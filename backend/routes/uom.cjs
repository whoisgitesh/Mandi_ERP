const express =
  require("express");

const router =
  express.Router();

const db =
  require("../db.cjs");

const {
  assignMasterNumber,
} = require("../services/masterNumberService.cjs");

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
          FROM unit_of_measure
          ORDER BY code
        `);

      res.json(
        result.rows
      );

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to fetch UOMs",
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

      const code = await assignMasterNumber(db, {
        masterKey: "uom",
        currentNo: payload.code,
      });

      const result =
        await db.query(
          `
          INSERT INTO unit_of_measure (
            code,
            description,
            international_standard_code,
            symbol,
            blocked
          )
          VALUES (
            $1,$2,$3,$4,$5
          )
          RETURNING *
          `,
          [
            code,
            payload.description,
            payload.international_standard_code,
            payload.symbol,
            payload.blocked,
          ]
        );

      res.json(
        result.rows[0]
      );

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to create UOM",
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

      const result =
        await db.query(
          `
          UPDATE unit_of_measure
          SET
            description = $1,
            international_standard_code = $2,
            symbol = $3,
            blocked = $4,
            updated_at = NOW()
          WHERE id = $5
          RETURNING *
          `,
          [
            payload.description,
            payload.international_standard_code,
            payload.symbol,
            payload.blocked,
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
          "Failed to update UOM",
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

      await db.query(
        `
        DELETE FROM unit_of_measure
        WHERE id = $1
        `,
        [req.params.id]
      );

      res.json({
        success: true,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to delete UOM",
      });
    }
  }
);

module.exports =
  router;
