const express = require("express");

const router = express.Router();

const db = require("../db.cjs");

const {
  getNextNumber,
} = require("../services/noSeriesService.cjs");

const {
  resolveSalesNoSeries,
} = require("../services/salesNoSeriesService.cjs");

const {
  createCustomerLedgerEntryForPostedInvoice,
} = require("../services/ledgerService.cjs");

const blankToNull = (value) =>
  value === "" ? null : value ?? null;

const num = (value) =>
  Number(
    String(value ?? 0).replace(/,/g, "")
  );

const today = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const isPostedStatus = (status) =>
  String(status ?? "").toLowerCase() === "posted";

const rejectPostedInvoiceEdit = (res) =>
  res.status(400).json({
    error: "Posted Sales Invoice cannot be edited.",
  });

const ensurePostedSalesInvoiceSnapshotColumns = async (client) => {
  await client.query(`
    ALTER TABLE posted_sales_shipment_line
    ADD COLUMN IF NOT EXISTS quantity_shipped NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS quantity_invoiced NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS qty_to_invoice NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reversed BOOLEAN DEFAULT FALSE
  `);

  await client.query(`
    ALTER TABLE sales_invoice_line
    ADD COLUMN IF NOT EXISTS source_shipment_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS source_shipment_line_no INTEGER,
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
    ADD COLUMN IF NOT EXISTS amount_including_gst NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS hsn_sac VARCHAR(50)
  `);

  await client.query(`
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

  await client.query(`
    ALTER TABLE posted_sales_invoice_lines
    ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tax_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gst_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cgst_pct NUMERIC(7,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_pct NUMERIC(7,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS igst_pct NUMERIC(7,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gst_pct NUMERIC(7,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_including_gst NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS gst_place_of_supply VARCHAR(50),
    ADD COLUMN IF NOT EXISTS gst_group_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS gst_jurisdiction_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS source_shipment_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS source_shipment_line_no INTEGER
  `);
};

const qtyToInvoice = (line) => {
  if (
    line.qty_to_invoice !== undefined &&
    line.qty_to_invoice !== null &&
    line.qty_to_invoice !== ""
  ) {
    return num(line.qty_to_invoice);
  }

  const shipped =
    num(line.quantity_shipped || line.quantity);

  const invoiced =
    num(line.quantity_invoiced);

  return Math.max(shipped - invoiced, 0);
};

const calculateInvoiceLine = (line) => {
  const quantityShipped =
    num(line.quantity_shipped || line.quantity);

  const quantityInvoiced =
    num(line.quantity_invoiced);

  const qty =
    Math.min(
      Math.max(qtyToInvoice(line), 0),
      Math.max(quantityShipped - quantityInvoiced, 0)
    );

  const unitPrice =
    num(line.unit_price);

  const discountPct =
    num(line.line_discount_pct);

  const discountAmount =
    Number(
      (
        qty *
        unitPrice *
        discountPct /
        100
      ).toFixed(2)
    );

  const amount =
    Number(
      (
        qty *
        unitPrice -
        discountAmount
      ).toFixed(2)
    );

  const taxAmount =
    Number(
      (
        amount *
        num(line.tax_pct) /
        100
      ).toFixed(2)
    );

  const invoiceType =
    line.invoice_type ||
    "Taxable";
  const isTaxable =
    String(invoiceType).toLowerCase() === "taxable";
  const cgstPct =
    isTaxable ? num(line.cgst_pct) : 0;
  const sgstPct =
    isTaxable ? num(line.sgst_pct) : 0;
  const igstPct =
    isTaxable ? num(line.igst_pct) : 0;
  const componentPct =
    cgstPct + sgstPct + igstPct;
  const totalGstPct =
    isTaxable
      ? num(line.total_gst_pct) || componentPct || num(line.tax_pct)
      : 0;
  const fallbackGstAmount =
    Number((amount * totalGstPct / 100).toFixed(2));
  const cgstAmount =
    isTaxable
      ? Number((amount * cgstPct / 100).toFixed(2))
      : 0;
  const sgstAmount =
    isTaxable
      ? Number((amount * sgstPct / 100).toFixed(2))
      : 0;
  const igstAmount =
    isTaxable
      ? Number((amount * igstPct / 100).toFixed(2))
      : 0;
  const componentGstAmount =
    Number((cgstAmount + sgstAmount + igstAmount).toFixed(2));
  const totalGstAmount =
    componentGstAmount > 0
      ? componentGstAmount
      : fallbackGstAmount;
  const amountIncludingGst =
    Number((amount + totalGstAmount).toFixed(2));

  return {
    ...line,
    quantity: quantityShipped,
    quantity_shipped: quantityShipped,
    quantity_invoiced: quantityInvoiced,
    qty_to_invoice: qty,
    balance_qty: Number(
      (
        quantityShipped -
        quantityInvoiced -
        qty
      ).toFixed(2)
    ),
    line_discount_amount: discountAmount,
    line_amount: amount,
    taxable_amount: amount,
    invoice_type: invoiceType,
    gst_place_of_supply:
      line.gst_place_of_supply ||
      "Bill-to Address",
    gst_group_type:
      line.gst_group_type ||
      null,
    gst_jurisdiction_type:
      line.gst_jurisdiction_type ||
      null,
    cgst_pct: cgstPct,
    sgst_pct: sgstPct,
    igst_pct: igstPct,
    total_gst_pct: totalGstPct,
    cgst_amount: cgstAmount,
    sgst_amount: sgstAmount,
    igst_amount: igstAmount,
    total_gst_amount: totalGstAmount,
    amount_including_gst: amountIncludingGst,
    tax_pct: totalGstPct || num(line.tax_pct),
    tax_amount:
      totalGstAmount ||
      taxAmount,
    amount_including_tax:
      amountIncludingGst ||
      Number((amount + taxAmount).toFixed(2)),
  };
};

const resolveLineGstForPosting = async (client, header, line) => {
  const gstGroupCode =
    blankToNull(line.gst_group_code);
  const invoiceType =
    line.invoice_type || "Taxable";

  if (
    !gstGroupCode ||
    String(invoiceType).toLowerCase() !== "taxable"
  ) {
    return calculateInvoiceLine({
      ...line,
      cgst_pct: 0,
      sgst_pct: 0,
      igst_pct: 0,
      total_gst_pct: 0,
      gst_jurisdiction_type: null,
    });
  }

  const postingDate =
    blankToNull(header.posting_date) ||
    blankToNull(header.document_date) ||
    today();
  const fromState =
    blankToNull(
      header.location_state_code ||
      header.from_state_code ||
      header.company_state_code
    );
  const toState =
    blankToNull(
      header.bill_to_state_code ||
      header.customer_state_code ||
      header.to_state_code
    );
  const explicitCalculationType =
    fromState && toState
      ? fromState === toState
        ? "Intra-State"
        : "Inter-State"
      : String(line.gst_jurisdiction_type || "")
          .toLowerCase()
          .includes("inter")
        ? "Inter-State"
        : String(line.gst_jurisdiction_type || "")
            .toLowerCase()
            .includes("intra")
          ? "Intra-State"
          : null;

  const preferredRateResult =
    await client.query(
      `
      SELECT
        gr.*,
        gg.gst_group_type
      FROM gst_rates gr
      LEFT JOIN gst_groups gg
        ON gg.code = gr.gst_group_code
      WHERE gr.gst_group_code = $1
        AND gr.is_active = true
        AND gr.effective_from <= $2::date
        AND (gr.effective_to IS NULL OR gr.effective_to >= $2::date)
        AND (
          $3::varchar IS NULL
          OR gr.gst_calculation_type = $3
        )
        AND (
          $4::varchar IS NULL
          OR gr.from_state_code IS NULL
          OR gr.from_state_code = $4
        )
        AND (
          $5::varchar IS NULL
          OR gr.to_state_code IS NULL
          OR gr.to_state_code = $5
        )
      ORDER BY
        CASE
          WHEN $3::varchar IS NOT NULL AND gr.gst_calculation_type = $3 THEN 0
          ELSE 1
        END,
        CASE WHEN gr.from_state_code IS NULL THEN 1 ELSE 0 END,
        CASE WHEN gr.to_state_code IS NULL THEN 1 ELSE 0 END,
        gr.effective_from DESC,
        gr.id DESC
      LIMIT 1
      `,
      [
        gstGroupCode,
        postingDate,
        explicitCalculationType,
        fromState,
        toState,
      ]
    );

  let rate =
    preferredRateResult.rows[0];

  if (!rate && explicitCalculationType) {
    const fallbackRateResult =
      await client.query(
        `
        SELECT
          gr.*,
          gg.gst_group_type
        FROM gst_rates gr
        LEFT JOIN gst_groups gg
          ON gg.code = gr.gst_group_code
        WHERE gr.gst_group_code = $1
          AND gr.is_active = true
          AND gr.effective_from <= $2::date
          AND (gr.effective_to IS NULL OR gr.effective_to >= $2::date)
        ORDER BY
          gr.effective_from DESC,
          gr.id DESC
        LIMIT 1
        `,
        [
          gstGroupCode,
          postingDate,
        ]
      );

    rate =
      fallbackRateResult.rows[0];
  }

  if (!rate) {
    return calculateInvoiceLine(line);
  }

  return calculateInvoiceLine({
    ...line,
    gst_group_type:
      rate.gst_group_type ||
      line.gst_group_type,
    gst_jurisdiction_type:
      String(rate.gst_calculation_type || "")
        .toLowerCase()
        .includes("inter")
        ? "Interstate"
        : "Intrastate",
    cgst_pct:
      num(rate.cgst_pct),
    sgst_pct:
      num(rate.sgst_pct),
    igst_pct:
      num(rate.igst_pct),
    total_gst_pct:
      num(rate.total_gst_pct),
    tax_pct:
      num(rate.total_gst_pct),
  });
};

const validateInvoiceLine = (line) => {
  const quantityShipped =
    num(line.quantity_shipped || line.quantity);
  const quantityInvoiced =
    num(line.quantity_invoiced);
  const requestedQty =
    qtyToInvoice(line);
  const remaining =
    Math.max(quantityShipped - quantityInvoiced, 0);
  const unitPrice =
    num(line.unit_price);
  const discountPct =
    num(line.line_discount_pct);
  const taxPct =
    num(line.tax_pct);

  if (quantityShipped < 0) {
    return "Quantity Shipped cannot be negative";
  }

  if (quantityInvoiced < 0) {
    return "Quantity Invoiced cannot be negative";
  }

  if (requestedQty < 0) {
    return "Qty. to Invoice cannot be negative";
  }

  if (requestedQty > remaining) {
    return "Qty. to Invoice cannot be greater than Quantity Shipped minus Quantity Invoiced";
  }

  if (unitPrice < 0) {
    return "Unit Price cannot be negative";
  }

  if (discountPct < 0 || discountPct > 100) {
    return "Line Discount % must be between 0 and 100";
  }

  if (taxPct < 0) {
    return "Tax / VAT % cannot be negative";
  }

  return null;
};

const normalizeDraftInvoiceLine = (header, line) => {
  const isOpenInvoice =
    String(header.status ?? "Open").toLowerCase() !== "posted" &&
    !header.posted_sales_invoice_id;

  if (!isOpenInvoice) {
    return line;
  }

  const quantityShipped =
    num(line.quantity_shipped || line.quantity);
  const quantityInvoiced =
    num(line.quantity_invoiced);
  const qtyToInvoiceValue =
    num(line.qty_to_invoice);
  const remaining =
    Math.max(quantityShipped - quantityInvoiced, 0);

  if (
    remaining > 0 &&
    qtyToInvoiceValue === 0
  ) {
    return {
      ...line,
      qty_to_invoice: remaining,
    };
  }

  return line;
};

router.get("/", async (req, res) => {
  try {
    const result =
      await db.query(`
        SELECT *
        FROM sales_invoice
        WHERE COALESCE(is_deleted, false) = false
        ORDER BY posting_date DESC,
                 created_at DESC
      `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        "Failed to fetch sales invoices",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const seriesCode =
      await resolveSalesNoSeries(
        db,
        [
          "invoice_nos",
          "sales_invoice_nos",
        ],
        "SALES_INVOICE"
      );

    const documentNo =
      await getNextNumber(seriesCode);

    const payload =
      req.body ?? {};

    if (!String(payload.location_code ?? "").trim()) {
      return res.status(400).json({
        error:
          "Location Code is required",
      });
    }

    const validationError =
      validateInvoiceLine(payload);

    if (validationError) {
      return res.status(400).json({
        error: validationError,
      });
    }

    const calculatedLine =
      calculateInvoiceLine(payload);

    const result =
      await db.query(
        `
        INSERT INTO sales_invoice (
          document_no,
          customer_no,
          customer_name,
          posting_date,
          document_date,
          status
        )
        VALUES ($1,$2,$3,$4,$5,'Open')
        RETURNING *
        `,
        [
          documentNo,
          blankToNull(payload.customer_no),
          blankToNull(payload.customer_name),
          blankToNull(payload.posting_date) || today(),
          blankToNull(payload.document_date) || today(),
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
        "Failed to create sales invoice",
    });
  }
});

router.post("/from-shipment/:shipmentNo", async (req, res) => {
  const client =
    await db.connect();

  try {
    await client.query("BEGIN");
    await ensurePostedSalesInvoiceSnapshotColumns(client);

    const { shipmentNo } =
      req.params;

    const headerResult =
      await client.query(
        `
        SELECT
          pss.*,
          so.document_no AS source_sales_order_no
        FROM posted_sales_shipment pss
        LEFT JOIN sales_orders so
          ON so.id = pss.source_sales_order_id
        WHERE (pss.document_no = $1 OR pss.id::text = $1)
          AND COALESCE(pss.is_deleted, false) = false
        `,
        [shipmentNo]
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
          gg.gst_group_type AS gst_group_type,
          COALESCE(pssl.hsn_sac_code, sol.hsn_sac_code) AS hsn_sac_code
        FROM posted_sales_shipment_line pssl
        LEFT JOIN sales_order_lines sol
          ON sol.id = pssl.sales_order_line_id
        LEFT JOIN gst_groups gg
          ON gg.code = COALESCE(pssl.gst_group_code, sol.gst_group_code)
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
        [header.id]
      );

    if (linesResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error:
          "All quantities from this shipment are already invoiced.",
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
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Open')
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

    for (const line of linesResult.rows) {
      const remainingQty =
        num(line.remaining_qty_to_invoice);

      const values =
        calculateInvoiceLine({
          ...line,
          quantity: line.quantity_shipped,
          quantity_shipped:
            line.quantity_shipped,
          quantity_invoiced:
            line.quantity_invoiced,
          qty_to_invoice:
            remainingQty,
        });

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
          source_shipment_no,
          source_shipment_line_no,
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
          taxable_amount,
          tax_pct,
          tax_amount,
          amount_including_tax,
          amount_including_gst,
          gst_place_of_supply,
          gst_group_type,
          gst_jurisdiction_type,
          invoice_type,
          cgst_pct,
          sgst_pct,
          igst_pct,
          total_gst_pct,
          cgst_amount,
          sgst_amount,
          igst_amount,
          total_gst_amount,
          hsn_sac_code
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40)
        `,
        [
          invoice.id,
          line.line_no,
          blankToNull(line.item_no),
          blankToNull(line.item_description),
          blankToNull(header.document_no),
          line.line_no,
          blankToNull(header.document_no),
          line.line_no,
          "Item",
          blankToNull(line.variant_code),
          blankToNull(line.location_code || header.location_code),
          blankToNull(line.gst_group_code),
          blankToNull(line.unit_of_measure_code),
          num(line.quantity_shipped),
          num(line.quantity_shipped),
          num(line.quantity_invoiced),
          remainingQty,
          values.balance_qty,
          num(line.unit_price),
          num(line.line_discount_pct),
          values.line_discount_amount,
          values.line_amount,
          values.taxable_amount,
          values.tax_pct,
          values.tax_amount,
          values.amount_including_tax,
          values.amount_including_gst,
          values.gst_place_of_supply,
          blankToNull(values.gst_group_type),
          blankToNull(values.gst_jurisdiction_type),
          values.invoice_type,
          values.cgst_pct,
          values.sgst_pct,
          values.igst_pct,
          values.total_gst_pct,
          values.cgst_amount,
          values.sgst_amount,
          values.igst_amount,
          values.total_gst_amount,
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
        err.message ||
        "Failed to create sales invoice from posted shipment",
    });
  } finally {
    client.release();
  }
});

router.get("/:id", async (req, res) => {
  try {
    await ensurePostedSalesInvoiceSnapshotColumns(db);

    const { id } =
      req.params;

    const header =
      await db.query(
        `
        SELECT
          si.*,
          pss.document_no AS source_shipment_no,
          so.document_no AS source_sales_order_no
        FROM sales_invoice si
        LEFT JOIN posted_sales_shipment pss
          ON pss.id = si.source_posted_sales_shipment_id
        LEFT JOIN sales_orders so
          ON so.id = si.source_sales_order_id
        WHERE si.id = $1
          AND COALESCE(si.is_deleted, false) = false
        `,
        [id]
      );

    if (header.rows.length === 0) {
      return res.status(404).json({
        error:
          "Sales invoice not found",
      });
    }

    const lines =
      await db.query(
        `
        SELECT
          sil.*,
          COALESCE(NULLIF(pssl.unit_price, 0), sol.unit_price, NULLIF(sil.unit_price, 0), 0) AS unit_price,
          COALESCE(NULLIF(pssl.line_discount_pct, 0), sol.line_discount_pct, NULLIF(sil.line_discount_pct, 0), 0) AS line_discount_pct,
          COALESCE(NULLIF(pssl.tax_pct, 0), sol.tax_pct, NULLIF(sil.tax_pct, 0), 0) AS tax_pct,
          COALESCE(sil.gst_group_code, pssl.gst_group_code, sol.gst_group_code) AS gst_group_code,
          COALESCE(sil.gst_group_type, gg.gst_group_type) AS gst_group_type,
          COALESCE(sil.gst_place_of_supply, 'Bill-to Address') AS gst_place_of_supply,
          COALESCE(sil.invoice_type, 'Taxable') AS invoice_type,
          COALESCE(sil.hsn_sac_code, pssl.hsn_sac_code, sol.hsn_sac_code) AS hsn_sac_code,
          COALESCE(sil.location_code, pssl.location_code, sol.location_code) AS location_code,
          COALESCE(sil.unit_of_measure_code, pssl.unit_of_measure_code, sol.unit_of_measure_code) AS unit_of_measure_code
        FROM sales_invoice_line sil
        LEFT JOIN posted_sales_shipment pss
          ON pss.id = $2
        LEFT JOIN posted_sales_shipment_line pssl
          ON pssl.posted_sales_shipment_id = pss.id
         AND pssl.line_no = sil.shipment_line_no
         AND COALESCE(pssl.is_deleted, false) = false
        LEFT JOIN sales_order_lines sol
          ON sol.id = pssl.sales_order_line_id
          OR (
            sol.sales_order_id = $3
            AND sol.line_no = sil.line_no
            AND COALESCE(sol.is_deleted, false) = false
          )
        LEFT JOIN gst_groups gg
          ON gg.code = COALESCE(sil.gst_group_code, pssl.gst_group_code, sol.gst_group_code)
        WHERE sil.sales_invoice_id = $1
          AND COALESCE(sil.is_deleted, false) = false
        ORDER BY sil.line_no
        `,
        [
          id,
          header.rows[0].source_posted_sales_shipment_id,
          header.rows[0].source_sales_order_id,
        ]
      );

    res.json({
      header:
        header.rows[0],
      lines:
        lines.rows.map((line) =>
          calculateInvoiceLine(
            normalizeDraftInvoiceLine(
              header.rows[0],
              line
            )
          )
        ),
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        "Failed to fetch sales invoice",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } =
      req.params;

    const payload =
      req.body ?? {};

    const existing =
      await db.query(
        `
        SELECT status
        FROM sales_invoice
        WHERE id = $1
          AND COALESCE(is_deleted, false) = false
        `,
        [id]
      );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        error:
          "Sales invoice not found",
      });
    }

    if (isPostedStatus(existing.rows[0].status)) {
      return rejectPostedInvoiceEdit(res);
    }

    const result =
      await db.query(
        `
        UPDATE sales_invoice
        SET
          customer_no = $1,
          customer_name = $2,
          posting_date = $3,
          document_date = $4,
          status = $5,
          total_amount = $6,
          due_date = $7,
          location_code = $8,
          customer_gst_reg_no = $9,
          gst_customer_type = $10,
          salesperson_code = $11,
          external_document_no = $12,
          discount = $13,
          narration = $14,
          address = $15,
          address_2 = $16,
          city = $17,
          post_code = $18,
          country_region_code = $19,
          contact = $20,
          email = $21,
          phone_no = $22,
          currency_code = $23,
          payment_terms_code = $24,
          payment_method_code = $25,
          total_tax = $26,
          bill_to_customer_no = $27,
          bill_to_name = $28,
          remarks = $29,
          amount_including_tax = $30,
          updated_at = NOW()
        WHERE id = $31
          AND COALESCE(is_deleted, false) = false
        RETURNING *
        `,
        [
          blankToNull(payload.customer_no),
          blankToNull(payload.customer_name),
          blankToNull(payload.posting_date),
          blankToNull(payload.document_date),
          blankToNull(payload.status) || "Open",
          num(payload.total_amount),
          blankToNull(payload.due_date),
          blankToNull(payload.location_code),
          blankToNull(payload.customer_gst_reg_no),
          blankToNull(payload.gst_customer_type),
          blankToNull(payload.salesperson_code),
          blankToNull(payload.external_document_no),
          num(payload.discount),
          blankToNull(payload.narration),
          blankToNull(payload.address),
          blankToNull(payload.address_2),
          blankToNull(payload.city),
          blankToNull(payload.post_code),
          blankToNull(payload.country_region_code),
          blankToNull(payload.contact),
          blankToNull(payload.email),
          blankToNull(payload.phone_no),
          blankToNull(payload.currency_code),
          blankToNull(payload.payment_terms_code),
          blankToNull(payload.payment_method_code),
          num(payload.total_tax),
          blankToNull(payload.bill_to_customer_no),
          blankToNull(payload.bill_to_name),
          blankToNull(payload.remarks),
          num(payload.amount_including_tax),
          id,
        ]
      );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error:
          "Sales invoice not found",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        "Failed to update sales invoice",
    });
  }
});

router.post("/:id/lines", async (req, res) => {
  try {
    await ensurePostedSalesInvoiceSnapshotColumns(db);

    const { id } =
      req.params;

    const payload =
      req.body ?? {};

    const invoiceResult =
      await db.query(
        `
        SELECT status
        FROM sales_invoice
        WHERE id = $1
          AND COALESCE(is_deleted, false) = false
        `,
        [id]
      );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        error:
          "Sales invoice not found",
      });
    }

    if (isPostedStatus(invoiceResult.rows[0].status)) {
      return rejectPostedInvoiceEdit(res);
    }

    const nextLineResult =
      await db.query(
        `
        SELECT COALESCE(MAX(line_no), 0) + 10 AS line_no
        FROM sales_invoice_line
        WHERE sales_invoice_id = $1
          AND COALESCE(is_deleted, false) = false
        `,
        [id]
      );

    const result =
      await db.query(
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
          taxable_amount,
          tax_pct,
          tax_amount,
          amount_including_tax,
          amount_including_gst,
          gst_place_of_supply,
          gst_group_type,
          gst_jurisdiction_type,
          invoice_type,
          cgst_pct,
          sgst_pct,
          igst_pct,
          total_gst_pct,
          cgst_amount,
          sgst_amount,
          igst_amount,
          total_gst_amount,
          hsn_sac_code
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36)
        RETURNING *
        `,
        [
          id,
          payload.line_no ??
            nextLineResult.rows[0].line_no,
          blankToNull(payload.item_no),
          blankToNull(payload.item_description),
          blankToNull(payload.shipment_no),
          payload.shipment_line_no ?? null,
          blankToNull(payload.type) || "Item",
          blankToNull(payload.variant_code),
          blankToNull(payload.location_code),
          blankToNull(payload.gst_group_code),
          blankToNull(payload.unit_of_measure_code),
          calculatedLine.qty_to_invoice,
          calculatedLine.quantity_shipped,
          calculatedLine.quantity_invoiced,
          calculatedLine.qty_to_invoice,
          calculatedLine.balance_qty,
          num(payload.unit_price),
          num(payload.line_discount_pct),
          calculatedLine.line_discount_amount,
          calculatedLine.line_amount,
          calculatedLine.taxable_amount,
          calculatedLine.tax_pct,
          calculatedLine.tax_amount,
          calculatedLine.amount_including_tax,
          calculatedLine.amount_including_gst,
          calculatedLine.gst_place_of_supply,
          blankToNull(calculatedLine.gst_group_type),
          blankToNull(calculatedLine.gst_jurisdiction_type),
          calculatedLine.invoice_type,
          calculatedLine.cgst_pct,
          calculatedLine.sgst_pct,
          calculatedLine.igst_pct,
          calculatedLine.total_gst_pct,
          calculatedLine.cgst_amount,
          calculatedLine.sgst_amount,
          calculatedLine.igst_amount,
          calculatedLine.total_gst_amount,
          blankToNull(payload.hsn_sac_code),
        ]
      );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        "Failed to add sales invoice line",
    });
  }
});

router.put("/line/:lineId", async (req, res) => {
  try {
    await ensurePostedSalesInvoiceSnapshotColumns(db);

    const { lineId } =
      req.params;

    const payload =
      req.body ?? {};

    const existingResult =
      await db.query(
        `
        SELECT
          sil.*,
          si.status AS invoice_status,
          si.source_posted_sales_shipment_id
        FROM sales_invoice_line sil
        JOIN sales_invoice si
          ON si.id = sil.sales_invoice_id
        WHERE sil.id = $1
          AND COALESCE(sil.is_deleted, false) = false
        `,
        [lineId]
      );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        error:
          "Sales invoice line not found",
      });
    }

    if (isPostedStatus(existingResult.rows[0].invoice_status)) {
      return rejectPostedInvoiceEdit(res);
    }

    const existingLine =
      existingResult.rows[0];

    const isShipmentLinked =
      Boolean(
        existingLine.shipment_no ||
        existingLine.shipment_line_no ||
        existingLine.source_shipment_no ||
        existingLine.source_shipment_line_no
      );

    const safePayload = {
      ...payload,
    };

    if (isShipmentLinked) {
      delete safePayload.shipment_no;
      delete safePayload.shipment_line_no;
      delete safePayload.source_shipment_no;
      delete safePayload.source_shipment_line_no;
      delete safePayload.quantity;
      delete safePayload.quantity_shipped;
      delete safePayload.quantity_invoiced;
      delete safePayload.unit_price;
      delete safePayload.line_discount_pct;
      delete safePayload.tax_pct;
      delete safePayload.gst_group_code;
      delete safePayload.hsn_sac_code;
    }

    let shipmentSourcePatch = {};

    if (
      isShipmentLinked &&
      existingLine.source_posted_sales_shipment_id
    ) {
      const sourceLineNo =
        existingLine.source_shipment_line_no ??
        existingLine.shipment_line_no;

      const sourceResult =
        await db.query(
          `
          SELECT
            pssl.*,
            COALESCE(NULLIF(pssl.unit_price, 0), sol.unit_price, 0) AS source_unit_price,
            COALESCE(NULLIF(pssl.line_discount_pct, 0), sol.line_discount_pct, 0) AS source_line_discount_pct,
            COALESCE(NULLIF(pssl.tax_pct, 0), sol.tax_pct, 0) AS source_tax_pct,
            COALESCE(pssl.gst_group_code, sol.gst_group_code) AS source_gst_group_code,
            COALESCE(pssl.hsn_sac_code, sol.hsn_sac_code) AS source_hsn_sac_code,
            gg.gst_group_type AS source_gst_group_type
          FROM posted_sales_shipment_line pssl
          LEFT JOIN sales_order_lines sol
            ON sol.id = pssl.sales_order_line_id
          LEFT JOIN gst_groups gg
            ON gg.code = COALESCE(pssl.gst_group_code, sol.gst_group_code)
          WHERE pssl.posted_sales_shipment_id = $1
            AND pssl.line_no = $2
            AND COALESCE(pssl.is_deleted, false) = false
            AND COALESCE(pssl.reversed, false) = false
          LIMIT 1
          `,
          [
            existingLine.source_posted_sales_shipment_id,
            sourceLineNo,
          ]
        );

      const sourceLine =
        sourceResult.rows[0];

      if (sourceLine) {
        shipmentSourcePatch = {
          unit_price:
            num(sourceLine.source_unit_price),
          line_discount_pct:
            num(sourceLine.source_line_discount_pct),
          tax_pct:
            num(sourceLine.source_tax_pct),
          gst_group_code:
            sourceLine.source_gst_group_code,
          hsn_sac_code:
            sourceLine.source_hsn_sac_code,
          gst_group_type:
            sourceLine.source_gst_group_type ||
            existingLine.gst_group_type,
        };
      }
    }

    const line = {
      ...existingLine,
      ...safePayload,
      ...shipmentSourcePatch,
    };

    const validationError =
      validateInvoiceLine(line);

    if (validationError) {
      return res.status(400).json({
        error: validationError,
      });
    }

    const calculatedLine =
      calculateInvoiceLine(line);

    const result =
      await db.query(
        `
        UPDATE sales_invoice_line
        SET
          item_no = COALESCE($1, item_no),
          item_description = COALESCE($2, item_description),
          shipment_no = COALESCE($3, shipment_no),
          shipment_line_no = COALESCE($4, shipment_line_no),
          type = COALESCE($5, type),
          variant_code = COALESCE($6, variant_code),
          location_code = COALESCE($7, location_code),
          gst_group_code = COALESCE($8, gst_group_code),
          unit_of_measure_code = COALESCE($9, unit_of_measure_code),
          quantity = COALESCE($10, quantity),
          quantity_shipped = COALESCE($11, quantity_shipped),
          quantity_invoiced = COALESCE($12, quantity_invoiced),
          qty_to_invoice = COALESCE($13, qty_to_invoice),
          balance_qty = COALESCE($14, balance_qty),
          unit_price = COALESCE($15, unit_price),
          line_discount_pct = COALESCE($16, line_discount_pct),
          line_discount_amount = COALESCE($17, line_discount_amount),
          line_amount = COALESCE($18, line_amount),
          tax_pct = COALESCE($19, tax_pct),
          tax_amount = COALESCE($20, tax_amount),
          amount_including_tax = COALESCE($21, amount_including_tax),
          hsn_sac_code = COALESCE($22, hsn_sac_code),
          taxable_amount = $23,
          amount_including_gst = $24,
          gst_place_of_supply = COALESCE($25, gst_place_of_supply),
          gst_group_type = COALESCE($26, gst_group_type),
          gst_jurisdiction_type = COALESCE($27, gst_jurisdiction_type),
          invoice_type = COALESCE($28, invoice_type),
          cgst_pct = $29,
          sgst_pct = $30,
          igst_pct = $31,
          total_gst_pct = $32,
          cgst_amount = $33,
          sgst_amount = $34,
          igst_amount = $35,
          total_gst_amount = $36,
          updated_at = NOW()
        WHERE id = $37
          AND COALESCE(is_deleted, false) = false
        RETURNING *
        `,
        [
          Object.prototype.hasOwnProperty.call(safePayload, "item_no")
            ? blankToNull(safePayload.item_no)
            : null,
          Object.prototype.hasOwnProperty.call(safePayload, "item_description")
            ? blankToNull(safePayload.item_description)
            : null,
          Object.prototype.hasOwnProperty.call(safePayload, "shipment_no")
            ? blankToNull(safePayload.shipment_no)
            : null,
          Object.prototype.hasOwnProperty.call(safePayload, "shipment_line_no")
            ? safePayload.shipment_line_no
            : null,
          Object.prototype.hasOwnProperty.call(safePayload, "type")
            ? blankToNull(safePayload.type)
            : null,
          Object.prototype.hasOwnProperty.call(safePayload, "variant_code")
            ? blankToNull(safePayload.variant_code)
            : null,
          Object.prototype.hasOwnProperty.call(safePayload, "location_code")
            ? blankToNull(safePayload.location_code)
            : null,
          Object.prototype.hasOwnProperty.call(safePayload, "gst_group_code")
            ? blankToNull(safePayload.gst_group_code)
            : isShipmentLinked
              ? blankToNull(calculatedLine.gst_group_code)
              : null,
          Object.prototype.hasOwnProperty.call(safePayload, "unit_of_measure_code")
            ? blankToNull(safePayload.unit_of_measure_code)
            : null,
          Object.prototype.hasOwnProperty.call(safePayload, "quantity")
            ? num(safePayload.quantity)
            : null,
          Object.prototype.hasOwnProperty.call(safePayload, "quantity_shipped")
            ? num(safePayload.quantity_shipped)
            : null,
          Object.prototype.hasOwnProperty.call(safePayload, "quantity_invoiced")
            ? num(safePayload.quantity_invoiced)
            : null,
          calculatedLine.qty_to_invoice,
          calculatedLine.balance_qty,
          Object.prototype.hasOwnProperty.call(safePayload, "unit_price")
            ? num(safePayload.unit_price)
            : isShipmentLinked
              ? num(calculatedLine.unit_price)
              : null,
          isShipmentLinked
            ? num(calculatedLine.line_discount_pct)
            : Object.prototype.hasOwnProperty.call(safePayload, "line_discount_pct")
              ? num(safePayload.line_discount_pct)
              : null,
          calculatedLine.line_discount_amount,
          calculatedLine.line_amount,
          isShipmentLinked
            ? num(calculatedLine.tax_pct)
            : Object.prototype.hasOwnProperty.call(safePayload, "tax_pct")
              ? num(safePayload.tax_pct)
              : null,
          calculatedLine.tax_amount,
          calculatedLine.amount_including_tax,
          isShipmentLinked
            ? blankToNull(calculatedLine.hsn_sac_code)
            : Object.prototype.hasOwnProperty.call(safePayload, "hsn_sac_code")
              ? blankToNull(safePayload.hsn_sac_code)
              : null,
          calculatedLine.taxable_amount,
          calculatedLine.amount_including_gst,
          Object.prototype.hasOwnProperty.call(safePayload, "gst_place_of_supply")
            ? blankToNull(safePayload.gst_place_of_supply)
            : null,
          Object.prototype.hasOwnProperty.call(safePayload, "gst_group_type")
            ? blankToNull(safePayload.gst_group_type)
            : isShipmentLinked
              ? blankToNull(calculatedLine.gst_group_type)
              : null,
          Object.prototype.hasOwnProperty.call(safePayload, "gst_jurisdiction_type")
            ? blankToNull(safePayload.gst_jurisdiction_type)
            : null,
          Object.prototype.hasOwnProperty.call(safePayload, "invoice_type")
            ? blankToNull(safePayload.invoice_type)
            : null,
          calculatedLine.cgst_pct,
          calculatedLine.sgst_pct,
          calculatedLine.igst_pct,
          calculatedLine.total_gst_pct,
          calculatedLine.cgst_amount,
          calculatedLine.sgst_amount,
          calculatedLine.igst_amount,
          calculatedLine.total_gst_amount,
          lineId,
        ]
      );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        "Failed to update sales invoice line",
    });
  }
});

router.delete("/line/:lineId", async (req, res) => {
  try {
    const existingResult =
      await db.query(
        `
        SELECT si.status
        FROM sales_invoice_line sil
        JOIN sales_invoice si
          ON si.id = sil.sales_invoice_id
        WHERE sil.id = $1
          AND COALESCE(sil.is_deleted, false) = false
        `,
        [req.params.lineId]
      );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        error:
          "Sales invoice line not found",
      });
    }

    if (isPostedStatus(existingResult.rows[0].status)) {
      return rejectPostedInvoiceEdit(res);
    }

    await db.query(
      `
      UPDATE sales_invoice_line
      SET is_deleted = true,
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
        "Failed to delete sales invoice line",
    });
  }
});

router.post("/:id/post", async (req, res) => {
  const client =
    await db.connect();

  try {
    await client.query("BEGIN");

    const headerResult =
      await client.query(
        `
        SELECT *
        FROM sales_invoice
        WHERE id = $1
          AND COALESCE(is_deleted, false) = false
        FOR UPDATE
        `,
        [req.params.id]
      );

    if (headerResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error:
          "Sales invoice not found",
      });
    }

    const header =
      headerResult.rows[0];

    if (header.status === "Posted") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error:
          "Sales invoice is already posted",
      });
    }

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
          sil.*,
          COALESCE(NULLIF(pssl.unit_price, 0), sol.unit_price, NULLIF(sil.unit_price, 0), 0) AS unit_price,
          COALESCE(NULLIF(pssl.line_discount_pct, 0), sol.line_discount_pct, NULLIF(sil.line_discount_pct, 0), 0) AS line_discount_pct,
          COALESCE(NULLIF(pssl.tax_pct, 0), sol.tax_pct, NULLIF(sil.tax_pct, 0), 0) AS tax_pct,
          COALESCE(pssl.gst_group_code, sol.gst_group_code, sil.gst_group_code) AS gst_group_code,
          COALESCE(pssl.hsn_sac_code, sol.hsn_sac_code, sil.hsn_sac_code) AS hsn_sac_code,
          COALESCE(pssl.location_code, sol.location_code, sil.location_code) AS location_code,
          COALESCE(pssl.unit_of_measure_code, sol.unit_of_measure_code, sil.unit_of_measure_code) AS unit_of_measure_code
        FROM sales_invoice_line sil
        LEFT JOIN posted_sales_shipment_line pssl
          ON pssl.posted_sales_shipment_id = $2
         AND pssl.line_no = sil.shipment_line_no
         AND COALESCE(pssl.is_deleted, false) = false
        LEFT JOIN sales_order_lines sol
          ON sol.id = pssl.sales_order_line_id
        WHERE sil.sales_invoice_id = $1
          AND COALESCE(sil.is_deleted, false) = false
        ORDER BY sil.line_no
        `,
        [
          req.params.id,
          header.source_posted_sales_shipment_id,
        ]
      );

    if (linesResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error:
          "At least one line is required to post the invoice",
      });
    }

    const invoiceLines =
      await Promise.all(
        linesResult.rows.map((line) =>
          resolveLineGstForPosting(
            client,
            header,
            normalizeDraftInvoiceLine(
              header,
              line
            )
          )
        )
      );

    for (const line of invoiceLines) {
      const sourceLineNo =
        line.source_shipment_line_no ??
        line.shipment_line_no;

      if (
        header.source_posted_sales_shipment_id &&
        sourceLineNo !== null &&
        sourceLineNo !== undefined
      ) {
        const sourceResult =
          await client.query(
            `
            SELECT
              COALESCE(NULLIF(pssl.unit_price, 0), sol.unit_price, 0) AS source_unit_price,
              COALESCE(NULLIF(pssl.line_discount_pct, 0), sol.line_discount_pct, 0) AS source_line_discount_pct
            FROM posted_sales_shipment_line pssl
            LEFT JOIN sales_order_lines sol
              ON sol.id = pssl.sales_order_line_id
            WHERE pssl.posted_sales_shipment_id = $1
              AND pssl.line_no = $2
              AND COALESCE(pssl.is_deleted, false) = false
              AND COALESCE(pssl.reversed, false) = false
            LIMIT 1
            `,
            [
              header.source_posted_sales_shipment_id,
              sourceLineNo,
            ]
          );

        const sourceLine =
          sourceResult.rows[0];

        if (
          sourceLine &&
          Math.abs(num(line.unit_price) - num(sourceLine.source_unit_price)) > 0.005
        ) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            error:
              "Invoice Unit Price must match Posted Sales Shipment Unit Price.",
          });
        }

        if (
          sourceLine &&
          Math.abs(num(line.line_discount_pct) - num(sourceLine.source_line_discount_pct)) > 0.005
        ) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            error:
              "Invoice Line Discount % must match Posted Sales Shipment Line Discount %.",
          });
        }
      }
    }

    for (const line of invoiceLines) {
      const validationError =
        validateInvoiceLine(line);

      if (validationError) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          error: validationError,
        });
      }
    }

    await ensurePostedSalesInvoiceSnapshotColumns(client);

    for (const line of invoiceLines) {
      if (line.id) {
        await client.query(
          `
          UPDATE sales_invoice_line
          SET
            line_discount_amount = $2,
            line_amount = $3,
            taxable_amount = $4,
            tax_pct = $5,
            tax_amount = $6,
            amount_including_tax = $7,
            amount_including_gst = $8,
            gst_group_type = $9,
            gst_jurisdiction_type = $10,
            invoice_type = $11,
            cgst_pct = $12,
            sgst_pct = $13,
            igst_pct = $14,
            total_gst_pct = $15,
            cgst_amount = $16,
            sgst_amount = $17,
            igst_amount = $18,
            total_gst_amount = $19,
            updated_at = NOW()
          WHERE id = $1
          `,
          [
            line.id,
            num(line.line_discount_amount),
            num(line.line_amount),
            num(line.taxable_amount || line.line_amount),
            num(line.tax_pct),
            num(line.tax_amount),
            num(line.amount_including_tax),
            num(line.amount_including_gst || line.amount_including_tax),
            blankToNull(line.gst_group_type),
            blankToNull(line.gst_jurisdiction_type),
            blankToNull(line.invoice_type),
            num(line.cgst_pct),
            num(line.sgst_pct),
            num(line.igst_pct),
            num(line.total_gst_pct || line.tax_pct),
            num(line.cgst_amount),
            num(line.sgst_amount),
            num(line.igst_amount),
            num(line.total_gst_amount || line.tax_amount),
          ]
        );
      }

      const sourceLineNo =
        line.source_shipment_line_no ??
        line.shipment_line_no;

      const qty =
        num(line.qty_to_invoice || line.quantity);

      if (
        header.source_posted_sales_shipment_id &&
        sourceLineNo !== null &&
        sourceLineNo !== undefined &&
        qty > 0
      ) {
        const shipmentUpdate =
          await client.query(
            `
            UPDATE posted_sales_shipment_line
            SET
              quantity_shipped = COALESCE(NULLIF(quantity_shipped, 0), quantity, 0),
              quantity_invoiced = COALESCE(quantity_invoiced, 0) + $3,
              qty_to_invoice = GREATEST(
                COALESCE(NULLIF(quantity_shipped, 0), quantity, 0) -
                (COALESCE(quantity_invoiced, 0) + $3),
                0
              ),
              updated_at = NOW()
            WHERE posted_sales_shipment_id = $1
              AND line_no = $2
              AND COALESCE(is_deleted, false) = false
              AND $3 <= GREATEST(
                COALESCE(NULLIF(quantity_shipped, 0), quantity, 0) -
                COALESCE(quantity_invoiced, 0),
                0
              )
            RETURNING id
            `,
            [
              header.source_posted_sales_shipment_id,
              sourceLineNo,
              qty,
            ]
          );

        if (shipmentUpdate.rows.length === 0) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            error:
              "Qty. to Invoice cannot be greater than remaining shipment quantity.",
          });
        }
      }
    }

    const postedSeriesCode =
      await resolveSalesNoSeries(
        client,
        "posted_invoice_nos",
        "POSTED_SALES_INVOICE"
      );

    const postedDocumentNo =
      await getNextNumber(postedSeriesCode);

    const totalAmount =
      invoiceLines.reduce(
        (sum, line) =>
          sum + num(line.line_amount),
        0
      );

    const totalTax =
      invoiceLines.reduce(
        (sum, line) =>
          sum + num(line.tax_amount),
        0
      );

    const amountIncludingTax =
      Number((totalAmount + totalTax).toFixed(2));

    if (amountIncludingTax <= 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error:
          "Sales invoice amount must be greater than 0. Check Qty. to Invoice and Unit Price.",
      });
    }

    const postedHeaderResult =
      await client.query(
        `
        INSERT INTO posted_sales_invoices (
          document_no,
          customer_no,
          customer_name,
          posting_date,
          document_date,
          due_date,
          location_code,
          customer_gst_reg_no,
          external_document_no,
          source_sales_invoice_id,
          source_posted_sales_shipment_id,
          source_sales_order_id,
          total_amount,
          total_tax,
          amount_including_tax,
          posted_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
        RETURNING *
        `,
        [
          postedDocumentNo,
          blankToNull(header.customer_no),
          blankToNull(header.customer_name),
          blankToNull(header.posting_date),
          blankToNull(header.document_date),
          blankToNull(header.due_date),
          blankToNull(header.location_code),
          blankToNull(header.customer_gst_reg_no),
          blankToNull(header.external_document_no),
          header.id,
          header.source_posted_sales_shipment_id,
          header.source_sales_order_id,
          totalAmount,
          totalTax,
          amountIncludingTax,
          blankToNull(header.updated_by),
        ]
      );

    let postedHeader =
      postedHeaderResult.rows[0];

    const postedHeaderSnapshotResult =
      await client.query(
        `
        UPDATE posted_sales_invoices
        SET
          total_tax_amount = $1,
          total_gst_amount = $1,
          total_excl_vat = $2,
          total_vat = $1,
          total_incl_vat = $3,
          currency_code = $4,
          payment_terms_code = $5,
          remarks = $6,
          source_sales_invoice_no = $7,
          source_shipment_no = $8
        WHERE id = $9
        RETURNING *
        `,
        [
          totalTax,
          totalAmount,
          amountIncludingTax,
          blankToNull(header.currency_code),
          blankToNull(header.payment_terms_code),
          blankToNull(header.remarks || header.narration),
          blankToNull(header.document_no),
          blankToNull(header.source_shipment_no),
          postedHeader.id,
        ]
      );

    postedHeader =
      postedHeaderSnapshotResult.rows[0] || postedHeader;

    for (const line of invoiceLines) {
      await client.query(
        `
        INSERT INTO posted_sales_invoice_lines (
          posted_sales_invoice_id,
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
          taxable_amount,
          total_tax_amount,
          total_gst_amount,
          amount_including_gst,
          total_gst_pct,
          cgst_pct,
          sgst_pct,
          igst_pct,
          cgst_amount,
          sgst_amount,
          igst_amount,
          gst_place_of_supply,
          gst_group_type,
          gst_jurisdiction_type,
          invoice_type,
          source_shipment_no,
          source_shipment_line_no,
          hsn_sac_code
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40)
        `,
        [
          postedHeader.id,
          line.line_no,
          blankToNull(line.item_no),
          blankToNull(line.item_description),
          blankToNull(line.shipment_no),
          line.shipment_line_no,
          blankToNull(line.type) || "Item",
          blankToNull(line.variant_code),
          blankToNull(line.location_code || header.location_code),
          blankToNull(line.gst_group_code),
          blankToNull(line.unit_of_measure_code),
          num(line.quantity_shipped || line.quantity),
          num(line.qty_to_invoice || line.quantity),
          num(line.qty_to_invoice || line.quantity),
          num(line.balance_qty),
          num(line.unit_price),
          num(line.line_discount_pct),
          num(line.line_discount_amount),
          num(line.line_amount),
          num(line.tax_pct),
          num(line.tax_amount),
          num(line.amount_including_tax),
          num(line.taxable_amount || line.line_amount),
          num(line.total_gst_amount || line.tax_amount),
          num(line.total_gst_amount || line.tax_amount),
          num(line.amount_including_gst || line.amount_including_tax),
          num(line.total_gst_pct || line.tax_pct),
          num(line.cgst_pct),
          num(line.sgst_pct),
          num(line.igst_pct),
          num(line.cgst_amount),
          num(line.sgst_amount),
          num(line.igst_amount),
          blankToNull(line.gst_place_of_supply),
          blankToNull(line.gst_group_type),
          blankToNull(line.gst_jurisdiction_type),
          blankToNull(line.invoice_type),
          blankToNull(line.shipment_no),
          line.shipment_line_no,
          blankToNull(line.hsn_sac_code),
        ]
      );
    }

    await client.query(
      `
      UPDATE sales_invoice
      SET status = 'Posted',
          posted_by = COALESCE(posted_by, updated_by),
          posted_sales_invoice_id = $2,
          total_amount = $3,
          total_tax = $4,
          amount_including_tax = $5,
          updated_at = NOW()
      WHERE id = $1
      `,
      [
        req.params.id,
        postedHeader.id,
        totalAmount,
        totalTax,
        amountIncludingTax,
      ]
    );

    await createCustomerLedgerEntryForPostedInvoice(
      client,
      postedHeader
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      posted_invoice_id:
        postedHeader.id,
      data:
        postedHeader,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error(err);

    res.status(500).json({
      error:
        err.message ||
        "Failed to post sales invoice",
    });
  } finally {
    client.release();
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const existingResult =
      await db.query(
        `
        SELECT status
        FROM sales_invoice
        WHERE id = $1
          AND COALESCE(is_deleted, false) = false
        `,
        [req.params.id]
      );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        error:
          "Sales invoice not found",
      });
    }

    if (isPostedStatus(existingResult.rows[0].status)) {
      return rejectPostedInvoiceEdit(res);
    }

    await db.query(
      `
      UPDATE sales_invoice
      SET is_deleted = true,
          updated_at = NOW()
      WHERE id = $1
      `,
      [req.params.id]
    );

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        "Failed to delete sales invoice",
    });
  }
});

module.exports =
  router;
