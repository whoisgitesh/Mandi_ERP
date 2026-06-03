const blankToNull = (value) =>
  value === "" || value === undefined ? null : value;

const cleanCode = (value) =>
  String(value ?? "").trim().toUpperCase();

const num = (value) =>
  value === "" || value === null || value === undefined
    ? 0
    : Number(value);

const round2 = (value) =>
  Number(num(value).toFixed(2));

function getIndianFinancialYearRange(postingDate) {
  const date =
    postingDate
      ? new Date(postingDate)
      : new Date();

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid posting date for TDS threshold calculation");
  }

  const year =
    date.getMonth() + 1 >= 4
      ? date.getFullYear()
      : date.getFullYear() - 1;

  const fyStart =
    `${year}-04-01`;
  const fyEnd =
    `${year + 1}-03-31`;

  return {
    fyStart,
    fyEnd,
  };
}

async function getPreviousVendorTdsTaxableTotal(
  client,
  {
    vendor_no,
    section_code,
    posting_date,
    exclude_posted_purchase_invoice_id,
  }
) {
  const vendorNo =
    cleanCode(vendor_no);
  const sectionCode =
    cleanCode(section_code);

  if (!vendorNo || !sectionCode) return 0;

  const { fyStart, fyEnd } =
    getIndianFinancialYearRange(posting_date);

  const result = await client.query(
    `
    SELECT COALESCE(SUM(
      COALESCE(total_amount, subtotal_excl_vat, total_excl_vat, 0)
    ), 0) AS previous_total
    FROM posted_purchase_invoices
    WHERE vendor_no = $1
      AND tds_section_code = $2
      AND posting_date >= $3::date
      AND posting_date <= LEAST($4::date, $5::date)
      AND COALESCE(is_deleted, false) = false
      AND ($6::integer IS NULL OR id <> $6::integer)
    `,
    [
      vendorNo,
      sectionCode,
      fyStart,
      posting_date || new Date().toISOString().slice(0, 10),
      fyEnd,
      exclude_posted_purchase_invoice_id || null,
    ]
  );

  return round2(result.rows[0]?.previous_total);
}

async function resolveTdsRate(
  client,
  {
    section_code,
    assessee_code,
    posting_date,
    concessional_code,
    country_code,
  }
) {
  const sectionCode = cleanCode(section_code);
  const assesseeCode = cleanCode(assessee_code);

  if (!sectionCode || !assesseeCode) return null;

  const result = await client.query(
    `
    SELECT *
    FROM tds_rates
    WHERE section_code = $1
      AND assessee_code = $2
      AND is_active = true
      AND effective_date <= $3::date
      AND (
        $4::varchar IS NULL
        OR concessional_code = $4
        OR concessional_code IS NULL
      )
      AND (
        $5::varchar IS NULL
        OR country_code = $5
        OR country_code IS NULL
      )
    ORDER BY
      CASE WHEN concessional_code = $4 THEN 0 ELSE 1 END,
      CASE WHEN country_code = $5 THEN 0 ELSE 1 END,
      effective_date DESC,
      id DESC
    LIMIT 1
    `,
    [
      sectionCode,
      assesseeCode,
      posting_date || new Date().toISOString().slice(0, 10),
      blankToNull(cleanCode(concessional_code)),
      blankToNull(cleanCode(country_code)),
    ]
  );

  return result.rows[0] || null;
}

function calculateTdsLine(line) {
  const tdsApplicable = Boolean(line.tds_applicable);
  const hasTdsBaseAmount =
    Object.prototype.hasOwnProperty.call(line, "tds_base_amount");
  const tdsBaseAmount =
    tdsApplicable
      ? hasTdsBaseAmount
        ? num(line.tds_base_amount)
        : num(line.line_amount)
      : 0;
  const tdsPct =
    tdsApplicable ? num(line.tds_pct) : 0;
  const surchargePct =
    tdsApplicable ? num(line.surcharge_pct) : 0;
  const cessPct =
    tdsApplicable ? num(line.cess_pct) : 0;
  const totalTdsPct =
    tdsApplicable
      ? Number((tdsPct + surchargePct + cessPct).toFixed(3))
      : 0;
  const manualTdsAmount =
    Boolean(line.change_tds) && tdsApplicable
      ? Math.max(num(line.tds_amount), 0)
      : null;
  const tdsAmount =
    manualTdsAmount !== null
      ? manualTdsAmount
      : tdsApplicable
        ? Number((tdsBaseAmount * totalTdsPct / 100).toFixed(2))
        : 0;
  const amountAfterTds =
    Number(
      (
        (
          num(line.amount_including_gst) ||
          num(line.amount_including_tax)
        ) -
        tdsAmount
      ).toFixed(2)
    );

  return {
    ...line,
    tds_applicable: tdsApplicable,
    tds_threshold_amount:
      tdsApplicable ? num(line.tds_threshold_amount) : 0,
    tds_base_amount: tdsBaseAmount,
    tds_pct: tdsPct,
    surcharge_pct: surchargePct,
    cess_pct: cessPct,
    total_tds_pct: totalTdsPct,
    tds_amount: tdsAmount,
    amount_after_tds: amountAfterTds,
  };
}

function calculateTdsThresholdSummary(
  lines,
  {
    previousVendorTotal = 0,
    thresholdAmount = 0,
  } = {}
) {
  const invoiceTaxableAmount =
    round2(
      lines.reduce(
        (sum, line) =>
          sum +
          (Boolean(line.tds_applicable)
            ? num(line.taxable_amount) || num(line.line_amount)
            : 0),
        0
      )
    );

  let eligibleBase =
    invoiceTaxableAmount;

  if (num(thresholdAmount) > 0) {
    if (num(previousVendorTotal) >= num(thresholdAmount)) {
      eligibleBase =
        invoiceTaxableAmount;
    } else {
      eligibleBase =
        Math.min(
          invoiceTaxableAmount,
          Math.max(
            num(previousVendorTotal) + invoiceTaxableAmount - num(thresholdAmount),
            0
          )
        );
    }
  }

  return {
    previousVendorTotal:
      round2(previousVendorTotal),
    currentInvoiceTaxableAmount:
      invoiceTaxableAmount,
    thresholdAmount:
      round2(thresholdAmount),
    eligibleBase:
      round2(eligibleBase),
  };
}

function applyTdsThresholdToLines(
  lines,
  {
    previousVendorTotal = 0,
    thresholdAmount = 0,
    changeTds = false,
  } = {}
) {
  const normalizedLines =
    lines.map((line) =>
      calculateTdsLine({
        ...line,
        tds_threshold_amount:
          thresholdAmount,
        change_tds:
          changeTds,
      })
    );

  if (changeTds) {
    return normalizedLines;
  }

  const {
    eligibleBase,
  } = calculateTdsThresholdSummary(normalizedLines, {
    previousVendorTotal,
    thresholdAmount,
  });

  let remainingEligibleBase =
    round2(eligibleBase);

  return normalizedLines.map((line) => {
    if (!line.tds_applicable) {
      return calculateTdsLine({
        ...line,
        tds_threshold_amount:
          thresholdAmount,
        tds_base_amount:
          0,
        tds_amount:
          0,
      });
    }

    const lineTaxableAmount =
      num(line.taxable_amount) ||
      num(line.line_amount);
    const lineTdsBaseAmount =
      round2(
        Math.min(
          lineTaxableAmount,
          Math.max(remainingEligibleBase, 0)
        )
      );

    remainingEligibleBase =
      round2(remainingEligibleBase - lineTdsBaseAmount);

    return calculateTdsLine({
      ...line,
      tds_threshold_amount:
        thresholdAmount,
      tds_base_amount:
        lineTdsBaseAmount,
      tds_amount:
        0,
      change_tds:
        false,
    });
  });
}

module.exports = {
  applyTdsThresholdToLines,
  calculateTdsLine,
  calculateTdsThresholdSummary,
  getIndianFinancialYearRange,
  getPreviousVendorTdsTaxableTotal,
  resolveTdsRate,
};
