const express =
  require("express");

const router =
  express.Router();

const db =
  require("../db.cjs");

const {
  getNextNumber,
} = require(
  "../services/noSeriesService.cjs"
);

const {
  resolvePurchaseNoSeries,
} = require(
  "../services/purchaseNoSeriesService.cjs"
);

const blankToNull = (value) =>
  value === "" ? null : value ?? null;

async function ensureMandiLocationColumn(client = db) {
  await client.query(`
    ALTER TABLE mandi_purchase
    ADD COLUMN IF NOT EXISTS location_code VARCHAR(30)
  `);
}

const calculateLineAmounts = (payload) => {
  const quantity =
    Number(payload.quantity ?? 0);

  const shippedQuantity =
    Number(payload.shipped_quantity ?? 0);

  const rate =
    Number(payload.rate ?? 0);

  return {
    quantity,
    shippedQuantity,
    balanceQuantity:
      quantity - shippedQuantity,
    lineAmount:
      quantity * rate,
    rate,
  };
};

/**
 * GET ALL
 */
router.get(
  "/",
  async (req, res) => {

    try {
      await ensureMandiLocationColumn();

      const result =
        await db.query(`
          SELECT *
          FROM mandi_purchase
          WHERE COALESCE(is_deleted, false) = false
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
          "Failed to fetch mandi purchases",
      });
    }
  }
);

/**
 * CREATE NEW
 */
router.post(
  "/",
  async (req, res) => {

    try {

      const payload =
        req.body;

      /**
       * GENERATE DOCUMENT NO
       */
      const seriesCode =
        await resolvePurchaseNoSeries(
          db,
          "mandi_purchase_nos",
          "MANDI_PURCHASE"
        );

      const documentNo =
        await getNextNumber(seriesCode);

      const result =
        await db.query(
          `
          INSERT INTO mandi_purchase (
            document_no,
            vendor_no,
            posting_date,
            status
          )
          VALUES (
            $1,$2,$3,$4
          )
          RETURNING *
          `,
          [
            documentNo,
            blankToNull(payload.vendor_no),
            payload.posting_date,
            "Open",
          ]
        );

      res.json({
        success: true,

        data:
          result.rows[0],
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          err.message ||
          "Failed to create mandi purchase",
      });
    }
  }
);

/**
 * GET SINGLE
 */
router.get(
  "/:id",
  async (req, res) => {

    try {

      const { id } =
        req.params;

      const headerResult =
        await db.query(
          `
          SELECT *
          FROM mandi_purchase
          WHERE id = $1
          `,
          [id]
        );

      if (
        headerResult.rows.length === 0
      ) {

        return res.status(404).json({
          error:
            "Mandi Purchase not found",
        });
      }

      const linesResult =
        await db.query(
          `
          SELECT *
          FROM mandi_purchase_line
          WHERE mandi_purchase_id = $1
            AND COALESCE(is_deleted, false) = false
          ORDER BY line_no
          `,
          [id]
        );

      const trackedPoResult =
        await db.query(
          `
          SELECT
            id,
            document_no,
            posting_date,
            status
          FROM purchase_orders
          WHERE source_mandi_purchase_id = $1
            AND COALESCE(is_deleted, false) = false
          ORDER BY posting_date DESC,
                   created_at DESC
          `,
          [id]
        );

      res.json({
        header:
          headerResult.rows[0],

        lines:
          linesResult.rows,

        tracked_purchase_orders:
          trackedPoResult.rows,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to load mandi purchase",
      });
    }
  }
);

/**
 * ADD LINE
 */
router.post(
  "/:id/lines",
  async (req, res) => {

    try {
      await ensureMandiLocationColumn();

      const { id } =
        req.params;

      const payload =
        req.body;

      const nextLine =
        await db.query(
          `
          SELECT COALESCE(MAX(line_no), 0) + 10000 AS line_no
          FROM mandi_purchase_line
          WHERE mandi_purchase_id = $1
            AND COALESCE(is_deleted, false) = false
          `,
          [id]
        );

      const {
        quantity,
        shippedQuantity,
        balanceQuantity,
        lineAmount,
        rate,
      } = calculateLineAmounts(payload);

      const result =
        await db.query(
          `
          INSERT INTO mandi_purchase_line (
            mandi_purchase_id,
            line_no,
            item_no,
            item_description,
            variant_code,
            mandi_vendor_no,
            mandi_vendor_name,
            quantity,
            shipped_quantity,
            balance_quantity,
            rate,
            line_amount
          )
          VALUES (
            $1,$2,$3,$4,$5,
            $6,$7,$8,$9,$10,
            $11,$12
          )
          RETURNING *
          `,
          [
            id,
            payload.line_no || nextLine.rows[0].line_no,
            blankToNull(payload.item_no),
            blankToNull(payload.item_description),
            blankToNull(payload.variant_code),
            blankToNull(payload.mandi_vendor_no),
            blankToNull(payload.mandi_vendor_name),
            quantity,
            shippedQuantity,
            balanceQuantity,
            rate,
            lineAmount,
          ]
        );

      res.json(
        result.rows[0]
      );

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          err.message ||
          "Failed to add line",
      });
    }
  }
);

/**
 * UPDATE LINE
 */
router.put(
  "/lines/:lineId",
  async (req, res) => {

    try {
      await ensureMandiLocationColumn();

      const payload =
        req.body;

      const {
        quantity,
        shippedQuantity,
        balanceQuantity,
        lineAmount,
        rate,
      } = calculateLineAmounts(payload);

      const result =
        await db.query(
          `
          UPDATE mandi_purchase_line
          SET
            item_no = $1,
            item_description = $2,
            variant_code = $3,
            mandi_vendor_no = $4,
            mandi_vendor_name = $5,
            quantity = $6,
            shipped_quantity = $7,
            balance_quantity = $8,
            rate = $9,
            line_amount = $10,
            updated_at = NOW()
          WHERE id = $11
          RETURNING *
          `,
          [
            blankToNull(payload.item_no),
            blankToNull(payload.item_description),
            blankToNull(payload.variant_code),
            blankToNull(payload.mandi_vendor_no),
            blankToNull(payload.mandi_vendor_name),
            quantity,
            shippedQuantity,
            balanceQuantity,
            rate,
            lineAmount,
            req.params.lineId,
          ]
        );

      res.json(
        result.rows[0]
      );

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          err.message ||
          "Failed to update line",
      });
    }
  }
);

/**
 * DELETE LINE
 */
router.delete(
  "/lines/:lineId",
  async (req, res) => {

    try {

      await db.query(
        `
        UPDATE mandi_purchase_line
        SET
          is_deleted = true,
          updated_at = NOW()
        WHERE id = $1
        `,
        [req.params.lineId]
      );

      res.json({
        success: true,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to delete line",
      });
    }
  }
);

/**
 * UPDATE HEADER
 */
router.put(
  "/:id",
  async (req, res) => {

    try {
      await ensureMandiLocationColumn();

      const { id } =
        req.params;

      const payload =
        req.body;

      if (!String(payload.challan_no ?? "").trim()) {
        return res.status(400).json({
          error: "Challan No. is required",
        });
      }

      if (!String(payload.location_code ?? "").trim()) {
        return res.status(400).json({
          error: "Location Code is required",
        });
      }

      const result =
        await db.query(
          `
          UPDATE mandi_purchase
          SET
            vendor_no = $1,
            vendor_name = $2,
            posting_date = $3,
            status = $4,
            remarks = $5,
            challan_no = $6,
            location_code = $7,
            serial_no = $8,
            name = $9,
            po_no = $10,
            purchaser_name = $11,
            updated_at = NOW()
          WHERE id = $12
          RETURNING *
          `,
          [
            blankToNull(payload.vendor_no),
            blankToNull(payload.vendor_name),
            blankToNull(payload.posting_date),
            blankToNull(payload.status),
            blankToNull(payload.remarks),
            blankToNull(payload.challan_no),
            blankToNull(payload.location_code),
            blankToNull(payload.serial_no),
            blankToNull(payload.name),
            blankToNull(payload.po_no),
            blankToNull(payload.purchaser_name),
            id,
          ]
        );

      const updatedHeader =
        result.rows[0];

      await db.query(
        `
        UPDATE purchase_orders
        SET
          vendor_no = $1,
          vendor_name = $2,
          challan_no = $3,
          location_code = $4,
          updated_at = NOW()
        WHERE source_mandi_purchase_id = $5
          AND COALESCE(is_deleted, false) = false
        `,
        [
          blankToNull(updatedHeader.vendor_no),
          blankToNull(updatedHeader.vendor_name),
          blankToNull(updatedHeader.challan_no),
          blankToNull(updatedHeader.location_code),
          id,
        ]
      );

      await db.query(
        `
        UPDATE inward_gate_entries i
        SET
          vendor_no = $1,
          vendor_name = $2,
          challan_no = $3,
          location_code = $4,
          updated_at = NOW()
        FROM purchase_orders po
        WHERE i.source_purchase_order_id = po.id
          AND po.source_mandi_purchase_id = $5
          AND COALESCE(i.is_deleted, false) = false
          AND COALESCE(po.is_deleted, false) = false
        `,
        [
          blankToNull(updatedHeader.vendor_no),
          blankToNull(updatedHeader.vendor_name),
          blankToNull(updatedHeader.challan_no),
          blankToNull(updatedHeader.location_code),
          id,
        ]
      );

      await db.query(
        `
        UPDATE posted_purchase_receipts ppr
        SET
          vendor_no = $1,
          vendor_name = $2,
          challan_no = $3,
          location_code = $4,
          updated_at = NOW()
        FROM purchase_orders po
        WHERE ppr.source_purchase_order_id = po.id
          AND po.source_mandi_purchase_id = $5
          AND COALESCE(ppr.is_deleted, false) = false
          AND COALESCE(po.is_deleted, false) = false
        `,
        [
          blankToNull(updatedHeader.vendor_no),
          blankToNull(updatedHeader.vendor_name),
          blankToNull(updatedHeader.challan_no),
          blankToNull(updatedHeader.location_code),
          id,
        ]
      );

      res.json(
        updatedHeader
      );

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to update mandi purchase",
      });
    }
  }
);

/**
 * CREATE PURCHASE ORDER
 */
router.post(
  "/:id/create-po",
  async (req, res) => {

    const client =
      await db.connect();

    try {
      await ensureMandiLocationColumn(client);

      await client.query(
        "BEGIN"
      );

      const { id } =
        req.params;

      /**
       * GET HEADER
       */
      const headerResult =
        await client.query(
          `
          SELECT
            m.*,
            COALESCE(m.vendor_name, v.name) AS vendor_name
          FROM mandi_purchase m
          LEFT JOIN vendors v
            ON v.vendor_no = m.vendor_no
          WHERE m.id = $1
          `,
          [id]
        );

      if (
        headerResult.rows.length === 0
      ) {

        throw new Error(
          "Mandi Purchase not found"
        );
      }

      const header =
        headerResult.rows[0];

      const requestedHeader =
        req.body ?? {};

      header.vendor_no =
        blankToNull(requestedHeader.vendor_no) ??
        header.vendor_no;

      header.vendor_name =
        blankToNull(requestedHeader.vendor_name) ??
        header.vendor_name;

      header.posting_date =
        blankToNull(requestedHeader.posting_date) ??
        header.posting_date;

      header.challan_no =
        blankToNull(requestedHeader.challan_no) ??
        header.challan_no;

      header.location_code =
        blankToNull(requestedHeader.location_code) ??
        header.location_code;

      if (!String(header.challan_no ?? "").trim()) {
        throw new Error(
          "Challan No. is required before creating Purchase Order"
        );
      }

      if (!String(header.location_code ?? "").trim()) {
        throw new Error(
          "Location Code is required before creating Purchase Order"
        );
      }

      await client.query(
        `
        UPDATE mandi_purchase
        SET
          vendor_no = $1,
          vendor_name = $2,
          posting_date = $3,
          challan_no = $4,
          location_code = $5,
          updated_at = NOW()
        WHERE id = $6
        `,
        [
          blankToNull(header.vendor_no),
          blankToNull(header.vendor_name),
          header.posting_date,
          blankToNull(header.challan_no),
          blankToNull(header.location_code),
          header.id,
        ]
      );

      /**
       * GET LINES
       */
      const linesResult =
        await client.query(
          `
          SELECT *
          FROM mandi_purchase_line
          WHERE mandi_purchase_id = $1
            AND COALESCE(is_deleted, false) = false
          ORDER BY line_no
          `,
          [id]
        );

      const lines =
        linesResult.rows;

      if (
        lines.length === 0
      ) {

        throw new Error(
          "No lines found"
        );
      }

      /**
       * GENERATE PO NO
       */
      const poSeriesCode =
        await resolvePurchaseNoSeries(
          client,
          "order_nos",
          "PURCHASE_ORDER"
        );

      const poNo =
        await getNextNumber(poSeriesCode);

      /**
       * CREATE PO HEADER
       */
      const poResult =
        await client.query(
          `
          INSERT INTO purchase_orders (
            document_no,
            vendor_no,
            vendor_name,
            challan_no,
            location_code,
            posting_date,
            status,
            source_mandi_purchase_id
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8
          )
          RETURNING *
          `,
          [
            poNo,
            header.vendor_no,
            header.vendor_name,
            header.challan_no,
            header.location_code,
            header.posting_date,
            "Open",
            header.id,
          ]
        );

      const po =
        poResult.rows[0];

      /**
       * CREATE PO LINES
       */
      for (const line of lines) {

        const amount =
          Number(
            line.quantity
          ) *
          Number(
            line.rate
          );

        await client.query(
          `
          INSERT INTO purchase_order_lines (
            purchase_order_id,
            line_no,
            item_no,
            item_description,
            variant_code,
            location_code,
            quantity,
            direct_unit_cost_excl_vat,
            line_amount
          )
          VALUES (
            $1,$2,$3,$4,
            $5,$6,$7,$8,$9
          )
          `,
          [
            po.id,
            line.line_no,
            line.item_no,
            line.item_description,
            line.variant_code,
            header.location_code,
            Number(
              line.quantity
            ),
            Number(
              line.rate
            ),
            amount,
          ]
        );
      }

      /**
       * UPDATE MANDI STATUS
       */
      await client.query(
        `
        UPDATE mandi_purchase
        SET
          status = 'PO Created',
          po_no = $1,
          updated_at = NOW()
        WHERE id = $2
        `,
        [
          po.document_no,
          header.id,
        ]
      );

      await client.query(
        "COMMIT"
      );

      res.json({
        success: true,

        message:
          `Purchase Order ${po.document_no} created successfully`,

        purchase_order_id:
          po.id,
      });

    } catch (err) {

      await client.query(
        "ROLLBACK"
      );

      console.error(err);

      res.status(500).json({
        error:
          err.message ||
          "Failed to create purchase order",
      });

    } finally {

      client.release();
    }
  }
);

module.exports =
  router;
