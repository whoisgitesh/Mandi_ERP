const express = require("express");

const router = express.Router();

const db = require("../db.cjs");

const {
  getNextNumber,
} = require("../services/noSeriesService.cjs");

const {
  resolvePurchaseNoSeries,
} = require("../services/purchaseNoSeriesService.cjs");

const numberOrZero = (value) => {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }

  return Number(value);
};

const hasNumberValue = (value) =>
  value !== "" && value !== null && value !== undefined;

const ensureGrnQcCostingColumns = async (client = db) => {
  await client.query(`
    ALTER TABLE inward_gate_entry_lines
      ADD COLUMN IF NOT EXISTS gate_quantity NUMERIC(18,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS qc_quantity NUMERIC(18,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS accepted_quantity NUMERIC(18,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(18,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS line_discount_pct NUMERIC(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS line_amount NUMERIC(18,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(50)
  `);

  await client.query(`
    ALTER TABLE posted_purchase_receipt_lines
      ADD COLUMN IF NOT EXISTS qc_quantity NUMERIC(18,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS accepted_quantity NUMERIC(18,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS rejected_quantity NUMERIC(18,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS direct_unit_cost NUMERIC(18,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(18,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS line_discount_pct NUMERIC(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS line_amount NUMERIC(18,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS location_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS uom_code VARCHAR(50)
  `);

  await client.query(`
    ALTER TABLE purchase_order_lines
      ADD COLUMN IF NOT EXISTS qty_to_invoice NUMERIC(18,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS qty_invoiced NUMERIC(18,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(12,2) DEFAULT 0
  `);
};

const calculateGrnLine = (line) => {
  const poUnitCost =
    numberOrZero(line.po_unit_cost);

  const poQuantity =
    numberOrZero(line.po_quantity);

  const poAmount =
    numberOrZero(line.po_line_amount);

  const unitCost =
    numberOrZero(line.unit_cost) ||
    poUnitCost ||
    (poQuantity ? poAmount / poQuantity : 0);

  const lineDiscountPct =
    numberOrZero(line.line_discount_pct) ||
    numberOrZero(line.po_line_discount_pct);

  const taxPct =
    numberOrZero(line.tax_pct) ||
    numberOrZero(line.po_tax_pct);

  const gateQuantity =
    numberOrZero(line.gate_quantity) ||
    numberOrZero(line.actual_quantity) ||
    numberOrZero(line.net_quantity) ||
    numberOrZero(line.received_quantity);

  const qcQuantity =
    numberOrZero(line.qc_quantity) || gateQuantity;

  const rejectedQuantity =
    numberOrZero(line.rejected_quantity);

  const acceptedQuantity =
    hasNumberValue(line.accepted_quantity)
      ? numberOrZero(line.accepted_quantity)
      : hasNumberValue(line.qty_received)
        ? numberOrZero(line.qty_received)
        : hasNumberValue(line.received_quantity)
          ? numberOrZero(line.received_quantity)
          : Math.max(qcQuantity - rejectedQuantity, 0);

  const grossAmount =
    acceptedQuantity * unitCost;

  const lineDiscountAmount =
    Number((grossAmount * lineDiscountPct / 100).toFixed(2));

  const lineAmount =
    Number((grossAmount - lineDiscountAmount).toFixed(2));

  const taxAmount =
    Number((lineAmount * taxPct / 100).toFixed(2));

  return {
    gateQuantity,
    qcQuantity,
    rejectedQuantity,
    acceptedQuantity,
    unitCost,
    lineDiscountPct,
    lineDiscountAmount,
    taxPct,
    taxAmount,
    lineAmount,
    amountIncludingTax:
      Number((lineAmount + taxAmount).toFixed(2)),
  };
};

/**
 * GET GRN PREVIEW
 */
router.get("/:id", async (req, res) => {

  try {
    await ensureGrnQcCostingColumns();

    const { id } =
      req.params;

    const headerResult =
      await db.query(
        `
        SELECT
          i.*,
          COALESCE(i.challan_no, po.challan_no, mp.challan_no) AS challan_no,
          COALESCE(i.vendor_name, v.name) AS vendor_name,
          COALESCE(i.vendor_gst_reg_no, v.gst_registration_no) AS vendor_gst_reg_no,
          v.address,
          v.address_2,
          v.city,
          v.post_code,
          v.country_region_code,
          v.phone_no,
          v.email,
          po.document_no AS source_purchase_order_no,
          po.vendor_invoice_no,
          po.vendor_invoice_date,
          po.receiving_no,
          po.purchaser_code,
          po.broker_name,
          po.brokerage,
          po.payment_terms_code,
          po.payment_method_code,
          po.currency_code
        FROM inward_gate_entries i
        LEFT JOIN vendors v
          ON v.vendor_no = i.vendor_no
        LEFT JOIN purchase_orders po
          ON po.id = i.source_purchase_order_id
        LEFT JOIN mandi_purchase mp
          ON mp.id = po.source_mandi_purchase_id
        WHERE i.id = $1
          AND COALESCE(i.is_deleted, false) = false
        `,
        [id]
      );

    if (
      headerResult.rows.length === 0
    ) {

      return res.status(404).json({
        error:
          "GRN not found",
      });
    }

    let header =
      headerResult.rows[0];

    if (!header.grn_document_no) {
      const seriesCode =
        await resolvePurchaseNoSeries(
          db,
          "goods_receipt_note_nos",
          "GOODS_RECEIPT_NOTE"
        );

      const documentNo =
        await getNextNumber(seriesCode);

      const updateResult =
        await db.query(
          `
          UPDATE inward_gate_entries
          SET grn_document_no = $1,
              updated_at = NOW()
          WHERE id = $2
          RETURNING *
          `,
          [
            documentNo,
            id,
          ]
        );

      header = {
        ...header,
        grn_document_no: updateResult.rows[0].grn_document_no,
        updated_at: updateResult.rows[0].updated_at,
      };
    }

    const linesResult =
      await db.query(
        `
        SELECT
          l.*,
          COALESCE(pol.location_code, i.location_code) AS location_code,
          pol.unit_of_measure_code,
          pol.direct_unit_cost_excl_vat AS po_unit_cost,
          pol.line_discount_pct AS po_line_discount_pct,
          pol.tax_pct AS po_tax_pct,
          pol.gst_group_code AS po_gst_group_code,
          pol.hsn_sac_code AS po_hsn_sac_code,
          COALESCE(NULLIF(l.unit_cost, 0), pol.direct_unit_cost_excl_vat, 0) AS unit_cost,
          COALESCE(NULLIF(l.line_discount_pct, 0), pol.line_discount_pct, 0) AS line_discount_pct,
          COALESCE(NULLIF(l.tax_pct, 0), pol.tax_pct, 0) AS tax_pct,
          COALESCE(l.gst_group_code, pol.gst_group_code) AS gst_group_code,
          COALESCE(l.hsn_sac_code, pol.hsn_sac_code) AS hsn_sac_code,
          pol.quantity AS po_quantity,
          pol.line_amount AS po_line_amount,
          COALESCE(NULLIF(l.gate_quantity, 0), NULLIF(l.actual_quantity, 0), NULLIF(l.net_quantity, 0), l.received_quantity, 0) AS gate_quantity,
          COALESCE(NULLIF(l.accepted_quantity, 0), NULLIF(l.received_quantity, 0), NULLIF(l.actual_quantity, 0), 0) AS qty_received,
          COALESCE(NULLIF(l.accepted_quantity, 0), NULLIF(l.received_quantity, 0), NULLIF(l.actual_quantity, 0), 0) AS accepted_quantity,
          COALESCE(l.rejected_quantity, 0) AS rejected_quantity,
          COALESCE(NULLIF(l.qc_quantity, 0), NULLIF(l.accepted_quantity, 0), NULLIF(l.received_quantity, 0), NULLIF(l.actual_quantity, 0), 0) AS qc_quantity,
          '' AS batch_lot_no,
          COALESCE(i.status, 'Open') AS status,
          COALESCE(NULLIF(l.accepted_quantity, 0), NULLIF(l.received_quantity, 0), NULLIF(l.actual_quantity, 0), 0)
            * COALESCE(NULLIF(l.unit_cost, 0), pol.direct_unit_cost_excl_vat, 0) AS line_amount
        FROM inward_gate_entry_lines l
        JOIN inward_gate_entries i
          ON i.id = l.inward_gate_entry_id
        LEFT JOIN purchase_order_lines pol
          ON pol.id = l.po_line_id
        WHERE l.inward_gate_entry_id = $1
          AND COALESCE(l.is_deleted, false) = false
        ORDER BY l.line_no
        `,
        [id]
      );

    res.json({
      header:
        header,

      lines:
        linesResult.rows,
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error:
        "Failed to load GRN",
    });
  }
});

/**
 * SAVE GRN HEADER
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    if (!String(payload.location_code ?? "").trim()) {
      return res.status(400).json({
        error: "Location Code is required",
      });
    }

    const result = await db.query(
      `
      UPDATE inward_gate_entries
      SET
        vendor_no = NULLIF($1, ''),
        vendor_name = NULLIF($2, ''),
        vendor_gst_reg_no = NULLIF($3, ''),
        location_code = NULLIF($4, ''),
        document_date = $5,
        posting_date = $6,
        challan_no = NULLIF($7, ''),
        description = $8,
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
      `,
      [
        payload.vendor_no,
        payload.vendor_name,
        payload.vendor_gst_reg_no,
        payload.location_code,
        payload.document_date || null,
        payload.posting_date || null,
        payload.challan_no,
        payload.description,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "GRN not found",
      });
    }

    if (
      payload.source_purchase_order_id &&
      (
        Object.prototype.hasOwnProperty.call(payload, "vendor_invoice_no") ||
        Object.prototype.hasOwnProperty.call(payload, "vendor_invoice_date") ||
        Object.prototype.hasOwnProperty.call(payload, "receiving_no") ||
        Object.prototype.hasOwnProperty.call(payload, "purchaser_code") ||
        Object.prototype.hasOwnProperty.call(payload, "broker_name") ||
        Object.prototype.hasOwnProperty.call(payload, "brokerage")
      )
    ) {
      await db.query(
        `
        UPDATE purchase_orders
        SET
          vendor_invoice_no = $1,
          vendor_invoice_date = $2,
          receiving_no = $3,
          purchaser_code = $4,
          broker_name = $5,
          brokerage = $6,
          updated_at = NOW()
        WHERE id = $7
        `,
        [
          payload.vendor_invoice_no || null,
          payload.vendor_invoice_date || null,
          payload.receiving_no || null,
          payload.purchaser_code || null,
          payload.broker_name || null,
          Number(payload.brokerage ?? 0),
          payload.source_purchase_order_id,
        ]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error:
        err.message ||
        "Failed to save GRN",
    });
  }
});

/**
 * SAVE GRN LINE
 */
router.put("/line/:lineId", async (req, res) => {
  try {
    await ensureGrnQcCostingColumns();

    const { lineId } = req.params;
    const payload = req.body;

    const currentResult = await db.query(
      `
      SELECT
        l.*,
        pol.direct_unit_cost_excl_vat AS po_unit_cost,
        pol.line_discount_pct AS po_line_discount_pct,
        pol.tax_pct AS po_tax_pct
      FROM inward_gate_entry_lines l
      LEFT JOIN purchase_order_lines pol
        ON pol.id = l.po_line_id
      WHERE l.id = $1
      `,
      [
        lineId,
      ]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        error: "GRN line not found",
      });
    }

    const currentLine =
      currentResult.rows[0];

    const mergedLine =
      calculateGrnLine({
        ...currentLine,
        ...payload,
        accepted_quantity:
          payload.accepted_quantity ??
          payload.qty_received ??
          payload.received_quantity ??
          currentLine.accepted_quantity,
      });

    if (mergedLine.qcQuantity > mergedLine.gateQuantity) {
      return res.status(400).json({
        error: "QC Qty cannot be greater than Gate Qty",
      });
    }

    if (
      mergedLine.acceptedQuantity + mergedLine.rejectedQuantity >
      mergedLine.qcQuantity
    ) {
      return res.status(400).json({
        error: "Accepted Qty plus Rejected Qty cannot be greater than QC Qty",
      });
    }

    const result = await db.query(
      `
      UPDATE inward_gate_entry_lines
      SET
        variant_code = $1,
        gate_quantity = $2,
        qc_quantity = $3,
        accepted_quantity = $4,
        rejected_quantity = $5,
        received_quantity = $4,
        unit_cost = $6,
        line_discount_pct = $7,
        line_discount_amount = $8,
        tax_pct = $9,
        tax_amount = $10,
        line_amount = $11,
        amount_including_tax = $12,
        updated_at = NOW()
      WHERE id = $13
      RETURNING *
      `,
      [
        payload.variant_code ?? currentLine.variant_code ?? null,
        mergedLine.gateQuantity,
        mergedLine.qcQuantity,
        mergedLine.acceptedQuantity,
        mergedLine.rejectedQuantity,
        mergedLine.unitCost,
        mergedLine.lineDiscountPct,
        mergedLine.lineDiscountAmount,
        mergedLine.taxPct,
        mergedLine.taxAmount,
        mergedLine.lineAmount,
        mergedLine.amountIncludingTax,
        lineId,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error:
        err.message ||
        "Failed to save GRN line",
    });
  }
});

/**
 * POST GRN
 */
router.post("/:id/post", async (req, res) => {

  const client =
    await db.connect();

  try {

    await client.query("BEGIN");
    await ensureGrnQcCostingColumns(client);
    await client.query(`
      ALTER TABLE posted_purchase_receipt_lines
      ADD COLUMN IF NOT EXISTS source_purchase_order_line_id INTEGER
    `);

    const { id } =
      req.params;

    /**
     * GET HEADER
     */
    const headerResult =
      await client.query(
        `
        SELECT
          i.*,
          COALESCE(i.challan_no, po.challan_no, mp.challan_no) AS challan_no
        FROM inward_gate_entries i
        LEFT JOIN purchase_orders po
          ON po.id = i.source_purchase_order_id
        LEFT JOIN mandi_purchase mp
          ON mp.id = po.source_mandi_purchase_id
        WHERE i.id = $1
          AND COALESCE(i.is_deleted, false) = false
        `,
        [id]
      );

    if (
      headerResult.rows.length === 0
    ) {

      throw new Error(
        "Inward Gate Entry not found"
      );
    }

    const header =
      headerResult.rows[0];

    if (header.posted_purchase_receipt_id) {
      throw new Error(
        "GRN is already posted"
      );
    }

    if (!String(header.location_code ?? "").trim()) {
      throw new Error("Location Code is required");
    }

    let grnDocumentNo =
      header.grn_document_no;

    if (!grnDocumentNo) {
      const grnSeriesCode =
        await resolvePurchaseNoSeries(
          client,
          "goods_receipt_note_nos",
          "GOODS_RECEIPT_NOTE"
        );

      grnDocumentNo =
        await getNextNumber(grnSeriesCode);

      await client.query(
        `
        UPDATE inward_gate_entries
        SET grn_document_no = $1,
            updated_at = NOW()
        WHERE id = $2
        `,
        [
          grnDocumentNo,
          id,
        ]
      );
    }

    /**
     * GET LINES
     */
    const linesResult =
      await client.query(
        `
        SELECT
          l.*,
          pol.location_code AS po_location_code,
          pol.unit_of_measure_code,
          pol.direct_unit_cost_excl_vat AS po_unit_cost,
          pol.line_discount_pct AS po_line_discount_pct,
          pol.tax_pct AS po_tax_pct,
          pol.gst_group_code AS po_gst_group_code,
          pol.hsn_sac_code AS po_hsn_sac_code,
          COALESCE(NULLIF(l.unit_cost, 0), pol.direct_unit_cost_excl_vat, 0) AS unit_cost,
          COALESCE(NULLIF(l.line_discount_pct, 0), pol.line_discount_pct, 0) AS line_discount_pct,
          COALESCE(NULLIF(l.tax_pct, 0), pol.tax_pct, 0) AS tax_pct,
          COALESCE(l.gst_group_code, pol.gst_group_code) AS gst_group_code,
          COALESCE(l.hsn_sac_code, pol.hsn_sac_code) AS hsn_sac_code,
          pol.quantity AS po_quantity,
          COALESCE(NULLIF(l.gate_quantity, 0), NULLIF(l.actual_quantity, 0), NULLIF(l.net_quantity, 0), l.received_quantity, 0) AS gate_quantity,
          COALESCE(NULLIF(l.qc_quantity, 0), NULLIF(l.accepted_quantity, 0), NULLIF(l.received_quantity, 0), NULLIF(l.actual_quantity, 0), 0) AS qc_quantity,
          COALESCE(NULLIF(l.accepted_quantity, 0), NULLIF(l.received_quantity, 0), NULLIF(l.actual_quantity, 0), 0) AS accepted_quantity,
          pol.line_amount AS po_line_amount
        FROM inward_gate_entry_lines l
        LEFT JOIN purchase_order_lines pol
          ON pol.id = l.po_line_id
        WHERE l.inward_gate_entry_id = $1
          AND COALESCE(l.is_deleted, false) = false
        `,
        [id]
      );

    const lines =
      linesResult.rows;

    const postedSeriesCode =
      await resolvePurchaseNoSeries(
        client,
        "posted_receipt_nos",
        "POSTED_PURCHASE_RECEIPT"
      );

    const postedDocumentNo =
      await getNextNumber(postedSeriesCode);

    const postedHeaderResult =
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
          postedDocumentNo,
          header.vendor_no,
          header.vendor_name,
          header.posting_date,
          header.document_date,
          header.lr_no,
          header.lr_date,
          header.description || grnDocumentNo,
          header.source_purchase_order_id,
          header.id,
          header.vehicle_no,
          header.challan_no,
          header.entry_type || "Inward",
          header.location_code,
        ]
      );

    const postedHeader =
      postedHeaderResult.rows[0];

    /**
     * UPDATE INVENTORY
     */
    for (const line of lines) {

      const calculatedLine =
        calculateGrnLine(line);

      if (calculatedLine.qcQuantity > calculatedLine.gateQuantity) {
        throw new Error(
          `QC Qty cannot be greater than Gate Qty for line ${line.line_no}`
        );
      }

      if (
        calculatedLine.acceptedQuantity + calculatedLine.rejectedQuantity >
        calculatedLine.qcQuantity
      ) {
        throw new Error(
          `Accepted Qty plus Rejected Qty cannot be greater than QC Qty for line ${line.line_no}`
        );
      }

      const qty =
        calculatedLine.acceptedQuantity;

      await client.query(
        `
        UPDATE items
        SET
          inventory =
            COALESCE(inventory, 0)
            + $1,
          updated_at = NOW()
        WHERE item_no = $2
        `,
        [
          qty,
          line.item_no,
        ]
      );

      /**
       * UPDATE PO RECEIVED QTY
       */
      if (
        line.po_line_id
      ) {

        await client.query(
          `
          UPDATE purchase_order_lines
          SET
            received_quantity =
              COALESCE(received_quantity, 0)
              + $1,
            qty_to_invoice =
              GREATEST(
                COALESCE(received_quantity, 0)
                + $1
                - COALESCE(qty_invoiced, 0),
                0
              ),
            updated_at = NOW()
          WHERE id = $2
          `,
          [
            qty,
            line.po_line_id,
          ]
        );
      }

      const postedLineResult =
        await client.query(
        `
        INSERT INTO posted_purchase_receipt_lines (
          posted_purchase_receipt_id,
          source_purchase_order_line_id,
          line_no,
          item_no,
          variant_code,
          item_description,
          location_code,
          gst_group_code,
          uom_code,
          quantity_received,
          first_weight,
          second_weight,
          net_quantity,
          vendor_weight,
          excess_weight,
          qc_quantity,
          accepted_quantity,
          rejected_quantity,
          direct_unit_cost,
          unit_cost,
          line_discount_pct,
          line_discount_amount,
          tax_pct,
          tax_amount,
          line_amount,
          amount_including_tax,
          hsn_sac_code
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,$11,$12,
          $13,$14,$15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24,$25,$26,$27
        )
        RETURNING id
        `,
        [
          postedHeader.id,
          line.po_line_id || null,
          line.line_no,
          line.item_no,
          line.variant_code || null,
          line.item_description,
          line.po_location_code || header.location_code || null,
          line.gst_group_code || line.po_gst_group_code || null,
          line.unit_of_measure_code || null,
          qty,
          Number(line.first_weight ?? 0),
          Number(line.second_weight ?? 0),
          Number(line.net_quantity ?? qty),
          Number(line.vendor_weight ?? 0),
          Number(line.excess_weight ?? 0),
          calculatedLine.qcQuantity,
          calculatedLine.acceptedQuantity,
          calculatedLine.rejectedQuantity,
          calculatedLine.unitCost,
          calculatedLine.unitCost,
          calculatedLine.lineDiscountPct,
          calculatedLine.lineDiscountAmount,
          calculatedLine.taxPct,
          calculatedLine.taxAmount,
          calculatedLine.lineAmount,
          calculatedLine.amountIncludingTax,
          line.hsn_sac_code || line.po_hsn_sac_code || null,
        ]
      );

      const unitCost =
        calculatedLine.unitCost;

      const costAmount =
        calculatedLine.lineAmount;

      await client.query(
        `
        INSERT INTO item_ledger_entries (
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
          source_line_id
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,
          $19,$20,$21,$22
        )
        `,
        [
          postedHeader.posting_date,
          "Purchase",
          "Purchase Receipt",
          postedHeader.document_no,
          line.item_no,
          line.item_description,
          line.po_location_code || header.location_code || null,
          line.variant_code || null,
          line.unit_of_measure_code || null,
          qty,
          qty,
          qty,
          0,
          unitCost,
          0,
          costAmount,
          postedHeader.vendor_no,
          header.vendor_name || null,
          true,
          "posted_purchase_receipt_lines",
          postedHeader.id,
          postedLineResult.rows[0].id,
        ]
      );
    }

    if (header.source_purchase_order_id) {
      const receiptStatusResult =
        await client.query(
          `
          SELECT
            COALESCE(SUM(COALESCE(quantity, 0)), 0) AS ordered_quantity,
            COALESCE(SUM(COALESCE(received_quantity, 0)), 0) AS received_quantity
          FROM purchase_order_lines
          WHERE purchase_order_id = $1
            AND COALESCE(is_deleted, false) = false
          `,
          [header.source_purchase_order_id]
        );

      const orderedQuantity =
        Number(receiptStatusResult.rows[0]?.ordered_quantity ?? 0);

      const receivedQuantity =
        Number(receiptStatusResult.rows[0]?.received_quantity ?? 0);

      if (orderedQuantity > 0 && receivedQuantity >= orderedQuantity) {
        await client.query(
          `
          UPDATE purchase_orders
          SET status = 'Posted',
              updated_at = NOW()
          WHERE id = $1
          `,
          [header.source_purchase_order_id]
        );
      }
    }

    /**
     * MARK IGE POSTED
     */
    await client.query(
      `
      UPDATE inward_gate_entries
      SET
        status = 'Posted',
        posted_purchase_receipt_id = $2,
        updated_at = NOW()
      WHERE id = $1
      `,
      [
        id,
        postedHeader.id,
      ]
    );

    await client.query(
      "COMMIT"
    );

    res.json({
      success: true,

      message:
        "GRN posted successfully",

      posted_receipt_id:
        postedHeader.id,

      posted_receipt_no:
        postedHeader.document_no,

      grn_document_no:
        grnDocumentNo,
    });

  } catch (err) {

    await client.query(
      "ROLLBACK"
    );

    console.error(err);

    res.status(500).json({
      error:
        err.message ||
        "Failed to post GRN",
    });

  } finally {

    client.release();
  }
});


router.get(
  "/",
  async (req, res) => {

    try {

      const result =
        await db.query(`
          SELECT
            i.*,
            COALESCE(i.vendor_name, v.name) AS vendor_name
          FROM inward_gate_entries i
          LEFT JOIN vendors v
            ON v.vendor_no = i.vendor_no
          WHERE i.is_deleted = false
            AND i.grn_document_no IS NOT NULL
          ORDER BY
            i.posting_date DESC,
            i.created_at DESC
        `);

      res.json(
        result.rows
      );

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to fetch GRNs",
      });
    }
  }
);

module.exports = router;
