const express = require("express");

const db = require("../db.cjs");

const router = express.Router();

async function ensureSchema() {
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

  await db.query(`
    ALTER TABLE item_categories
      ADD COLUMN IF NOT EXISTS description VARCHAR(150),
      ADD COLUMN IF NOT EXISTS parent_category_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS item_category_attributes (
      id SERIAL PRIMARY KEY,
      category_code VARCHAR(50) REFERENCES item_categories(code) ON DELETE CASCADE,
      attribute_name VARCHAR(100),
      default_value VARCHAR(150),
      unit_of_measure_code VARCHAR(50),
      inherited_from VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    ALTER TABLE item_category_attributes
      ADD COLUMN IF NOT EXISTS category_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS attribute_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS default_value VARCHAR(150),
      ADD COLUMN IF NOT EXISTS unit_of_measure_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS inherited_from VARCHAR(50),
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await db.query(`
    ALTER TABLE items
      ADD COLUMN IF NOT EXISTS item_category_code VARCHAR(50)
  `);
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

async function findCategory(code) {
  const result = await db.query(
    `SELECT *
     FROM item_categories
     WHERE code = $1
     LIMIT 1`,
    [code]
  );

  return result.rows[0] || null;
}

async function assertNoCircularParent(code, parentCode) {
  if (!parentCode) return;
  if (code === parentCode) {
    const err = new Error("Parent category cannot be itself.");
    err.statusCode = 400;
    throw err;
  }

  let current = parentCode;
  const visited = new Set();

  while (current) {
    if (current === code || visited.has(current)) {
      const err = new Error("Circular parent category relationship is not allowed.");
      err.statusCode = 400;
      throw err;
    }

    visited.add(current);
    const row = await findCategory(current);
    current = row?.parent_category_code || null;
  }
}

async function getAncestorCodes(code) {
  const ancestors = [];
  let current = code;
  const visited = new Set();

  while (current && !visited.has(current)) {
    visited.add(current);
    const row = await findCategory(current);
    const parent = row?.parent_category_code || null;
    if (parent) ancestors.push(parent);
    current = parent;
  }

  return ancestors;
}

async function getInheritedAttributes(code) {
  const ancestors = await getAncestorCodes(code);
  if (ancestors.length === 0) return [];

  const ordered = [...ancestors].reverse();
  const result = await db.query(
    `SELECT
       id,
       category_code,
       attribute_name,
       default_value,
       unit_of_measure_code,
       category_code AS inherited_from,
       created_at
     FROM item_category_attributes
     WHERE category_code = ANY($1::text[])
     ORDER BY array_position($1::text[], category_code), id`,
    [ordered]
  );

  return result.rows;
}

async function validatePayload(payload, existingCode = null) {
  const code = normalizeCode(existingCode || payload.code);
  const description = String(payload.description || "").trim();
  const parentCategoryCode = normalizeCode(payload.parent_category_code);

  if (!code) {
    const err = new Error("Code is required.");
    err.statusCode = 400;
    throw err;
  }

  if (!description) {
    const err = new Error("Description is required.");
    err.statusCode = 400;
    throw err;
  }

  if (parentCategoryCode) {
    const parent = await findCategory(parentCategoryCode);
    if (!parent || parent.is_active === false) {
      const err = new Error("Parent category must reference an existing active category.");
      err.statusCode = 400;
      throw err;
    }
  }

  await assertNoCircularParent(code, parentCategoryCode);

  return {
    code,
    description,
    parent_category_code: parentCategoryCode || null,
    is_active: payload.is_active !== false,
  };
}

router.get("/", async (req, res) => {
  try {
    await ensureSchema();
    const activeOnly = req.query.active === "true" || req.query.active === "1";
    const result = await db.query(
      `SELECT
         c.*,
         p.description AS parent_description,
         COALESCE(item_usage.item_count, 0) AS item_count
       FROM item_categories c
       LEFT JOIN item_categories p ON p.code = c.parent_category_code
       LEFT JOIN (
         SELECT item_category_code, COUNT(*) AS item_count
         FROM items
         WHERE item_category_code IS NOT NULL
           AND COALESCE(is_deleted, false) = false
         GROUP BY item_category_code
       ) item_usage ON item_usage.item_category_code = c.code
       WHERE ($1::boolean = false OR COALESCE(c.is_active, true) = true)
       ORDER BY c.code`,
      [activeOnly]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch item categories" });
  }
});

router.get("/:code", async (req, res) => {
  try {
    await ensureSchema();
    const code = normalizeCode(req.params.code);
    const category = await findCategory(code);

    if (!category) {
      return res.status(404).json({ error: "Item category not found" });
    }

    const direct = await db.query(
      `SELECT *
       FROM item_category_attributes
       WHERE category_code = $1
       ORDER BY id`,
      [code]
    );

    const inherited = await getInheritedAttributes(code);

    res.json({
      ...category,
      attributes: direct.rows,
      inherited_attributes: inherited,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch item category" });
  }
});

router.post("/", async (req, res) => {
  try {
    await ensureSchema();
    const payload = await validatePayload(req.body);

    const exists = await findCategory(payload.code);
    if (exists) {
      return res.status(400).json({ error: "Item Category Code already exists." });
    }

    const result = await db.query(
      `INSERT INTO item_categories (
         code,
         description,
         parent_category_code,
         is_active
       )
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [
        payload.code,
        payload.description,
        payload.parent_category_code,
        payload.is_active,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Failed to create item category",
    });
  }
});

router.put("/:code", async (req, res) => {
  try {
    await ensureSchema();
    const code = normalizeCode(req.params.code);
    const existing = await findCategory(code);
    if (!existing) {
      return res.status(404).json({ error: "Item category not found" });
    }

    const payload = await validatePayload({ ...req.body, code }, code);
    const result = await db.query(
      `UPDATE item_categories
       SET description = $1,
           parent_category_code = $2,
           is_active = $3,
           updated_at = NOW()
       WHERE code = $4
       RETURNING *`,
      [
        payload.description,
        payload.parent_category_code,
        payload.is_active,
        code,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Failed to update item category",
    });
  }
});

router.delete("/:code", async (req, res) => {
  try {
    await ensureSchema();
    const code = normalizeCode(req.params.code);

    const used = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM items
       WHERE item_category_code = $1
         AND COALESCE(is_deleted, false) = false`,
      [code]
    );

    const children = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM item_categories
       WHERE parent_category_code = $1
         AND COALESCE(is_active, true) = true`,
      [code]
    );

    if (Number(used.rows[0]?.count || 0) > 0 || Number(children.rows[0]?.count || 0) > 0) {
      await db.query(
        `UPDATE item_categories
         SET is_active = false,
             updated_at = NOW()
         WHERE code = $1`,
        [code]
      );
      return res.json({ success: true, deactivated: true });
    }

    await db.query(`DELETE FROM item_categories WHERE code = $1`, [code]);
    res.json({ success: true, deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete item category" });
  }
});

router.post("/:code/attributes", async (req, res) => {
  try {
    await ensureSchema();
    const code = normalizeCode(req.params.code);
    const category = await findCategory(code);
    if (!category) {
      return res.status(404).json({ error: "Item category not found" });
    }

    const attributeName = String(req.body.attribute_name || "").trim();
    if (!attributeName) {
      return res.status(400).json({ error: "Attribute is required." });
    }

    const result = await db.query(
      `INSERT INTO item_category_attributes (
         category_code,
         attribute_name,
         default_value,
         unit_of_measure_code,
         inherited_from
       )
       VALUES ($1,$2,$3,$4,NULL)
       RETURNING *`,
      [
        code,
        attributeName,
        req.body.default_value || null,
        req.body.unit_of_measure_code || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add item category attribute" });
  }
});

router.put("/attributes/:id", async (req, res) => {
  try {
    await ensureSchema();
    const attributeName = String(req.body.attribute_name || "").trim();
    if (!attributeName) {
      return res.status(400).json({ error: "Attribute is required." });
    }

    const result = await db.query(
      `UPDATE item_category_attributes
       SET attribute_name = $1,
           default_value = $2,
           unit_of_measure_code = $3,
           inherited_from = NULL
       WHERE id = $4
       RETURNING *`,
      [
        attributeName,
        req.body.default_value || null,
        req.body.unit_of_measure_code || null,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Attribute not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update item category attribute" });
  }
});

router.delete("/attributes/:id", async (req, res) => {
  try {
    await ensureSchema();
    await db.query(`DELETE FROM item_category_attributes WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete item category attribute" });
  }
});

module.exports = router;
