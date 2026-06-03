async function resolveSalesNoSeries(db, setupColumns, fallbackCode) {
  const columns = Array.isArray(setupColumns)
    ? setupColumns
    : [setupColumns];

  const setupResult = await db.query(
    `SELECT ${columns.join(", ")}
     FROM sales_receivables_setup
     LIMIT 1`
  );

  const setup = setupResult.rows[0] ?? {};
  if (setupResult.rows.length === 0) {
    throw new Error("Sales & Receivables Setup is not configured");
  }

  let configuredCode = null;

  for (const column of columns) {
    if (setup[column]) {
      configuredCode = setup[column];
      break;
    }
  }

  const allowFallback =
    process.env.ALLOW_NO_SERIES_FALLBACK === "true";

  if (!configuredCode) {
    if (allowFallback && fallbackCode) {
      return fallbackCode;
    }

    throw new Error(
      `Sales & Receivables Setup field "${columns.join(" or ")}" is not configured`
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
    `Configured No. Series "${configuredCode}" for Sales & Receivables Setup field "${columns.join(" or ")}" does not exist`
  );
}

module.exports = {
  resolveSalesNoSeries,
};
