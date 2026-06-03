const express =
  require("express");

const router =
  express.Router();

const db =
  require("../db.cjs");

let postedTdsColumnsReady =
  false;

async function ensurePostedTdsColumns() {
  if (postedTdsColumnsReady) {
    return;
  }

  await db.query(`
    ALTER TABLE posted_purchase_invoices
    ADD COLUMN IF NOT EXISTS tds_threshold_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tds_base_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tds_base_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tds_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tds_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tds_less_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS net_payable_amount NUMERIC(18,2) DEFAULT 0
  `);

  await db.query(`
    ALTER TABLE posted_purchase_invoice_lines
    ADD COLUMN IF NOT EXISTS tds_threshold_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tds_base_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tds_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_after_tds NUMERIC(18,2) DEFAULT 0
  `);

  postedTdsColumnsReady =
    true;
}

/**
 * GET ALL POSTED PURCHASE INVOICES
 */
router.get("/", async (req, res) => {
  try {
    await ensurePostedTdsColumns();

    const result =
      await db.query(`
        SELECT
          *,
          COALESCE(
            total_tax_amount,
            total_gst_amount,
            total_vat,
            0
          ) AS tax_amount,
          COALESCE(tds_amount, 0) AS list_tds_amount,
          COALESCE(
            net_payable_amount,
            tds_less_amount,
            COALESCE(amount_including_tax, 0) - COALESCE(tds_amount, 0),
            total_amount,
            0
          ) AS net_payable
        FROM posted_purchase_invoices
        WHERE COALESCE(is_deleted, false) = false
        ORDER BY posting_date DESC,
                 created_at DESC
      `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        "Failed to fetch posted purchase invoices",
    });
  }
});

/**
 * GET SINGLE POSTED PURCHASE INVOICE
 */
router.get("/:id", async (req, res) => {
  try {
    await ensurePostedTdsColumns();

    const { id } =
      req.params;

    const headerResult =
      await db.query(
        `
        SELECT
          ppi.*,
          COALESCE(NULLIF(ppi.tds_threshold_amount, 0), spi.tds_threshold_amount, 0) AS tds_threshold_amount,
          COALESCE(NULLIF(ppi.tds_base_amount, 0), spi.tds_base_amount, ppi.total_tds_base_amount, 0) AS tds_base_amount,
          COALESCE(NULLIF(ppi.tds_amount, 0), spi.tds_amount, ppi.total_tds_amount, 0) AS tds_amount,
          COALESCE(NULLIF(ppi.tds_less_amount, 0), spi.tds_less_amount, ppi.net_payable_amount, 0) AS tds_less_amount,
          COALESCE(NULLIF(ppi.net_payable_amount, 0), spi.net_payable_amount, ppi.tds_less_amount, 0) AS net_payable_amount,
          ppr.document_no AS source_posted_purchase_receipt_no,
          po.document_no AS source_purchase_order_no,
          ige.document_no AS source_inward_gate_entry_no
        FROM posted_purchase_invoices ppi
        LEFT JOIN purchase_invoices spi
          ON spi.id = ppi.source_purchase_invoice_id
        LEFT JOIN posted_purchase_receipts ppr
          ON ppr.id = ppi.source_posted_purchase_receipt_id
        LEFT JOIN purchase_orders po
          ON po.id = ppi.source_purchase_order_id
        LEFT JOIN inward_gate_entries ige
          ON ige.id = ppi.source_inward_gate_entry_id
        WHERE ppi.id = $1
          AND COALESCE(ppi.is_deleted, false) = false
        `,
        [id]
      );

    if (headerResult.rows.length === 0) {
      return res.status(404).json({
        error:
          "Posted Purchase Invoice not found",
      });
    }

    const linesResult =
      await db.query(
        `
        SELECT
          ppil.*,
          COALESCE(NULLIF(ppil.tds_threshold_amount, 0), pil.tds_threshold_amount, 0) AS tds_threshold_amount,
          COALESCE(NULLIF(ppil.tds_base_amount, 0), pil.tds_base_amount, 0) AS tds_base_amount,
          COALESCE(NULLIF(ppil.tds_amount, 0), pil.tds_amount, 0) AS tds_amount,
          COALESCE(NULLIF(ppil.amount_after_tds, 0), pil.amount_after_tds, 0) AS amount_after_tds,
          ppr.document_no AS source_receipt_no,
          pprl.line_no AS source_receipt_line_no,
          pi.document_no AS source_invoice_no
        FROM posted_purchase_invoice_lines ppil
        LEFT JOIN posted_purchase_receipt_lines pprl
          ON pprl.id = ppil.source_posted_purchase_receipt_line_id
        LEFT JOIN posted_purchase_receipts ppr
          ON ppr.id = pprl.posted_purchase_receipt_id
        LEFT JOIN purchase_invoice_lines pil
          ON pil.id = ppil.source_purchase_invoice_line_id
        LEFT JOIN purchase_invoices pi
          ON pi.id = pil.purchase_invoice_id
        WHERE ppil.posted_purchase_invoice_id = $1
          AND COALESCE(ppil.is_deleted, false) = false
        ORDER BY ppil.line_no
        `,
        [id]
      );

    res.json({
      header:
        headerResult.rows[0],
      lines:
        linesResult.rows,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        "Failed to fetch posted purchase invoice",
    });
  }
});

module.exports =
  router;
