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
  resolvePurchaseNoSeries,
} = require("../services/purchaseNoSeriesService.cjs");

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

async function ensureReceiptReversalColumns(clientOrDb = db) {
  await clientOrDb.query(`
    ALTER TABLE posted_purchase_receipt_lines
    ADD COLUMN IF NOT EXISTS quantity_invoiced NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reversed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS reversed_quantity NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reversal_document_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS reversed_by VARCHAR(100)
  `);

  await clientOrDb.query(`
    ALTER TABLE posted_purchase_receipts
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
}

async function availableInventory(client, line, fallbackLocation) {
  const result = await client.query(
    `SELECT COALESCE(SUM(quantity), 0) AS available_qty
     FROM item_ledger_entries
     WHERE item_no = $1
       AND COALESCE(location_code, '') = COALESCE($2, '')
       AND COALESCE(variant_code, '') = COALESCE($3, '')
       AND COALESCE(is_deleted, false) = false`,
    [
      line.item_no,
      line.location_code || fallbackLocation || "",
      line.variant_code || "",
    ]
  );

  return Number(result.rows[0]?.available_qty ?? 0);
}

/**
 * GET ALL POSTED PURCHASE RECEIPTS
 */
router.get(
  "/",
  async (req, res) => {

    try {
      await ensureReceiptReversalColumns();

      const result =
        await db.query(`
          SELECT
          ppr.*,
            COALESCE(ppr.challan_no, i.challan_no, po.challan_no, mp.challan_no) AS challan_no,
            COALESCE(ppr.vendor_name, v.name) AS vendor_name,
            po.document_no AS source_purchase_order_no,
            i.document_no AS source_inward_gate_entry_no,
            i.grn_document_no AS source_grn_no
          FROM posted_purchase_receipts ppr
          LEFT JOIN vendors v
            ON v.vendor_no = ppr.vendor_no
          LEFT JOIN purchase_orders po
            ON po.id = ppr.source_purchase_order_id
          LEFT JOIN inward_gate_entries i
            ON i.id = ppr.source_inward_gate_entry_id
          LEFT JOIN mandi_purchase mp
            ON mp.id = po.source_mandi_purchase_id
          ORDER BY
            ppr.posting_date DESC,
            ppr.created_at DESC
        `);

      res.json(
        result.rows
      );

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to fetch posted purchase receipts",
      });
    }
  }
);

/**
 * GET SINGLE POSTED PURCHASE RECEIPT
 */
router.get(
  "/:id",
  async (req, res) => {

    try {
      await ensureReceiptReversalColumns();

      const { id } =
        req.params;

      /**
       * HEADER
       */
      const headerResult =
        await db.query(
          `
          SELECT
            ppr.*,
            COALESCE(ppr.challan_no, i.challan_no, po.challan_no, mp.challan_no) AS challan_no,
            COALESCE(ppr.vendor_name, v.name) AS vendor_name,
            po.document_no AS source_purchase_order_no,
            i.document_no AS source_inward_gate_entry_no,
            i.grn_document_no AS source_grn_no
          FROM posted_purchase_receipts ppr
          LEFT JOIN vendors v
            ON v.vendor_no = ppr.vendor_no
          LEFT JOIN purchase_orders po
            ON po.id = ppr.source_purchase_order_id
          LEFT JOIN inward_gate_entries i
            ON i.id = ppr.source_inward_gate_entry_id
          LEFT JOIN mandi_purchase mp
            ON mp.id = po.source_mandi_purchase_id
          WHERE (ppr.id::text = $1 OR ppr.document_no = $1)
          `,
          [String(id)]
        );

      if (
        headerResult.rows.length === 0
      ) {

        return res.status(404).json({
          error:
            "Posted Purchase Receipt not found",
        });
      }

      /**
       * LINES
       */
      const linesResult =
        await db.query(
          `
          SELECT *
          FROM posted_purchase_receipt_lines
          WHERE posted_purchase_receipt_id = $1
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
          "Failed to fetch posted purchase receipt",
      });
    }
  }
);

/**
 * CREATE POSTED RECEIPT
 * (Usually from GRN posting)
 */
router.post(
  "/",
  async (req, res) => {

    const client =
      await db.connect();

    try {

      await client.query(
        "BEGIN"
      );

      const payload =
        {
          ...req.body,
        };

      if (!payload.location_code) {
        if (payload.source_purchase_order_id) {
          const sourcePoResult =
            await client.query(
              `
              SELECT location_code
              FROM purchase_orders
              WHERE id = $1
              LIMIT 1
              `,
              [payload.source_purchase_order_id]
            );

          payload.location_code =
            sourcePoResult.rows[0]?.location_code ||
            payload.location_code;
        }

        if (!payload.location_code && payload.source_inward_gate_entry_id) {
          const sourceIgeResult =
            await client.query(
              `
              SELECT location_code
              FROM inward_gate_entries
              WHERE id = $1
              LIMIT 1
              `,
              [payload.source_inward_gate_entry_id]
            );

          payload.location_code =
            sourceIgeResult.rows[0]?.location_code ||
            payload.location_code;
        }
      }

      if (!payload.challan_no) {
        if (payload.source_inward_gate_entry_id) {
          const sourceIgeResult =
            await client.query(
              `
              SELECT challan_no
              FROM inward_gate_entries
              WHERE id = $1
              LIMIT 1
              `,
              [payload.source_inward_gate_entry_id]
            );

          payload.challan_no =
            sourceIgeResult.rows[0]?.challan_no ||
            payload.challan_no;
        }

        if (!payload.challan_no && payload.source_purchase_order_id) {
          const sourcePoResult =
            await client.query(
              `
              SELECT COALESCE(po.challan_no, mp.challan_no) AS challan_no
              FROM purchase_orders po
              LEFT JOIN mandi_purchase mp
                ON mp.id = po.source_mandi_purchase_id
              WHERE po.id = $1
              LIMIT 1
              `,
              [payload.source_purchase_order_id]
            );

          payload.challan_no =
            sourcePoResult.rows[0]?.challan_no ||
            payload.challan_no;
        }
      }

      if (!String(payload.location_code ?? "").trim()) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          error:
            "Location Code is required",
        });
      }

      const documentNo =
        payload.document_no ||
        await getNextNumber(
          await resolvePurchaseNoSeries(
            client,
            "posted_receipt_nos",
            "POSTED_PURCHASE_RECEIPT"
          )
        );

      /**
       * CREATE HEADER
       */
      const headerResult =
        await client.query(
          `
          INSERT INTO posted_purchase_receipts (
            document_no,
            vendor_no,
            vendor_name,
            posting_date,
            document_date,
            lr_no,
            lr_date,
            description,
            source_purchase_order_id,
            source_inward_gate_entry_id,
            vehicle_no,
            challan_no,
            entry_type,
            location_code
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,
            $7,$8,$9,$10,$11,
            $12,$13,$14
          )
          RETURNING *
          `,
          [
            documentNo,
            payload.vendor_no,
            payload.vendor_name,
            payload.posting_date,
            payload.document_date,
            payload.lr_no,
            payload.lr_date,
            payload.description,
            payload.source_purchase_order_id,
            payload.source_inward_gate_entry_id,
            payload.vehicle_no,
            payload.challan_no,
            payload.entry_type,
            payload.location_code,
          ]
        );

      const header =
        headerResult.rows[0];

      /**
       * INSERT LINES
       */
      if (
        Array.isArray(
          payload.lines
        )
      ) {

        for (
          let i = 0;
          i < payload.lines.length;
          i++
        ) {

          const line =
            payload.lines[i];

          await client.query(
            `
            INSERT INTO posted_purchase_receipt_lines (
              posted_purchase_receipt_id,
              line_no,
              item_no,
              variant_code,
              item_description,
              quantity_received,
              first_weight,
              second_weight,
              net_quantity,
              vendor_weight,
              excess_weight
            )
            VALUES (
              $1,$2,$3,$4,$5,
              $6,$7,$8,$9,$10,$11
            )
            `,
            [
              header.id,
              line.line_no ??
                (i + 1) * 10000,
              line.item_no,
              line.variant_code,
              line.item_description,
              Number(
                line.quantity_received ?? 0
              ),
              Number(
                line.first_weight ?? 0
              ),
              Number(
                line.second_weight ?? 0
              ),
              Number(
                line.net_quantity ?? 0
              ),
              Number(
                line.vendor_weight ?? 0
              ),
              Number(
                line.excess_weight ?? 0
              ),
            ]
          );
        }
      }

      await client.query(
        "COMMIT"
      );

      res.json({
        success: true,

        message:
          "Posted Purchase Receipt created successfully",

        data: header,
      });

    } catch (err) {

      await client.query(
        "ROLLBACK"
      );

      console.error(err);

      res.status(500).json({
        error:
          err.message ||
          "Failed to create posted purchase receipt",
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
    await ensureReceiptReversalColumns(client);

    const id = req.params.id;
    const reason = blankToNull(req.body?.reason);
    const reversedBy = req.user?.email || req.user?.username || null;

    const headerResult = await client.query(
      `SELECT *
       FROM posted_purchase_receipts
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    const header = headerResult.rows[0];
    if (!header) {
      throw new Error("Posted Purchase Receipt not found");
    }

    if (header.reversed) {
      throw new Error("Receipt is already reversed.");
    }

    const linesResult = await client.query(
      `SELECT *
       FROM posted_purchase_receipt_lines
       WHERE posted_purchase_receipt_id = $1
       ORDER BY line_no
       FOR UPDATE`,
      [header.id]
    );

    const lines = linesResult.rows;
    if (lines.length === 0) {
      throw new Error("No receipt lines found to undo.");
    }

    const reversalNos = [];

    for (const line of lines) {
      const receivedQty = num(line.quantity_received);
      const invoicedQty = num(line.quantity_invoiced);

      if (line.reversed) {
        throw new Error("Receipt is already reversed.");
      }

      if (invoicedQty > 0) {
        throw new Error("Receipt cannot be undone because it has already been invoiced.");
      }

      const invoiceExists = await client.query(
        `SELECT 1
         FROM purchase_invoice_lines pil
         JOIN purchase_invoices pi ON pi.id = pil.purchase_invoice_id
         WHERE pil.source_posted_purchase_receipt_line_id = $1
           AND COALESCE(pil.is_deleted, false) = false
           AND COALESCE(pi.is_deleted, false) = false
         LIMIT 1`,
        [line.id]
      );

      if (invoiceExists.rows.length > 0) {
        throw new Error("Receipt cannot be undone because it has already been invoiced.");
      }

      const availableQty = await availableInventory(client, line, header.location_code);
      if (availableQty < receivedQty) {
        throw new Error("Receipt cannot be undone because inventory is no longer available.");
      }

      const sourceLedger = await client.query(
        `SELECT id, entry_no, entry_type, document_type, quantity
         FROM item_ledger_entries
         WHERE source_table = 'posted_purchase_receipt_lines'
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
          vendor_no,
          vendor_name,
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
          "Purchase Reversal",
          "Purchase Receipt Reversal",
          reversalNo,
          line.item_no,
          line.item_description,
          line.location_code || header.location_code,
          blankToNull(line.variant_code),
          blankToNull(line.uom_code),
          -receivedQty,
          -receivedQty,
          0,
          0,
          num(line.unit_cost || line.direct_unit_cost),
          0,
          -num(line.line_amount),
          header.vendor_no,
          header.vendor_name,
          false,
          "posted_purchase_receipt_line_reversal",
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
        reversal_type: "Purchase Receipt Undo",
        source_document_type: "Posted Purchase Receipt",
        source_document_no: header.document_no,
        source_line_no: line.line_no,
        source_entry_no: sourceLedger.rows[0]?.entry_no || null,
        item_no: line.item_no,
        description: line.item_description,
        variant_code: blankToNull(line.variant_code),
        location_code: line.location_code || header.location_code,
        unit_of_measure_code: blankToNull(line.uom_code),
        original_quantity: num(sourceLedger.rows[0]?.quantity ?? receivedQty),
        reversal_quantity: -receivedQty,
        original_entry_type: sourceLedger.rows[0]?.entry_type || "Purchase",
        reversal_entry_type: "Purchase Reversal",
        original_document_type:
          sourceLedger.rows[0]?.document_type || "Purchase Receipt",
        reversal_document_type: "Purchase Receipt Reversal",
        original_item_ledger_entry_no: sourceLedger.rows[0]?.entry_no || null,
        reversal_item_ledger_entry_no: reversalLedger.entry_no || null,
        reason,
        posting_date: today(),
        reversed_by: reversedBy,
      });

      await client.query(
        `UPDATE items
         SET inventory = GREATEST(COALESCE(inventory, 0) - $1, 0),
             updated_at = NOW()
         WHERE item_no = $2`,
        [receivedQty, line.item_no]
      );

      if (line.source_purchase_order_line_id) {
        await client.query(
          `UPDATE purchase_order_lines
           SET
             received_quantity = GREATEST(COALESCE(received_quantity, 0) - $1, 0),
             qty_to_receive = GREATEST(COALESCE(quantity, 0) - GREATEST(COALESCE(received_quantity, 0) - $1, 0), 0),
             qty_to_invoice = GREATEST(GREATEST(COALESCE(received_quantity, 0) - $1, 0) - COALESCE(qty_invoiced, 0), 0),
             updated_at = NOW()
           WHERE id = $2`,
          [receivedQty, line.source_purchase_order_line_id]
        );
      }

      await client.query(
        `UPDATE posted_purchase_receipt_lines
         SET
           reversed = true,
           reversed_quantity = $1,
           reversal_document_no = $2,
           reversed_at = NOW(),
           reversed_by = $3
         WHERE id = $4`,
        [receivedQty, reversalNo, reversedBy, line.id]
      );
    }

    if (header.source_purchase_order_id) {
      await client.query(
        `UPDATE purchase_orders
         SET status = 'Open',
             updated_at = NOW()
         WHERE id = $1`,
        [header.source_purchase_order_id]
      );
    }

    await client.query(
      `UPDATE posted_purchase_receipts
       SET reversed = true,
           reversed_at = NOW(),
           reversal_reason = $2
       WHERE id = $1`,
      [header.id, reason]
    );

    await client.query("COMMIT");
    res.json({
      success: true,
      message: "Receipt undone successfully",
      reversal_document_no: reversalNos[0] || null,
      reversal_nos: reversalNos,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(err.statusCode || 400).json({
      error: err.message || "Failed to undo receipt",
    });
  } finally {
    client.release();
  }
});

module.exports =
  router;
