async function hasIsActiveColumn(db) {
  const result = await db.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'number_series'
      AND column_name = 'is_active'
    LIMIT 1
    `
  );

  return result.rows.length > 0;
}

function normalizeCode(value) {
  const code = String(value ?? "").trim();
  return code || null;
}

async function validateNoSeriesCodes(db, payload, columns) {
  const selectedCodes = [
    ...new Set(
      columns
        .map((column) => normalizeCode(payload[column]))
        .filter(Boolean)
    ),
  ];

  if (selectedCodes.length === 0) {
    return;
  }

  const activeColumnExists = await hasIsActiveColumn(db);
  const result = await db.query(
    activeColumnExists
      ? `
        SELECT code
        FROM number_series
        WHERE code = ANY($1::text[])
          AND COALESCE(is_active, true) = true
        `
      : `
        SELECT code
        FROM number_series
        WHERE code = ANY($1::text[])
        `,
    [selectedCodes]
  );

  const validCodes = new Set(result.rows.map((row) => row.code));
  const invalidCodes = selectedCodes.filter((code) => !validCodes.has(code));

  if (invalidCodes.length > 0) {
    const error = new Error(
      `Invalid No. Series code${invalidCodes.length > 1 ? "s" : ""}: ${invalidCodes.join(", ")}`
    );
    error.statusCode = 400;
    throw error;
  }
}

module.exports = {
  hasIsActiveColumn,
  validateNoSeriesCodes,
};
