const express = require('express')
const router = express.Router()

const db = require('../db.cjs')

const {
  getNextNumber
} = require('../services/noSeriesService.cjs')

const {
  applyItemToPurchaseLine,
  applyVendorToPurchaseHeader
} = require('../services/fieldMappingService.cjs')

const {
  resolvePurchaseNoSeries
} = require('../services/purchaseNoSeriesService.cjs')

const HEADER_UPDATE_COLUMNS = [
  'vendor_no',
  'vendor_name',
  'order_date',
  'posting_date',
  'document_date',
  'due_date',
  'vendor_invoice_no',
  'challan_no',
  'quote_no',
  'location_code',
  'purchaser_code',
  'payment_terms_code',
  'payment_method_code',
  'shipment_method_code',
  'currency_code',
  'currency_factor',
  'status',
  'narration',
  'total_amount',
  'vendor_gst_reg_no',
  'broker_name',
  'brokerage',
  'delivery_terms',
  'deduction',
  'cash_discount',
  'receiving_no',
  'discount',
  'address',
  'address_2',
  'city',
  'post_code',
  'country_region_code',
  'phone_no',
  'mobile_phone_no',
  'email',
  'contact',
  'invoice_received_date',
  'vat_date',
  'vendor_invoice_date',
  'expected_receipt_date',
  'promised_receipt_date',
  'requested_receipt_date',
  'payment_discount_pct',
  'payment_reference',
  'creditor_no',
  'on_hold',
  'department_code',
  'receiving_no_series',
  'your_reference',
  'prepared_by',
  'referred_by',
  'referred_by_phone_no',
  'vendor_order_no',
  'alternate_vendor_address_code',
  'charge_group_code',
  'order_type',
  'broker_code'
]

const LINE_UPDATE_COLUMNS = [
  'type',
  'item_no',
  'item_description',
  'variant_code',
  'location_code',
  'gst_group_code',
  'unit_of_measure_code',
  'quantity',
  'direct_unit_cost_excl_vat',
  'line_discount_pct',
  'line_discount_amount',
  'tax_pct',
  'tax_amount',
  'line_amount',
  'amount_including_tax',
  'qty_to_receive',
  'qty_to_invoice',
  'received_quantity',
  'rejected_qty',
  'gross_weight',
  'net_weight',
  'hsn_sac_code'
]

async function ensurePurchaseOrderLineInvoiceColumns(client = db) {
  await client.query(
    `ALTER TABLE purchase_order_lines
     ADD COLUMN IF NOT EXISTS qty_to_invoice NUMERIC(12,2) DEFAULT 0,
     ADD COLUMN IF NOT EXISTS qty_invoiced NUMERIC(12,2) DEFAULT 0,
     ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(12,2) DEFAULT 0,
     ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(5,2) DEFAULT 0,
     ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0,
     ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(12,2) DEFAULT 0`
  )
}

function buildPatch(columns, body) {
  const sets = []
  const values = []

  for (const column of columns) {
    if (Object.prototype.hasOwnProperty.call(body, column)) {
      values.push(blankToNull(body[column]))
      sets.push(`${column} = $${values.length}`)
    }
  }

  return {
    sets,
    values
  }
}

function blankToNull(value) {
  return value === '' ? null : value
}

function numberOrZero(value) {
  if (value === '' || value === null || value === undefined) {
    return 0
  }

  return Number(value)
}

function calculatePurchaseLine(line, source = {}) {
  const quantity =
    numberOrZero(line.quantity)

  const receivedQuantity =
    numberOrZero(line.received_quantity)

  const invoicedQuantity =
    numberOrZero(line.qty_invoiced)

  const unitCost =
    numberOrZero(line.direct_unit_cost_excl_vat ?? line.unit_cost)

  const discountPct =
    numberOrZero(line.line_discount_pct)

  const taxPct =
    numberOrZero(line.tax_pct)

  const outstandingQuantity =
    Math.max(quantity - receivedQuantity, 0)

  const remainingToInvoice =
    Math.max(receivedQuantity - invoicedQuantity, 0)

  const requestedQtyToReceive =
    Object.prototype.hasOwnProperty.call(source, 'qty_to_receive')
      ? numberOrZero(source.qty_to_receive)
      : numberOrZero(line.qty_to_receive)

  const shouldDefaultQtyToInvoice =
    Object.prototype.hasOwnProperty.call(source, 'received_quantity') ||
    Object.prototype.hasOwnProperty.call(source, 'qty_invoiced')

  const requestedQtyToInvoice =
    Object.prototype.hasOwnProperty.call(source, 'qty_to_invoice')
      ? numberOrZero(source.qty_to_invoice)
      : shouldDefaultQtyToInvoice
        ? remainingToInvoice
        : numberOrZero(line.qty_to_invoice ?? remainingToInvoice)

  const grossAmount =
    quantity * unitCost

  const lineDiscountAmount =
    Number((grossAmount * discountPct / 100).toFixed(2))

  const lineAmount =
    Number((grossAmount - lineDiscountAmount).toFixed(2))

  const taxAmount =
    Number((lineAmount * taxPct / 100).toFixed(2))

  return {
    ...line,
    quantity,
    received_quantity: receivedQuantity,
    qty_invoiced: Math.min(
      Math.max(invoicedQuantity, 0),
      receivedQuantity
    ),
    direct_unit_cost_excl_vat: unitCost,
    line_discount_pct: discountPct,
    line_discount_amount: lineDiscountAmount,
    tax_pct: taxPct,
    tax_amount: taxAmount,
    qty_to_receive: Math.min(
      Math.max(requestedQtyToReceive, 0),
      outstandingQuantity
    ),
    qty_to_invoice: Math.min(
      Math.max(requestedQtyToInvoice, 0),
      remainingToInvoice
    ),
    line_amount: lineAmount,
    amount_including_tax: Number((lineAmount + taxAmount).toFixed(2))
  }
}

/**
 * GET PURCHASE ORDERS
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         po.*,
         COALESCE(po.challan_no, mp.challan_no) AS challan_no
       FROM purchase_orders po
       LEFT JOIN mandi_purchase mp
         ON mp.id = po.source_mandi_purchase_id
       ORDER BY po.id DESC`
    )

    res.json(result.rows)

  } catch (err) {
    console.error(err)

    res.status(500).json({
      error: 'Failed to fetch purchase orders'
    })
  }
})

/**
 * GET PURCHASE ORDER HEADER
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         po.*,
         COALESCE(po.challan_no, mp.challan_no) AS challan_no
       FROM purchase_orders po
       LEFT JOIN mandi_purchase mp
         ON mp.id = po.source_mandi_purchase_id
       WHERE po.id = $1
         AND COALESCE(po.is_deleted, false) = false`,
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Purchase order not found'
      })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error(err)

    res.status(500).json({
      error: 'Failed to fetch purchase order'
    })
  }
})

/**
 * GET PURCHASE ORDER LINES
 */
router.get('/:id/lines', async (req, res) => {
  try {
    await ensurePurchaseOrderLineInvoiceColumns()

    const result = await db.query(
      `SELECT *
       FROM purchase_order_lines
       WHERE purchase_order_id = $1
         AND COALESCE(is_deleted, false) = false
       ORDER BY line_no, id`,
      [req.params.id]
    )

    res.json(result.rows)
  } catch (err) {
    console.error(err)

    res.status(500).json({
      error: 'Failed to fetch purchase order lines'
    })
  }
})

/**
 * UPDATE PURCHASE ORDER HEADER
 */
router.put('/:id', async (req, res) => {
  try {
    const body = await applyVendorToPurchaseHeader(
      db,
      req.body
    )

    const currentResult = await db.query(
      `SELECT broker_name, challan_no, location_code
       FROM purchase_orders
       WHERE id = $1
         AND COALESCE(is_deleted, false) = false`,
      [req.params.id]
    )

    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Purchase order not found'
      })
    }

    const currentPo = currentResult.rows[0]

    const effectiveBrokerName =
      Object.prototype.hasOwnProperty.call(body, 'broker_name')
        ? body.broker_name
        : currentPo.broker_name

    const effectiveChallanNo =
      Object.prototype.hasOwnProperty.call(body, 'challan_no')
        ? body.challan_no
        : currentPo.challan_no

    const effectiveLocationCode =
      Object.prototype.hasOwnProperty.call(body, 'location_code')
        ? body.location_code
        : currentPo.location_code

    if (!String(effectiveBrokerName ?? '').trim()) {
      return res.status(400).json({
        error: 'Broker Name is required'
      })
    }

    if (!String(effectiveChallanNo ?? '').trim()) {
      return res.status(400).json({
        error: 'Challan No. is required'
      })
    }

    if (!String(effectiveLocationCode ?? '').trim()) {
      return res.status(400).json({
        error: 'Location Code is required'
      })
    }

    const patch = buildPatch(
      HEADER_UPDATE_COLUMNS,
      body
    )

    if (patch.sets.length === 0) {
      return res.status(400).json({
        error: 'No valid purchase order fields provided'
      })
    }

    patch.values.push(req.params.id)

    const result = await db.query(
      `UPDATE purchase_orders
       SET ${patch.sets.join(', ')},
           updated_at = NOW()
       WHERE id = $${patch.values.length}
       RETURNING *`,
      patch.values
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Purchase order not found'
      })
    }

    const updatedPo = result.rows[0]

    if (
      Object.prototype.hasOwnProperty.call(body, 'vendor_no') ||
      Object.prototype.hasOwnProperty.call(body, 'vendor_name') ||
      Object.prototype.hasOwnProperty.call(body, 'challan_no') ||
      Object.prototype.hasOwnProperty.call(body, 'location_code')
    ) {
      await db.query(
        `UPDATE inward_gate_entries
         SET
           vendor_no = $1,
           vendor_name = $2,
           challan_no = $3,
           location_code = $4,
           updated_at = NOW()
         WHERE source_purchase_order_id = $5
           AND COALESCE(is_deleted, false) = false`,
        [
          blankToNull(updatedPo.vendor_no),
          blankToNull(updatedPo.vendor_name),
          blankToNull(updatedPo.challan_no),
          blankToNull(updatedPo.location_code),
          updatedPo.id,
        ]
      )

      await db.query(
        `UPDATE posted_purchase_receipts
         SET
           vendor_no = $1,
           vendor_name = $2,
           challan_no = $3,
           location_code = $4,
           updated_at = NOW()
         WHERE source_purchase_order_id = $5
           AND COALESCE(is_deleted, false) = false`,
        [
          blankToNull(updatedPo.vendor_no),
          blankToNull(updatedPo.vendor_name),
          blankToNull(updatedPo.challan_no),
          blankToNull(updatedPo.location_code),
          updatedPo.id,
        ]
      )
    }

    res.json(updatedPo)
  } catch (err) {
    console.error(err)

    res.status(500).json({
      error: 'Failed to update purchase order'
    })
  }
})

/**
 * UPDATE PURCHASE ORDER LINE
 */
router.put('/lines/:lineId', async (req, res) => {
  try {
    await ensurePurchaseOrderLineInvoiceColumns()

    const existingResult = await db.query(
      `SELECT *
       FROM purchase_order_lines
       WHERE id = $1
         AND COALESCE(is_deleted, false) = false`,
      [req.params.lineId]
    )

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Purchase order line not found'
      })
    }

    const body = await applyItemToPurchaseLine(
      db,
      {
        ...existingResult.rows[0],
        ...req.body
      }
    )

    const calculatedBody =
      calculatePurchaseLine(body, req.body)

    const patch = buildPatch(
      LINE_UPDATE_COLUMNS,
      calculatedBody
    )

    if (patch.sets.length === 0) {
      return res.status(400).json({
        error: 'No valid purchase order line fields provided'
      })
    }

    patch.values.push(req.params.lineId)

    const result = await db.query(
      `UPDATE purchase_order_lines
       SET ${patch.sets.join(', ')},
           updated_at = NOW()
       WHERE id = $${patch.values.length}
       RETURNING *`,
      patch.values
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Purchase order line not found'
      })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error(err)

    res.status(500).json({
      error: 'Failed to update purchase order line'
    })
  }
})

/**
 * CREATE PURCHASE ORDER
 */
router.post('/', async (req, res) => {
  const client = await db.connect()

  try {
    await client.query('BEGIN')
    await ensurePurchaseOrderLineInvoiceColumns(client)

    const body = await applyVendorToPurchaseHeader(
      client,
      req.body
    )

    const seriesCode = await resolvePurchaseNoSeries(
      client,
      'order_nos',
      'PURCHASE_ORDER'
    )

    /**
     * GENERATE NUMBER
     */
    const documentNo =
      await getNextNumber(seriesCode)

    /**
     * INSERT HEADER
     */
    const headerResult = await client.query(
      `INSERT INTO purchase_orders (
        document_no,
        vendor_no,
        vendor_name,
        order_date,
        posting_date,
        document_date,
        due_date,
        vendor_invoice_no,
        quote_no,
        location_code,
        purchaser_code,
        payment_terms_code,
        payment_method_code,
        shipment_method_code,
        currency_code,
        currency_factor,
        status,
        narration,
        total_amount,
        vendor_gst_reg_no,
        broker_name,
        brokerage,
        delivery_terms,
        deduction,
        cash_discount,
        receiving_no,
        discount,
        address,
        address_2,
        city,
        post_code,
        country_region_code,
        phone_no,
        mobile_phone_no,
        email,
        contact,
        invoice_received_date,
        vat_date,
        vendor_invoice_date,
        expected_receipt_date,
        promised_receipt_date,
        requested_receipt_date,
        payment_discount_pct,
        payment_reference,
        creditor_no,
        on_hold,
        department_code,
        receiving_no_series,
        your_reference,
        prepared_by,
        referred_by,
        referred_by_phone_no,
        vendor_order_no,
        alternate_vendor_address_code,
        charge_group_code,
        order_type,
        broker_code,
        source_mandi_purchase_id,
        challan_no
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
        $31,$32,$33,$34,$35,$36,$37,$38,$39,$40,
        $41,$42,$43,$44,$45,$46,$47,$48,$49,$50,
        $51,$52,$53,$54,$55,$56,$57,$58,$59
      )
      RETURNING *`,
      [
        documentNo,
        blankToNull(body.vendor_no),
        blankToNull(body.vendor_name),
        blankToNull(body.order_date),
        blankToNull(body.posting_date || body.order_date),
        blankToNull(body.document_date || body.order_date),
        blankToNull(body.due_date),
        blankToNull(body.vendor_invoice_no),
        blankToNull(body.quote_no),
        blankToNull(body.location_code),
        blankToNull(body.purchaser_code),
        blankToNull(body.payment_terms_code),
        blankToNull(body.payment_method_code),
        blankToNull(body.shipment_method_code),
        blankToNull(body.currency_code),
        body.currency_factor || 1,
        body.status || 'Open',
        blankToNull(body.narration),
        numberOrZero(body.total_amount),
        blankToNull(body.vendor_gst_reg_no),
        blankToNull(body.broker_name),
        numberOrZero(body.brokerage),
        blankToNull(body.delivery_terms),
        numberOrZero(body.deduction),
        numberOrZero(body.cash_discount),
        blankToNull(body.receiving_no),
        numberOrZero(body.discount),
        blankToNull(body.address),
        blankToNull(body.address_2),
        blankToNull(body.city),
        blankToNull(body.post_code),
        blankToNull(body.country_region_code),
        blankToNull(body.phone_no),
        blankToNull(body.mobile_phone_no),
        blankToNull(body.email),
        blankToNull(body.contact),
        blankToNull(body.invoice_received_date),
        blankToNull(body.vat_date),
        blankToNull(body.vendor_invoice_date),
        blankToNull(body.expected_receipt_date),
        blankToNull(body.promised_receipt_date),
        blankToNull(body.requested_receipt_date),
        numberOrZero(body.payment_discount_pct),
        blankToNull(body.payment_reference),
        blankToNull(body.creditor_no),
        blankToNull(body.on_hold),
        blankToNull(body.department_code),
        blankToNull(body.receiving_no_series),
        blankToNull(body.your_reference),
        blankToNull(body.prepared_by),
        blankToNull(body.referred_by),
        blankToNull(body.referred_by_phone_no),
        blankToNull(body.vendor_order_no),
        blankToNull(body.alternate_vendor_address_code),
        blankToNull(body.charge_group_code),
        blankToNull(body.order_type),
        blankToNull(body.broker_code),
        blankToNull(body.source_mandi_purchase_id),
        blankToNull(body.challan_no)
      ]
    )

    const header = headerResult.rows[0]

    /**
     * INSERT LINES
     */
    for (const rawLine of body.lines || []) {
      const line = await applyItemToPurchaseLine(
        client,
        rawLine
      )

      const calculatedLine =
        calculatePurchaseLine(line, rawLine)

      await client.query(
        `INSERT INTO purchase_order_lines (
          purchase_order_id,
          document_no,
          line_no,
          item_no,
          item_description,
          location_code,
          gst_group_code,
          unit_of_measure_code,
          quantity,
          direct_unit_cost_excl_vat,
          line_discount_pct,
          line_discount_amount,
          tax_pct,
          tax_amount,
          line_amount,
          amount_including_tax,
          qty_to_receive,
          qty_to_invoice,
          qty_invoiced,
          received_quantity,
          rejected_qty,
          gross_weight,
          net_weight,
          hsn_sac_code
        )
        VALUES (
          $1,$2,$3,$4,
          $5,$6,$7,$8,$9,$10,$11,$12,
          $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
        )`,
        [
          header.id,
          documentNo,
          calculatedLine.line_no,
          calculatedLine.item_no,
          calculatedLine.item_description || calculatedLine.description,
          calculatedLine.location_code,
          blankToNull(calculatedLine.gst_group_code),
          calculatedLine.unit_of_measure_code,
          numberOrZero(calculatedLine.quantity),
          numberOrZero(calculatedLine.direct_unit_cost_excl_vat),
          numberOrZero(calculatedLine.line_discount_pct),
          numberOrZero(calculatedLine.line_discount_amount),
          numberOrZero(calculatedLine.tax_pct),
          numberOrZero(calculatedLine.tax_amount),
          numberOrZero(calculatedLine.line_amount),
          numberOrZero(calculatedLine.amount_including_tax),
          numberOrZero(calculatedLine.qty_to_receive),
          numberOrZero(calculatedLine.qty_to_invoice),
          numberOrZero(calculatedLine.qty_invoiced),
          numberOrZero(calculatedLine.received_quantity),
          numberOrZero(calculatedLine.rejected_qty),
          numberOrZero(calculatedLine.gross_weight),
          numberOrZero(calculatedLine.net_weight),
          blankToNull(calculatedLine.hsn_sac_code)
        ]
      )
    }

    await client.query('COMMIT')

    res.status(201).json({
      ...header,
      document_no: documentNo
    })

  } catch (err) {

    await client.query('ROLLBACK')

    console.error(err)

    res.status(500).json({
      error: err.message
    })

  } finally {
    client.release()
  }
})

module.exports = router
