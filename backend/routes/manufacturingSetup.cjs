const express = require("express");
const router = express.Router();

const db = require("../db.cjs");
const {
  ensureManufacturingSchema,
  getManufacturingSetup,
} = require("../services/manufacturingService.cjs");

async function validateSeries(code, label) {
  if (!code) return;

  const result = await db.query(
    `SELECT 1 FROM number_series WHERE code = $1 LIMIT 1`,
    [code]
  );

  if (result.rows.length === 0) {
    const error = new Error(`${label} must reference an existing No. Series`);
    error.statusCode = 400;
    throw error;
  }
}

router.get("/", async (req, res) => {
  try {
    const setup = await getManufacturingSetup();
    res.json(setup);
  } catch (err) {
    console.error("GET MANUFACTURING SETUP ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load manufacturing setup" });
  }
});

router.put("/", async (req, res) => {
  try {
    await ensureManufacturingSchema();

    const payload = req.body ?? {};

    await validateSeries(payload.released_prod_order_nos, "Released Production Order Nos.");
    await validateSeries(payload.production_bom_nos, "Production BOM Nos.");
    await validateSeries(payload.production_bom_version_nos, "Production BOM Version Nos.");
    await validateSeries(payload.item_journal_nos, "Item Journal Nos.");
    await validateSeries(payload.assembly_order_nos, "Assembly Order Nos.");
    await validateSeries(payload.posted_assembly_order_nos, "Posted Assembly Order Nos.");
    await validateSeries(payload.consumption_journal_nos, "Consumption Journal Nos.");
    await validateSeries(payload.output_journal_nos, "Output Journal Nos.");

    const current = await getManufacturingSetup();

    const result = await db.query(
      `
      UPDATE manufacturing_setup
      SET
        released_prod_order_nos = $1,
        production_bom_nos = $2,
        production_bom_version_nos = $3,
        item_journal_nos = $4,
        assembly_order_nos = $5,
        posted_assembly_order_nos = $6,
        consumption_journal_nos = $7,
        output_journal_nos = $8,
        normal_starting_time = $9,
        normal_ending_time = $10,
        default_safety_lead_time = $11,
        updated_at = NOW()
      WHERE id = $12
      RETURNING *
      `,
      [
        payload.released_prod_order_nos || null,
        payload.production_bom_nos || null,
        payload.production_bom_version_nos || null,
        payload.item_journal_nos || null,
        payload.assembly_order_nos || null,
        payload.posted_assembly_order_nos || null,
        payload.consumption_journal_nos || null,
        payload.output_journal_nos || null,
        payload.normal_starting_time || "08:00",
        payload.normal_ending_time || "17:00",
        payload.default_safety_lead_time || null,
        current.id,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE MANUFACTURING SETUP ERROR:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Failed to save manufacturing setup" });
  }
});

module.exports = router;
