const { getNextNumber } = require("./noSeriesService.cjs");

const SETUP_COLUMNS = {
  customer: {
    table: "sales_receivables_setup",
    column: "customer_nos",
  },
  vendor: {
    table: "purchase_payables_setup",
    column: "vendor_nos",
  },
  item: {
    table: "inventory_setup",
    column: "item_nos",
  },
  salespersonPurchaser: {
    table: "sales_receivables_setup",
    column: "salesperson_purchaser_nos",
  },
  location: {
    table: "inventory_setup",
    column: "location_nos",
  },
  uom: {
    table: "inventory_setup",
    column: "uom_nos",
  },
  mandiVendor: {
    table: "purchase_payables_setup",
    column: "mandi_vendor_nos",
  },
};

async function getConfiguredSeriesCode(db, masterKey) {
  const config = SETUP_COLUMNS[masterKey];

  if (!config) {
    return null;
  }

  const result = await db.query(
    `SELECT ${config.column} AS series_code FROM ${config.table} LIMIT 1`
  );

  return result.rows[0]?.series_code ?? null;
}

async function isRelatedSeries(db, sourceCode, selectedCode) {
  if (!sourceCode || !selectedCode) return false;

  const result = await db.query(
    `
    SELECT 1
    FROM no_series_relationships
    WHERE series_code = $1
      AND related_series_code = $2
    LIMIT 1
    `,
    [sourceCode, selectedCode]
  );

  return result.rows.length > 0;
}

async function assertSeriesAllowed(db, masterKey, selectedSeriesCode) {
  if (!selectedSeriesCode) return;

  const defaultSeriesCode =
    await getConfiguredSeriesCode(db, masterKey);

  if (!defaultSeriesCode) return;

  if (selectedSeriesCode === defaultSeriesCode) return;

  if (await isRelatedSeries(db, defaultSeriesCode, selectedSeriesCode)) {
    return;
  }

  throw new Error(
    `No. Series ${selectedSeriesCode} is not allowed for this page`
  );
}

async function resolveSeriesCode(db, masterKey, selectedSeriesCode) {
  if (selectedSeriesCode) {
    await assertSeriesAllowed(db, masterKey, selectedSeriesCode);
    return selectedSeriesCode;
  }

  return getConfiguredSeriesCode(db, masterKey);
}

async function assignMasterNumber(db, {
  masterKey,
  selectedSeriesCode,
  selectedSeriesLineId,
  currentNo,
  autoValues = ["", "AUTO"],
}) {
  if (currentNo && !autoValues.includes(String(currentNo).trim())) {
    return currentNo;
  }

  if (selectedSeriesLineId) {
    const lineResult = await db.query(
      `
      SELECT no_series_code
      FROM no_series_lines
      WHERE id = $1
      `,
      [selectedSeriesLineId]
    );

    const lineSeriesCode =
      lineResult.rows[0]?.no_series_code ??
      selectedSeriesCode ??
      null;

    await assertSeriesAllowed(
      db,
      masterKey,
      lineSeriesCode
    );

    return getNextNumber(lineSeriesCode, selectedSeriesLineId);
  }

  const seriesCode = await resolveSeriesCode(
    db,
    masterKey,
    selectedSeriesCode
  );

  if (!seriesCode) {
    throw new Error("No. Series is not configured");
  }

  return getNextNumber(seriesCode, selectedSeriesLineId);
}

module.exports = {
  assignMasterNumber,
  resolveSeriesCode,
};
