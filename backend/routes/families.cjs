const express = require("express");

const db = require("../db.cjs");

const router = express.Router();

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function localDateOnly() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function ensureSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS families (
      family_no VARCHAR(50) PRIMARY KEY,
      description VARCHAR(150) NOT NULL,
      description_2 VARCHAR(150),
      search_name VARCHAR(150),
      item_category_code VARCHAR(50),
      routing_no VARCHAR(50),
      blocked BOOLEAN DEFAULT FALSE,
      last_date_modified DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    ALTER TABLE families
      ADD COLUMN IF NOT EXISTS description VARCHAR(150),
      ADD COLUMN IF NOT EXISTS description_2 VARCHAR(150),
      ADD COLUMN IF NOT EXISTS search_name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS item_category_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS routing_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS last_date_modified DATE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS family_lines (
      id SERIAL PRIMARY KEY,
      family_no VARCHAR(50) REFERENCES families(family_no) ON DELETE CASCADE,
      line_no INT NOT NULL,
      item_no VARCHAR(50) NOT NULL,
      description VARCHAR(150),
      unit_of_measure_code VARCHAR(50),
      quantity NUMERIC(12,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    ALTER TABLE family_lines
      ADD COLUMN IF NOT EXISTS family_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS line_no INT,
      ADD COLUMN IF NOT EXISTS item_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS description VARCHAR(150),
      ADD COLUMN IF NOT EXISTS unit_of_measure_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS quantity NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await db.query(`
    ALTER TABLE items
      ADD COLUMN IF NOT EXISTS item_category_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS family_no VARCHAR(50)
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS item_categories (
      code VARCHAR(50) PRIMARY KEY,
      description VARCHAR(150) NOT NULL,
      parent_category_code VARCHAR(50),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function findFamily(familyNo) {
  const result = await db.query(
    `SELECT
       families.*,
       TO_CHAR(last_date_modified, 'YYYY-MM-DD') AS last_date_modified
     FROM families
     WHERE family_no = $1
     LIMIT 1`,
    [familyNo]
  );

  return result.rows[0] || null;
}

async function validateFamilyPayload(payload, existingFamilyNo = null) {
  const familyNo = normalizeCode(existingFamilyNo || payload.family_no);
  const description = String(payload.description || "").trim();
  const itemCategoryCode = normalizeCode(payload.item_category_code);

  if (!familyNo) {
    const err = new Error("Family No. is required.");
    err.statusCode = 400;
    throw err;
  }

  if (!description) {
    const err = new Error("Description is required.");
    err.statusCode = 400;
    throw err;
  }

  if (itemCategoryCode) {
    const category = await db.query(
      `SELECT 1
       FROM item_categories
       WHERE code = $1
         AND COALESCE(is_active, true) = true
       LIMIT 1`,
      [itemCategoryCode]
    );

    if (category.rows.length === 0) {
      const err = new Error("Item Category Code must reference an existing active Item Category.");
      err.statusCode = 400;
      throw err;
    }
  }

  return {
    family_no: familyNo,
    description,
    description_2: payload.description_2 || null,
    search_name: payload.search_name || description,
    item_category_code: itemCategoryCode || null,
    routing_no: payload.routing_no || null,
    blocked: Boolean(payload.blocked),
    last_date_modified: payload.last_date_modified || localDateOnly(),
  };
}

router.get("/lookups/options", async (req, res) => {
  try {
    await ensureSchema();

    const [families, categories, items] = await Promise.all([
      db.query(
        `SELECT
           f.*,
           TO_CHAR(f.last_date_modified, 'YYYY-MM-DD') AS last_date_modified,
           c.description AS item_category_description
         FROM families f
         LEFT JOIN item_categories c ON c.code = f.item_category_code
         WHERE COALESCE(f.blocked, false) = false
         ORDER BY f.family_no`
      ),
      db.query(
        `SELECT code, description
         FROM item_categories
         WHERE COALESCE(is_active, true) = true
         ORDER BY code`
      ),
      db.query(
        `SELECT item_no, description, base_unit_of_measure, item_category_code, family_no, unit_price
         FROM items
         WHERE COALESCE(is_deleted, false) = false
         ORDER BY item_no`
      ),
    ]);

    res.json({
      families: families.rows,
      item_categories: categories.rows,
      items: items.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load family lookups" });
  }
});

router.get("/", async (req, res) => {
  try {
    await ensureSchema();
    const activeOnly = req.query.active === "true" || req.query.active === "1";
    const itemCategoryCode = normalizeCode(req.query.item_category_code);

    const result = await db.query(
      `SELECT
         f.*,
         TO_CHAR(f.last_date_modified, 'YYYY-MM-DD') AS last_date_modified,
         c.description AS item_category_description,
         COALESCE(item_usage.item_count, 0) AS item_count
       FROM families f
       LEFT JOIN item_categories c ON c.code = f.item_category_code
       LEFT JOIN (
         SELECT family_no, COUNT(*) AS item_count
         FROM items
         WHERE family_no IS NOT NULL
           AND COALESCE(is_deleted, false) = false
         GROUP BY family_no
       ) item_usage ON item_usage.family_no = f.family_no
       WHERE ($1::boolean = false OR COALESCE(f.blocked, false) = false)
         AND ($2::text IS NULL OR f.item_category_code = $2)
       ORDER BY f.family_no`,
      [activeOnly, itemCategoryCode || null]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch families" });
  }
});

router.get("/:familyNo", async (req, res) => {
  try {
    await ensureSchema();
    const familyNo = normalizeCode(req.params.familyNo);
    const family = await findFamily(familyNo);

    if (!family) {
      return res.status(404).json({ error: "Family not found" });
    }

    const lines = await db.query(
      `SELECT *
       FROM family_lines
       WHERE family_no = $1
       ORDER BY line_no, id`,
      [familyNo]
    );

    res.json({
      ...family,
      lines: lines.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch family" });
  }
});

router.post("/", async (req, res) => {
  try {
    await ensureSchema();
    const payload = await validateFamilyPayload(req.body);

    const existing = await findFamily(payload.family_no);
    if (existing) {
      return res.status(400).json({ error: "Family No. already exists." });
    }

    const result = await db.query(
      `INSERT INTO families (
         family_no,
         description,
         description_2,
         search_name,
         item_category_code,
         routing_no,
         blocked,
         last_date_modified
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        payload.family_no,
        payload.description,
        payload.description_2,
        payload.search_name,
        payload.item_category_code,
        payload.routing_no,
        payload.blocked,
        localDateOnly(),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Failed to create family",
    });
  }
});

router.put("/:familyNo", async (req, res) => {
  try {
    await ensureSchema();
    const familyNo = normalizeCode(req.params.familyNo);
    const existing = await findFamily(familyNo);
    if (!existing) {
      return res.status(404).json({ error: "Family not found" });
    }

    const payload = await validateFamilyPayload({ ...req.body, family_no: familyNo }, familyNo);
    const result = await db.query(
      `UPDATE families
       SET description = $1,
           description_2 = $2,
           search_name = $3,
           item_category_code = $4,
           routing_no = $5,
           blocked = $6,
           last_date_modified = $7,
           updated_at = NOW()
       WHERE family_no = $8
       RETURNING *`,
      [
        payload.description,
        payload.description_2,
        payload.search_name,
        payload.item_category_code,
        payload.routing_no,
        payload.blocked,
        localDateOnly(),
        familyNo,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Failed to update family",
    });
  }
});

router.delete("/:familyNo", async (req, res) => {
  try {
    await ensureSchema();
    const familyNo = normalizeCode(req.params.familyNo);

    const used = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM items
       WHERE family_no = $1
         AND COALESCE(is_deleted, false) = false`,
      [familyNo]
    );

    if (Number(used.rows[0]?.count || 0) > 0) {
      await db.query(
        `UPDATE families
         SET blocked = true,
             updated_at = NOW(),
             last_date_modified = $2
         WHERE family_no = $1`,
        [familyNo, localDateOnly()]
      );
      return res.json({ success: true, deactivated: true });
    }

    await db.query(`DELETE FROM families WHERE family_no = $1`, [familyNo]);
    res.json({ success: true, deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete family" });
  }
});

router.post("/:familyNo/lines", async (req, res) => {
  try {
    await ensureSchema();
    const familyNo = normalizeCode(req.params.familyNo);
    const family = await findFamily(familyNo);
    if (!family) {
      return res.status(404).json({ error: "Family not found" });
    }

    const itemNo = normalizeCode(req.body.item_no);
    if (!itemNo) {
      return res.status(400).json({ error: "Item No. is required." });
    }

    const item = await db.query(
      `SELECT item_no, description, base_unit_of_measure, item_category_code
       FROM items
       WHERE item_no = $1
         AND COALESCE(is_deleted, false) = false
       LIMIT 1`,
      [itemNo]
    );

    if (item.rows.length === 0) {
      return res.status(400).json({ error: "Item No. must reference an existing item." });
    }

    const duplicate = await db.query(
      `SELECT 1
       FROM family_lines
       WHERE family_no = $1
         AND item_no = $2
       LIMIT 1`,
      [familyNo, itemNo]
    );

    if (duplicate.rows.length > 0) {
      return res.status(400).json({ error: "Item already exists in this Family." });
    }

    const nextLine = await db.query(
      `SELECT COALESCE(MAX(line_no), 0) + 10000 AS line_no
       FROM family_lines
       WHERE family_no = $1`,
      [familyNo]
    );

    const row = item.rows[0];
    const result = await db.query(
      `INSERT INTO family_lines (
         family_no,
         line_no,
         item_no,
         description,
         unit_of_measure_code,
         quantity
       )
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        familyNo,
        Number(req.body.line_no || nextLine.rows[0].line_no || 10000),
        itemNo,
        req.body.description || row.description || null,
        req.body.unit_of_measure_code || row.base_unit_of_measure || null,
        Math.max(Number(req.body.quantity || 0), 0),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Failed to add family line",
    });
  }
});

router.put("/lines/:lineId", async (req, res) => {
  try {
    await ensureSchema();
    const lineId = req.params.lineId;
    const itemNo = normalizeCode(req.body.item_no);

    if (!itemNo) {
      return res.status(400).json({ error: "Item No. is required." });
    }

    const item = await db.query(
      `SELECT item_no, description, base_unit_of_measure
       FROM items
       WHERE item_no = $1
         AND COALESCE(is_deleted, false) = false
       LIMIT 1`,
      [itemNo]
    );

    if (item.rows.length === 0) {
      return res.status(400).json({ error: "Item No. must reference an existing item." });
    }

    const current = await db.query(
      `SELECT family_no
       FROM family_lines
       WHERE id = $1
       LIMIT 1`,
      [lineId]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ error: "Family line not found" });
    }

    const duplicate = await db.query(
      `SELECT 1
       FROM family_lines
       WHERE family_no = $1
         AND item_no = $2
         AND id <> $3
       LIMIT 1`,
      [current.rows[0].family_no, itemNo, lineId]
    );

    if (duplicate.rows.length > 0) {
      return res.status(400).json({ error: "Item already exists in this Family." });
    }

    const row = item.rows[0];
    const result = await db.query(
      `UPDATE family_lines
       SET line_no = $1,
           item_no = $2,
           description = $3,
           unit_of_measure_code = $4,
           quantity = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        Number(req.body.line_no || 10000),
        itemNo,
        req.body.description || row.description || null,
        req.body.unit_of_measure_code || row.base_unit_of_measure || null,
        Math.max(Number(req.body.quantity || 0), 0),
        lineId,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Failed to update family line",
    });
  }
});

router.delete("/lines/:lineId", async (req, res) => {
  try {
    await ensureSchema();
    await db.query(`DELETE FROM family_lines WHERE id = $1`, [req.params.lineId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete family line" });
  }
});

module.exports = router;
