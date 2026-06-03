const express = require("express");

const router = express.Router();

const db = require("../db.cjs");

const blankToNull = (value) =>
  value === "" || value === undefined ? null : value;

async function ensureRow(client = db) {
  await client.query(`
    INSERT INTO gst_setup (
      id,
      gst_tax_type,
      cess_tax_type,
      generate_einv_on_service_post
    )
    VALUES (1, 'GST', 'GST CESS', false)
    ON CONFLICT (id) DO NOTHING
  `);
}

router.get("/", async (req, res) => {
  try {
    await ensureRow();

    const result = await db.query(`
      SELECT *
      FROM gst_setup
      WHERE id = 1
    `);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch GST setup",
    });
  }
});

router.put("/", async (req, res) => {
  try {
    const payload = req.body ?? {};
    const gstTaxType = String(payload.gst_tax_type ?? "").trim();
    const cessTaxType = blankToNull(payload.cess_tax_type);

    if (!gstTaxType) {
      return res.status(400).json({
        error: "GST Tax Type is required",
      });
    }

    await ensureRow();

    const result = await db.query(
      `
      UPDATE gst_setup
      SET
        gst_tax_type = $1,
        cess_tax_type = $2,
        generate_einv_on_service_post = $3,
        updated_at = NOW()
      WHERE id = 1
      RETURNING *
      `,
      [
        gstTaxType,
        cessTaxType,
        Boolean(payload.generate_einv_on_service_post),
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to update GST setup",
    });
  }
});

module.exports = router;
