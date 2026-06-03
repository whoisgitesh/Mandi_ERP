const express = require("express");

const router = express.Router();

const db = require("../db.cjs");
const {
  hasIsActiveColumn,
} = require("../services/setupNoSeriesValidation.cjs");

const blankToNull = (value) =>
  value === "" || value === undefined ? null : value;

const cleanSeriesCode = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  /*
   * Setup pages should save only the No. Series code. This also accepts
   * accidental display values like "TDS_CHALLAN - TDS Challan Nos".
   */
  return raw.split(" - ")[0].trim().toUpperCase();
};

const num = (value) =>
  value === "" || value === null || value === undefined
    ? 0
    : Number(value);

const validRoundingTypes = new Set(["Nearest", "Up", "Down"]);

async function ensureRow(client = db) {
  await client.query(`
    INSERT INTO tds_setup (id, tax_type)
    VALUES (1, 'TDS')
    ON CONFLICT (id) DO NOTHING
  `);
}

async function assertNoSeriesExists(client, code, label) {
  const normalizedCode = cleanSeriesCode(code);
  if (!normalizedCode) return null;

  const activeColumnExists = await hasIsActiveColumn(client);

  const result = await client.query(
    activeColumnExists
      ? `
        SELECT code
        FROM number_series
        WHERE UPPER(code) = UPPER($1)
          AND COALESCE(is_active, true) = true
        LIMIT 1
        `
      : `
        SELECT code
        FROM number_series
        WHERE UPPER(code) = UPPER($1)
        LIMIT 1
        `,
    [normalizedCode]
  );

  if (!result.rows[0]) {
    throw new Error(`${label} must reference an existing No. Series`);
  }

  return result.rows[0].code;
}

router.get("/", async (req, res) => {
  try {
    await ensureRow();

    const result = await db.query(`
      SELECT *
      FROM tds_setup
      WHERE id = 1
    `);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch TDS setup",
    });
  }
});

router.put("/", async (req, res) => {
  const client = await db.connect();

  try {
    const payload = req.body ?? {};
    const roundingType = payload.tds_rounding_type || "Nearest";

    if (!validRoundingTypes.has(roundingType)) {
      throw new Error("TDS Rounding Type must be Nearest, Up, or Down");
    }

    await client.query("BEGIN");
    await ensureRow(client);

    const nilChallanNos = await assertNoSeriesExists(
      client,
      payload.tds_nil_challan_nos,
      "TDS Nil Challan Nos."
    );
    const nilPayDocumentNos = await assertNoSeriesExists(
      client,
      payload.nil_pay_tds_document_nos,
      "Nil Pay TDS Document Nos."
    );

    const result = await client.query(
      `
      UPDATE tds_setup
      SET
        tax_type = $1,
        tds_nil_challan_nos = $2,
        nil_pay_tds_document_nos = $3,
        tds_rounding_precision = $4,
        tds_rounding_type = $5,
        tds_enabled = $6,
        updated_at = NOW()
      WHERE id = 1
      RETURNING *
      `,
      [
        blankToNull(payload.tax_type) || "TDS",
        nilChallanNos,
        nilPayDocumentNos,
        num(payload.tds_rounding_precision) || 1,
        roundingType,
        payload.tds_enabled !== false,
      ]
    );

    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(400).json({
      error: err.message || "Failed to update TDS setup",
    });
  } finally {
    client.release();
  }
});

module.exports = router;
