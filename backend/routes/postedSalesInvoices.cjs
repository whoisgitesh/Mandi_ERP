const express = require("express");

const router = express.Router();

const db = require("../db.cjs");

const ensurePostedSalesInvoiceSnapshotColumns = async () => {
  await db.query(`
    ALTER TABLE sales_invoice_line
    ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS hsn_sac VARCHAR(50),
    ADD COLUMN IF NOT EXISTS gst_place_of_supply VARCHAR(50),
    ADD COLUMN IF NOT EXISTS gst_group_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS gst_group_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS gst_jurisdiction_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS cgst_pct NUMERIC(7,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_pct NUMERIC(7,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS igst_pct NUMERIC(7,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gst_pct NUMERIC(7,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gst_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_including_gst NUMERIC(12,2) DEFAULT 0
  `);

  await db.query(`
    ALTER TABLE posted_sales_invoices
    ADD COLUMN IF NOT EXISTS total_tax_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gst_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_excl_vat NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_vat NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_incl_vat NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS currency_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS payment_terms_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS remarks TEXT,
    ADD COLUMN IF NOT EXISTS source_sales_invoice_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS source_shipment_no VARCHAR(50)
  `);

  await db.query(`
    ALTER TABLE posted_sales_invoice_lines
    ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tax_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gst_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cgst_pct NUMERIC(7,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_pct NUMERIC(7,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS igst_pct NUMERIC(7,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gst_pct NUMERIC(7,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_including_gst NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS gst_group_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS hsn_sac VARCHAR(50),
    ADD COLUMN IF NOT EXISTS gst_place_of_supply VARCHAR(50),
    ADD COLUMN IF NOT EXISTS gst_group_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS gst_jurisdiction_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS source_shipment_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS source_shipment_line_no INTEGER
  `);
};

router.get("/", async (req, res) => {
  try {
    await ensurePostedSalesInvoiceSnapshotColumns();

    const result =
      await db.query(`
        SELECT
          *,
          COALESCE(
            NULLIF(total_tax_amount, 0),
            NULLIF(total_gst_amount, 0),
            NULLIF(total_vat, 0),
            NULLIF(total_tax, 0),
            GREATEST(
              COALESCE(amount_including_tax, total_incl_vat, 0) -
              COALESCE(total_amount, total_excl_vat, 0),
              0
            ),
            0
          ) AS tax_amount,
          COALESCE(
            amount_including_tax,
            total_incl_vat,
            total_amount + COALESCE(total_tax_amount, total_tax, 0),
            0
          ) AS display_amount_including_tax
        FROM posted_sales_invoices
        WHERE COALESCE(is_deleted, false) = false
        ORDER BY posting_date DESC,
                 created_at DESC
      `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        "Failed to fetch posted sales invoices",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    await ensurePostedSalesInvoiceSnapshotColumns();

    const { id } =
      req.params;

    const headerResult =
      await db.query(
        `
        SELECT
          psi.*,
          COALESCE(
            NULLIF(psi.total_tax_amount, 0),
            NULLIF(psi.total_gst_amount, 0),
            NULLIF(psi.total_vat, 0),
            NULLIF(psi.total_tax, 0),
            GREATEST(
              COALESCE(psi.amount_including_tax, psi.total_incl_vat, 0) -
              COALESCE(psi.total_amount, psi.total_excl_vat, 0),
              0
            ),
            0
          ) AS tax_amount,
          COALESCE(
            psi.amount_including_tax,
            psi.total_incl_vat,
            psi.total_amount + COALESCE(psi.total_tax_amount, psi.total_tax, 0),
            0
          ) AS display_amount_including_tax,
          si.document_no AS source_sales_invoice_no,
          pss.document_no AS source_posted_sales_shipment_no,
          so.document_no AS source_sales_order_no
        FROM posted_sales_invoices psi
        LEFT JOIN sales_invoice si
          ON si.id = psi.source_sales_invoice_id
        LEFT JOIN posted_sales_shipment pss
          ON pss.id = psi.source_posted_sales_shipment_id
        LEFT JOIN sales_orders so
          ON so.id = psi.source_sales_order_id
        WHERE psi.id = $1
          AND COALESCE(psi.is_deleted, false) = false
        `,
        [id]
      );

    if (headerResult.rows.length === 0) {
      return res.status(404).json({
        error:
          "Posted Sales Invoice not found",
      });
    }

    const linesResult =
      await db.query(
        `
        SELECT
          psil.*,
          COALESCE(NULLIF(psil.gst_place_of_supply, ''), NULLIF(sil.gst_place_of_supply, '')) AS gst_place_of_supply,
          COALESCE(NULLIF(psil.gst_group_code, ''), NULLIF(sil.gst_group_code, '')) AS gst_group_code,
          COALESCE(NULLIF(psil.gst_group_type, ''), NULLIF(sil.gst_group_type, '')) AS gst_group_type,
          COALESCE(NULLIF(psil.hsn_sac_code, ''), NULLIF(psil.hsn_sac, ''), NULLIF(sil.hsn_sac_code, ''), NULLIF(sil.hsn_sac, '')) AS hsn_sac_code,
          COALESCE(NULLIF(psil.gst_jurisdiction_type, ''), NULLIF(sil.gst_jurisdiction_type, '')) AS gst_jurisdiction_type,
          COALESCE(NULLIF(psil.invoice_type, ''), NULLIF(sil.invoice_type, ''), 'Taxable') AS invoice_type,
          CASE WHEN COALESCE(sil.total_gst_pct, 0) > 0 THEN COALESCE(sil.cgst_pct, 0) ELSE COALESCE(psil.cgst_pct, 0) END AS cgst_pct,
          CASE WHEN COALESCE(sil.total_gst_pct, 0) > 0 THEN COALESCE(sil.sgst_pct, 0) ELSE COALESCE(psil.sgst_pct, 0) END AS sgst_pct,
          CASE WHEN COALESCE(sil.total_gst_pct, 0) > 0 THEN COALESCE(sil.igst_pct, 0) ELSE COALESCE(psil.igst_pct, 0) END AS igst_pct,
          COALESCE(NULLIF(sil.total_gst_pct, 0), NULLIF(psil.total_gst_pct, 0), NULLIF(sil.tax_pct, 0), psil.tax_pct, 0) AS total_gst_pct,
          CASE WHEN COALESCE(sil.total_gst_pct, 0) > 0 THEN COALESCE(sil.cgst_amount, 0) ELSE COALESCE(psil.cgst_amount, 0) END AS cgst_amount,
          CASE WHEN COALESCE(sil.total_gst_pct, 0) > 0 THEN COALESCE(sil.sgst_amount, 0) ELSE COALESCE(psil.sgst_amount, 0) END AS sgst_amount,
          CASE WHEN COALESCE(sil.total_gst_pct, 0) > 0 THEN COALESCE(sil.igst_amount, 0) ELSE COALESCE(psil.igst_amount, 0) END AS igst_amount,
          COALESCE(NULLIF(sil.total_gst_amount, 0), NULLIF(psil.total_gst_amount, 0), NULLIF(sil.tax_amount, 0), psil.tax_amount, 0) AS total_gst_amount,
          COALESCE(NULLIF(sil.taxable_amount, 0), NULLIF(psil.taxable_amount, 0), psil.line_amount, 0) AS taxable_amount,
          COALESCE(NULLIF(sil.amount_including_gst, 0), NULLIF(psil.amount_including_gst, 0), NULLIF(sil.amount_including_tax, 0), psil.amount_including_tax, 0) AS amount_including_gst
        FROM posted_sales_invoice_lines psil
        JOIN posted_sales_invoices psi
          ON psi.id = psil.posted_sales_invoice_id
        LEFT JOIN sales_invoice_line sil
          ON sil.sales_invoice_id = psi.source_sales_invoice_id
         AND sil.line_no = psil.line_no
         AND COALESCE(sil.is_deleted, false) = false
        WHERE psil.posted_sales_invoice_id = $1
          AND COALESCE(psil.is_deleted, false) = false
        ORDER BY psil.line_no
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
        "Failed to fetch posted sales invoice",
    });
  }
});

module.exports =
  router;
