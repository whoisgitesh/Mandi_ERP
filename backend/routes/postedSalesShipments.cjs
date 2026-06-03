const express =
  require("express");

const router =
  express.Router();

const db =
  require("../db.cjs");

const {
  getNextNumber,
} = require("../services/noSeriesService.cjs");

const {
  resolveSalesNoSeries,
} = require("../services/salesNoSeriesService.cjs");

const {
  getNextReversalNo,
  insertReversalEntry,
} = require("../services/reversalEntryService.cjs");

const blankToNull = (value) =>
  value === "" ? null : value ?? null;

const num = (value) =>
  Number(value ?? 0);

const today = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const ensureShipmentInvoiceColumns = async (clientOrDb = db) => {
  await clientOrDb.query(`
    ALTER TABLE posted_sales_shipment_line
    ADD COLUMN IF NOT EXISTS quantity_shipped NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS quantity_invoiced NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS qty_to_invoice NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reversed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS reversed_quantity NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reversal_document_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS reversed_by VARCHAR(100)
  `);

  await clientOrDb.query(`
    ALTER TABLE posted_sales_shipment
    ADD COLUMN IF NOT EXISTS reversed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS reversal_reason TEXT
  `);

  await clientOrDb.query(`
    ALTER TABLE item_ledger_entries
    ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS reversed_entry_no INT,
    ADD COLUMN IF NOT EXISTS reversal_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS source_posted_document_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS reversal_reason TEXT
  `);

  await clientOrDb.query(`
    WITH invoice_totals AS (
      SELECT
        psi.source_posted_sales_shipment_id AS posted_sales_shipment_id,
        COALESCE(psil.source_shipment_line_no, psil.shipment_line_no) AS line_no,
        SUM(
          COALESCE(
            NULLIF(psil.qty_to_invoice, 0),
            NULLIF(psil.quantity_invoiced, 0),
            NULLIF(psil.quantity_shipped, 0),
            0
          )
        ) AS quantity_invoiced
      FROM posted_sales_invoice_lines psil
      JOIN posted_sales_invoices psi
        ON psi.id = psil.posted_sales_invoice_id
      WHERE COALESCE(psil.is_deleted, false) = false
        AND COALESCE(psi.is_deleted, false) = false
        AND psi.source_posted_sales_shipment_id IS NOT NULL
        AND COALESCE(psil.source_shipment_line_no, psil.shipment_line_no) IS NOT NULL
      GROUP BY
        psi.source_posted_sales_shipment_id,
        COALESCE(psil.source_shipment_line_no, psil.shipment_line_no)
    ),
    line_totals AS (
      SELECT
        pssl.id,
        COALESCE(NULLIF(pssl.quantity_shipped, 0), pssl.quantity, 0) AS quantity_shipped,
        COALESCE(it.quantity_invoiced, 0) AS quantity_invoiced
      FROM posted_sales_shipment_line pssl
      LEFT JOIN invoice_totals it
        ON it.posted_sales_shipment_id = pssl.posted_sales_shipment_id
       AND it.line_no = pssl.line_no
    )
    UPDATE posted_sales_shipment_line pssl
    SET quantity_shipped = line_totals.quantity_shipped,
        quantity_invoiced = line_totals.quantity_invoiced,
        qty_to_invoice = CASE
          WHEN COALESCE(pssl.reversed, false) = true THEN 0
          ELSE GREATEST(
            line_totals.quantity_shipped - line_totals.quantity_invoiced,
            0
          )
        END
    FROM line_totals
    WHERE line_totals.id = pssl.id
  `);
};

const ensureSalesShipmentReversalColumns = ensureShipmentInvoiceColumns;

const calculateInvoiceValueFields = (line, quantity) => {
  const qty =
    num(quantity);
  const unitPrice =
    num(line.unit_price);
  const discountPct =
    num(line.line_discount_pct);
  const taxPct =
    num(line.tax_pct);
  const lineDiscountAmount =
    Number((qty * unitPrice * discountPct / 100).toFixed(2));
  const lineAmount =
    Number((qty * unitPrice - lineDiscountAmount).toFixed(2));
  const taxAmount =
    Number((lineAmount * taxPct / 100).toFixed(2));

  return {
    line_discount_amount: lineDiscountAmount,
    line_amount: lineAmount,
    tax_amount: taxAmount,
    amount_including_tax:
      Number((lineAmount + taxAmount).toFixed(2)),
  };
};

/**
 * GET ALL
 */
router.get(
  "/",
  async (req, res) => {

    try {

      const result =
        await db.query(`
          SELECT
            pss.*,
            so.document_no AS source_sales_order_no
          FROM posted_sales_shipment pss
          LEFT JOIN sales_orders so
            ON so.id = pss.source_sales_order_id
          WHERE COALESCE(pss.is_deleted, false) = false
          ORDER BY posting_date DESC,
                   created_at DESC
        `);

      res.json(
        result.rows
      );

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to fetch posted sales shipments",
      });
    }
  }
);

router.get(
  "/available-for-invoice",
  async (req, res) => {
    try {
      await ensureShipmentInvoiceColumns();

      const result =
        await db.query(`
          SELECT
            pss.*,
            so.document_no AS source_sales_order_no,
            SUM(
              GREATEST(
                COALESCE(NULLIF(pssl.quantity_shipped, 0), pssl.quantity, 0) -
                COALESCE(pssl.quantity_invoiced, 0),
                0
              )
            ) AS remaining_qty_to_invoice
          FROM posted_sales_shipment pss
          JOIN posted_sales_shipment_line pssl
            ON pssl.posted_sales_shipment_id = pss.id
           AND COALESCE(pssl.is_deleted, false) = false
           AND COALESCE(pssl.reversed, false) = false
          LEFT JOIN sales_orders so
            ON so.id = pss.source_sales_order_id
          WHERE COALESCE(pss.is_deleted, false) = false
          GROUP BY pss.id, so.document_no
          HAVING SUM(
            GREATEST(
              COALESCE(NULLIF(pssl.quantity_shipped, 0), pssl.quantity, 0) -
              COALESCE(pssl.quantity_invoiced, 0),
              0
            )
          ) > 0
          ORDER BY pss.posting_date DESC,
                   pss.created_at DESC
        `);

      res.json(result.rows);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Failed to fetch shipments available for invoice",
      });
    }
  }
);

router.get(
  "/:documentNo/lines-to-invoice",
  async (req, res) => {
    try {
      await ensureShipmentInvoiceColumns();

      const result =
        await db.query(
          `
          SELECT
            pssl.*,
            COALESCE(NULLIF(pssl.quantity_shipped, 0), pssl.quantity, 0) AS quantity_shipped,
            COALESCE(pssl.quantity_invoiced, 0) AS quantity_invoiced,
            GREATEST(
              COALESCE(NULLIF(pssl.quantity_shipped, 0), pssl.quantity, 0) -
              COALESCE(pssl.quantity_invoiced, 0),
              0
            ) AS remaining_qty_to_invoice,
            COALESCE(NULLIF(pssl.unit_price, 0), sol.unit_price, 0) AS unit_price,
            COALESCE(NULLIF(pssl.line_discount_pct, 0), sol.line_discount_pct, 0) AS line_discount_pct,
            COALESCE(NULLIF(pssl.tax_pct, 0), sol.tax_pct, 0) AS tax_pct,
            COALESCE(pssl.gst_group_code, sol.gst_group_code) AS gst_group_code,
            COALESCE(pssl.hsn_sac_code, sol.hsn_sac_code) AS hsn_sac_code
          FROM posted_sales_shipment pss
          JOIN posted_sales_shipment_line pssl
            ON pssl.posted_sales_shipment_id = pss.id
           AND COALESCE(pssl.is_deleted, false) = false
           AND COALESCE(pssl.reversed, false) = false
          LEFT JOIN sales_order_lines sol
            ON sol.id = pssl.sales_order_line_id
          WHERE (pss.document_no = $1 OR pss.id::text = $1)
            AND COALESCE(pss.is_deleted, false) = false
            AND GREATEST(
              COALESCE(NULLIF(pssl.quantity_shipped, 0), pssl.quantity, 0) -
              COALESCE(pssl.quantity_invoiced, 0),
              0
            ) > 0
          ORDER BY pssl.line_no
          `,
          [req.params.documentNo]
        );

      res.json(result.rows);
    } catch (err) {
      console.error(err);

      res.status(500).json({
        error:
          "Failed to fetch shipment lines available for invoice",
      });
    }
  }
);

/**
 * CREATE SALES INVOICE FROM POSTED SHIPMENT
 */
router.post(
  "/:id/create-invoice",
  async (req, res) => {
    const client =
      await db.connect();

    try {
      await client.query("BEGIN");

      const { id } =
        req.params;

      await ensureShipmentInvoiceColumns(client);

      const headerResult =
        await client.query(
          `
          SELECT
            pss.*,
            so.document_no AS source_sales_order_no
          FROM posted_sales_shipment pss
          LEFT JOIN sales_orders so
            ON so.id = pss.source_sales_order_id
          WHERE (pss.id::text = $1 OR pss.document_no = $1)
            AND COALESCE(pss.is_deleted, false) = false
          `,
          [String(id)]
        );

      if (headerResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          error:
            "Posted shipment not found",
        });
      }

      const header =
        headerResult.rows[0];

      if (!String(header.location_code ?? "").trim()) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          error:
            "Location Code is required",
        });
      }

      const linesResult =
        await client.query(
          `
          SELECT
            pssl.*,
            COALESCE(NULLIF(pssl.unit_price, 0), sol.unit_price, 0) AS unit_price,
            COALESCE(NULLIF(pssl.line_discount_pct, 0), sol.line_discount_pct, 0) AS line_discount_pct,
            COALESCE(NULLIF(pssl.tax_pct, 0), sol.tax_pct, 0) AS tax_pct,
            COALESCE(pssl.gst_group_code, sol.gst_group_code) AS gst_group_code,
            COALESCE(pssl.hsn_sac_code, sol.hsn_sac_code) AS hsn_sac_code
          FROM posted_sales_shipment_line pssl
          LEFT JOIN sales_order_lines sol
            ON sol.id = pssl.sales_order_line_id
          WHERE pssl.posted_sales_shipment_id = $1
            AND COALESCE(pssl.is_deleted, false) = false
            AND COALESCE(pssl.reversed, false) = false
            AND GREATEST(
              COALESCE(NULLIF(pssl.quantity_shipped, 0), pssl.quantity, 0) -
              COALESCE(pssl.quantity_invoiced, 0),
              0
            ) > 0
          ORDER BY pssl.line_no
          FOR UPDATE OF pssl
          `,
          [headerResult.rows[0].id]
        );

      const invoiceLines =
        linesResult.rows.map((line) => ({
          ...line,
          remaining_qty_to_invoice:
            Math.max(
              num(line.quantity_shipped || line.quantity) -
              num(line.quantity_invoiced),
              0
            ),
        }));

      if (invoiceLines.length === 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          error:
            "No shipped quantity is available to invoice",
        });
      }

      const seriesCode =
        await resolveSalesNoSeries(
          client,
          [
            "invoice_nos",
            "sales_invoice_nos",
          ],
          "SALES_INVOICE"
        );

      const documentNo =
        await getNextNumber(seriesCode);

      const invoiceResult =
        await client.query(
          `
          INSERT INTO sales_invoice (
            document_no,
            customer_no,
            customer_name,
            posting_date,
            document_date,
            location_code,
            external_document_no,
            address,
            city,
            post_code,
            bill_to_customer_no,
            bill_to_name,
            source_sales_order_id,
            source_posted_sales_shipment_id,
            status
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Open'
          )
          RETURNING *
          `,
          [
            documentNo,
            blankToNull(header.customer_no),
            blankToNull(header.customer_name),
            today(),
            today(),
            blankToNull(header.location_code),
            blankToNull(header.external_document_no),
            blankToNull(header.address),
            blankToNull(header.city),
            blankToNull(header.post_code),
            blankToNull(header.customer_no),
            blankToNull(header.customer_name),
            header.source_sales_order_id,
            header.id,
          ]
        );

      const invoice =
        invoiceResult.rows[0];

      let totalAmount = 0;
      let totalTax = 0;
      let amountIncludingTax = 0;

      for (const line of invoiceLines) {
        const quantity =
          num(line.remaining_qty_to_invoice);

        const values =
          calculateInvoiceValueFields(
            line,
            quantity
          );

        totalAmount += values.line_amount;
        totalTax += values.tax_amount;
        amountIncludingTax += values.amount_including_tax;

        await client.query(
          `
          INSERT INTO sales_invoice_line (
            sales_invoice_id,
            line_no,
          item_no,
          item_description,
          shipment_no,
          shipment_line_no,
          type,
          variant_code,
          location_code,
          gst_group_code,
          unit_of_measure_code,
          quantity,
          quantity_shipped,
          quantity_invoiced,
          qty_to_invoice,
          balance_qty,
          unit_price,
          line_discount_pct,
          line_discount_amount,
          line_amount,
          tax_pct,
          tax_amount,
          amount_including_tax,
          hsn_sac_code
        )
        VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
          )
          `,
          [
            invoice.id,
            line.line_no,
            blankToNull(line.item_no),
            blankToNull(line.item_description),
            blankToNull(header.document_no),
            line.line_no,
            "Item",
            blankToNull(line.variant_code),
            blankToNull(line.location_code || header.location_code),
            blankToNull(line.gst_group_code),
            blankToNull(line.unit_of_measure_code),
            num(line.quantity_shipped || line.quantity),
            num(line.quantity_shipped || line.quantity),
            num(line.quantity_invoiced),
            quantity,
            Math.max(
              num(line.quantity_shipped || line.quantity) -
              num(line.quantity_invoiced) -
              quantity,
              0
            ),
            num(line.unit_price),
            num(line.line_discount_pct),
            values.line_discount_amount,
            values.line_amount,
            num(line.tax_pct),
            values.tax_amount,
            values.amount_including_tax,
            blankToNull(line.hsn_sac_code),
          ]
        );
      }

      await client.query(
        `
        UPDATE sales_invoice
        SET total_amount = $2,
            total_tax = $3,
            amount_including_tax = $4,
            updated_at = NOW()
        WHERE id = $1
        `,
        [
          invoice.id,
          totalAmount,
          totalTax,
          amountIncludingTax,
        ]
      );

      await client.query("COMMIT");

      res.json({
        success: true,
        sales_invoice_id:
          invoice.id,
        sales_invoice_no:
          invoice.document_no,
      });
    } catch (err) {
      await client.query("ROLLBACK");

      console.error(err);

      res.status(500).json({
        error:
          "Failed to create sales invoice from posted shipment",
      });
    } finally {
      client.release();
    }
  }
);

router.post("/:id/undo", async (req, res) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    await ensureSalesShipmentReversalColumns(client);

    const id = req.params.id;
    const reason = blankToNull(req.body?.reason);
    const reversedBy = req.user?.email || req.user?.username || null;

    const headerResult = await client.query(
      `SELECT *
       FROM posted_sales_shipment
       WHERE id = $1
         AND COALESCE(is_deleted, false) = false
       FOR UPDATE`,
      [id]
    );

    const header = headerResult.rows[0];
    if (!header) {
      throw new Error("Posted shipment not found");
    }

    if (header.reversed) {
      throw new Error("Shipment is already reversed.");
    }

    const linesResult = await client.query(
      `SELECT *
       FROM posted_sales_shipment_line
       WHERE posted_sales_shipment_id = $1
         AND COALESCE(is_deleted, false) = false
       ORDER BY line_no
       FOR UPDATE`,
      [header.id]
    );

    const lines = linesResult.rows;
    if (lines.length === 0) {
      throw new Error("No shipment lines found to undo.");
    }

    const reversalNos = [];

    for (const line of lines) {
      const shippedQty = num(line.quantity_shipped || line.quantity);
      const invoicedQty = num(line.quantity_invoiced);

      if (line.reversed) {
        throw new Error("Shipment is already reversed.");
      }

      if (invoicedQty > 0) {
        throw new Error("Shipment cannot be undone because it has already been invoiced.");
      }

      const invoiceExists = await client.query(
        `SELECT 1
         FROM sales_invoice_line sil
         JOIN sales_invoice si ON si.id = sil.sales_invoice_id
         WHERE si.source_posted_sales_shipment_id = $1
           AND COALESCE(sil.source_shipment_line_no, sil.shipment_line_no) = $2
           AND COALESCE(sil.is_deleted, false) = false
           AND COALESCE(si.is_deleted, false) = false
         LIMIT 1`,
        [header.id, line.line_no]
      );

      if (invoiceExists.rows.length > 0) {
        throw new Error("Shipment cannot be undone because it has already been invoiced.");
      }

      const sourceLedger = await client.query(
        `SELECT id, entry_no, entry_type, document_type, quantity
         FROM item_ledger_entries
         WHERE source_table = 'posted_sales_shipment_line'
           AND source_line_id = $1
           AND COALESCE(is_reversal, false) = false
         ORDER BY id
         LIMIT 1`,
        [line.id]
      );

      const reversalNo = await getNextReversalNo(client);
      reversalNos.push(reversalNo);

      const reversalLedgerResult = await client.query(
        `INSERT INTO item_ledger_entries (
          posting_date,
          entry_type,
          document_type,
          document_no,
          item_no,
          description,
          location_code,
          variant_code,
          unit_of_measure_code,
          quantity,
          invoiced_quantity,
          remaining_quantity,
          unit_price,
          unit_cost,
          sales_amount,
          cost_amount,
          customer_no,
          customer_name,
          open,
          source_table,
          source_id,
          source_line_id,
          is_reversal,
          reversed_entry_no,
          source_posted_document_no,
          reversal_reason
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,
          $19,$20,$21,$22,$23,$24,$25,$26
        )
        RETURNING id, entry_no`,
        [
          today(),
          "Sale Reversal",
          "Sales Shipment Reversal",
          reversalNo,
          line.item_no,
          line.item_description,
          line.location_code || header.location_code,
          blankToNull(line.variant_code),
          blankToNull(line.unit_of_measure_code),
          shippedQty,
          shippedQty,
          shippedQty,
          num(line.unit_price),
          0,
          -num(line.line_amount),
          0,
          header.customer_no,
          header.customer_name,
          false,
          "posted_sales_shipment_line_reversal",
          header.id,
          line.id,
          true,
          sourceLedger.rows[0]?.entry_no || null,
          header.document_no,
          reason,
        ]
      );

      const reversalLedger = reversalLedgerResult.rows[0];

      await client.query(
        `UPDATE item_ledger_entries
         SET reversal_no = $1
         WHERE id = $2`,
        [reversalNo, reversalLedger.id]
      );

      await insertReversalEntry(client, {
        reversal_no: reversalNo,
        reversal_type: "Sales Shipment Undo",
        source_document_type: "Posted Sales Shipment",
        source_document_no: header.document_no,
        source_line_no: line.line_no,
        source_entry_no: sourceLedger.rows[0]?.entry_no || null,
        item_no: line.item_no,
        description: line.item_description,
        variant_code: blankToNull(line.variant_code),
        location_code: line.location_code || header.location_code,
        unit_of_measure_code: blankToNull(line.unit_of_measure_code),
        original_quantity: num(sourceLedger.rows[0]?.quantity ?? -shippedQty),
        reversal_quantity: shippedQty,
        original_entry_type: sourceLedger.rows[0]?.entry_type || "Sale",
        reversal_entry_type: "Sale Reversal",
        original_document_type:
          sourceLedger.rows[0]?.document_type || "Sales Shipment",
        reversal_document_type: "Sales Shipment Reversal",
        original_item_ledger_entry_no: sourceLedger.rows[0]?.entry_no || null,
        reversal_item_ledger_entry_no: reversalLedger.entry_no || null,
        reason,
        posting_date: today(),
        reversed_by: reversedBy,
      });

      if (line.sales_order_line_id) {
        await client.query(
          `UPDATE sales_order_lines
           SET
             qty_shipped = GREATEST(COALESCE(qty_shipped, 0) - $1, 0),
             qty_to_ship = GREATEST(COALESCE(quantity, 0) - GREATEST(COALESCE(qty_shipped, 0) - $1, 0), 0),
             updated_at = NOW()
           WHERE id = $2`,
          [shippedQty, line.sales_order_line_id]
        );
      }

      await client.query(
        `UPDATE posted_sales_shipment_line
         SET
           reversed = true,
           reversed_quantity = $1,
           reversal_document_no = $2,
           reversed_at = NOW(),
           reversed_by = $3
         WHERE id = $4`,
        [shippedQty, reversalNo, reversedBy, line.id]
      );
    }

    await client.query(
      `UPDATE posted_sales_shipment
       SET reversed = true,
           reversed_at = NOW(),
           reversal_reason = $2
       WHERE id = $1`,
      [header.id, reason]
    );

    await client.query("COMMIT");
    res.json({
      success: true,
      message: "Shipment undone successfully",
      reversal_document_no: reversalNos[0] || null,
      reversal_nos: reversalNos,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(err.statusCode || 400).json({
      error: err.message || "Failed to undo shipment",
    });
  } finally {
    client.release();
  }
});

/**
 * GET SINGLE
 */
router.get(
  "/:id",
  async (req, res) => {

    try {
      await ensureShipmentInvoiceColumns();

      const { id } =
        req.params;

      const headerResult =
        await db.query(
          `
          SELECT
            pss.*,
            so.document_no AS source_sales_order_no
          FROM posted_sales_shipment pss
          LEFT JOIN sales_orders so
            ON so.id = pss.source_sales_order_id
          WHERE (pss.id::text = $1 OR pss.document_no = $1)
            AND COALESCE(pss.is_deleted, false) = false
          `,
          [String(id)]
        );

      if (
        headerResult.rows.length === 0
      ) {

        return res.status(404).json({
          error:
            "Posted shipment not found",
        });
      }

      const linesResult =
        await db.query(
          `
          SELECT
            *,
            COALESCE(NULLIF(quantity_shipped, 0), quantity, 0) AS quantity_shipped,
            COALESCE(quantity_invoiced, 0) AS quantity_invoiced,
            CASE
              WHEN COALESCE(reversed, false) = true THEN 0
              ELSE GREATEST(
                COALESCE(NULLIF(quantity_shipped, 0), quantity, 0) -
                COALESCE(quantity_invoiced, 0),
                0
              )
            END AS remaining_qty_to_invoice
          FROM posted_sales_shipment_line
          WHERE posted_sales_shipment_id = $1
            AND COALESCE(is_deleted, false) = false
          ORDER BY line_no
          `,
          [headerResult.rows[0].id]
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
          "Failed to fetch posted sales shipment",
      });
    }
  }
);

module.exports =
  router;
