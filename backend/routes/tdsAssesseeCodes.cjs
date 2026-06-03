const express = require("express");

const router = express.Router();

const db = require("../db.cjs");

const cleanCode = (value) =>
  String(value ?? "").trim().toUpperCase();

function normalizePayload(payload = {}) {
  const code = cleanCode(payload.code);

  if (!code) {
    throw new Error("Assessee Code is required");
  }

  if (!String(payload.description ?? "").trim()) {
    throw new Error("Description is required");
  }

  return {
    code,
    description: String(payload.description).trim(),
    is_resident: payload.is_resident !== false,
    is_active: payload.is_active !== false,
  };
}

router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT *
      FROM tds_assessee_codes
      ORDER BY code
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch TDS assessee codes",
    });
  }
});

router.get("/:code", async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT *
      FROM tds_assessee_codes
      WHERE code = $1
      `,
      [cleanCode(req.params.code)]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "TDS Assessee Code not found",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch TDS assessee code",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = normalizePayload(req.body);

    const result = await db.query(
      `
      INSERT INTO tds_assessee_codes (
        code,
        description,
        is_resident,
        is_active
      )
      VALUES ($1,$2,$3,$4)
      RETURNING *
      `,
      [
        payload.code,
        payload.description,
        payload.is_resident,
        payload.is_active,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(err.code === "23505" ? 409 : 400).json({
      error:
        err.code === "23505"
          ? "Assessee Code already exists"
          : err.message || "Failed to create TDS assessee code",
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
      UPDATE tds_assessee_codes
      SET
        description = $1,
        is_resident = $2,
        is_active = $3,
        updated_at = NOW()
      WHERE code = $4
      RETURNING *
      `,
      [
        payload.description,
        payload.is_resident,
        payload.is_active,
        payload.code,
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "TDS Assessee Code not found",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(400).json({
      error: err.message || "Failed to update TDS assessee code",
    });
  }
});

router.delete("/:code", async (req, res) => {
  try {
    const result = await db.query(
      `
      UPDATE tds_assessee_codes
      SET is_active = false,
          updated_at = NOW()
      WHERE code = $1
      RETURNING *
      `,
      [cleanCode(req.params.code)]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "TDS Assessee Code not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to deactivate TDS assessee code",
    });
  }
});

module.exports = router;
