const express = require("express");

const db = require("../db.cjs");
const { ensureLedgerTables } = require("../services/ledgerService.cjs");

const router = express.Router();

const COMMON_CURRENCIES = [
  ["INR", "Indian Rupee", "INR", "356", "₹"],
  ["USD", "US Dollar", "USD", "840", "$"],
  ["EUR", "Euro", "EUR", "978", "€"],
  ["GBP", "Pound Sterling", "GBP", "826", "£"],
  ["AED", "United Arab Emirates Dirham", "AED", "784", ""],
  ["AUD", "Australian Dollar", "AUD", "036", "$"],
  ["CAD", "Canadian Dollar", "CAD", "124", "$"],
  ["CHF", "Swiss Franc", "CHF", "756", ""],
  ["CNY", "Chinese Yuan", "CNY", "156", "¥"],
  ["JPY", "Japanese Yen", "JPY", "392", "¥"],
];

async function ensureSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS currencies (
      code VARCHAR(10) PRIMARY KEY,
      description VARCHAR(100) NOT NULL,
      iso_code VARCHAR(10),
      iso_numeric_code VARCHAR(10),
      symbol VARCHAR(10),
      currency_symbol_position VARCHAR(50),
      emu_currency BOOLEAN DEFAULT FALSE,
      currency_factor NUMERIC(18,6) DEFAULT 1,
      unrealized_gains_acc VARCHAR(50),
      realized_gains_acc VARCHAR(50),
      unrealized_losses_acc VARCHAR(50),
      realized_losses_acc VARCHAR(50),
      amount_rounding_precision NUMERIC(18,6) DEFAULT 0.01,
      amount_decimal_places VARCHAR(10) DEFAULT '2:2',
      invoice_rounding_precision NUMERIC(18,6) DEFAULT 0.01,
      invoice_rounding_type VARCHAR(20) DEFAULT 'Nearest',
      unit_amount_rounding_precision NUMERIC(18,6) DEFAULT 0.001,
      unit_amount_decimal_places VARCHAR(10) DEFAULT '2:5',
      appln_rounding_precision NUMERIC(18,6) DEFAULT 0,
      conv_lcy_rndg_debit_acc VARCHAR(50),
      conv_lcy_rndg_credit_acc VARCHAR(50),
      max_vat_difference_allowed NUMERIC(18,2) DEFAULT 0,
      vat_rounding_type VARCHAR(20) DEFAULT 'Nearest',
      payment_tolerance_pct NUMERIC(7,3) DEFAULT 0,
      max_payment_tolerance_amount NUMERIC(18,2) DEFAULT 0,
      last_date_modified DATE,
      last_date_adjusted DATE,
      realized_gl_gains_account VARCHAR(50),
      realized_gl_losses_account VARCHAR(50),
      residual_gains_account VARCHAR(50),
      residual_losses_account VARCHAR(50),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    ALTER TABLE currencies
      ADD COLUMN IF NOT EXISTS iso_code VARCHAR(10),
      ADD COLUMN IF NOT EXISTS iso_numeric_code VARCHAR(10),
      ADD COLUMN IF NOT EXISTS symbol VARCHAR(10),
      ADD COLUMN IF NOT EXISTS currency_symbol_position VARCHAR(50),
      ADD COLUMN IF NOT EXISTS emu_currency BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS currency_factor NUMERIC(18,6) DEFAULT 1,
      ADD COLUMN IF NOT EXISTS unrealized_gains_acc VARCHAR(50),
      ADD COLUMN IF NOT EXISTS realized_gains_acc VARCHAR(50),
      ADD COLUMN IF NOT EXISTS unrealized_losses_acc VARCHAR(50),
      ADD COLUMN IF NOT EXISTS realized_losses_acc VARCHAR(50),
      ADD COLUMN IF NOT EXISTS amount_rounding_precision NUMERIC(18,6) DEFAULT 0.01,
      ADD COLUMN IF NOT EXISTS amount_decimal_places VARCHAR(10) DEFAULT '2:2',
      ADD COLUMN IF NOT EXISTS invoice_rounding_precision NUMERIC(18,6) DEFAULT 0.01,
      ADD COLUMN IF NOT EXISTS invoice_rounding_type VARCHAR(20) DEFAULT 'Nearest',
      ADD COLUMN IF NOT EXISTS unit_amount_rounding_precision NUMERIC(18,6) DEFAULT 0.001,
      ADD COLUMN IF NOT EXISTS unit_amount_decimal_places VARCHAR(10) DEFAULT '2:5',
      ADD COLUMN IF NOT EXISTS appln_rounding_precision NUMERIC(18,6) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS conv_lcy_rndg_debit_acc VARCHAR(50),
      ADD COLUMN IF NOT EXISTS conv_lcy_rndg_credit_acc VARCHAR(50),
      ADD COLUMN IF NOT EXISTS max_vat_difference_allowed NUMERIC(18,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS vat_rounding_type VARCHAR(20) DEFAULT 'Nearest',
      ADD COLUMN IF NOT EXISTS payment_tolerance_pct NUMERIC(7,3) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS max_payment_tolerance_amount NUMERIC(18,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_date_modified DATE,
      ADD COLUMN IF NOT EXISTS last_date_adjusted DATE,
      ADD COLUMN IF NOT EXISTS realized_gl_gains_account VARCHAR(50),
      ADD COLUMN IF NOT EXISTS realized_gl_losses_account VARCHAR(50),
      ADD COLUMN IF NOT EXISTS residual_gains_account VARCHAR(50),
      ADD COLUMN IF NOT EXISTS residual_losses_account VARCHAR(50),
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS currency_exchange_rates (
      id SERIAL PRIMARY KEY,
      currency_code VARCHAR(10) REFERENCES currencies(code) ON DELETE CASCADE,
      starting_date DATE NOT NULL,
      exchange_rate_amount NUMERIC(18,6) NOT NULL,
      adjustment_exch_rate_amount NUMERIC(18,6),
      relational_currency_code VARCHAR(10),
      relational_exch_rate_amount NUMERIC(18,6),
      fixing_exch_rate_amount VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    ALTER TABLE currency_exchange_rates
      ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10),
      ADD COLUMN IF NOT EXISTS starting_date DATE,
      ADD COLUMN IF NOT EXISTS exchange_rate_amount NUMERIC(18,6),
      ADD COLUMN IF NOT EXISTS adjustment_exch_rate_amount NUMERIC(18,6),
      ADD COLUMN IF NOT EXISTS relational_currency_code VARCHAR(10),
      ADD COLUMN IF NOT EXISTS relational_exch_rate_amount NUMERIC(18,6),
      ADD COLUMN IF NOT EXISTS fixing_exch_rate_amount VARCHAR(20),
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await db.query(`
    ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS currency_code VARCHAR(20);
    ALTER TABLE purchase_invoices ADD COLUMN IF NOT EXISTS currency_code VARCHAR(20);
    ALTER TABLE posted_purchase_invoices ADD COLUMN IF NOT EXISTS currency_code VARCHAR(20);
    ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS currency_code VARCHAR(20);
    ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS currency_code VARCHAR(20);
    ALTER TABLE posted_sales_invoices ADD COLUMN IF NOT EXISTS currency_code VARCHAR(20);
  `);

  await ensureLedgerTables(db);
}

async function seedCommonCurrencies() {
  for (const row of COMMON_CURRENCIES) {
    await db.query(
      `INSERT INTO currencies (
         code,
         description,
         iso_code,
         iso_numeric_code,
         symbol,
         currency_symbol_position,
         currency_factor,
         last_date_modified
       )
       VALUES ($1,$2,$3,$4,$5,'Before Amount',1,CURRENT_DATE)
       ON CONFLICT (code) DO UPDATE
       SET description = COALESCE(currencies.description, EXCLUDED.description),
           iso_code = COALESCE(currencies.iso_code, EXCLUDED.iso_code),
           iso_numeric_code = COALESCE(currencies.iso_numeric_code, EXCLUDED.iso_numeric_code),
           symbol = COALESCE(currencies.symbol, EXCLUDED.symbol)`,
      row
    );
  }
}

function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

function numberValue(value, fallback = 0) {
  if (value === "" || value === null || value === undefined) return fallback;
  return Number(value);
}

function dateValue(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function assertRoundingType(value, label) {
  if (!value) return "Nearest";
  if (!["Nearest", "Up", "Down"].includes(value)) {
    const err = new Error(`${label} must be Nearest, Up, or Down.`);
    err.statusCode = 400;
    throw err;
  }
  return value;
}

function buildPayload(body, codeOverride = null) {
  const code = normalizeCode(codeOverride || body.code);
  const description = String(body.description || "").trim();

  if (!code) {
    const err = new Error("Currency Code is required.");
    err.statusCode = 400;
    throw err;
  }

  if (!description) {
    const err = new Error("Description is required.");
    err.statusCode = 400;
    throw err;
  }

  const precisionFields = [
    "currency_factor",
    "amount_rounding_precision",
    "invoice_rounding_precision",
    "unit_amount_rounding_precision",
    "appln_rounding_precision",
    "max_vat_difference_allowed",
    "payment_tolerance_pct",
    "max_payment_tolerance_amount",
  ];

  for (const field of precisionFields) {
    if (numberValue(body[field], field === "currency_factor" ? 1 : 0) < 0) {
      const err = new Error("Rounding precision and tolerance values cannot be negative.");
      err.statusCode = 400;
      throw err;
    }
  }

  return {
    code,
    description,
    iso_code: normalizeCode(body.iso_code),
    iso_numeric_code: body.iso_numeric_code || null,
    symbol: body.symbol || null,
    currency_symbol_position: body.currency_symbol_position || "Before Amount",
    emu_currency: Boolean(body.emu_currency),
    currency_factor: numberValue(body.currency_factor, 1),
    unrealized_gains_acc: body.unrealized_gains_acc || null,
    realized_gains_acc: body.realized_gains_acc || null,
    unrealized_losses_acc: body.unrealized_losses_acc || null,
    realized_losses_acc: body.realized_losses_acc || null,
    amount_rounding_precision: numberValue(body.amount_rounding_precision, 0.01),
    amount_decimal_places: body.amount_decimal_places || "2:2",
    invoice_rounding_precision: numberValue(body.invoice_rounding_precision, 0.01),
    invoice_rounding_type: assertRoundingType(body.invoice_rounding_type, "Invoice Rounding Type"),
    unit_amount_rounding_precision: numberValue(body.unit_amount_rounding_precision, 0.001),
    unit_amount_decimal_places: body.unit_amount_decimal_places || "2:5",
    appln_rounding_precision: numberValue(body.appln_rounding_precision, 0),
    conv_lcy_rndg_debit_acc: body.conv_lcy_rndg_debit_acc || null,
    conv_lcy_rndg_credit_acc: body.conv_lcy_rndg_credit_acc || null,
    max_vat_difference_allowed: numberValue(body.max_vat_difference_allowed, 0),
    vat_rounding_type: assertRoundingType(body.vat_rounding_type, "VAT Rounding Type"),
    payment_tolerance_pct: numberValue(body.payment_tolerance_pct, 0),
    max_payment_tolerance_amount: numberValue(body.max_payment_tolerance_amount, 0),
    last_date_modified: dateValue(body.last_date_modified),
    last_date_adjusted: dateValue(body.last_date_adjusted),
    realized_gl_gains_account: body.realized_gl_gains_account || null,
    realized_gl_losses_account: body.realized_gl_losses_account || null,
    residual_gains_account: body.residual_gains_account || null,
    residual_losses_account: body.residual_losses_account || null,
    is_active: body.is_active !== false,
  };
}

async function ensureCurrencyExists(code) {
  const result = await db.query(
    `SELECT code FROM currencies WHERE code = $1 AND COALESCE(is_active, true) = true`,
    [code]
  );

  return result.rows.length > 0;
}

router.use(async (_req, _res, next) => {
  try {
    await ensureSchema();
    await seedCommonCurrencies();
    next();
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res) => {
  try {
    const activeOnly = req.query.active === "true" || req.query.active === "1";
    const result = await db.query(
      `SELECT *
       FROM currencies
       WHERE ($1::boolean = false OR COALESCE(is_active, true) = true)
       ORDER BY code`,
      [activeOnly]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch currencies" });
  }
});

router.get("/:code/exchange-rates", async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);
    const result = await db.query(
      `SELECT *
       FROM currency_exchange_rates
       WHERE currency_code = $1
       ORDER BY starting_date DESC, id DESC`,
      [code]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch currency exchange rates" });
  }
});

router.post("/:code/exchange-rates", async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);
    if (!(await ensureCurrencyExists(code))) {
      return res.status(404).json({ error: "Currency not found" });
    }

    const startingDate = dateValue(req.body.starting_date);
    const exchangeRateAmount = numberValue(req.body.exchange_rate_amount, 0);
    if (!startingDate) return res.status(400).json({ error: "Starting Date is required." });
    if (exchangeRateAmount <= 0) {
      return res.status(400).json({ error: "Exchange Rate Amount must be greater than 0." });
    }

    const result = await db.query(
      `INSERT INTO currency_exchange_rates (
         currency_code,
         starting_date,
         exchange_rate_amount,
         adjustment_exch_rate_amount,
         relational_currency_code,
         relational_exch_rate_amount,
         fixing_exch_rate_amount
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        code,
        startingDate,
        exchangeRateAmount,
        numberValue(req.body.adjustment_exch_rate_amount, exchangeRateAmount),
        normalizeCode(req.body.relational_currency_code) || null,
        numberValue(req.body.relational_exch_rate_amount, 1),
        req.body.fixing_exch_rate_amount || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create currency exchange rate" });
  }
});

router.put("/exchange-rates/:id", async (req, res) => {
  try {
    const startingDate = dateValue(req.body.starting_date);
    const exchangeRateAmount = numberValue(req.body.exchange_rate_amount, 0);
    if (!startingDate) return res.status(400).json({ error: "Starting Date is required." });
    if (exchangeRateAmount <= 0) {
      return res.status(400).json({ error: "Exchange Rate Amount must be greater than 0." });
    }

    const result = await db.query(
      `UPDATE currency_exchange_rates
       SET starting_date = $1,
           exchange_rate_amount = $2,
           adjustment_exch_rate_amount = $3,
           relational_currency_code = $4,
           relational_exch_rate_amount = $5,
           fixing_exch_rate_amount = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        startingDate,
        exchangeRateAmount,
        numberValue(req.body.adjustment_exch_rate_amount, exchangeRateAmount),
        normalizeCode(req.body.relational_currency_code) || null,
        numberValue(req.body.relational_exch_rate_amount, 1),
        req.body.fixing_exch_rate_amount || null,
        req.params.id,
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Exchange rate not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update currency exchange rate" });
  }
});

router.delete("/exchange-rates/:id", async (req, res) => {
  try {
    await db.query(`DELETE FROM currency_exchange_rates WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete currency exchange rate" });
  }
});

router.get("/:code", async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);
    const result = await db.query(`SELECT * FROM currencies WHERE code = $1`, [code]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Currency not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch currency" });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = buildPayload(req.body);
    const result = await db.query(
      `INSERT INTO currencies (
         code, description, iso_code, iso_numeric_code, symbol, currency_symbol_position,
         emu_currency, currency_factor, unrealized_gains_acc, realized_gains_acc,
         unrealized_losses_acc, realized_losses_acc, amount_rounding_precision,
         amount_decimal_places, invoice_rounding_precision, invoice_rounding_type,
         unit_amount_rounding_precision, unit_amount_decimal_places, appln_rounding_precision,
         conv_lcy_rndg_debit_acc, conv_lcy_rndg_credit_acc, max_vat_difference_allowed,
         vat_rounding_type, payment_tolerance_pct, max_payment_tolerance_amount,
         last_date_modified, last_date_adjusted, realized_gl_gains_account,
         realized_gl_losses_account, residual_gains_account, residual_losses_account,
         is_active
       )
       VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
         $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32
       )
       RETURNING *`,
      Object.values(payload)
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Failed to create currency",
    });
  }
});

router.put("/:code", async (req, res) => {
  try {
    const payload = buildPayload(req.body, req.params.code);
    const values = Object.values(payload).slice(1);
    const result = await db.query(
      `UPDATE currencies
       SET description = $1,
           iso_code = $2,
           iso_numeric_code = $3,
           symbol = $4,
           currency_symbol_position = $5,
           emu_currency = $6,
           currency_factor = $7,
           unrealized_gains_acc = $8,
           realized_gains_acc = $9,
           unrealized_losses_acc = $10,
           realized_losses_acc = $11,
           amount_rounding_precision = $12,
           amount_decimal_places = $13,
           invoice_rounding_precision = $14,
           invoice_rounding_type = $15,
           unit_amount_rounding_precision = $16,
           unit_amount_decimal_places = $17,
           appln_rounding_precision = $18,
           conv_lcy_rndg_debit_acc = $19,
           conv_lcy_rndg_credit_acc = $20,
           max_vat_difference_allowed = $21,
           vat_rounding_type = $22,
           payment_tolerance_pct = $23,
           max_payment_tolerance_amount = $24,
           last_date_modified = $25,
           last_date_adjusted = $26,
           realized_gl_gains_account = $27,
           realized_gl_losses_account = $28,
           residual_gains_account = $29,
           residual_losses_account = $30,
           is_active = $31,
           updated_at = NOW()
       WHERE code = $32
       RETURNING *`,
      [...values, payload.code]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Currency not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Failed to update currency",
    });
  }
});

router.delete("/:code", async (req, res) => {
  try {
    const code = normalizeCode(req.params.code);
    await db.query(
      `UPDATE currencies
       SET is_active = false,
           updated_at = NOW()
       WHERE code = $1`,
      [code]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to deactivate currency" });
  }
});

module.exports = router;
