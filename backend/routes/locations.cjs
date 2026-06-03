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
  "code",
  "name",
  "address",
  "city",
  "state",
  "country",
  "post_code",
  "phone_no",
  "blocked",
];

const BOOLEAN = new Set(["blocked"]);

function cleanValue(key, value) {
  if (value === "") return null;
  if (BOOLEAN.has(key)) return Boolean(value);
  return value ?? null;
}

router.get("/", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT *
       FROM locations
       WHERE COALESCE(is_deleted, false) = false
       ORDER BY code`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch locations",
      error: "Failed to fetch locations",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const code = await assignMasterNumber(db, {
      masterKey: "location",
      selectedSeriesCode: body.no_series_code,
      selectedSeriesLineId: body.no_series_line_id,
      currentNo: body.code,
    });

    const payload = {
      ...body,
      code,
      state: await assertStateExists(db, body.state || body.state_code, "State Code"),
    };

    const fields = COLUMNS;
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    const values = fields.map((field) => cleanValue(field, payload[field]));

    const result = await db.query(
      `INSERT INTO locations (${fields.join(", ")})
       VALUES (${placeholders.join(", ")})
       RETURNING *`,
      values
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to create location",
      error: err.message || "Failed to create location",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const payload = {
      ...req.body,
      state: await assertStateExists(db, req.body.state || req.body.state_code, "State Code"),
    };
    const fields = COLUMNS.filter((field) => field !== "code");
    const assignments = fields.map((field, i) => `${field} = $${i + 1}`);
    const values = fields.map((field) => cleanValue(field, payload[field]));

    const result = await db.query(
      `UPDATE locations
       SET ${assignments.join(", ")},
           updated_at = NOW()
       WHERE id = $${fields.length + 1}
       RETURNING *`,
      [...values, req.params.id]
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to update location",
      error: "Failed to update location",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.query(
      `UPDATE locations
       SET is_deleted = true,
           updated_at = NOW()
       WHERE id = $1`,
      [req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to delete location",
      error: "Failed to delete location",
    });
  }
});

module.exports = router;
