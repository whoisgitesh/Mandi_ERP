async function resolvePurchaseNoSeries(db, setupColumn, fallbackCode) {
  const setupResult = await db.query(
    `SELECT ${setupColumn} AS series_code
     FROM purchase_payables_setup
     LIMIT 1`
  );

  if (setupResult.rows.length === 0) {
    throw new Error("Purchase & Payables Setup is not configured");
  }

  const configuredCode =
    setupResult.rows[0]?.series_code;

  const allowFallback =
    process.env.ALLOW_NO_SERIES_FALLBACK === "true";

  if (!configuredCode) {
    if (allowFallback && fallbackCode) {
      return fallbackCode;
    }

    throw new Error(
      `Purchase & Payables Setup field "${setupColumn}" is not configured`
    );
  }

  const existsResult = await db.query(
    `SELECT 1
     FROM number_series
     WHERE code = $1
     LIMIT 1`,
    [configuredCode]
  );

  if (existsResult.rows.length > 0) {
    return configuredCode;
  }

  if (allowFallback && fallbackCode) {
    return fallbackCode;
  }

  throw new Error(
    `Configured No. Series "${configuredCode}" for Purchase & Payables Setup field "${setupColumn}" does not exist`
  );
}

module.exports = {
  resolvePurchaseNoSeries,
};
