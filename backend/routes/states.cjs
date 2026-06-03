const express = require("express");
const router = express.Router();

const db = require("../db.cjs");
const {
  cleanCode,
  ensureStatesSchema,
} = require("../services/statesService.cjs");

function cleanPayload(payload = {}) {
  const code = cleanCode(payload.code);
  if (!code) throw Object.assign(new Error("Code is required"), { statusCode: 400 });
  if (!String(payload.description || "").trim()) {
    throw Object.assign(new Error("Description is required"), { statusCode: 400 });
  }

  return {
    code,
    description: String(payload.description).trim(),
    etds_tcs_state_code: String(payload.etds_tcs_state_code || "").trim() || null,
    gst_state_code: String(payload.gst_state_code || "").trim() || null,
    is_active: payload.is_active !== false,
  };
}

router.get("/", async (req, res) => {
  try {
    await ensureStatesSchema();
    const activeOnly = req.query.active === "true";
    const result = await db.query(
      `
      SELECT *
      FROM states
      WHERE ($1::boolean = false OR COALESCE(is_active, true) = true)
      ORDER BY code
      `,
      [activeOnly]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET STATES ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load states" });
  }
});

router.get("/:code", async (req, res) => {
  try {
    await ensureStatesSchema();
    const result = await db.query(`SELECT * FROM states WHERE code = $1 LIMIT 1`, [
      cleanCode(req.params.code),
    ]);
    if (!result.rows[0]) return res.status(404).json({ error: "State not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET STATE ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load state" });
  }
});

router.post("/", async (req, res) => {
  try {
    await ensureStatesSchema();
    const payload = cleanPayload(req.body);
    const result = await db.query(
      `
      INSERT INTO states (
        code,
        description,
        etds_tcs_state_code,
        gst_state_code,
        is_active
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        payload.code,
        payload.description,
        payload.etds_tcs_state_code,
        payload.gst_state_code,
        payload.is_active,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("CREATE STATE ERROR:", err);
    res.status(err.statusCode || 400).json({
      error: err.code === "23505" ? "State Code or GST State Code already exists." : err.message,
    });
  }
});

router.put("/:code", async (req, res) => {
  try {
    await ensureStatesSchema();
    const payload = cleanPayload({ ...req.body, code: req.params.code });
    const result = await db.query(
      `
      UPDATE states
      SET
        description = $1,
        etds_tcs_state_code = $2,
        gst_state_code = $3,
        is_active = $4,
        updated_at = NOW()
      WHERE code = $5
      RETURNING *
      `,
      [
        payload.description,
        payload.etds_tcs_state_code,
        payload.gst_state_code,
        payload.is_active,
        payload.code,
      ]
    );

    if (!result.rows[0]) return res.status(404).json({ error: "State not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE STATE ERROR:", err);
    res.status(err.statusCode || 400).json({
      error: err.code === "23505" ? "GST State Code already exists." : err.message,
    });
  }
});

router.delete("/:code", async (req, res) => {
  try {
    await ensureStatesSchema();
    const result = await db.query(
      `
      UPDATE states
      SET is_active = false,
          updated_at = NOW()
      WHERE code = $1
      RETURNING *
      `,
      [cleanCode(req.params.code)]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "State not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("DELETE STATE ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to deactivate state" });
  }
});

module.exports = router;
