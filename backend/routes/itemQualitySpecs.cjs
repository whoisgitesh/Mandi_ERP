const express = require("express");

const db = require("../db.cjs");

const router = express.Router();

const QUALITY_TYPES = new Set(["Range", "Minimum", "Maximum", "Fixed"]);

const num = (value) => Number(value ?? 0) || 0;
const cleanCode = (value) => String(value || "").trim().toUpperCase();

async function ensureSchema(connection = db) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS item_quality_specifications (
      id SERIAL PRIMARY KEY,
      item_no VARCHAR(50) NOT NULL,
      section_code VARCHAR(50),
      quality_specific VARCHAR(100) NOT NULL,
      unit_of_measure_code VARCHAR(50),
      quality_type VARCHAR(30) NOT NULL DEFAULT 'Range',
      quality_from NUMERIC(18,4) DEFAULT 0,
      quality_to NUMERIC(18,4) DEFAULT 0,
      standard_value VARCHAR(100),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    ALTER TABLE item_quality_specifications
      ADD COLUMN IF NOT EXISTS item_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS section_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS quality_specific VARCHAR(100),
      ADD COLUMN IF NOT EXISTS unit_of_measure_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS quality_type VARCHAR(30) NOT NULL DEFAULT 'Range',
      ADD COLUMN IF NOT EXISTS quality_from NUMERIC(18,4) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS quality_to NUMERIC(18,4) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS standard_value VARCHAR(100),
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await connection.query(`
    CREATE INDEX IF NOT EXISTS idx_item_quality_specifications_item
      ON item_quality_specifications(item_no)
  `);

  await connection.query(`
    CREATE INDEX IF NOT EXISTS idx_item_quality_specifications_lookup
      ON item_quality_specifications(item_no, section_code, quality_specific)
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS item_quality_spec (
      id SERIAL PRIMARY KEY,
      item_id INTEGER,
      section_code VARCHAR(50),
      quality_specific VARCHAR(150) NOT NULL DEFAULT '',
      unit_of_measure_code VARCHAR(50),
      quality_type VARCHAR(30) NOT NULL DEFAULT 'Range',
      quality_from NUMERIC(12,4) DEFAULT 0,
      quality_to NUMERIC(12,4) DEFAULT 0,
      standard_value NUMERIC(12,4),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    INSERT INTO item_quality_specifications (
      item_no,
      section_code,
      quality_specific,
      unit_of_measure_code,
      quality_type,
      quality_from,
      quality_to,
      standard_value,
      created_at,
      updated_at
    )
    SELECT
      i.item_no,
      old.section_code,
      NULLIF(old.quality_specific, ''),
      old.unit_of_measure_code,
      CASE
        WHEN old.quality_type IN ('Min', 'Minimum') THEN 'Minimum'
        WHEN old.quality_type IN ('Max', 'Maximum') THEN 'Maximum'
        WHEN old.quality_type IN ('Equal', 'Fixed') THEN 'Fixed'
        ELSE 'Range'
      END,
      COALESCE(old.quality_from, 0),
      COALESCE(old.quality_to, 0),
      CASE WHEN old.standard_value IS NULL THEN NULL ELSE old.standard_value::text END,
      COALESCE(old.created_at, CURRENT_TIMESTAMP),
      COALESCE(old.updated_at, CURRENT_TIMESTAMP)
    FROM item_quality_spec old
    JOIN items i ON i.id = old.item_id
    WHERE old.quality_specific IS NOT NULL
      AND old.quality_specific <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM item_quality_specifications newer
        WHERE newer.item_no = i.item_no
          AND COALESCE(newer.section_code, '') = COALESCE(old.section_code, '')
          AND lower(newer.quality_specific) = lower(old.quality_specific)
      )
  `);
}

async function itemNoFromId(itemId) {
  if (!itemId) return "";
  const result = await db.query(
    `SELECT item_no
     FROM items
     WHERE id = $1
       AND COALESCE(is_deleted, false) = false
     LIMIT 1`,
    [itemId]
  );
  return result.rows[0]?.item_no || "";
}

async function assertItemExists(itemNo) {
  const result = await db.query(
    `SELECT item_no
     FROM items
     WHERE item_no = $1
       AND COALESCE(is_deleted, false) = false
     LIMIT 1`,
    [itemNo]
  );

  if (result.rows.length === 0) {
    const err = new Error("Item No. must reference an existing item.");
    err.statusCode = 400;
    throw err;
  }
}

async function validatePayload(payload = {}, existingId = null) {
  const itemNo = cleanCode(payload.item_no);
  const sectionCode = cleanCode(payload.section_code) || null;
  const qualitySpecific = String(payload.quality_specific || "").trim();
  const qualityType = QUALITY_TYPES.has(payload.quality_type)
    ? payload.quality_type
    : "Range";
  const qualityFrom = num(payload.quality_from);
  const qualityTo = num(payload.quality_to);
  const standardValue =
    payload.standard_value === null || payload.standard_value === undefined
      ? ""
      : String(payload.standard_value).trim();

  if (!itemNo) {
    const err = new Error("Item No. is required.");
    err.statusCode = 400;
    throw err;
  }

  if (!qualitySpecific) {
    const err = new Error("Quality Specific is required.");
    err.statusCode = 400;
    throw err;
  }

  if (qualityFrom < 0 || qualityTo < 0) {
    const err = new Error("Quality numeric limits cannot be negative.");
    err.statusCode = 400;
    throw err;
  }

  if (qualityType === "Range" && qualityFrom > qualityTo) {
    const err = new Error("Quality From must be less than or equal to Quality To.");
    err.statusCode = 400;
    throw err;
  }

  if (qualityType === "Fixed" && !standardValue) {
    const err = new Error("Standard Value is required when Quality Type is Fixed.");
    err.statusCode = 400;
    throw err;
  }

  await assertItemExists(itemNo);

  const duplicate = await db.query(
    `SELECT 1
     FROM item_quality_specifications
     WHERE item_no = $1
       AND COALESCE(section_code, '') = COALESCE($2, '')
       AND lower(quality_specific) = lower($3)
       AND ($4::int IS NULL OR id <> $4::int)
     LIMIT 1`,
    [itemNo, sectionCode, qualitySpecific, existingId ? Number(existingId) : null]
  );

  if (duplicate.rows.length > 0) {
    const err = new Error("Duplicate Quality Specific for the same item and section is not allowed.");
    err.statusCode = 400;
    throw err;
  }

  return {
    item_no: itemNo,
    section_code: sectionCode,
    quality_specific: qualitySpecific,
    unit_of_measure_code: cleanCode(payload.unit_of_measure_code) || null,
    quality_type: qualityType,
    quality_from: qualityFrom,
    quality_to: qualityTo,
    standard_value: standardValue || null,
    is_active: payload.is_active !== false,
  };
}

async function listForItem(itemNo) {
  const result = await db.query(
    `SELECT *
     FROM item_quality_specifications
     WHERE item_no = $1
     ORDER BY section_code NULLS LAST, quality_specific, id`,
    [itemNo]
  );

  return result.rows;
}

router.get("/", async (req, res) => {
  try {
    await ensureSchema();
    const itemNo = cleanCode(req.query.item_no) || (await itemNoFromId(req.query.item_id));
    if (!itemNo) return res.status(400).json({ error: "Item No. is required" });

    res.json(await listForItem(itemNo));
  } catch (err) {
    console.error("GET ITEM QUALITY SPECS ERROR:", err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Failed to load item quality specifications",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    await ensureSchema();
    const itemNo = cleanCode(req.body?.item_no) || (await itemNoFromId(req.body?.item_id));
    const payload = await validatePayload({ ...req.body, item_no: itemNo });

    const result = await db.query(
      `INSERT INTO item_quality_specifications (
         item_no,
         section_code,
         quality_specific,
         unit_of_measure_code,
         quality_type,
         quality_from,
         quality_to,
         standard_value,
         is_active
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        payload.item_no,
        payload.section_code,
        payload.quality_specific,
        payload.unit_of_measure_code,
        payload.quality_type,
        payload.quality_from,
        payload.quality_to,
        payload.standard_value,
        payload.is_active,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("CREATE ITEM QUALITY SPEC ERROR:", err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Failed to create item quality specification",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    await ensureSchema();

    const current = await db.query(
      `SELECT *
       FROM item_quality_specifications
       WHERE id = $1
       LIMIT 1`,
      [req.params.id]
    );

    if (!current.rows[0]) {
      return res.status(404).json({ error: "Item quality specification not found" });
    }

    const payload = await validatePayload(
      { ...current.rows[0], ...req.body },
      req.params.id
    );

    const result = await db.query(
      `UPDATE item_quality_specifications
       SET item_no = $1,
           section_code = $2,
           quality_specific = $3,
           unit_of_measure_code = $4,
           quality_type = $5,
           quality_from = $6,
           quality_to = $7,
           standard_value = $8,
           is_active = $9,
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        payload.item_no,
        payload.section_code,
        payload.quality_specific,
        payload.unit_of_measure_code,
        payload.quality_type,
        payload.quality_from,
        payload.quality_to,
        payload.standard_value,
        payload.is_active,
        req.params.id,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE ITEM QUALITY SPEC ERROR:", err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Failed to update item quality specification",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await ensureSchema();
    await db.query(`DELETE FROM item_quality_specifications WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE ITEM QUALITY SPEC ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to delete item quality specification" });
  }
});

module.exports = router;
