const express =
  require("express");

const router =
  express.Router();

const db =
  require("../db.cjs");

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
          FROM mandi_master
          WHERE is_deleted = false
          ORDER BY date DESC,
                   created_at DESC
        `);

      res.json(
        result.rows
      );

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to load mandi master",
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

      const result =
        await db.query(
          `
          INSERT INTO mandi_master (
            vendor_no,
            vendor_name,
            date,
            item_no,
            item_description,
            today_purchase_quantity,
            today_purchase_rate,
            variant_code,
            starting_date,
            expected_qty,
            expected_rate,
            bardana_weight,
            dammi,
            mandi_labour,
            loading_stiching,
            commission,
            dalali,
            market_fees,
            hrdf,
            cancer_fund,
            mandi_dhara_fof_payment,
            initial_update_time,
            fill_up_time,
            per_pack_qty
          )
          VALUES (
            $1,$2,$3,$4,$5,
            $6,$7,$8,$9,$10,
            $11,$12,$13,$14,$15,
            $16,$17,$18,$19,$20,
            $21,$22,$23,$24
          )
          RETURNING *
          `,
          [
            payload.vendor_no,
            payload.vendor_name,
            payload.date,
            payload.item_no,
            payload.item_description,
            payload.today_purchase_quantity,
            payload.today_purchase_rate,
            payload.variant_code,
            payload.starting_date,
            payload.expected_qty,
            payload.expected_rate,
            payload.bardana_weight,
            payload.dammi,
            payload.mandi_labour,
            payload.loading_stiching,
            payload.commission,
            payload.dalali,
            payload.market_fees,
            payload.hrdf,
            payload.cancer_fund,
            payload.mandi_dhara_fof_payment,
            payload.initial_update_time,
            payload.fill_up_time,
            payload.per_pack_qty,
          ]
        );

      res.json(
        result.rows[0]
      );

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to create mandi master",
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
          UPDATE mandi_master
          SET
            vendor_no = $1,
            vendor_name = $2,
            date = $3,
            item_no = $4,
            item_description = $5,
            today_purchase_quantity = $6,
            today_purchase_rate = $7,
            variant_code = $8,
            starting_date = $9,
            expected_qty = $10,
            expected_rate = $11,
            bardana_weight = $12,
            dammi = $13,
            mandi_labour = $14,
            loading_stiching = $15,
            commission = $16,
            dalali = $17,
            market_fees = $18,
            hrdf = $19,
            cancer_fund = $20,
            mandi_dhara_fof_payment = $21,
            initial_update_time = $22,
            fill_up_time = $23,
            per_pack_qty = $24,
            updated_at = NOW()
          WHERE id = $25
          RETURNING *
          `,
          [
            payload.vendor_no,
            payload.vendor_name,
            payload.date,
            payload.item_no,
            payload.item_description,
            payload.today_purchase_quantity,
            payload.today_purchase_rate,
            payload.variant_code,
            payload.starting_date,
            payload.expected_qty,
            payload.expected_rate,
            payload.bardana_weight,
            payload.dammi,
            payload.mandi_labour,
            payload.loading_stiching,
            payload.commission,
            payload.dalali,
            payload.market_fees,
            payload.hrdf,
            payload.cancer_fund,
            payload.mandi_dhara_fof_payment,
            payload.initial_update_time,
            payload.fill_up_time,
            payload.per_pack_qty,
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
          "Failed to update mandi master",
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
        UPDATE mandi_master
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
          "Failed to delete mandi master",
      });
    }
  }
);

module.exports = router;