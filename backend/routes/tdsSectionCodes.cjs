const express = require("express");

const router = express.Router();

const db = require("../db.cjs");

const blankToNull = (value) =>
  value === "" || value === undefined ? null : value;

const cleanCode = (value) =>
  String(value ?? "").trim().toUpperCase();

function normalizePayload(payload = {}) {
  const code = cleanCode(payload.code);

  if (!code) {
    throw new Error("Section Code is required");
  }

  if (!String(payload.description ?? "").trim()) {
    throw new Error("Description is required");
  }

  return {
    code,
    description: String(payload.description).trim(),
    etds_code: blankToNull(payload.etds_code),
    parent_code: blankToNull(cleanCode(payload.parent_code)),
    is_group: Boolean(payload.is_group),
    is_active: payload.is_active !== false,
  };
}

router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT *
      FROM tds_section_codes
      ORDER BY COALESCE(parent_code, code), is_group DESC, code
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch TDS section codes",
    });
  }
});

router.get("/:code", async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT *
      FROM tds_section_codes
      WHERE code = $1
      `,
      [cleanCode(req.params.code)]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "TDS Section Code not found",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch TDS section code",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = normalizePayload(req.body);

    const result = await db.query(
      `
      INSERT INTO tds_section_codes (
        code,
        description,
        etds_code,
        parent_code,
        is_group,
        is_active
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
      [
        payload.code,
        payload.description,
        payload.etds_code,
        payload.parent_code,
        payload.is_group,
        payload.is_active,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(err.code === "23505" ? 409 : 400).json({
      error:
        err.code === "23505"
          ? "Section Code already exists"
          : err.message || "Failed to create TDS section code",
    });
  }
});

router.put("/:code", async (req, res) => {
  try {
    const payload = normalizePayload({
      ...req.body,
      code: req.params.code,
    });

    const result = await db.query(
      `
      UPDATE tds_section_codes
      SET
        description = $1,
        etds_code = $2,
        parent_code = $3,
        is_group = $4,
        is_active = $5,
        updated_at = NOW()
      WHERE code = $6
      RETURNING *
      `,
      [
        payload.description,
        payload.etds_code,
        payload.parent_code,
        payload.is_group,
        payload.is_active,
        payload.code,
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "TDS Section Code not found",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({
      error: err.message || "Failed to update TDS section code",
    });
  }
});

router.delete("/:code", async (req, res) => {
  try {
    const result = await db.query(
      `
      UPDATE tds_section_codes
      SET is_active = false,
          updated_at = NOW()
      WHERE code = $1
      RETURNING *
      `,
      [cleanCode(req.params.code)]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "TDS Section Code not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to deactivate TDS section code",
    });
  }
});

module.exports = router;
