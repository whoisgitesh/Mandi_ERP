const express = require("express");

const router = express.Router();

const db = require("../db.cjs");

const blankToNull = (value) =>
  value === "" || value === undefined ? null : value;

const cleanCode = (value) =>
  String(value ?? "").trim().toUpperCase();

const num = (value) =>
  value === "" || value === null || value === undefined
    ? 0
    : Number(value);

function normalizePayload(payload = {}) {
  const sectionCode = cleanCode(payload.section_code);
  const assesseeCode = cleanCode(payload.assessee_code);
  const tdsPct = num(payload.tds_pct);
  const surchargePct = num(payload.surcharge_pct);
  const cessPct = num(payload.cess_pct);

  if (!sectionCode) {
    throw new Error("Section Code is required");
  }

  if (!assesseeCode) {
    throw new Error("Assessee Code is required");
  }

  if (!payload.effective_date) {
    throw new Error("Effective Date is required");
  }

  if (tdsPct < 0 || surchargePct < 0 || cessPct < 0) {
    throw new Error("TDS, surcharge, and cess percentages cannot be negative");
  }

  return {
    section_code: sectionCode,
    assessee_code: assesseeCode,
    effective_date: payload.effective_date,
    concessional_code: blankToNull(cleanCode(payload.concessional_code)),
    nature_of_remittance: blankToNull(payload.nature_of_remittance),
    act_applicable: blankToNull(payload.act_applicable),
    country_code: blankToNull(cleanCode(payload.country_code)),
    tds_pct: tdsPct,
    surcharge_pct: surchargePct,
    cess_pct: cessPct,
    total_tds_pct: Number((tdsPct + surchargePct + cessPct).toFixed(3)),
    threshold_amount: num(payload.threshold_amount),
    is_active: payload.is_active !== false,
  };
}

async function assertMasterExists(client, table, column, value, label) {
  const result = await client.query(
    `
    SELECT ${column}
    FROM ${table}
    WHERE ${column} = $1
    LIMIT 1
    `,
    [value]
  );

  if (!result.rows[0]) {
    throw new Error(`${label} does not exist`);
  }
}

async function assertNoDuplicate(client, payload, excludeId = null) {
  if (!payload.is_active) return;

  const result = await client.query(
    `
    SELECT id
    FROM tds_rates
    WHERE is_active = true
      AND section_code = $1
      AND assessee_code = $2
      AND effective_date = $3::date
      AND COALESCE(concessional_code, '') = COALESCE($4, '')
      AND COALESCE(country_code, '') = COALESCE($5, '')
      AND ($6::int IS NULL OR id <> $6::int)
    LIMIT 1
    `,
    [
      payload.section_code,
      payload.assessee_code,
      payload.effective_date,
      payload.concessional_code,
      payload.country_code,
      excludeId,
    ]
  );

  if (result.rows[0]) {
    throw new Error("An active TDS Rate already exists for this section, assessee, effective date, concessional code, and country");
  }
}

router.get("/resolve", async (req, res) => {
  try {
    const sectionCode = cleanCode(req.query.section_code);
    const assesseeCode = cleanCode(req.query.assessee_code);
    const postingDate =
      req.query.posting_date || new Date().toISOString().slice(0, 10);
    const concessionalCode = blankToNull(cleanCode(req.query.concessional_code));
    const countryCode = blankToNull(cleanCode(req.query.country_code));

    if (!sectionCode || !assesseeCode) {
      return res.status(400).json({
        error: "section_code and assessee_code are required",
      });
    }

    const result = await db.query(
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
        postingDate,
        concessionalCode,
        countryCode,
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "No active TDS Rate found for this setup",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to resolve TDS Rate",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        tr.*,
        tsc.description AS section_description,
        tac.description AS assessee_description
      FROM tds_rates tr
      LEFT JOIN tds_section_codes tsc
        ON tsc.code = tr.section_code
      LEFT JOIN tds_assessee_codes tac
        ON tac.code = tr.assessee_code
      ORDER BY tr.effective_date DESC,
               tr.section_code,
               tr.assessee_code
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch TDS rates",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT *
      FROM tds_rates
      WHERE id = $1
      `,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "TDS Rate not found",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch TDS rate",
    });
  }
});

router.post("/", async (req, res) => {
  const client = await db.connect();

  try {
    const payload = normalizePayload(req.body);

    await client.query("BEGIN");
    await assertMasterExists(client, "tds_section_codes", "code", payload.section_code, "Section Code");
    await assertMasterExists(client, "tds_assessee_codes", "code", payload.assessee_code, "Assessee Code");
    await assertNoDuplicate(client, payload);

    const result = await client.query(
      `
      INSERT INTO tds_rates (
        section_code,
        assessee_code,
        effective_date,
        concessional_code,
        nature_of_remittance,
        act_applicable,
        country_code,
        tds_pct,
        surcharge_pct,
        cess_pct,
        total_tds_pct,
        threshold_amount,
        is_active
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
      `,
      [
        payload.section_code,
        payload.assessee_code,
        payload.effective_date,
        payload.concessional_code,
        payload.nature_of_remittance,
        payload.act_applicable,
        payload.country_code,
        payload.tds_pct,
        payload.surcharge_pct,
        payload.cess_pct,
        payload.total_tds_pct,
        payload.threshold_amount,
        payload.is_active,
      ]
    );

    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(400).json({
      error: err.message || "Failed to create TDS rate",
    });
  } finally {
    client.release();
  }
});

router.put("/:id", async (req, res) => {
  const client = await db.connect();

  try {
    const payload = normalizePayload(req.body);

    await client.query("BEGIN");
    await assertMasterExists(client, "tds_section_codes", "code", payload.section_code, "Section Code");
    await assertMasterExists(client, "tds_assessee_codes", "code", payload.assessee_code, "Assessee Code");
    await assertNoDuplicate(client, payload, req.params.id);

    const result = await client.query(
      `
      UPDATE tds_rates
      SET
        section_code = $1,
        assessee_code = $2,
        effective_date = $3,
        concessional_code = $4,
        nature_of_remittance = $5,
        act_applicable = $6,
        country_code = $7,
        tds_pct = $8,
        surcharge_pct = $9,
        cess_pct = $10,
        total_tds_pct = $11,
        threshold_amount = $12,
        is_active = $13,
        updated_at = NOW()
      WHERE id = $14
      RETURNING *
      `,
      [
        payload.section_code,
        payload.assessee_code,
        payload.effective_date,
        payload.concessional_code,
        payload.nature_of_remittance,
        payload.act_applicable,
        payload.country_code,
        payload.tds_pct,
        payload.surcharge_pct,
        payload.cess_pct,
        payload.total_tds_pct,
        payload.threshold_amount,
        payload.is_active,
        req.params.id,
      ]
    );

    if (!result.rows[0]) {
      throw new Error("TDS Rate not found");
    }

    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(400).json({
      error: err.message || "Failed to update TDS rate",
    });
  } finally {
    client.release();
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await db.query(
      `
      UPDATE tds_rates
      SET is_active = false,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "TDS Rate not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to deactivate TDS rate",
    });
  }
});

module.exports = router;
