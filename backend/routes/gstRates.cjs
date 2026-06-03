const express = require("express");

const router = express.Router();

const db = require("../db.cjs");
const {
  assertStateExists,
  resolveStateCode,
} = require("../services/statesService.cjs");

const blankToNull = (value) =>
  value === "" || value === undefined ? null : value;

const cleanCode = (value) =>
  String(value ?? "").trim().toUpperCase();

const num = (value) =>
  value === "" || value === null || value === undefined
    ? 0
    : Number(value);

const cleanState = (value) => {
  const state = cleanCode(value);
  return state || null;
};

async function normalizeStateInput(client, value, label) {
  const state = cleanState(value);
  if (!state) return null;
  return assertStateExists(client, state, label);
}

function normalizePayload(payload = {}) {
  const calculationType =
    payload.gst_calculation_type || "Intra-State";

  if (!["Intra-State", "Inter-State"].includes(calculationType)) {
    throw new Error("GST Calculation Type must be Intra-State or Inter-State");
  }

  if (!payload.gst_group_code) {
    throw new Error("GST Group Code is required");
  }

  if (!payload.effective_from) {
    throw new Error("Effective From is required");
  }

  let cgst = num(payload.cgst_pct);
  let sgst = num(payload.sgst_pct);
  let igst = num(payload.igst_pct);

  if (calculationType === "Intra-State") {
    igst = 0;
  } else {
    cgst = 0;
    sgst = 0;
  }

  const total =
    calculationType === "Intra-State"
      ? Number((cgst + sgst).toFixed(2))
      : Number(igst.toFixed(2));

  if (total < 0 || cgst < 0 || sgst < 0 || igst < 0) {
    throw new Error("GST percentages cannot be negative");
  }

  return {
    gst_group_code: cleanCode(payload.gst_group_code),
    hsn_sac: blankToNull(payload.hsn_sac),
    from_state_code: cleanState(payload.from_state_code),
    to_state_code: cleanState(payload.to_state_code),
    effective_from: payload.effective_from,
    effective_to: blankToNull(payload.effective_to),
    gst_calculation_type: calculationType,
    cgst_pct: cgst,
    sgst_pct: sgst,
    igst_pct: igst,
    total_gst_pct: total,
    is_active: payload.is_active !== false,
  };
}

async function assertGroupExists(client, code) {
  const result = await client.query(
    `
    SELECT code
    FROM gst_groups
    WHERE code = $1
    LIMIT 1
    `,
    [code]
  );

  if (!result.rows[0]) {
    throw new Error("Selected GST Group does not exist");
  }
}

async function assertNoOverlap(client, payload, excludeId = null) {
  if (!payload.is_active) return;

  const result = await client.query(
    `
    SELECT id
    FROM gst_rates
    WHERE is_active = true
      AND gst_group_code = $1
      AND gst_calculation_type = $2
      AND COALESCE(from_state_code, '') = COALESCE($3, '')
      AND COALESCE(to_state_code, '') = COALESCE($4, '')
      AND ($5::date IS NULL OR effective_from <= $5::date)
      AND (effective_to IS NULL OR effective_to >= $6::date)
      AND ($7::int IS NULL OR id <> $7::int)
    LIMIT 1
    `,
    [
      payload.gst_group_code,
      payload.gst_calculation_type,
      payload.from_state_code,
      payload.to_state_code,
      payload.effective_to,
      payload.effective_from,
      excludeId,
    ]
  );

  if (result.rows[0]) {
    throw new Error("An active GST Rate already exists for this group, state, calculation type, and date range");
  }
}

router.get("/resolve", async (req, res) => {
  try {
    const gstGroupCode = cleanCode(req.query.gst_group_code);
    const fromState =
      (await resolveStateCode(db, req.query.from_state)) ||
      cleanState(req.query.from_state);
    const toState =
      (await resolveStateCode(db, req.query.to_state)) ||
      cleanState(req.query.to_state);
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const calculationType =
      fromState && toState
        ? fromState === toState
          ? "Intra-State"
          : "Inter-State"
        : null;

    if (!gstGroupCode) {
      return res.status(400).json({
        error: "gst_group_code is required",
      });
    }

    const setupResult = await db.query(`
      SELECT gst_tax_type
      FROM gst_setup
      WHERE id = 1
      LIMIT 1
    `);

    if (
      setupResult.rows[0] &&
      cleanCode(setupResult.rows[0].gst_tax_type) !== "GST"
    ) {
      return res.status(400).json({
        error: "GST Setup is not configured with GST Tax Type",
      });
    }

    const result = await db.query(
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

    if (result.rows[0]) {
      return res.json(result.rows[0]);
    }

    const fallbackResult = await db.query(
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
        CASE WHEN from_state_code IS NULL THEN 0 ELSE 1 END,
        CASE WHEN to_state_code IS NULL THEN 0 ELSE 1 END,
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
      return res.json(fallbackResult.rows[0]);
    }

    const latestConfiguredResult = await db.query(
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
      return res.json(latestConfiguredResult.rows[0]);
    }

    {
      const groupResult = await db.query(
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

      if (group && groupRate > 0) {
        const cgst =
          calculationType === "Intra-State"
            ? Number((groupRate / 2).toFixed(2))
            : 0;
        const sgst =
          calculationType === "Intra-State"
            ? Number((groupRate - cgst).toFixed(2))
            : 0;
        const igst =
          calculationType === "Inter-State"
            ? groupRate
            : 0;

        return res.json({
          gst_group_code: gstGroupCode,
          gst_calculation_type: calculationType || "Intra-State",
          cgst_pct: cgst,
          sgst_pct: sgst,
          igst_pct: igst,
          total_gst_pct: groupRate,
          source: "gst_groups",
        });
      }

      return res.status(404).json({
        error: "No active GST Rate found for this setup",
      });
    }
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to resolve GST Rate",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        gr.*,
        gg.description AS gst_group_description
      FROM gst_rates gr
      LEFT JOIN gst_groups gg
        ON gg.code = gr.gst_group_code
      ORDER BY gr.effective_from DESC,
               gr.gst_group_code,
               gr.id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to fetch GST rates",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT *
      FROM gst_rates
      WHERE id = $1
      `,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "GST Rate not found",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to fetch GST rate",
    });
  }
});

router.post("/", async (req, res) => {
  const client = await db.connect();

  try {
    const payload = normalizePayload(req.body);

    await client.query("BEGIN");
    await assertGroupExists(client, payload.gst_group_code);
    payload.from_state_code = await normalizeStateInput(client, payload.from_state_code, "From State");
    payload.to_state_code = await normalizeStateInput(client, payload.to_state_code, "Location State Code");
    await assertNoOverlap(client, payload);

    const result = await client.query(
      `
      INSERT INTO gst_rates (
        gst_group_code,
        hsn_sac,
        from_state_code,
        to_state_code,
        effective_from,
        effective_to,
        gst_calculation_type,
        cgst_pct,
        sgst_pct,
        igst_pct,
        total_gst_pct,
        is_active
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
      `,
      [
        payload.gst_group_code,
        payload.hsn_sac,
        payload.from_state_code,
        payload.to_state_code,
        payload.effective_from,
        payload.effective_to,
        payload.gst_calculation_type,
        payload.cgst_pct,
        payload.sgst_pct,
        payload.igst_pct,
        payload.total_gst_pct,
        payload.is_active,
      ]
    );

    await client.query("COMMIT");

    res.json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);

    res.status(400).json({
      error: err.message || "Failed to create GST rate",
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
    await assertGroupExists(client, payload.gst_group_code);
    payload.from_state_code = await normalizeStateInput(client, payload.from_state_code, "From State");
    payload.to_state_code = await normalizeStateInput(client, payload.to_state_code, "Location State Code");
    await assertNoOverlap(client, payload, req.params.id);

    const result = await client.query(
      `
      UPDATE gst_rates
      SET
        gst_group_code = $1,
        hsn_sac = $2,
        from_state_code = $3,
        to_state_code = $4,
        effective_from = $5,
        effective_to = $6,
        gst_calculation_type = $7,
        cgst_pct = $8,
        sgst_pct = $9,
        igst_pct = $10,
        total_gst_pct = $11,
        is_active = $12,
        updated_at = NOW()
      WHERE id = $13
      RETURNING *
      `,
      [
        payload.gst_group_code,
        payload.hsn_sac,
        payload.from_state_code,
        payload.to_state_code,
        payload.effective_from,
        payload.effective_to,
        payload.gst_calculation_type,
        payload.cgst_pct,
        payload.sgst_pct,
        payload.igst_pct,
        payload.total_gst_pct,
        payload.is_active,
        req.params.id,
      ]
    );

    if (!result.rows[0]) {
      throw new Error("GST Rate not found");
    }

    await client.query("COMMIT");

    res.json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);

    res.status(400).json({
      error: err.message || "Failed to update GST rate",
    });
  } finally {
    client.release();
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await db.query(
      `
      UPDATE gst_rates
      SET is_active = false,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "GST Rate not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to deactivate GST rate",
    });
  }
});

module.exports = router;
