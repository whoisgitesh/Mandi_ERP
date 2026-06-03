const express = require("express");
const router = express.Router();
const pool = require("../../db.cjs");
const {
  validateNoSeriesCodes,
} = require("../../services/setupNoSeriesValidation.cjs");

// ============================================================
// GET PURCHASE & PAYABLES SETUP
// ============================================================

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM purchase_payables_setup LIMIT 1`);
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error("GET PURCHASE SETUP ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ============================================================
// UPDATE (or INSERT) PURCHASE & PAYABLES SETUP
// ============================================================

router.put("/", async (req, res) => {
  try {
    const d = req.body;

    const COLS = [
      // No. Series — standard
      "vendor_nos",
      "quote_nos",
      "blanket_order_nos",
      "order_nos",
      "return_order_nos",
      "invoice_nos",
      "posted_invoice_nos",
      "credit_memo_nos",
      "posted_credit_memo_nos",
      "purchase_receipt_nos",
      "posted_receipt_nos",
      "posted_return_shipment_nos",
      // No. Series — domain-specific
      "mandi_purchase_nos",
      "mandi_vendor_nos",
      "inward_gate_entry_nos",
      "goods_receipt_note_nos",
      // General
      "default_location_code",
      "receipt_on_invoice",
      "return_shipment_on_credit_memo",
      "invoice_rounding",
      "copy_comments_order_to_receipt",
      "copy_comments_order_to_invoice",
      "copy_comments_blanket_to_order",
      "copy_vendor_name_to_entries",
      "copy_line_descr_to_gl_entry",
      "ext_doc_no_mandatory",
      "allow_vat_difference",
      "calc_inv_discount",
      "default_gl_account_quantity",
      "discount_posting",
      "appln_between_currencies",
      // Posting & validation
      "default_posting_date",
      "default_qty_to_receive",
      "prepmt_auto_update_frequency",
      "posting_date_check_on_posting",
      "allow_multiple_posting_groups",
      "check_multiple_posting_groups",
      "ignore_updated_addresses",
      // Defaults
      "default_payment_terms_code",
      "default_payment_method_code",
      // Order settings
      "allow_purchase_order_archiving",
    ];

    const NO_SERIES_COLS = [
      "vendor_nos",
      "quote_nos",
      "blanket_order_nos",
      "order_nos",
      "return_order_nos",
      "invoice_nos",
      "posted_invoice_nos",
      "credit_memo_nos",
      "posted_credit_memo_nos",
      "purchase_receipt_nos",
      "posted_receipt_nos",
      "posted_return_shipment_nos",
      "mandi_purchase_nos",
      "mandi_vendor_nos",
      "inward_gate_entry_nos",
      "goods_receipt_note_nos",
    ];

    const existing = await pool.query(
      `SELECT *
       FROM purchase_payables_setup
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
        `INSERT INTO purchase_payables_setup (${COLS.join(", ")}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      return res.json({ success: true, data: result.rows[0] });
    }

    const id = existing.rows[0].id;
    const sets = COLS.map((c, i) => `${c} = $${i + 1}`).join(", ");
    const result = await pool.query(
      `UPDATE purchase_payables_setup SET ${sets}, updated_at = now() WHERE id = $${COLS.length + 1} RETURNING *`,
      [...values, id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("UPDATE PURCHASE SETUP ERROR:", err);
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});


module.exports = router;
