const express = require("express");
const router = express.Router();
const pool = require("../../db.cjs");
const {
  validateNoSeriesCodes,
} = require("../../services/setupNoSeriesValidation.cjs");
const {
  ensureInventorySetupNoSeriesColumns,
} = require("../../services/manufacturingService.cjs");

const MANUFACTURING_ASSEMBLY_NO_SERIES_COLS = [
  "production_bom_nos",
  "production_bom_version_nos",
  "released_prod_order_nos",
  "consumption_journal_nos",
  "output_journal_nos",
  "assembly_order_nos",
  "posted_assembly_order_nos",
  "item_journal_nos",
  "reversal_entry_nos",
];

// ============================================================
// GET INVENTORY SETUP
// ============================================================

router.get("/", async (req, res) => {
  try {
    await ensureInventorySetupNoSeriesColumns(pool);
    const result = await pool.query(`SELECT * FROM inventory_setup LIMIT 1`);
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error("GET INVENTORY SETUP ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ============================================================
// UPDATE INVENTORY SETUP
// ============================================================

router.put("/", async (req, res) => {
  try {
    const d = req.body;

    const COLS = [
      // No. Series
      "item_nos",
      "location_nos",
      "uom_nos",
      "lot_nos",
      "serial_nos",
      ...MANUFACTURING_ASSEMBLY_NO_SERIES_COLS,
      // General
      "location_mandatory",
      "prevent_negative_inventory",
      "variant_mandatory_if_exists",
      "automatic_cost_posting",
      "automatic_cost_adjustment",
      "cost_adjustment_logging",
      "default_costing_method",
      "average_cost_period",
      "average_cost_calc_type",
      "skip_prompt_to_create_item",
      "copy_item_descr_to_entries",
      "allow_inventory_adjustment",
      // Planning
      "current_demand_forecast",
      "use_forecast_on_locations",
      "use_forecast_on_variants",
      "default_safety_lead_time",
      "blank_overflow_level",
      "combined_mps_mrp_calculation",
      "default_dampener_period",
      "default_dampener_percent",
    ];

    const NO_SERIES_COLS = [
      "item_nos",
      "location_nos",
      "uom_nos",
      "lot_nos",
      "serial_nos",
      ...MANUFACTURING_ASSEMBLY_NO_SERIES_COLS,
    ];

    await ensureInventorySetupNoSeriesColumns(pool);

    const existing = await pool.query(
      `SELECT *
       FROM inventory_setup
       LIMIT 1`
    );

    const valueFor = (column) =>
      Object.prototype.hasOwnProperty.call(d, column)
        ? d[column]
        : existing.rows[0]?.[column] ?? null;

    const values = COLS.map(valueFor);
    const payloadForValidation = Object.fromEntries(
      COLS.map((column, index) => [column, values[index]])
    );

    try {
      await validateNoSeriesCodes(pool, payloadForValidation, NO_SERIES_COLS);
    } catch (validationErr) {
      if (String(validationErr.message || "").startsWith("Invalid No. Series")) {
        validationErr.message = "Selected No. Series must reference an existing No. Series.";
      }
      throw validationErr;
    }

    if (existing.rows.length === 0) {
      const placeholders = COLS.map((_, i) => `$${i + 1}`).join(", ");
      const result = await pool.query(
        `INSERT INTO inventory_setup (${COLS.join(", ")}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      return res.json({ success: true, data: result.rows[0] });
    }

    const id = existing.rows[0].id;
    const sets = COLS.map((c, i) => `${c} = $${i + 1}`).join(", ");
    const result = await pool.query(
      `UPDATE inventory_setup SET ${sets}, updated_at = now() WHERE id = $${COLS.length + 1} RETURNING *`,
      [...values, id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("UPDATE INVENTORY SETUP ERROR:", err);
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});


module.exports = router;
