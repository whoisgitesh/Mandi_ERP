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
  createVendorLedgerEntryForPostedInvoice,
} = require("../services/ledgerService.cjs");

const {
  applyTdsThresholdToLines,
  calculateTdsLine,
  calculateTdsThresholdSummary,
  getPreviousVendorTdsTaxableTotal,
  resolveTdsRate,
} = require("../services/tdsService.cjs");

const blankToNull = (value) =>
  value === "" ? null : value ?? null;

const cleanCode = (value) =>
  String(value ?? "").trim().toUpperCase();

const num = (value) =>
  Number(value ?? 0);

const today = () =>
  new Date().toISOString().slice(0, 10);

const cleanState = (value) => {
  const state =
    cleanCode(value);

  return state || null;
};

const round2 = (value) =>
  Number(num(value).toFixed(2));

const round3 = (value) =>
  Number(num(value).toFixed(3));

async function isTdsEnabled(client) {
  try {
    const result =
      await client.query(`
        SELECT COALESCE(tds_enabled, true) AS tds_enabled
        FROM tds_setup
        ORDER BY id
        LIMIT 1
      `);

    if (result.rows.length === 0) return true;

    return result.rows[0].tds_enabled !== false;
  } catch (err) {
    if (err?.code === "42P01") return false;
    throw err;
  }
}

async function getVendorTdsContext(client, vendorNo) {
  const result =
    await client.query(
      `
      SELECT
        vendor_no,
        name AS vendor_name,
        name,
        COALESCE(tds_applicable, false) AS tds_applicable,
        tds_section_code,
        tds_assessee_code,
        pan_no,
        concessional_code
      FROM vendors
      WHERE vendor_no = $1
      LIMIT 1
      `,
      [blankToNull(vendorNo)]
    );

  return result.rows[0] || {};
}

async function resolveInvoiceTdsContext(
  client,
  {
    vendorNo,
    postingDate,
  }
) {
  const tdsEnabled =
    await isTdsEnabled(client);
  const vendor =
    await getVendorTdsContext(client, vendorNo);
  const vendorTdsApplicable =
    tdsEnabled && Boolean(vendor.tds_applicable);
  const sectionCode =
    blankToNull(vendor.tds_section_code);
  const assesseeCode =
    blankToNull(vendor.tds_assessee_code);

  let tdsRate =
    null;

  if (vendorTdsApplicable && sectionCode && assesseeCode) {
    tdsRate =
      await resolveTdsRate(client, {
        section_code:
          sectionCode,
        assessee_code:
          assesseeCode,
        posting_date:
          postingDate || today(),
        concessional_code:
          vendor.concessional_code,
      });
  }

  const active =
    Boolean(vendorTdsApplicable);

  return {
    active,
    rateFound:
      Boolean(tdsRate),
    tdsEnabled,
    vendor,
    tdsRate,
    sectionCode,
    assesseeCode,
    warning:
      vendorTdsApplicable && !tdsRate
        ? "No TDS rate found for selected vendor section and assessee code."
        : null,
  };
}

async function applyVendorTdsToInvoiceLines(
  client,
  {
    vendorNo,
    postingDate,
    lines,
    changeTds = false,
  }
) {
  const tdsContext =
    await resolveInvoiceTdsContext(client, {
      vendorNo,
      postingDate,
    });

  const preparedLines =
    lines.map((line) =>
      normalizeLine({
        ...line,
        tds_applicable:
          tdsContext.active,
        tds_section_code:
          tdsContext.sectionCode,
        tds_assessee_code:
          tdsContext.assesseeCode,
        tds_pct:
          changeTds
            ? line.tds_pct ?? 0
            : tdsContext.tdsRate?.tds_pct ?? 0,
        surcharge_pct:
          changeTds
            ? line.surcharge_pct ?? 0
            : tdsContext.tdsRate?.surcharge_pct ?? 0,
        cess_pct:
          changeTds
            ? line.cess_pct ?? 0
            : tdsContext.tdsRate?.cess_pct ?? 0,
        total_tds_pct:
          changeTds
            ? line.total_tds_pct ?? 0
            : tdsContext.tdsRate?.total_tds_pct ?? 0,
        change_tds:
          changeTds,
      })
    );

  if (!tdsContext.active) {
    return {
      ...tdsContext,
      previousVendorTotal:
        0,
      currentInvoiceTaxableAmount:
        round2(
          preparedLines.reduce(
            (sum, line) => sum + num(line.taxable_amount || line.line_amount),
            0
          )
        ),
      thresholdAmount:
        num(tdsContext.tdsRate?.threshold_amount),
      eligibleBase:
        0,
      lines:
        preparedLines.map((line) =>
          calculateTdsLine({
            ...line,
            tds_applicable:
              false,
            tds_base_amount:
              0,
            tds_amount:
              0,
          })
        ),
    };
  }

  const previousVendorTotal =
    await getPreviousVendorTdsTaxableTotal(client, {
      vendor_no:
        vendorNo,
      section_code:
        tdsContext.sectionCode,
      posting_date:
        postingDate || today(),
    });
  const thresholdAmount =
    num(tdsContext.tdsRate?.threshold_amount);
  const thresholdedLines =
    applyTdsThresholdToLines(preparedLines, {
      previousVendorTotal,
      thresholdAmount,
      changeTds,
    });
  const summary =
    calculateTdsThresholdSummary(thresholdedLines, {
      previousVendorTotal,
      thresholdAmount,
    });

  return {
    ...tdsContext,
    previousVendorTotal:
      summary.previousVendorTotal,
    currentInvoiceTaxableAmount:
      summary.currentInvoiceTaxableAmount,
    thresholdAmount:
      summary.thresholdAmount,
    eligibleBase:
      summary.eligibleBase,
    lines:
      thresholdedLines,
  };
}

async function resolveGstRateForInvoiceLine(
  client,
  {
    gst_group_code,
    posting_date,
    from_state,
    to_state,
  }
) {
  const gstGroupCode =
    cleanCode(gst_group_code);

  if (!gstGroupCode) return null;

  const fromState =
    cleanState(from_state);
  const toState =
    cleanState(to_state);
  const calculationType =
    fromState && toState
      ? fromState === toState
        ? "Intra-State"
        : "Inter-State"
      : null;
  const date =
    posting_date || today();

  const exactResult =
    await client.query(
      `
      SELECT *
      FROM gst_rates
      WHERE gst_group_code = $1
        AND (
          $2::varchar IS NULL
          OR gst_calculation_type = $2
        )
        AND is_active = true
        AND effective_from <= $3::date
        AND (effective_to IS NULL OR effective_to >= $3::date)
        AND (
          from_state_code IS NULL
          OR from_state_code = $4
        )
        AND (
          to_state_code IS NULL
          OR to_state_code = $5
        )
      ORDER BY
        CASE WHEN from_state_code IS NULL THEN 1 ELSE 0 END,
        CASE WHEN to_state_code IS NULL THEN 1 ELSE 0 END,
        effective_from DESC,
        id DESC
      LIMIT 1
      `,
      [
        gstGroupCode,
        calculationType,
        date,
        fromState,
        toState,
      ]
    );

  if (exactResult.rows[0]) {
    return exactResult.rows[0];
  }

  const fallbackResult =
    await client.query(
      `
      SELECT *
      FROM gst_rates
      WHERE gst_group_code = $1
        AND is_active = true
        AND effective_from <= $2::date
        AND (effective_to IS NULL OR effective_to >= $2::date)
      ORDER BY
        CASE
          WHEN $3::varchar IS NULL THEN 0
          WHEN gst_calculation_type = $3 THEN 0
          ELSE 1
        END,
        effective_from DESC,
        id DESC
      LIMIT 1
      `,
      [
        gstGroupCode,
        date,
        calculationType,
      ]
    );

  if (fallbackResult.rows[0]) {
    return fallbackResult.rows[0];
  }

  const latestConfiguredResult =
    await client.query(
      `
      SELECT *
      FROM gst_rates
      WHERE gst_group_code = $1
        AND is_active = true
      ORDER BY
        CASE
          WHEN $2::varchar IS NULL THEN 0
          WHEN gst_calculation_type = $2 THEN 0
          ELSE 1
        END,
        effective_from DESC,
        id DESC
      LIMIT 1
      `,
      [
        gstGroupCode,
        calculationType,
      ]
    );

  if (latestConfiguredResult.rows[0]) {
    return latestConfiguredResult.rows[0];
  }

  const groupResult =
    await client.query(
      `
      SELECT
        code AS gst_group_code,
        gst_rate
      FROM gst_groups
      WHERE code = $1
        AND COALESCE(is_active, true) = true
      LIMIT 1
      `,
      [gstGroupCode]
    );

  const group =
    groupResult.rows[0];
  const groupRate =
    num(group?.gst_rate);

  if (!group || groupRate <= 0) {
    return null;
  }

  const cgstPct =
    (calculationType || "Intra-State") === "Intra-State"
      ? round2(groupRate / 2)
      : 0;
  const sgstPct =
    (calculationType || "Intra-State") === "Intra-State"
      ? round2(groupRate - cgstPct)
      : 0;
  const igstPct =
    calculationType === "Inter-State"
      ? groupRate
      : 0;

  return {
    gst_group_code: gstGroupCode,
    gst_calculation_type: calculationType || "Intra-State",
    cgst_pct: cgstPct,
    sgst_pct: sgstPct,
    igst_pct: igstPct,
    total_gst_pct: groupRate,
  };
}

const applyGstRate = (line, rate) => {
  if (!rate) return line;

  return {
    ...line,
    gst_group_code:
      rate.gst_group_code ||
      line.gst_group_code,
    gst_calculation_type:
      rate.gst_calculation_type,
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
  };
};

async function ensurePurchaseInvoiceSourceColumns(client = db) {
  await client.query(`
    ALTER TABLE posted_purchase_receipt_lines
    ADD COLUMN IF NOT EXISTS source_purchase_order_line_id INTEGER,
    ADD COLUMN IF NOT EXISTS reversed BOOLEAN DEFAULT FALSE
  `);

  await client.query(`
    ALTER TABLE purchase_invoice_lines
    ADD COLUMN IF NOT EXISTS source_purchase_order_line_id INTEGER
  `);

  await client.query(`
    ALTER TABLE posted_purchase_invoice_lines
    ADD COLUMN IF NOT EXISTS source_purchase_order_line_id INTEGER
  `);

  await client.query(`
    ALTER TABLE purchase_order_lines
    ADD COLUMN IF NOT EXISTS qty_to_invoice NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS qty_invoiced NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS gst_group_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS gst_calculation_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS cgst_pct NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_pct NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS igst_pct NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gst_pct NUMERIC(5,2) DEFAULT 0
  `);

  await client.query(`
    ALTER TABLE purchase_invoices
    ADD COLUMN IF NOT EXISTS currency_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS payment_terms_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS remarks TEXT,
    ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS total_discount_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tax_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tds_section_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tds_assessee_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tds_pct NUMERIC(18,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS surcharge_pct NUMERIC(18,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cess_pct NUMERIC(18,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tds_pct NUMERIC(18,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tds_base_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tds_threshold_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS previous_tds_base_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS current_tds_base_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tds_base_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tds_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS net_payable_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS subtotal_excl_vat NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gst_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_excl_vat NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_vat NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_incl_vat NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS invoice_discount_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS invoice_discount_pct NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tds_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS change_tds BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tds_less_amount NUMERIC(18,2) DEFAULT 0
  `);

  await client.query(`
    ALTER TABLE posted_purchase_invoices
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Posted',
    ADD COLUMN IF NOT EXISTS remarks TEXT,
    ADD COLUMN IF NOT EXISTS currency_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS payment_terms_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS total_discount_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tax_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS posted_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tds_section_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tds_assessee_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tds_pct NUMERIC(18,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS surcharge_pct NUMERIC(18,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cess_pct NUMERIC(18,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tds_pct NUMERIC(18,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tds_base_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tds_threshold_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS previous_tds_base_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS current_tds_base_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tds_base_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tds_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS net_payable_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS subtotal_excl_vat NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gst_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_excl_vat NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_vat NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_incl_vat NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS invoice_discount_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS invoice_discount_pct NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tds_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS change_tds BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tds_less_amount NUMERIC(18,2) DEFAULT 0
  `);

  await client.query(`
    ALTER TABLE purchase_invoice_lines
    ADD COLUMN IF NOT EXISTS location_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS uom_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS direct_unit_cost NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_discount_pct NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tds_section_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tds_assessee_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tds_base_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tds_threshold_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tds_pct NUMERIC(18,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS surcharge_pct NUMERIC(18,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cess_pct NUMERIC(18,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tds_pct NUMERIC(18,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tds_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_after_tds NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS previous_tds_base_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS current_tds_base_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS net_payable_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS gst_group_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS gst_calculation_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS cgst_pct NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_pct NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS igst_pct NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gst_pct NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gst_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_including_gst NUMERIC(18,2) DEFAULT 0
  `);

  await client.query(`
    ALTER TABLE posted_purchase_invoice_lines
    ADD COLUMN IF NOT EXISTS location_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS uom_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS direct_unit_cost NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_discount_pct NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS tds_section_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tds_assessee_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tds_base_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tds_threshold_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tds_pct NUMERIC(18,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS surcharge_pct NUMERIC(18,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cess_pct NUMERIC(18,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_tds_pct NUMERIC(18,3) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tds_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_after_tds NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS gst_group_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS gst_calculation_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS cgst_pct NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_pct NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS igst_pct NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gst_pct NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gst_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_including_gst NUMERIC(18,2) DEFAULT 0
  `);

  await client.query(`
    ALTER TABLE posted_purchase_receipt_lines
    ADD COLUMN IF NOT EXISTS quantity_invoiced NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS direct_unit_cost NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_discount_pct NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS location_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS uom_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS gst_group_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS gst_calculation_type VARCHAR(30),
    ADD COLUMN IF NOT EXISTS cgst_pct NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_pct NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS igst_pct NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gst_pct NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gst_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(18,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_including_gst NUMERIC(18,2) DEFAULT 0
  `);
}

const normalizeLine = (line) => {
  const quantityReceived =
    num(line.quantity_received);

  const quantityInvoiced =
    num(line.quantity_invoiced);

  const remaining =
    Math.max(
      quantityReceived - quantityInvoiced,
      0
    );

  const qtyToInvoice =
    Math.min(
      Math.max(num(line.qty_to_invoice), 0),
      remaining || Math.max(quantityReceived, 0)
    );

  const directUnitCost =
    num(line.direct_unit_cost);

  const lineDiscountPct =
    num(line.line_discount_pct);

  if (directUnitCost < 0) {
    throw new Error("Direct Unit Cost cannot be negative");
  }

  if (lineDiscountPct < 0 || lineDiscountPct > 100) {
    throw new Error("Line Disc. % must be between 0 and 100");
  }

  const lineDiscountAmount =
    round2(qtyToInvoice * directUnitCost * lineDiscountPct / 100);

  const lineAmount =
    round2(qtyToInvoice * directUnitCost - lineDiscountAmount);

  if (lineAmount < 0) {
    throw new Error("Line Amount cannot be negative");
  }

  const taxableAmount =
    lineAmount;

  let cgstPct =
    num(line.cgst_pct);
  let sgstPct =
    num(line.sgst_pct);
  let igstPct =
    num(line.igst_pct);
  let totalGstPct =
    num(line.total_gst_pct) ||
    num(line.tax_pct);

  const explicitComponentPct =
    cgstPct + sgstPct + igstPct;

  const isInterState =
    String(line.gst_calculation_type ?? "").toLowerCase() === "inter-state";

  if (isInterState) {
    totalGstPct =
      totalGstPct ||
      explicitComponentPct;
    igstPct =
      totalGstPct ||
      igstPct;
    cgstPct =
      0;
    sgstPct =
      0;
  } else if (explicitComponentPct > 0) {
    totalGstPct =
      explicitComponentPct;
  } else if (totalGstPct > 0) {
    cgstPct =
      round2(totalGstPct / 2);
    sgstPct =
      round2(totalGstPct - cgstPct);
    igstPct =
      0;
  }

  if (cgstPct < 0 || sgstPct < 0 || igstPct < 0 || totalGstPct < 0) {
    throw new Error("GST percentages cannot be negative");
  }

  totalGstPct =
    round2(cgstPct + sgstPct + igstPct);

  const gstCalculationType =
    blankToNull(line.gst_calculation_type) ||
    (igstPct > 0 ? "Inter-State" : "Intra-State");

  const cgstAmount =
    round2(taxableAmount * cgstPct / 100);
  const sgstAmount =
    round2(taxableAmount * sgstPct / 100);
  const igstAmount =
    round2(taxableAmount * igstPct / 100);
  const totalGstAmount =
    round2(cgstAmount + sgstAmount + igstAmount);
  const amountIncludingGst =
    round2(taxableAmount + totalGstAmount);

  return calculateTdsLine({
    ...line,
    quantity_received:
      quantityReceived,
    quantity_invoiced:
      quantityInvoiced,
    qty_to_invoice:
      qtyToInvoice,
    direct_unit_cost:
      directUnitCost,
    line_discount_pct:
      lineDiscountPct,
    line_discount_amount:
      lineDiscountAmount,
    gst_calculation_type:
      gstCalculationType,
    cgst_pct:
      cgstPct,
    sgst_pct:
      sgstPct,
    igst_pct:
      igstPct,
    total_gst_pct:
      totalGstPct,
    cgst_amount:
      cgstAmount,
    sgst_amount:
      sgstAmount,
    igst_amount:
      igstAmount,
    total_gst_amount:
      totalGstAmount,
    taxable_amount:
      taxableAmount,
    amount_including_gst:
      amountIncludingGst,
    tax_pct:
      totalGstPct,
    tax_amount:
      totalGstAmount,
    line_amount:
      lineAmount,
    amount_including_tax:
      amountIncludingGst,
    hsn_sac_code:
      blankToNull(line.hsn_sac_code),
    tds_base_amount:
      Boolean(line.tds_applicable)
        ? line.tds_base_amount !== undefined &&
          line.tds_base_amount !== null &&
          line.tds_base_amount !== ""
          ? num(line.tds_base_amount)
          : taxableAmount
        : 0,
  });
};

const recalcTotal = async (client, id) => {
  const result =
    await client.query(
      `
      WITH line_totals AS (
        SELECT
          COALESCE(SUM(taxable_amount), 0) AS subtotal_excl_vat,
          COALESCE(SUM(line_discount_amount), 0) AS total_discount_amount,
          COALESCE(SUM(igst_amount), 0) AS igst_amount,
          COALESCE(SUM(cgst_amount), 0) AS cgst_amount,
          COALESCE(SUM(sgst_amount), 0) AS sgst_amount,
          COALESCE(SUM(total_gst_amount), 0) AS total_gst_amount,
          COALESCE(SUM(amount_including_gst), 0) AS amount_including_gst,
          COALESCE(MAX(tds_threshold_amount), 0) AS tds_threshold_amount,
          COALESCE(SUM(tds_base_amount), 0) AS total_tds_base_amount,
          COALESCE(SUM(tds_amount), 0) AS total_tds_amount,
          COALESCE(SUM(amount_after_tds), 0) AS net_payable_amount
        FROM purchase_invoice_lines
        WHERE purchase_invoice_id = $1
          AND COALESCE(is_deleted, false) = false
      )
      UPDATE purchase_invoices
      SET
        subtotal_excl_vat = ROUND(line_totals.subtotal_excl_vat, 2),
        total_amount = ROUND(line_totals.subtotal_excl_vat, 2),
        total_discount_amount = ROUND(line_totals.total_discount_amount, 2),
        igst_amount = ROUND(line_totals.igst_amount, 2),
        cgst_amount = ROUND(line_totals.cgst_amount, 2),
        sgst_amount = ROUND(line_totals.sgst_amount, 2),
        total_gst_amount = ROUND(line_totals.total_gst_amount, 2),
        total_tax_amount = ROUND(line_totals.total_gst_amount, 2),
        amount_including_tax = ROUND(line_totals.amount_including_gst, 2),
        total_excl_vat = ROUND(GREATEST(line_totals.subtotal_excl_vat - COALESCE(purchase_invoices.invoice_discount_amount, 0), 0), 2),
        total_vat = ROUND(line_totals.total_gst_amount, 2),
        total_incl_vat = ROUND(GREATEST(line_totals.subtotal_excl_vat - COALESCE(purchase_invoices.invoice_discount_amount, 0), 0) + line_totals.total_gst_amount, 2),
        tds_threshold_amount = ROUND(line_totals.tds_threshold_amount, 2),
        tds_base_amount = ROUND(line_totals.total_tds_base_amount, 2),
        total_tds_base_amount = ROUND(line_totals.total_tds_base_amount, 2),
        total_tds_amount = ROUND(line_totals.total_tds_amount, 2),
        tds_amount = ROUND(line_totals.total_tds_amount, 2),
        tds_less_amount = ROUND(GREATEST(line_totals.subtotal_excl_vat - COALESCE(purchase_invoices.invoice_discount_amount, 0), 0) + line_totals.total_gst_amount - line_totals.total_tds_amount, 2),
        net_payable_amount = ROUND(GREATEST(line_totals.subtotal_excl_vat - COALESCE(purchase_invoices.invoice_discount_amount, 0), 0) + line_totals.total_gst_amount - line_totals.total_tds_amount, 2),
        updated_at = NOW()
      FROM line_totals
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

  return result.rows[0];
};

/**
 * GET ALL PURCHASE INVOICES
 */
router.get("/", async (req, res) => {
  try {
    const result =
      await db.query(`
        SELECT *
        FROM purchase_invoices
        WHERE COALESCE(is_deleted, false) = false
        ORDER BY posting_date DESC,
                 created_at DESC
      `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        "Failed to fetch purchase invoices",
    });
  }
});

/**
 * CREATE BLANK PURCHASE INVOICE
 */
router.post("/", async (req, res) => {
  try {
    const seriesCode =
      await resolvePurchaseNoSeries(
        db,
        "invoice_nos",
        "PURCHASE_INVOICE"
      );

    const documentNo =
      await getNextNumber(seriesCode);

    const result =
      await db.query(
        `
        INSERT INTO purchase_invoices (
          document_no,
          vendor_no,
          vendor_name,
          posting_date,
          document_date,
          status
        )
        VALUES (
          $1,$2,$3,$4,$5,$6
        )
        RETURNING *
        `,
        [
          documentNo,
          blankToNull(req.body?.vendor_no),
          blankToNull(req.body?.vendor_name),
          blankToNull(req.body?.posting_date) || today(),
          blankToNull(req.body?.document_date) || today(),
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
        "Failed to create purchase invoice",
    });
  }
});

/**
 * CREATE PURCHASE INVOICE FROM POSTED PURCHASE RECEIPT
 */
router.post("/from-receipt/:receiptId", async (req, res) => {
  const client =
    await db.connect();

  try {
    const { receiptId } =
      req.params;

    await client.query("BEGIN");
    await ensurePurchaseInvoiceSourceColumns(client);

    const receiptResult =
      await client.query(
        `
        SELECT
          ppr.*,
          COALESCE(ppr.vendor_name, v.name) AS vendor_name,
          COALESCE(v.tds_applicable, false) AS vendor_tds_applicable,
          v.tds_section_code AS vendor_tds_section_code,
          v.tds_assessee_code AS vendor_tds_assessee_code,
          v.concessional_code AS vendor_concessional_code,
          i.grn_document_no AS source_grn_no
        FROM posted_purchase_receipts ppr
        LEFT JOIN vendors v
          ON v.vendor_no = ppr.vendor_no
        LEFT JOIN inward_gate_entries i
          ON i.id = ppr.source_inward_gate_entry_id
        WHERE ppr.id = $1
          AND COALESCE(ppr.is_deleted, false) = false
        `,
        [receiptId]
      );

    if (receiptResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error:
          "Posted Purchase Receipt not found",
      });
    }

    const receipt =
      receiptResult.rows[0];
    const tdsContext =
      await resolveInvoiceTdsContext(client, {
        vendorNo:
          receipt.vendor_no,
        postingDate:
          today(),
      });

    const lineResult =
      await client.query(
        `
        SELECT
          pprl.*,
          pol.direct_unit_cost_excl_vat AS po_direct_unit_cost,
          pol.line_discount_pct AS po_line_discount_pct,
          pol.tax_pct AS po_tax_pct,
          pol.gst_group_code AS po_gst_group_code,
          pol.gst_calculation_type AS po_gst_calculation_type,
          pol.cgst_pct AS po_cgst_pct,
          pol.sgst_pct AS po_sgst_pct,
          pol.igst_pct AS po_igst_pct,
          pol.total_gst_pct AS po_total_gst_pct,
          pol.hsn_sac_code AS po_hsn_sac_code,
          pol.location_code AS po_location_code,
          pol.unit_of_measure_code AS po_uom_code,
          COALESCE(inv.invoiced_qty, 0) AS quantity_invoiced
        FROM posted_purchase_receipt_lines pprl
        LEFT JOIN purchase_order_lines pol
          ON pol.id = pprl.source_purchase_order_line_id
        LEFT JOIN (
          SELECT
            source_posted_purchase_receipt_line_id,
            SUM(quantity_invoiced) AS invoiced_qty
          FROM posted_purchase_invoice_lines
          WHERE COALESCE(is_deleted, false) = false
          GROUP BY source_posted_purchase_receipt_line_id
        ) inv
          ON inv.source_posted_purchase_receipt_line_id = pprl.id
        WHERE pprl.posted_purchase_receipt_id = $1
          AND COALESCE(pprl.is_deleted, false) = false
          AND COALESCE(pprl.reversed, false) = false
        ORDER BY pprl.line_no
        `,
        [receiptId]
      );

    const remainingLines =
      lineResult.rows
        .map((line) => {
          const received =
            num(line.quantity_received);

          const invoiced =
            num(line.quantity_invoiced);

          return {
            ...line,
            quantity_invoiced:
              invoiced,
            qty_to_invoice:
              Math.max(received - invoiced, 0),
          };
        })
        .map((line) => {
          const directUnitCost =
            num(line.direct_unit_cost) ||
            num(line.unit_cost) ||
            num(line.po_direct_unit_cost);

          const lineDiscountPct =
            num(line.line_discount_pct) ||
            num(line.po_line_discount_pct);

          const taxPct =
            num(line.tax_pct) ||
            num(line.po_tax_pct);

          return normalizeLine({
            ...line,
            location_code:
              line.location_code ||
              line.po_location_code ||
              receipt.location_code,
            uom_code:
              line.uom_code ||
              line.unit_of_measure_code ||
              line.po_uom_code,
            direct_unit_cost:
              directUnitCost,
            line_discount_pct:
              lineDiscountPct,
            tax_pct:
              taxPct,
            hsn_sac_code:
              line.hsn_sac_code ||
              line.po_hsn_sac_code,
            gst_group_code:
              line.gst_group_code ||
              line.po_gst_group_code,
            gst_calculation_type:
              line.gst_calculation_type ||
              line.po_gst_calculation_type,
            cgst_pct:
              num(line.cgst_pct) ||
              num(line.po_cgst_pct),
            sgst_pct:
              num(line.sgst_pct) ||
              num(line.po_sgst_pct),
            igst_pct:
              num(line.igst_pct) ||
              num(line.po_igst_pct),
            total_gst_pct:
              num(line.total_gst_pct) ||
              num(line.po_total_gst_pct) ||
              taxPct,
            tds_applicable:
              tdsContext.active,
            tds_section_code:
              tdsContext.sectionCode,
            tds_assessee_code:
              tdsContext.assesseeCode,
          });
        })
        .filter((line) =>
          num(line.qty_to_invoice) > 0
        );

    let tdsRate = null;

    if (tdsContext.active) {
      tdsRate =
        tdsContext.tdsRate;

      for (const line of remainingLines) {
        line.tds_pct = tdsRate?.tds_pct ?? 0;
        line.surcharge_pct = tdsRate?.surcharge_pct ?? 0;
        line.cess_pct = tdsRate?.cess_pct ?? 0;
        line.total_tds_pct = tdsRate?.total_tds_pct ?? 0;
        Object.assign(line, calculateTdsLine(line));
      }
    }

    if (remainingLines.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error:
          "No remaining receipt quantity is available to invoice",
      });
    }

    for (let index = 0; index < remainingLines.length; index++) {
      const line =
        remainingLines[index];

      if (!line.gst_group_code) {
        continue;
      }

      const gstRate =
        await resolveGstRateForInvoiceLine(client, {
          gst_group_code:
            line.gst_group_code,
          posting_date:
            today(),
        });

      if (!gstRate) {
        throw new Error("GST rate not found for selected GST Group and posting date.");
      }

      remainingLines[index] =
        normalizeLine(
          applyGstRate(
            line,
            gstRate
          )
        );
    }

    const tdsResult =
      await applyVendorTdsToInvoiceLines(client, {
        vendorNo:
          receipt.vendor_no,
        postingDate:
          today(),
        lines:
          remainingLines,
        changeTds:
          false,
      });

    remainingLines.splice(
      0,
      remainingLines.length,
      ...tdsResult.lines
    );

    const documentNo =
      await getNextNumber(
        await resolvePurchaseNoSeries(
          client,
          "invoice_nos",
          "PURCHASE_INVOICE",
        )
      );

    const headerResult =
      await client.query(
        `
        INSERT INTO purchase_invoices (
          document_no,
          vendor_no,
          vendor_name,
          posting_date,
          document_date,
          location_code,
          challan_no,
          source_posted_purchase_receipt_id,
          source_purchase_order_id,
          source_inward_gate_entry_id,
          source_grn_no,
          tds_applicable,
          tds_section_code,
          tds_assessee_code,
          tds_pct,
          surcharge_pct,
          cess_pct,
          total_tds_pct,
          tds_threshold_amount,
          previous_tds_base_amount,
          current_tds_base_amount,
          tds_base_amount,
          total_tds_base_amount,
          status
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,
          $7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24
        )
        RETURNING *
        `,
        [
          documentNo,
          receipt.vendor_no,
          receipt.vendor_name,
          today(),
          today(),
          receipt.location_code,
          receipt.challan_no,
          receipt.id,
          receipt.source_purchase_order_id,
          receipt.source_inward_gate_entry_id,
          receipt.source_grn_no,
          Boolean(tdsResult.active),
          blankToNull(tdsResult.sectionCode),
          blankToNull(tdsResult.assesseeCode),
          num(tdsResult.tdsRate?.tds_pct),
          num(tdsResult.tdsRate?.surcharge_pct),
          num(tdsResult.tdsRate?.cess_pct),
          num(tdsResult.tdsRate?.total_tds_pct),
          num(tdsResult.thresholdAmount),
          num(tdsResult.previousVendorTotal),
          num(tdsResult.currentInvoiceTaxableAmount),
          num(tdsResult.eligibleBase),
          num(tdsResult.eligibleBase),
          "Open",
        ]
      );

    const header =
      headerResult.rows[0];

    for (const line of remainingLines) {
      await client.query(
        `
        INSERT INTO purchase_invoice_lines (
          purchase_invoice_id,
          source_posted_purchase_receipt_line_id,
          source_purchase_order_line_id,
          line_no,
          item_no,
          variant_code,
          item_description,
          location_code,
          gst_group_code,
          uom_code,
          quantity_received,
          quantity_invoiced,
          qty_to_invoice,
          direct_unit_cost,
          line_discount_pct,
          line_discount_amount,
          tax_pct,
          tax_amount,
          gst_calculation_type,
          cgst_pct,
          sgst_pct,
          igst_pct,
          total_gst_pct,
          cgst_amount,
          sgst_amount,
          igst_amount,
          total_gst_amount,
          taxable_amount,
          amount_including_gst,
          line_amount,
          amount_including_tax,
          hsn_sac_code,
          tds_applicable,
          tds_section_code,
          tds_assessee_code,
          tds_threshold_amount,
          tds_base_amount,
          tds_pct,
          surcharge_pct,
          cess_pct,
          total_tds_pct,
          tds_amount,
          amount_after_tds,
          status
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,
          $8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
          $22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,
          $37,$38,$39,$40,$41,$42,$43,$44
        )
        `,
        [
          header.id,
          line.id,
          line.source_purchase_order_line_id,
          line.line_no,
          line.item_no,
          line.variant_code,
          line.item_description,
          line.location_code || receipt.location_code,
          blankToNull(line.gst_group_code),
          line.uom_code || null,
          num(line.quantity_received),
          num(line.quantity_invoiced),
          num(line.qty_to_invoice),
          num(line.direct_unit_cost),
          num(line.line_discount_pct),
          num(line.line_discount_amount),
          num(line.tax_pct),
          num(line.tax_amount),
          blankToNull(line.gst_calculation_type),
          num(line.cgst_pct),
          num(line.sgst_pct),
          num(line.igst_pct),
          num(line.total_gst_pct),
          num(line.cgst_amount),
          num(line.sgst_amount),
          num(line.igst_amount),
          num(line.total_gst_amount),
          num(line.taxable_amount),
          num(line.amount_including_gst),
          num(line.line_amount),
          num(line.amount_including_tax),
          blankToNull(line.hsn_sac_code),
          Boolean(line.tds_applicable),
          blankToNull(line.tds_section_code),
          blankToNull(line.tds_assessee_code),
          num(line.tds_threshold_amount),
          num(line.tds_base_amount),
          num(line.tds_pct),
          num(line.surcharge_pct),
          num(line.cess_pct),
          num(line.total_tds_pct),
          num(line.tds_amount),
          num(line.amount_after_tds),
          "Open",
        ]
      );
    }

    const updatedHeader =
      await recalcTotal(
        client,
        header.id
      );

    await client.query("COMMIT");

    res.json({
      success: true,
      data:
        updatedHeader,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error(err);

    res.status(500).json({
      error:
        err.message ||
        "Failed to create purchase invoice",
    });
  } finally {
    client.release();
  }
});

/**
 * GET SINGLE PURCHASE INVOICE
 */
router.get("/:id", async (req, res) => {
  try {
    await ensurePurchaseInvoiceSourceColumns();

    const { id } =
      req.params;

    const headerResult =
      await db.query(
        `
        SELECT
          pi.*,
          ppr.document_no AS source_posted_purchase_receipt_no,
          po.document_no AS source_purchase_order_no,
          ige.document_no AS source_inward_gate_entry_no
        FROM purchase_invoices pi
        LEFT JOIN posted_purchase_receipts ppr
          ON ppr.id = pi.source_posted_purchase_receipt_id
        LEFT JOIN purchase_orders po
          ON po.id = pi.source_purchase_order_id
        LEFT JOIN inward_gate_entries ige
          ON ige.id = pi.source_inward_gate_entry_id
        WHERE pi.id = $1
          AND COALESCE(pi.is_deleted, false) = false
        `,
        [id]
      );

    if (headerResult.rows.length === 0) {
      return res.status(404).json({
        error:
          "Purchase Invoice not found",
      });
    }

    const linesResult =
      await db.query(
        `
        SELECT
          pil.*,
          CASE
            WHEN pil.status = 'Posted'
              AND COALESCE(pil.qty_to_invoice, 0) = 0
              THEN COALESCE(NULLIF(pil.quantity_invoiced, 0), pil.quantity_received, 0)
            ELSE COALESCE(pil.qty_to_invoice, 0)
          END AS qty_to_invoice,
          COALESCE(
            NULLIF(pil.direct_unit_cost, 0),
            NULLIF(pprl.direct_unit_cost, 0),
            NULLIF(pprl.unit_cost, 0),
            pol.direct_unit_cost_excl_vat,
            0
          ) AS direct_unit_cost,
          COALESCE(
            NULLIF(pil.line_discount_pct, 0),
            NULLIF(pprl.line_discount_pct, 0),
            pol.line_discount_pct,
            0
          ) AS line_discount_pct,
          COALESCE(
            NULLIF(pil.tax_pct, 0),
            NULLIF(pprl.tax_pct, 0),
            pol.tax_pct,
            0
          ) AS tax_pct,
          COALESCE(pil.gst_group_code, pprl.gst_group_code, pol.gst_group_code) AS gst_group_code,
          COALESCE(pil.gst_calculation_type, pprl.gst_calculation_type, pol.gst_calculation_type) AS gst_calculation_type,
          COALESCE(NULLIF(pil.cgst_pct, 0), NULLIF(pprl.cgst_pct, 0), pol.cgst_pct, 0) AS cgst_pct,
          COALESCE(NULLIF(pil.sgst_pct, 0), NULLIF(pprl.sgst_pct, 0), pol.sgst_pct, 0) AS sgst_pct,
          COALESCE(NULLIF(pil.igst_pct, 0), NULLIF(pprl.igst_pct, 0), pol.igst_pct, 0) AS igst_pct,
          COALESCE(NULLIF(pil.total_gst_pct, 0), NULLIF(pprl.total_gst_pct, 0), pol.total_gst_pct, pil.tax_pct, pprl.tax_pct, pol.tax_pct, 0) AS total_gst_pct,
          COALESCE(
            pil.hsn_sac_code,
            pprl.hsn_sac_code,
            pol.hsn_sac_code
          ) AS hsn_sac_code,
          COALESCE(
            pil.location_code,
            pprl.location_code,
            pol.location_code
          ) AS location_code,
          COALESCE(
            pil.uom_code,
            pprl.uom_code,
            pol.unit_of_measure_code
          ) AS uom_code
        FROM purchase_invoice_lines pil
        LEFT JOIN posted_purchase_receipt_lines pprl
          ON pprl.id = pil.source_posted_purchase_receipt_line_id
        LEFT JOIN purchase_order_lines pol
          ON pol.id = COALESCE(
            pil.source_purchase_order_line_id,
            pprl.source_purchase_order_line_id
          )
        WHERE pil.purchase_invoice_id = $1
          AND COALESCE(pil.is_deleted, false) = false
        ORDER BY pil.line_no
        `,
        [id]
      );

    const header =
      headerResult.rows[0];
    const normalizedLines =
      linesResult.rows.map(normalizeLine);

    if (header.status === "Posted") {
      return res.json({
        header,
        lines:
          normalizedLines,
      });
    }

    const tdsResult =
      await applyVendorTdsToInvoiceLines(db, {
        vendorNo:
          header.vendor_no,
        postingDate:
          header.posting_date || today(),
        lines:
          normalizedLines,
        changeTds:
          Boolean(header.change_tds),
      });

    res.json({
      header: {
        ...header,
        tds_applicable:
          tdsResult.active,
        tds_section_code:
          tdsResult.sectionCode,
        tds_assessee_code:
          tdsResult.assesseeCode,
        tds_pct:
          tdsResult.tdsRate?.tds_pct ?? 0,
        surcharge_pct:
          tdsResult.tdsRate?.surcharge_pct ?? 0,
        cess_pct:
          tdsResult.tdsRate?.cess_pct ?? 0,
        total_tds_pct:
          tdsResult.tdsRate?.total_tds_pct ?? 0,
        tds_threshold_amount:
          tdsResult.thresholdAmount,
        previous_tds_base_amount:
          tdsResult.previousVendorTotal,
        current_tds_base_amount:
          tdsResult.currentInvoiceTaxableAmount,
        tds_base_amount:
          tdsResult.eligibleBase,
        total_tds_base_amount:
          tdsResult.eligibleBase,
        tds_warning:
          tdsResult.warning,
      },
      lines:
        tdsResult.lines,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        "Failed to fetch purchase invoice",
    });
  }
});

/**
 * UPDATE PURCHASE INVOICE HEADER AND LINES
 */
router.put("/:id", async (req, res) => {
  const client =
    await db.connect();

  try {
    const { id } =
      req.params;

    const payload =
      req.body ?? {};

    await client.query("BEGIN");
    await ensurePurchaseInvoiceSourceColumns(client);

    const currentResult =
      await client.query(
        `
        SELECT *
        FROM purchase_invoices
        WHERE id = $1
          AND COALESCE(is_deleted, false) = false
        FOR UPDATE
        `,
        [id]
      );

    if (currentResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error:
          "Purchase Invoice not found",
      });
    }

    if (currentResult.rows[0].status === "Posted") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error:
          "Posted purchase invoices cannot be edited",
      });
    }

    if (!String(payload.location_code ?? currentResult.rows[0].location_code ?? "").trim()) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error:
          "Location Code is required",
      });
    }

    const vendorResult =
      await client.query(
        `
        SELECT
          vendor_no,
          COALESCE(tds_applicable, false) AS tds_applicable,
          tds_section_code,
          tds_assessee_code,
          concessional_code
        FROM vendors
        WHERE vendor_no = $1
        LIMIT 1
        `,
        [
          blankToNull(payload.vendor_no) ||
          currentResult.rows[0].vendor_no,
        ]
      );

    const vendor =
      vendorResult.rows[0] || {};
    const tdsContext =
      await resolveInvoiceTdsContext(client, {
        vendorNo:
          blankToNull(payload.vendor_no) ||
          currentResult.rows[0].vendor_no,
        postingDate:
          payload.posting_date ||
          currentResult.rows[0].posting_date ||
          today(),
      });
    const headerTdsApplicable =
      tdsContext.active;
    const headerTdsSectionCode =
      tdsContext.sectionCode;
    const headerTdsAssesseeCode =
      tdsContext.assesseeCode;
    const invoiceDiscountPct =
      num(payload.invoice_discount_pct);
    const invoiceDiscountAmount =
      num(payload.invoice_discount_amount);

    if (invoiceDiscountPct < 0 || invoiceDiscountPct > 100) {
      throw new Error("Invoice Discount % must be between 0 and 100");
    }

    if (invoiceDiscountAmount < 0) {
      throw new Error("Inv. Discount Amount cannot be negative");
    }

    await client.query(
      `
      UPDATE purchase_invoices
      SET
        vendor_no = $1,
        vendor_name = $2,
        vendor_invoice_no = $3,
        vendor_invoice_date = $4,
        posting_date = $5,
        document_date = $6,
        due_date = $7,
        location_code = $8,
        challan_no = $9,
        currency_code = $10,
        payment_terms_code = $11,
        remarks = $12,
        tds_applicable = $13,
        tds_section_code = $14,
        tds_assessee_code = $15,
        tds_pct = $16,
        surcharge_pct = $17,
        cess_pct = $18,
        total_tds_pct = $19,
        status = $20,
        posted_at = $21,
        invoice_discount_amount = $22,
        invoice_discount_pct = $23,
        change_tds = $24,
        updated_at = NOW()
      WHERE id = $25
      `,
      [
        blankToNull(payload.vendor_no),
        blankToNull(payload.vendor_name),
        blankToNull(payload.vendor_invoice_no),
        blankToNull(payload.vendor_invoice_date),
        blankToNull(payload.posting_date),
        blankToNull(payload.document_date),
        blankToNull(payload.due_date),
        blankToNull(payload.location_code),
        blankToNull(payload.challan_no),
        blankToNull(payload.currency_code),
        blankToNull(payload.payment_terms_code),
        blankToNull(payload.remarks),
        headerTdsApplicable,
        headerTdsSectionCode,
        headerTdsAssesseeCode,
        num(tdsContext.tdsRate?.tds_pct),
        num(tdsContext.tdsRate?.surcharge_pct),
        num(tdsContext.tdsRate?.cess_pct),
        num(tdsContext.tdsRate?.total_tds_pct),
        blankToNull(payload.status) || "Open",
        blankToNull(payload.posted_at),
        invoiceDiscountAmount,
        invoiceDiscountPct,
        Boolean(payload.change_tds),
        id,
      ]
    );

    let tdsSummary =
      null;

    if (Array.isArray(payload.lines)) {
      const normalizedLines = [];

      for (const rawLine of payload.lines) {
        const gstRate =
          rawLine.gst_group_code
            ? await resolveGstRateForInvoiceLine(client, {
                gst_group_code:
                  rawLine.gst_group_code,
                posting_date:
                  payload.posting_date ||
                  currentResult.rows[0].posting_date ||
                  today(),
                from_state:
                  payload.from_state_code ||
                  payload.location_state_code ||
                  payload.state_code,
                to_state:
                  payload.to_state_code ||
                  payload.vendor_state_code ||
                  payload.state_code,
              })
            : null;

        if (rawLine.gst_group_code && !gstRate) {
          throw new Error("GST rate not found for selected GST Group and posting date.");
        }

        normalizedLines.push(
          normalizeLine({
            ...applyGstRate(rawLine, gstRate),
            tds_applicable:
              headerTdsApplicable,
            tds_section_code:
              headerTdsSectionCode,
            tds_assessee_code:
              headerTdsAssesseeCode,
            tds_pct:
              Boolean(payload.change_tds)
                ? rawLine.tds_pct ?? 0
                : tdsContext.tdsRate?.tds_pct ?? 0,
            surcharge_pct:
              Boolean(payload.change_tds)
                ? rawLine.surcharge_pct ?? 0
                : tdsContext.tdsRate?.surcharge_pct ?? 0,
            cess_pct:
              Boolean(payload.change_tds)
                ? rawLine.cess_pct ?? 0
                : tdsContext.tdsRate?.cess_pct ?? 0,
            total_tds_pct:
              Boolean(payload.change_tds)
                ? rawLine.total_tds_pct ?? 0
                : tdsContext.tdsRate?.total_tds_pct ?? 0,
            change_tds:
              Boolean(payload.change_tds),
          })
        );
      }

      const tdsResult =
        await applyVendorTdsToInvoiceLines(client, {
          vendorNo:
            blankToNull(payload.vendor_no) ||
            currentResult.rows[0].vendor_no,
          postingDate:
            payload.posting_date ||
            currentResult.rows[0].posting_date ||
            today(),
          lines:
            normalizedLines,
          changeTds:
            Boolean(payload.change_tds),
        });
      tdsSummary =
        tdsResult;
      const thresholdedLines =
        tdsResult.lines;

      for (const line of thresholdedLines) {

        await client.query(
          `
          UPDATE purchase_invoice_lines
          SET
            item_no = $1,
            variant_code = $2,
            item_description = $3,
            location_code = $4,
            uom_code = $5,
            quantity_received = $6,
            quantity_invoiced = $7,
            qty_to_invoice = $8,
            direct_unit_cost = $9,
            line_discount_pct = $10,
            line_discount_amount = $11,
            tax_pct = $12,
            tax_amount = $13,
            gst_calculation_type = $14,
            cgst_pct = $15,
            sgst_pct = $16,
            igst_pct = $17,
            total_gst_pct = $18,
            cgst_amount = $19,
            sgst_amount = $20,
            igst_amount = $21,
            total_gst_amount = $22,
            taxable_amount = $23,
            amount_including_gst = $24,
            line_amount = $25,
            amount_including_tax = $26,
            hsn_sac_code = $27,
            gst_group_code = $28,
            tds_applicable = $29,
            tds_section_code = $30,
            tds_assessee_code = $31,
            tds_threshold_amount = $32,
            tds_base_amount = $33,
            tds_pct = $34,
            surcharge_pct = $35,
            cess_pct = $36,
            total_tds_pct = $37,
            tds_amount = $38,
            amount_after_tds = $39,
            status = $40,
            updated_at = NOW()
          WHERE id = $41
            AND purchase_invoice_id = $42
          `,
          [
            blankToNull(line.item_no),
            blankToNull(line.variant_code),
            blankToNull(line.item_description),
            blankToNull(line.location_code),
            blankToNull(line.uom_code),
            num(line.quantity_received),
            num(line.quantity_invoiced),
            num(line.qty_to_invoice),
            num(line.direct_unit_cost),
            num(line.line_discount_pct),
            num(line.line_discount_amount),
            num(line.tax_pct),
            num(line.tax_amount),
            blankToNull(line.gst_calculation_type),
            num(line.cgst_pct),
            num(line.sgst_pct),
            num(line.igst_pct),
            num(line.total_gst_pct),
            num(line.cgst_amount),
            num(line.sgst_amount),
            num(line.igst_amount),
            num(line.total_gst_amount),
            num(line.taxable_amount),
            num(line.amount_including_gst),
            num(line.line_amount),
            num(line.amount_including_tax),
            blankToNull(line.hsn_sac_code),
            blankToNull(line.gst_group_code),
            Boolean(line.tds_applicable),
            blankToNull(line.tds_section_code),
            blankToNull(line.tds_assessee_code),
            num(line.tds_threshold_amount),
            num(line.tds_base_amount),
            num(line.tds_pct),
            num(line.surcharge_pct),
            num(line.cess_pct),
            num(line.total_tds_pct),
            num(line.tds_amount),
            num(line.amount_after_tds),
            blankToNull(line.status) || "Open",
            line.id,
            id,
          ]
        );
      }
    }

    if (tdsSummary) {
      await client.query(
        `
        UPDATE purchase_invoices
        SET
          tds_threshold_amount = $1,
          previous_tds_base_amount = $2,
          current_tds_base_amount = $3,
          tds_base_amount = $4,
          total_tds_base_amount = $4,
          updated_at = NOW()
        WHERE id = $5
        `,
        [
          num(tdsSummary.thresholdAmount),
          num(tdsSummary.previousVendorTotal),
          num(tdsSummary.currentInvoiceTaxableAmount),
          num(tdsSummary.eligibleBase),
          id,
        ]
      );
    }

    const updatedHeader =
      await recalcTotal(client, id);

    await client.query("COMMIT");

    res.json({
      header:
        updatedHeader,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error(err);

    res.status(500).json({
      error:
        err.message ||
        "Failed to update purchase invoice",
    });
  } finally {
    client.release();
  }
});

/**
 * POST PURCHASE INVOICE
 */
router.post("/:id/post", async (req, res) => {
  const client =
    await db.connect();

  try {
    const { id } =
      req.params;

    await client.query("BEGIN");
    await ensurePurchaseInvoiceSourceColumns(client);

    const headerResult =
      await client.query(
        `
        SELECT *
        FROM purchase_invoices
        WHERE id = $1
          AND COALESCE(is_deleted, false) = false
        FOR UPDATE
        `,
        [id]
      );

    if (headerResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error:
          "Purchase Invoice not found",
      });
    }

    const header =
      headerResult.rows[0];

    if (header.status === "Posted") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error:
          "Purchase Invoice is already posted",
      });
    }

    if (!header.vendor_invoice_no) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error:
          "Vendor Invoice No. is mandatory before posting",
      });
    }

    if (!String(header.location_code ?? "").trim()) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error:
          "Location Code is required",
      });
    }

    const tdsContext =
      await resolveInvoiceTdsContext(client, {
        vendorNo:
          header.vendor_no,
        postingDate:
          header.posting_date || today(),
      });

    const linesResult =
      await client.query(
        `
        SELECT *
        FROM purchase_invoice_lines
        WHERE purchase_invoice_id = $1
          AND COALESCE(is_deleted, false) = false
        ORDER BY line_no
        `,
        [id]
      );

    let lines =
      linesResult.rows.map((line) =>
        normalizeLine({
          ...line,
          change_tds:
            Boolean(header.change_tds),
          tds_applicable:
            tdsContext.active,
          tds_section_code:
            tdsContext.sectionCode,
          tds_assessee_code:
            tdsContext.assesseeCode,
        })
      );

    if (
      lines.length === 0 ||
      !lines.some((line) =>
        num(line.qty_to_invoice) > 0
      )
    ) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error:
          "At least one line must have Qty. to Invoice",
      });
    }

    const postingTdsApplicable =
      tdsContext.active;
    let postingPreviousVendorTotal =
      0;
    let postingThresholdAmount =
      0;

    if (postingTdsApplicable) {
      const tdsRate =
        tdsContext.tdsRate;

      if (!Boolean(header.change_tds) && tdsRate) {
        lines =
          lines.map((line) =>
            normalizeLine({
              ...line,
              tds_pct:
                num(line.tds_pct) > 0
                  ? line.tds_pct
                  : tdsRate.tds_pct ?? line.tds_pct,
              surcharge_pct:
                num(line.surcharge_pct) > 0
                  ? line.surcharge_pct
                  : tdsRate.surcharge_pct ?? line.surcharge_pct,
              cess_pct:
                num(line.cess_pct) > 0
                  ? line.cess_pct
                  : tdsRate.cess_pct ?? line.cess_pct,
              total_tds_pct:
                num(line.total_tds_pct) > 0
                  ? line.total_tds_pct
                  : tdsRate.total_tds_pct ?? line.total_tds_pct,
            })
          );
      }

      postingPreviousVendorTotal =
        await getPreviousVendorTdsTaxableTotal(client, {
          vendor_no:
            header.vendor_no,
          section_code:
            tdsContext.sectionCode,
          posting_date:
            header.posting_date || today(),
        });
      postingThresholdAmount =
        num(tdsRate?.threshold_amount) ||
        Math.max(...lines.map((line) => num(line.tds_threshold_amount)), 0) ||
        num(header.tds_threshold_amount);
      lines =
        applyTdsThresholdToLines(lines, {
          previousVendorTotal:
            postingPreviousVendorTotal,
          thresholdAmount:
            postingThresholdAmount,
          changeTds:
            Boolean(header.change_tds),
        });
    } else {
      lines =
        lines.map((line) =>
          calculateTdsLine({
            ...line,
            tds_applicable:
              false,
            tds_base_amount:
              0,
            tds_amount:
              0,
          })
        );
    }

    const tdsSummary =
      calculateTdsThresholdSummary(lines, {
        previousVendorTotal:
          postingPreviousVendorTotal,
        thresholdAmount:
          postingThresholdAmount,
      });

    const documentNo =
      await getNextNumber(
        await resolvePurchaseNoSeries(
          client,
          "posted_invoice_nos",
          "POSTED_PURCHASE_INVOICE",
        )
      );

    const totalAmount =
      Number(
        lines
          .reduce(
            (sum, line) =>
              sum + num(line.line_amount),
            0
          )
          .toFixed(2)
      );

    const totalDiscountAmount =
      Number(
        lines
          .reduce((sum, line) => sum + num(line.line_discount_amount), 0)
          .toFixed(2)
      );

    const totalTaxAmount =
      Number(
        lines
          .reduce((sum, line) => sum + num(line.tax_amount), 0)
          .toFixed(2)
      );

    const amountIncludingTax =
      Number(
        lines
          .reduce((sum, line) => sum + num(line.amount_including_tax), 0)
          .toFixed(2)
      );
    const igstAmount =
      round2(lines.reduce((sum, line) => sum + num(line.igst_amount), 0));
    const cgstAmount =
      round2(lines.reduce((sum, line) => sum + num(line.cgst_amount), 0));
    const sgstAmount =
      round2(lines.reduce((sum, line) => sum + num(line.sgst_amount), 0));
    const totalGstAmount =
      round2(lines.reduce((sum, line) => sum + num(line.total_gst_amount), 0));
    const invoiceDiscountAmount =
      num(header.invoice_discount_amount);
    const invoiceDiscountPct =
      num(header.invoice_discount_pct);
    const totalExclVat =
      round2(Math.max(totalAmount - invoiceDiscountAmount, 0));
    const totalVat =
      totalGstAmount;
    const totalInclVat =
      round2(totalExclVat + totalVat);

    const totalTdsBaseAmount =
      Number(
        lines
          .reduce((sum, line) => sum + num(line.tds_base_amount), 0)
          .toFixed(2)
      );
    const tdsThresholdAmount =
      round2(
        Math.max(
          Math.max(...lines.map((line) => num(line.tds_threshold_amount)), 0),
          num(header.tds_threshold_amount),
          num(tdsContext.tdsRate?.threshold_amount)
        )
      );

    const totalTdsAmount =
      Number(
        lines
          .reduce((sum, line) => sum + num(line.tds_amount), 0)
          .toFixed(2)
      );

    const netPayableAmount =
      round2(totalInclVat - totalTdsAmount);
    const tdsLessAmount =
      netPayableAmount;
    const postedTdsApplicable =
      tdsContext.active;
    const postedTdsSectionCode =
      tdsContext.sectionCode;
    const postedTdsAssesseeCode =
      tdsContext.assesseeCode;
    const firstTdsLine =
      lines.find((line) =>
        Boolean(line.tds_applicable)
      ) || {};
    const postedTdsPct =
      num(firstTdsLine.tds_pct) ||
      num(tdsContext.tdsRate?.tds_pct);
    const postedSurchargePct =
      num(firstTdsLine.surcharge_pct) ||
      num(tdsContext.tdsRate?.surcharge_pct);
    const postedCessPct =
      num(firstTdsLine.cess_pct) ||
      num(tdsContext.tdsRate?.cess_pct);
    const postedTotalTdsPct =
      num(firstTdsLine.total_tds_pct) ||
      round3(postedTdsPct + postedSurchargePct + postedCessPct) ||
      num(tdsContext.tdsRate?.total_tds_pct);

    if (totalTdsAmount > totalInclVat) {
      throw new Error("TDS Amount cannot be greater than Total Incl. Tax");
    }

    if (netPayableAmount < 0) {
      throw new Error("Net Payable Amount cannot be negative");
    }

    const postedHeaderResult =
      await client.query(
        `
        INSERT INTO posted_purchase_invoices (
          document_no,
          source_purchase_invoice_id,
          source_purchase_invoice_no,
          vendor_no,
          vendor_name,
          vendor_invoice_no,
          vendor_invoice_date,
          posting_date,
          document_date,
          due_date,
          location_code,
          challan_no,
          source_posted_purchase_receipt_id,
          source_purchase_order_id,
          source_inward_gate_entry_id,
          source_grn_no,
          total_amount,
          total_discount_amount,
          total_tax_amount,
          amount_including_tax,
          currency_code,
          payment_terms_code,
          remarks,
          tds_applicable,
          tds_section_code,
          tds_assessee_code,
          tds_pct,
          surcharge_pct,
          cess_pct,
          total_tds_pct,
          tds_threshold_amount,
          previous_tds_base_amount,
          current_tds_base_amount,
          tds_base_amount,
          total_tds_base_amount,
          total_tds_amount,
          tds_amount,
          subtotal_excl_vat,
          igst_amount,
          cgst_amount,
          sgst_amount,
          total_gst_amount,
          total_excl_vat,
          total_vat,
          total_incl_vat,
          invoice_discount_amount,
          invoice_discount_pct,
          change_tds,
          tds_less_amount,
          net_payable_amount,
          status,
          posted_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,
          $10,$11,$12,$13,$14,$15,$16,$17,
          $18,$19,$20,$21,$22,$23,$24,$25,$26,
          $27,$28,$29,$30,$31,$32,$33,$34,$35,$36,
          $37,$38,$39,$40,$41,$42,$43,$44,$45,$46,
          $47,$48,$49,$50,$51,$52
        )
        RETURNING *
        `,
        [
          documentNo,
          header.id,
          header.document_no,
          header.vendor_no,
          header.vendor_name,
          header.vendor_invoice_no,
          header.vendor_invoice_date,
          header.posting_date,
          header.document_date,
          header.due_date,
          header.location_code,
          header.challan_no,
          header.source_posted_purchase_receipt_id,
          header.source_purchase_order_id,
          header.source_inward_gate_entry_id,
          header.source_grn_no,
          totalAmount,
          totalDiscountAmount,
          totalTaxAmount,
          amountIncludingTax,
          header.currency_code,
          header.payment_terms_code,
          header.remarks,
          postedTdsApplicable,
          postedTdsSectionCode,
          postedTdsAssesseeCode,
          postedTdsPct,
          postedSurchargePct,
          postedCessPct,
          postedTotalTdsPct,
          tdsThresholdAmount,
          num(tdsSummary.previousVendorTotal),
          num(tdsSummary.currentInvoiceTaxableAmount),
          totalTdsBaseAmount,
          totalTdsBaseAmount,
          totalTdsAmount,
          totalTdsAmount,
          totalAmount,
          igstAmount,
          cgstAmount,
          sgstAmount,
          totalGstAmount,
          totalExclVat,
          totalVat,
          totalInclVat,
          invoiceDiscountAmount,
          invoiceDiscountPct,
          Boolean(header.change_tds),
          tdsLessAmount,
          netPayableAmount,
          "Posted",
          new Date(),
        ]
      );

    const postedHeader =
      postedHeaderResult.rows[0];

    for (const line of lines) {
      if (num(line.qty_to_invoice) <= 0) {
        continue;
      }

      if (!String(line.location_code ?? header.location_code ?? "").trim()) {
        throw new Error("Location Code is required on all purchase invoice lines");
      }

      await client.query(
        `
        INSERT INTO posted_purchase_invoice_lines (
          posted_purchase_invoice_id,
          source_purchase_invoice_line_id,
          source_posted_purchase_receipt_line_id,
          source_purchase_order_line_id,
          line_no,
          item_no,
          variant_code,
          item_description,
          location_code,
          gst_group_code,
          uom_code,
          quantity_received,
          quantity_invoiced,
          direct_unit_cost,
          line_discount_pct,
          line_discount_amount,
          tax_pct,
          tax_amount,
          gst_calculation_type,
          cgst_pct,
          sgst_pct,
          igst_pct,
          total_gst_pct,
          cgst_amount,
          sgst_amount,
          igst_amount,
          total_gst_amount,
          taxable_amount,
          amount_including_gst,
          line_amount,
          amount_including_tax,
          hsn_sac_code,
          tds_applicable,
          tds_section_code,
          tds_assessee_code,
          tds_threshold_amount,
          tds_base_amount,
          tds_pct,
          surcharge_pct,
          cess_pct,
          total_tds_pct,
          tds_amount,
          amount_after_tds
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,
          $8,$9,$10,$11,$12,$13,$14,$15,
          $16,$17,$18,$19,$20,$21,$22,$23,$24,
          $25,$26,$27,$28,$29,$30,$31,$32,$33,$34,
          $35,$36,$37,$38,$39,$40,$41,$42,$43
        )
        `,
        [
          postedHeader.id,
          line.id,
          line.source_posted_purchase_receipt_line_id,
          line.source_purchase_order_line_id,
          line.line_no,
          line.item_no,
          line.variant_code,
          line.item_description,
          line.location_code,
          blankToNull(line.gst_group_code),
          line.uom_code,
          num(line.quantity_received),
          num(line.qty_to_invoice),
          num(line.direct_unit_cost),
          num(line.line_discount_pct),
          num(line.line_discount_amount),
          num(line.tax_pct),
          num(line.tax_amount),
          blankToNull(line.gst_calculation_type),
          num(line.cgst_pct),
          num(line.sgst_pct),
          num(line.igst_pct),
          num(line.total_gst_pct),
          num(line.cgst_amount),
          num(line.sgst_amount),
          num(line.igst_amount),
          num(line.total_gst_amount),
          num(line.taxable_amount),
          num(line.amount_including_gst),
          num(line.line_amount),
          num(line.amount_including_tax),
          blankToNull(line.hsn_sac_code),
          Boolean(line.tds_applicable),
          blankToNull(line.tds_section_code),
          blankToNull(line.tds_assessee_code),
          num(line.tds_threshold_amount) || tdsThresholdAmount,
          num(line.tds_base_amount),
          num(line.tds_pct),
          num(line.surcharge_pct),
          num(line.cess_pct),
          num(line.total_tds_pct),
          num(line.tds_amount),
          num(line.amount_after_tds),
        ]
      );

      if (line.source_posted_purchase_receipt_line_id) {
        await client.query(
          `
          UPDATE posted_purchase_receipt_lines
          SET
            quantity_invoiced = COALESCE(quantity_invoiced, 0) + $1,
            updated_at = NOW()
          WHERE id = $2
          `,
          [
            num(line.qty_to_invoice),
            line.source_posted_purchase_receipt_line_id,
          ]
        );
      }

      if (line.source_purchase_order_line_id) {
        await client.query(
          `
          UPDATE purchase_order_lines
          SET
            qty_invoiced = LEAST(
              COALESCE(received_quantity, 0),
              COALESCE(qty_invoiced, 0) + $1
            ),
            qty_to_invoice = GREATEST(
              COALESCE(received_quantity, 0) - LEAST(
                COALESCE(received_quantity, 0),
                COALESCE(qty_invoiced, 0) + $1
              ),
              0
            ),
            updated_at = NOW()
          WHERE id = $2
          `,
          [
            num(line.qty_to_invoice),
            line.source_purchase_order_line_id,
          ]
        );
      }

      await client.query(
        `
        UPDATE purchase_invoice_lines
        SET
          quantity_invoiced = quantity_invoiced + $1,
          status = 'Posted',
          updated_at = NOW()
        WHERE id = $2
        `,
        [
          num(line.qty_to_invoice),
          line.id,
        ]
      );
    }

    await client.query(
      `
      UPDATE purchase_invoices
      SET
        status = 'Posted',
        total_amount = $1,
        total_discount_amount = $2,
        total_tax_amount = $3,
        amount_including_tax = $4,
        tds_pct = $5,
        surcharge_pct = $6,
        cess_pct = $7,
        total_tds_pct = $8,
        tds_threshold_amount = $9,
        previous_tds_base_amount = $10,
        current_tds_base_amount = $11,
        tds_base_amount = $12,
        total_tds_base_amount = $13,
        total_tds_amount = $14,
        tds_amount = $15,
        subtotal_excl_vat = $16,
        igst_amount = $17,
        cgst_amount = $18,
        sgst_amount = $19,
        total_gst_amount = $20,
        total_excl_vat = $21,
        total_vat = $22,
        total_incl_vat = $23,
        invoice_discount_amount = $24,
        invoice_discount_pct = $25,
        tds_less_amount = $26,
        net_payable_amount = $27,
        posted_purchase_invoice_id = $28,
        posted_at = NOW(),
        updated_at = NOW()
      WHERE id = $29
      `,
      [
        totalAmount,
        totalDiscountAmount,
        totalTaxAmount,
        amountIncludingTax,
        postedTdsPct,
        postedSurchargePct,
        postedCessPct,
        postedTotalTdsPct,
        tdsThresholdAmount,
        num(tdsSummary.previousVendorTotal),
        num(tdsSummary.currentInvoiceTaxableAmount),
        totalTdsBaseAmount,
        totalTdsBaseAmount,
        totalTdsAmount,
        totalTdsAmount,
        totalAmount,
        igstAmount,
        cgstAmount,
        sgstAmount,
        totalGstAmount,
        totalExclVat,
        totalVat,
        totalInclVat,
        invoiceDiscountAmount,
        invoiceDiscountPct,
        tdsLessAmount,
        netPayableAmount,
        postedHeader.id,
        id,
      ]
    );

    await createVendorLedgerEntryForPostedInvoice(
      client,
      postedHeader
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      posted_invoice_id:
        postedHeader.id,
      document_no:
        postedHeader.document_no,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error(err);

    res.status(500).json({
      error:
        err.message ||
        "Failed to post purchase invoice",
    });
  } finally {
    client.release();
  }
});

module.exports =
  router;
