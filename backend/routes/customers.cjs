const express = require("express");
const router = express.Router();

const db = require("../db.cjs");
const {
  assignMasterNumber,
} = require("../services/masterNumberService.cjs");
const {
  assertStateExists,
} = require("../services/statesService.cjs");

const COLUMNS = [
  "customer_no",
  "name",
  "search_name",
  "address",
  "address_2",
  "city",
  "state_code",
  "country_region_code",
  "post_code",
  "phone_no",
  "mobile_phone_no",
  "email",
  "contact_person",
  "gst_customer_type",
  "gst_registration_no",
  "pan_no",
  "aadhaar_no",
  "location_code",
  "responsibility_center",
  "payment_terms_code",
  "payment_method_code",
  "shipment_method_code",
  "credit_limit",
  "blocked",
  "opening_balance",
  "closing_balance",
  "balance_lcy",
  "overdue_balance_lcy",
  "sales_lcy",
  "payments_lcy",
];

const NUMERIC = new Set([
  "credit_limit",
  "opening_balance",
  "closing_balance",
  "balance_lcy",
  "overdue_balance_lcy",
  "sales_lcy",
  "payments_lcy",
]);

const BOOLEAN = new Set(["blocked"]);

function cleanValue(key, value) {
  if (value === "") return null;
  if (NUMERIC.has(key)) return Number(value ?? 0);
  if (BOOLEAN.has(key)) return Boolean(value);
  return value ?? null;
}

router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM customers
       WHERE COALESCE(is_deleted, false) = false
       ORDER BY id DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM customers WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const customerNo = await assignMasterNumber(db, {
      masterKey: "customer",
      selectedSeriesCode: body.no_series_code,
      selectedSeriesLineId: body.no_series_line_id,
      currentNo: body.customer_no,
    });

    const payload = {
      ...body,
      customer_no: customerNo,
    };
    payload.state_code = await assertStateExists(db, payload.state_code, "State Code");

    const fields = COLUMNS;
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    const values = fields.map((field) => cleanValue(field, payload[field]));

    const result = await db.query(
      `INSERT INTO customers (${fields.join(", ")})
       VALUES (${placeholders.join(", ")})
       RETURNING *`,
      values
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Failed to create customer",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    req.body.state_code = await assertStateExists(db, req.body.state_code, "State Code");
    const fields = COLUMNS.filter((field) => field !== "customer_no");
    const assignments = fields.map((field, i) => `${field} = $${i + 1}`);
    const values = fields.map((field) => cleanValue(field, req.body[field]));

    const result = await db.query(
      `UPDATE customers
       SET ${assignments.join(", ")},
           updated_at = NOW()
       WHERE id = $${fields.length + 1}
       RETURNING *`,
      [...values, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ error: err.message || "Failed to update customer" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.query(
      `UPDATE customers
       SET is_deleted = true,
           updated_at = NOW()
       WHERE id = $1`,
      [req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

module.exports = router;
