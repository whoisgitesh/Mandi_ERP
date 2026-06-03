const express = require("express");

const db = require("../db.cjs");

const router = express.Router();

async function ensureSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS customer_groups (
      code VARCHAR(50) PRIMARY KEY,
      name VARCHAR(150),
      description VARCHAR(150),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    ALTER TABLE customer_groups
      ADD COLUMN IF NOT EXISTS name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS description VARCHAR(150),
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await db.query(`
    INSERT INTO customer_groups (code, name, is_active)
    VALUES
      ('LARGE', 'Large Business', true),
      ('MEDIUM', 'Medium Business', true),
      ('SMALL', 'Small Business', true)
    ON CONFLICT (code) DO NOTHING
  `);
}

router.get("/", async (req, res) => {
  try {
    await ensureSchema();
    const activeOnly = req.query.active === "true" || req.query.active === "1";
    const result = await db.query(
      `SELECT code, COALESCE(name, description, code) AS name, is_active
       FROM customer_groups
       WHERE ($1::boolean = false OR COALESCE(is_active, true) = true)
       ORDER BY code`,
      [activeOnly]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch customer groups" });
  }
});

module.exports = router;
