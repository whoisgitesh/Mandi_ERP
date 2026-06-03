const express = require("express");

const router = express.Router();

const db = require("../db.cjs");

const blankToNull = (value) =>
  value === "" || value === undefined ? null : value;

const cleanCode = (value) =>
  String(value ?? "").trim().toUpperCase();

const validTypes = new Set(["Goods", "Service"]);

const num = (value) =>
  value === "" || value === null || value === undefined
    ? 0
    : Number(value);

router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT *
      FROM gst_groups
      ORDER BY code
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to fetch GST groups",
    });
  }
});

router.get("/:code", async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT *
      FROM gst_groups
      WHERE code = $1
      `,
      [cleanCode(req.params.code)]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "GST Group not found",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to fetch GST group",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const payload = req.body ?? {};
    const code = cleanCode(payload.code);
    const type = payload.gst_group_type || "Goods";

    if (!code) {
      return res.status(400).json({
        error: "GST Group Code is required",
      });
    }

    if (!validTypes.has(type)) {
      return res.status(400).json({
        error: "GST Group Type must be Goods or Service",
      });
    }

    const result = await db.query(
      `
      INSERT INTO gst_groups (
        code,
        description,
        gst_group_type,
        gst_rate,
        gst_place_of_supply,
        component_calc_type,
        cess_uom,
        cess_credit,
        hsn_sac_required,
        reverse_charge,
        is_active
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
      `,
      [
        code,
        blankToNull(payload.description),
        type,
        num(payload.gst_rate),
        blankToNull(payload.gst_place_of_supply),
        blankToNull(payload.component_calc_type) || "General",
        blankToNull(payload.cess_uom),
        Boolean(payload.cess_credit),
        Boolean(payload.hsn_sac_required),
        Boolean(payload.reverse_charge),
        payload.is_active !== false,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);

    res.status(err.code === "23505" ? 409 : 500).json({
      error:
        err.code === "23505"
          ? "GST Group Code already exists"
          : "Failed to create GST group",
    });
  }
});

router.put("/:code", async (req, res) => {
  try {
    const payload = req.body ?? {};
    const type = payload.gst_group_type || "Goods";

    if (!validTypes.has(type)) {
      return res.status(400).json({
        error: "GST Group Type must be Goods or Service",
      });
    }

    const result = await db.query(
      `
      UPDATE gst_groups
      SET
        description = $1,
        gst_group_type = $2,
        gst_rate = $3,
        gst_place_of_supply = $4,
        component_calc_type = $5,
        cess_uom = $6,
        cess_credit = $7,
        hsn_sac_required = $8,
        reverse_charge = $9,
        is_active = $10,
        updated_at = NOW()
      WHERE code = $11
      RETURNING *
      `,
      [
        blankToNull(payload.description),
        type,
        num(payload.gst_rate),
        blankToNull(payload.gst_place_of_supply),
        blankToNull(payload.component_calc_type) || "General",
        blankToNull(payload.cess_uom),
        Boolean(payload.cess_credit),
        Boolean(payload.hsn_sac_required),
        Boolean(payload.reverse_charge),
        payload.is_active !== false,
        cleanCode(req.params.code),
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "GST Group not found",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to update GST group",
    });
  }
});

router.delete("/:code", async (req, res) => {
  try {
    const result = await db.query(
      `
      UPDATE gst_groups
      SET is_active = false,
          updated_at = NOW()
      WHERE code = $1
      RETURNING *
      `,
      [cleanCode(req.params.code)]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "GST Group not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to deactivate GST group",
    });
  }
});

module.exports = router;
