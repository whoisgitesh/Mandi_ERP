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
  "vendor_no",
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
  "purchaser_code",
  "responsibility_center",
  "location_code",
  "payment_terms_code",
  "payment_method_code",
  "shipment_method_code",
  "gst_registration_no",
  "gst_vendor_type",
  "pan_no",
  "tds_applicable",
  "tds_section_code",
  "tds_assessee_code",
  "lower_deduction_certificate_no",
  "concessional_code",
  "pan_status",
  "pan_reference_no",
  "msme",
  "msme_no",
  "subcontractor",
  "transporter",
  "bank_name",
  "bank_account_no",
  "ifsc_code",
  "balance_lcy",
  "balance_due_lcy",
  "payments_lcy",
  "blocked",
];

const NUMERIC = new Set([
  "balance_lcy",
  "balance_due_lcy",
  "payments_lcy",
]);

const BOOLEAN = new Set([
  "msme",
  "subcontractor",
  "transporter",
  "blocked",
  "tds_applicable",
]);

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

function cleanValue(key, value) {
  if (value === "") return null;
  if (NUMERIC.has(key)) return Number(value ?? 0);
  if (BOOLEAN.has(key)) return Boolean(value);
  return value ?? null;
}

function cleanPanNo(value) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
}

function cleanCode(value) {
  const code = String(value ?? "").trim().toUpperCase();
  return code || null;
}

function validatePanNo(payload) {
  const panNo = cleanPanNo(payload.pan_no);

  payload.pan_no = panNo || null;

  if (!panNo) {
    const err = new Error("PAN No. is required.");
    err.statusCode = 400;
    throw err;
  }

  if (!PAN_REGEX.test(panNo)) {
    const err = new Error("Invalid PAN No. Format. Example: ABCDE1234F");
    err.statusCode = 400;
    throw err;
  }
}

async function validateTdsCodes(payload) {
  const tdsApplicable = Boolean(payload.tds_applicable);
  const sectionCode = cleanCode(payload.tds_section_code);
  const assesseeCode = cleanCode(payload.tds_assessee_code);

  payload.tds_section_code = sectionCode;
  payload.tds_assessee_code = assesseeCode;

  if (!tdsApplicable) return;

  if (!sectionCode) {
    const err = new Error("TDS Section Code is required when TDS is applicable.");
    err.statusCode = 400;
    throw err;
  }

  if (!assesseeCode) {
    const err = new Error("TDS Assessee Code is required when TDS is applicable.");
    err.statusCode = 400;
    throw err;
  }

  const section = await db.query(
    `SELECT code
     FROM tds_section_codes
     WHERE code = $1
       AND COALESCE(is_active, true) = true
     LIMIT 1`,
    [sectionCode]
  );

  if (!section.rows[0]) {
    const err = new Error("TDS Section Code must reference an existing TDS Section Code.");
    err.statusCode = 400;
    throw err;
  }

  const assessee = await db.query(
    `SELECT code
     FROM tds_assessee_codes
     WHERE code = $1
       AND COALESCE(is_active, true) = true
     LIMIT 1`,
    [assesseeCode]
  );

  if (!assessee.rows[0]) {
    const err = new Error("TDS Assessee Code must reference an existing TDS Assessee Code.");
    err.statusCode = 400;
    throw err;
  }
}

router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM vendors
       WHERE COALESCE(is_deleted, false) = false
       ORDER BY id DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const vendorNo = await assignMasterNumber(db, {
      masterKey: "vendor",
      selectedSeriesCode: body.no_series_code,
      selectedSeriesLineId: body.no_series_line_id,
      currentNo: body.vendor_no,
    });

    const payload = {
      ...body,
      vendor_no: vendorNo,
    };
    payload.state_code = await assertStateExists(db, payload.state_code, "State Code");

    validatePanNo(payload);
    await validateTdsCodes(payload);

    const fields = COLUMNS;
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    const values = fields.map((field) => cleanValue(field, payload[field]));

    const result = await db.query(
      `INSERT INTO vendors (${fields.join(", ")})
       VALUES (${placeholders.join(", ")})
       RETURNING *`,
      values
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Failed to create vendor",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    req.body.state_code = await assertStateExists(db, req.body.state_code, "State Code");
    validatePanNo(req.body);
    await validateTdsCodes(req.body);

    const fields = COLUMNS.filter((field) => field !== "vendor_no");
    const assignments = fields.map((field, i) => `${field} = $${i + 1}`);
    const values = fields.map((field) => cleanValue(field, req.body[field]));

    const result = await db.query(
      `UPDATE vendors
       SET ${assignments.join(", ")},
           updated_at = NOW()
       WHERE id = $${fields.length + 1}
       RETURNING *`,
      [...values, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Failed to update vendor",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.query(
      `UPDATE vendors
       SET is_deleted = true,
           updated_at = NOW()
       WHERE id = $1`,
      [req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete vendor" });
  }
});

module.exports = router;
