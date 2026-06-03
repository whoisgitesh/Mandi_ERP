const express = require("express");

const db = require("../db.cjs");

const router = express.Router();

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS inward_gate_entry_quality (
      id SERIAL PRIMARY KEY,
      inward_gate_entry_id INTEGER,
      inward_gate_entry_line_id INTEGER NOT NULL,
      item_no VARCHAR(50),
      spec_id INTEGER,
      section_code VARCHAR(50),
      quality_specific VARCHAR(100),
      unit_of_measure_code VARCHAR(50),
      quality_type VARCHAR(30),
      quality_from NUMERIC(18,4) DEFAULT 0,
      quality_to NUMERIC(18,4) DEFAULT 0,
      standard_value VARCHAR(100),
      actual_value NUMERIC(18,4),
      result VARCHAR(30),
      remarks TEXT,
      quality_stage VARCHAR(20) NOT NULL,
      is_deleted BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    ALTER TABLE inward_gate_entry_quality
    ADD COLUMN IF NOT EXISTS inward_gate_entry_id INTEGER,
    ADD COLUMN IF NOT EXISTS inward_gate_entry_line_id INTEGER,
    ADD COLUMN IF NOT EXISTS item_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS spec_id INTEGER,
    ADD COLUMN IF NOT EXISTS section_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS quality_specific VARCHAR(100),
    ADD COLUMN IF NOT EXISTS unit_of_measure_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS quality_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS quality_from NUMERIC(18,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS quality_to NUMERIC(18,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS standard_value VARCHAR(100),
    ADD COLUMN IF NOT EXISTS actual_value NUMERIC(18,4),
    ADD COLUMN IF NOT EXISTS result VARCHAR(30),
    ADD COLUMN IF NOT EXISTS remarks TEXT,
    ADD COLUMN IF NOT EXISTS quality_stage VARCHAR(20),
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await db.query(`
    ALTER TABLE inward_gate_entry_quality
    DROP CONSTRAINT IF EXISTS inward_gate_entry_quality_spec_id_fkey
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_ige_quality_line_stage
    ON inward_gate_entry_quality(inward_gate_entry_line_id, quality_stage)
  `);
}

function normalizePayload(payload = {}) {
  return {
    inward_gate_entry_id: payload.inward_gate_entry_id || null,
    inward_gate_entry_line_id: payload.inward_gate_entry_line_id,
    item_no: payload.item_no || null,
    spec_id: payload.spec_id || null,
    section_code: payload.section_code || null,
    quality_specific: payload.quality_specific || null,
    unit_of_measure_code: payload.unit_of_measure_code || null,
    quality_type: payload.quality_type || "Range",
    quality_from: Number(payload.quality_from ?? 0),
    quality_to: Number(payload.quality_to ?? 0),
    standard_value: payload.standard_value ?? null,
    actual_value:
      payload.actual_value === "" ||
      payload.actual_value === null ||
      payload.actual_value === undefined
        ? null
        : Number(payload.actual_value),
    result: payload.result || null,
    remarks: payload.remarks || null,
    quality_stage: payload.quality_stage || "Pre",
  };
}

router.get("/", async (req, res) => {
  try {
    await ensureTable();

    const lineId = req.query.inward_gate_entry_line_id;
    const stage = req.query.quality_stage || "Pre";

    if (!lineId) {
      return res.status(400).json({
        success: false,
        error: "inward_gate_entry_line_id is required",
      });
    }

    const result = await db.query(
      `
      SELECT *
      FROM inward_gate_entry_quality
      WHERE inward_gate_entry_line_id = $1
        AND quality_stage = $2
        AND COALESCE(is_deleted, false) = false
      ORDER BY id
      `,
      [lineId, stage]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("GET IGE QUALITY ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    await ensureTable();

    const payload = normalizePayload(req.body);

    if (!payload.inward_gate_entry_line_id) {
      return res.status(400).json({
        success: false,
        error: "inward_gate_entry_line_id is required",
      });
    }

    const result = await db.query(
      `
      INSERT INTO inward_gate_entry_quality (
        inward_gate_entry_id,
        inward_gate_entry_line_id,
        item_no,
        spec_id,
        section_code,
        quality_specific,
        unit_of_measure_code,
        quality_type,
        quality_from,
        quality_to,
        standard_value,
        actual_value,
        result,
        remarks,
        quality_stage
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15
      )
      RETURNING *
      `,
      [
        payload.inward_gate_entry_id,
        payload.inward_gate_entry_line_id,
        payload.item_no,
        payload.spec_id,
        payload.section_code,
        payload.quality_specific,
        payload.unit_of_measure_code,
        payload.quality_type,
        payload.quality_from,
        payload.quality_to,
        payload.standard_value,
        payload.actual_value,
        payload.result,
        payload.remarks,
        payload.quality_stage,
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("POST IGE QUALITY ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    await ensureTable();

    const payload = normalizePayload(req.body);

    const result = await db.query(
      `
      UPDATE inward_gate_entry_quality
      SET
        inward_gate_entry_id = $1,
        inward_gate_entry_line_id = $2,
        item_no = $3,
        spec_id = $4,
        section_code = $5,
        quality_specific = $6,
        unit_of_measure_code = $7,
        quality_type = $8,
        quality_from = $9,
        quality_to = $10,
        standard_value = $11,
        actual_value = $12,
        result = $13,
        remarks = $14,
        quality_stage = $15,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
      RETURNING *
      `,
      [
        payload.inward_gate_entry_id,
        payload.inward_gate_entry_line_id,
        payload.item_no,
        payload.spec_id,
        payload.section_code,
        payload.quality_specific,
        payload.unit_of_measure_code,
        payload.quality_type,
        payload.quality_from,
        payload.quality_to,
        payload.standard_value,
        payload.actual_value,
        payload.result,
        payload.remarks,
        payload.quality_stage,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Quality reading not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("PUT IGE QUALITY ERROR:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
