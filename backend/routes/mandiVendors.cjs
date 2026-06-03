const express =
  require("express");

const router =
  express.Router();

const db =
  require("../db.cjs");

const {
  assignMasterNumber,
} = require(
  "../services/masterNumberService.cjs"
);

const COLUMNS = [
  "vendor_no",
  "name",
  "city",
  "phone_no",
  "email",
  "gst_registration_no",
  "address",
  "balance_lcy",
  "balance_due_lcy",
];

const NUMERIC = new Set([
  "balance_lcy",
  "balance_due_lcy",
]);

function cleanValue(key, value) {
  if (value === "") return null;
  if (NUMERIC.has(key)) return Number(value ?? 0);
  return value ?? null;
}

/**
 * GET ALL
 */
router.get(
  "/",
  async (req, res) => {

    try {

      const result =
        await db.query(`
          SELECT *
          FROM mandi_vendor
          WHERE COALESCE(is_deleted, false) = false
          ORDER BY vendor_no
        `);

      res.json(
        result.rows
      );

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to fetch mandi vendors",
      });
    }
  }
);

/**
 * NEXT NUMBER
 */
router.get(
  "/next-number",
  async (req, res) => {

    try {

      const number =
        await assignMasterNumber(
          db,
          {
            masterKey:
              "mandiVendor",
            selectedSeriesCode:
              req.query.series_code,
            selectedSeriesLineId:
              req.query.series_line_id,
            currentNo:
              null,
          }
        );

      res.json({
        number,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to generate number",
      });
    }
  }
);

/**
 * CREATE
 */
router.post(
  "/",
  async (req, res) => {

    try {

      const payload =
        req.body;

      const vendorNo =
        await assignMasterNumber(
          db,
          {
            masterKey:
              "mandiVendor",
            selectedSeriesCode:
              payload.no_series_code,
            selectedSeriesLineId:
              payload.no_series_line_id,
            currentNo:
              payload.vendor_no,
          }
        );

      const nextPayload = {
        ...payload,
        vendor_no: vendorNo,
      };

      const fields = COLUMNS;
      const placeholders =
        fields.map((_, index) => `$${index + 1}`);
      const values =
        fields.map((field) => cleanValue(field, nextPayload[field]));

      const result =
        await db.query(
          `
          INSERT INTO mandi_vendor (${fields.join(", ")})
          VALUES (${placeholders.join(", ")})
          RETURNING *
          `,
          values
        );

      res.json(
        result.rows[0]
      );

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          err.message ||
          "Failed to create mandi vendor",
      });
    }
  }
);

/**
 * UPDATE
 */
router.put(
  "/:id",
  async (req, res) => {

    try {

      const { id } =
        req.params;

      const payload =
        req.body;

      const fields =
        COLUMNS.filter((field) => field !== "vendor_no");
      const assignments =
        fields.map((field, index) => `${field} = $${index + 1}`);
      const values =
        fields.map((field) => cleanValue(field, payload[field]));

      const result =
        await db.query(
          `
          UPDATE mandi_vendor
          SET
            ${assignments.join(", ")},
            updated_at = NOW()
          WHERE id = $${fields.length + 1}
          RETURNING *
          `,
          [
            ...values,
            id,
          ]
        );

      res.json(
        result.rows[0]
      );

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to update mandi vendor",
      });
    }
  }
);

/**
 * DELETE
 */
router.delete(
  "/:id",
  async (req, res) => {

    try {

      const { id } =
        req.params;

      await db.query(
        `
        UPDATE mandi_vendor
        SET
          is_deleted = true,
          updated_at = NOW()
        WHERE id = $1
        `,
        [id]
      );

      res.json({
        success: true,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to delete mandi vendor",
      });
    }
  }
);

module.exports =
  router;
