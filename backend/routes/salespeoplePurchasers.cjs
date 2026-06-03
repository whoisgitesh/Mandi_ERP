const express = require("express");

const db = require("../db.cjs");
const { assignMasterNumber } = require("../services/masterNumberService.cjs");

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function ensureSchema() {
  await db.query(`
    ALTER TABLE sales_receivables_setup
      ADD COLUMN IF NOT EXISTS salesperson_purchaser_nos VARCHAR(50)
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS departments (
      code VARCHAR(50) PRIMARY KEY,
      name VARCHAR(150),
      description VARCHAR(150),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    ALTER TABLE departments
      ADD COLUMN IF NOT EXISTS name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS description VARCHAR(150),
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

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
    INSERT INTO departments (code, name, is_active)
    VALUES
      ('ADM', 'Administration', true),
      ('PROD', 'Production', true),
      ('SALES', 'Sales', true)
    ON CONFLICT (code) DO NOTHING
  `);

  await db.query(`
    INSERT INTO customer_groups (code, name, is_active)
    VALUES
      ('LARGE', 'Large Business', true),
      ('MEDIUM', 'Medium Business', true),
      ('SMALL', 'Small Business', true)
    ON CONFLICT (code) DO NOTHING
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS salespeople_purchasers (
      code VARCHAR(50) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      job_title VARCHAR(100),
      commission_pct NUMERIC(7,3) DEFAULT 0,
      phone_no VARCHAR(30),
      email VARCHAR(150),
      next_task_date DATE,
      blocked BOOLEAN DEFAULT FALSE,
      department_code VARCHAR(50),
      customer_group_code VARCHAR(50),
      picture_url TEXT,
      last_date_modified DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    ALTER TABLE salespeople_purchasers
      ADD COLUMN IF NOT EXISTS name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS job_title VARCHAR(100),
      ADD COLUMN IF NOT EXISTS commission_pct NUMERIC(7,3) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS phone_no VARCHAR(30),
      ADD COLUMN IF NOT EXISTS email VARCHAR(150),
      ADD COLUMN IF NOT EXISTS next_task_date DATE,
      ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS department_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS customer_group_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS picture_url TEXT,
      ADD COLUMN IF NOT EXISTS last_date_modified DATE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await db.query(`
    ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS salesperson_code VARCHAR(50)
  `);

  await db.query(`
    ALTER TABLE vendors
      ADD COLUMN IF NOT EXISTS purchaser_code VARCHAR(50)
  `);
}

async function seedDefaultSeries() {
  await db.query(`
    INSERT INTO number_series (code, description, manual_nos, date_order)
    VALUES ('SALESPERSON_PURCHASER', 'Salesperson/Purchaser Nos.', true, false)
    ON CONFLICT (code)
    DO UPDATE SET description = EXCLUDED.description
  `);

  await db.query(`
    INSERT INTO no_series_lines (
      no_series_code,
      starting_no,
      ending_no,
      last_no_used,
      increment_by,
      open
    )
    SELECT 'SALESPERSON_PURCHASER', 'SP-00001', 'SP-99999', NULL, 1, true
    WHERE NOT EXISTS (
      SELECT 1 FROM no_series_lines WHERE no_series_code = 'SALESPERSON_PURCHASER'
    )
  `);

  await db.query(`
    INSERT INTO sales_receivables_setup (salesperson_purchaser_nos)
    SELECT 'SALESPERSON_PURCHASER'
    WHERE NOT EXISTS (SELECT 1 FROM sales_receivables_setup)
  `);

  await db.query(`
    UPDATE sales_receivables_setup
    SET salesperson_purchaser_nos = COALESCE(salesperson_purchaser_nos, 'SALESPERSON_PURCHASER')
    WHERE salesperson_purchaser_nos IS NULL
  `);
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : null;
}

function localDateOnly() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function assertLookup(table, code, label) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;

  const result = await db.query(
    `SELECT 1
     FROM ${table}
     WHERE code = $1
       AND COALESCE(is_active, true) = true
     LIMIT 1`,
    [normalized]
  );

  if (result.rows.length === 0) {
    const err = new Error(`${label} must reference an existing active value.`);
    err.statusCode = 400;
    throw err;
  }

  return normalized;
}

async function validatePayload(body, existingCode = null) {
  const code = normalizeCode(existingCode || body.code);
  const name = String(body.name || "").trim();
  const commissionPct = Number(body.commission_pct ?? 0) || 0;
  const email = String(body.email || "").trim();

  if (!code) {
    const err = new Error("Code is required.");
    err.statusCode = 400;
    throw err;
  }

  if (!name) {
    const err = new Error("Name is required.");
    err.statusCode = 400;
    throw err;
  }

  if (commissionPct < 0) {
    const err = new Error("Commission % cannot be negative.");
    err.statusCode = 400;
    throw err;
  }

  if (email && !EMAIL_REGEX.test(email)) {
    const err = new Error("Email must be a valid email address.");
    err.statusCode = 400;
    throw err;
  }

  return {
    code,
    name,
    job_title: body.job_title || null,
    commission_pct: commissionPct,
    phone_no: body.phone_no || null,
    email: email || null,
    next_task_date: dateOnly(body.next_task_date),
    blocked: Boolean(body.blocked),
    department_code: await assertLookup("departments", body.department_code, "Department Code"),
    customer_group_code: await assertLookup("customer_groups", body.customer_group_code, "Customer Group Code"),
    picture_url: body.picture_url || null,
    last_date_modified: dateOnly(body.last_date_modified) || localDateOnly(),
  };
}

router.use(async (_req, _res, next) => {
  try {
    await ensureSchema();
    next();
  } catch (err) {
    next(err);
  }
});

router.get("/lookups/options", async (_req, res) => {
  try {
    const [departments, customerGroups] = await Promise.all([
      db.query(`
        SELECT code, COALESCE(name, description, code) AS name
        FROM departments
        WHERE COALESCE(is_active, true) = true
        ORDER BY code
      `),
      db.query(`
        SELECT code, COALESCE(name, description, code) AS name
        FROM customer_groups
        WHERE COALESCE(is_active, true) = true
        ORDER BY code
      `),
    ]);

    res.json({
      departments: departments.rows,
      customer_groups: customerGroups.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load Salesperson/Purchaser lookups" });
  }
});

router.get("/", async (req, res) => {
  try {
    const activeOnly = req.query.active === "true" || req.query.active === "1";
    const result = await db.query(
      `SELECT
         sp.*,
         COALESCE(d.name, d.description) AS department_name,
         COALESCE(cg.name, cg.description) AS customer_group_name
       FROM salespeople_purchasers sp
       LEFT JOIN departments d ON d.code = sp.department_code
       LEFT JOIN customer_groups cg ON cg.code = sp.customer_group_code
       WHERE ($1::boolean = false OR COALESCE(sp.blocked, false) = false)
       ORDER BY sp.code`,
      [activeOnly]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch salespeople/purchasers" });
  }
});

router.get("/:code", async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);
    const result = await db.query(
      `SELECT
         sp.*,
         COALESCE(d.name, d.description) AS department_name,
         COALESCE(cg.name, cg.description) AS customer_group_name
       FROM salespeople_purchasers sp
       LEFT JOIN departments d ON d.code = sp.department_code
       LEFT JOIN customer_groups cg ON cg.code = sp.customer_group_code
       WHERE sp.code = $1
       LIMIT 1`,
      [code]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Salesperson/Purchaser not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch salesperson/purchaser" });
  }
});

router.post("/", async (req, res) => {
  try {
    await seedDefaultSeries();
    const code = await assignMasterNumber(db, {
      masterKey: "salespersonPurchaser",
      selectedSeriesCode: req.body.no_series_code,
      selectedSeriesLineId: req.body.no_series_line_id,
      currentNo: req.body.code,
    });
    const payload = await validatePayload({ ...req.body, code });

    const exists = await db.query(
      `SELECT 1 FROM salespeople_purchasers WHERE code = $1 LIMIT 1`,
      [payload.code]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ error: "Salesperson/Purchaser Code already exists." });
    }

    const result = await db.query(
      `INSERT INTO salespeople_purchasers (
         code,
         name,
         job_title,
         commission_pct,
         phone_no,
         email,
         next_task_date,
         blocked,
         department_code,
         customer_group_code,
         picture_url,
         last_date_modified
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        payload.code,
        payload.name,
        payload.job_title,
        payload.commission_pct,
        payload.phone_no,
        payload.email,
        payload.next_task_date,
        payload.blocked,
        payload.department_code,
        payload.customer_group_code,
        payload.picture_url,
        payload.last_date_modified,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Failed to create salesperson/purchaser",
    });
  }
});

router.put("/:code", async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);
    const payload = await validatePayload({ ...req.body, code }, code);

    const result = await db.query(
      `UPDATE salespeople_purchasers
       SET
         name = $2,
         job_title = $3,
         commission_pct = $4,
         phone_no = $5,
         email = $6,
         next_task_date = $7,
         blocked = $8,
         department_code = $9,
         customer_group_code = $10,
         picture_url = $11,
         last_date_modified = $12,
         updated_at = CURRENT_TIMESTAMP
       WHERE code = $1
       RETURNING *`,
      [
        code,
        payload.name,
        payload.job_title,
        payload.commission_pct,
        payload.phone_no,
        payload.email,
        payload.next_task_date,
        payload.blocked,
        payload.department_code,
        payload.customer_group_code,
        payload.picture_url,
        payload.last_date_modified,
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Salesperson/Purchaser not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Failed to update salesperson/purchaser",
    });
  }
});

router.delete("/:code", async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);
    const result = await db.query(
      `DELETE FROM salespeople_purchasers
       WHERE code = $1
       RETURNING *`,
      [code]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Salesperson/Purchaser not found" });
    }

    res.json({ success: true, deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete salesperson/purchaser" });
  }
});

module.exports = router;
