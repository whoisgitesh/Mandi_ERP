const express = require("express");
const router = express.Router();
const pool = require("../../db.cjs");
const {
  validateNoSeriesCodes,
} = require("../../services/setupNoSeriesValidation.cjs");

async function ensureSchema() {
  await pool.query(`
    ALTER TABLE sales_receivables_setup
      ADD COLUMN IF NOT EXISTS salesperson_purchaser_nos VARCHAR(50)
  `);
}

// ============================================================
// GET SALES & RECEIVABLES SETUP
// ============================================================

router.get("/", async (req, res) => {
  try {
    await ensureSchema();
    const result = await pool.query(`SELECT * FROM sales_receivables_setup LIMIT 1`);
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error("GET SALES SETUP ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ============================================================
// UPDATE (or INSERT) SALES & RECEIVABLES SETUP
// ============================================================

router.put("/", async (req, res) => {
  try {
    await ensureSchema();
    const d = req.body;

    const COLS = [
      // No. Series
      "customer_nos",
      "salesperson_purchaser_nos",
      "quote_nos",
      "blanket_order_nos",
      "order_nos",
      "return_order_nos",
      "invoice_nos",
      "posted_invoice_nos",
      "credit_memo_nos",
      "posted_credit_memo_nos",
      "shipment_nos",
      "posted_shipment_nos",
      "posted_return_receipt_nos",
      // General
      "default_location_code",
      "shipment_on_invoice",
      "invoice_rounding",
      "copy_comments_order_to_invoice",
      "copy_comments_order_to_shipment",
      "return_receipt_on_credit_memo",
      "copy_customer_name_to_entries",
      "ext_doc_no_mandatory",
      "calc_inv_discount",
      "allow_vat_difference",
      "exact_cost_reversing_mandatory",
      "check_prepmt_when_posting",
      "posting_date_check_on_posting",
      "allow_multiple_posting_groups",
      "ignore_updated_addresses",
      "skip_manual_reservation",
      "copy_line_descr_to_gl_entry",
      "default_item_quantity",
      "create_item_from_description",
      "discount_posting",
      "default_posting_date",
      "default_quantity_to_ship",
      "prepayment_auto_update_frequency",
      "check_multiple_posting_groups",
      "appl_between_currencies",
      "logo_position_on_documents",
      "quote_validity_calculation",
      // Defaults
      "default_payment_terms_code",
      "default_payment_method_code",
      "default_ship_to_code",
      // Warnings
      "credit_warnings",
      "stockout_warning",
    ];

    const NO_SERIES_COLS = [
      "customer_nos",
      "salesperson_purchaser_nos",
      "quote_nos",
      "blanket_order_nos",
      "order_nos",
      "return_order_nos",
      "invoice_nos",
      "posted_invoice_nos",
      "credit_memo_nos",
      "posted_credit_memo_nos",
      "shipment_nos",
      "posted_shipment_nos",
      "posted_return_receipt_nos",
    ];

    const existing = await pool.query(
      `SELECT *
       FROM sales_receivables_setup
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

    await validateNoSeriesCodes(pool, payloadForValidation, NO_SERIES_COLS);

    if (existing.rows.length === 0) {
      const placeholders = COLS.map((_, i) => `$${i + 1}`).join(", ");
      const result = await pool.query(
        `INSERT INTO sales_receivables_setup (${COLS.join(", ")}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      return res.json({ success: true, data: result.rows[0] });
    }

    const id = existing.rows[0].id;
    const sets = COLS.map((c, i) => `${c} = $${i + 1}`).join(", ");
    const result = await pool.query(
      `UPDATE sales_receivables_setup SET ${sets}, updated_at = now() WHERE id = $${COLS.length + 1} RETURNING *`,
      [...values, id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("UPDATE SALES SETUP ERROR:", err);
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});


module.exports = router;
