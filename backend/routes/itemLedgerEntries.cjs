const express =
  require("express");

const router =
  express.Router();

const db =
  require("../db.cjs");

/**
 * GET ITEM LEDGER ENTRIES
 */
router.get(
  "/",
  async (req, res) => {

    try {
      await db.query(`
        ALTER TABLE items
          ADD COLUMN IF NOT EXISTS item_category_code VARCHAR(50),
          ADD COLUMN IF NOT EXISTS family_no VARCHAR(50)
      `);

      await db.query(`
        ALTER TABLE item_ledger_entries
          ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS reversed_entry_no INT,
          ADD COLUMN IF NOT EXISTS reversal_no VARCHAR(50),
          ADD COLUMN IF NOT EXISTS source_posted_document_no VARCHAR(50),
          ADD COLUMN IF NOT EXISTS reversal_reason TEXT
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS families (
          family_no VARCHAR(50) PRIMARY KEY,
          description VARCHAR(150) NOT NULL,
          description_2 VARCHAR(150),
          search_name VARCHAR(150),
          item_category_code VARCHAR(50),
          routing_no VARCHAR(50),
          blocked BOOLEAN DEFAULT FALSE,
          last_date_modified DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const result =
        await db.query(`
          SELECT
            ile.id,
            ile.entry_no,
            ile.posting_date,
            ile.entry_type,
            ile.document_type,
            ile.document_no,
            ile.item_no,
            ile.description,
            ile.location_code,
            ile.variant_code,
            ile.unit_of_measure_code,
            i.item_category_code,
            i.family_no,
            f.description AS family_description,
            COALESCE(ile.quantity, 0) AS quantity,
            COALESCE(ile.invoiced_quantity, 0) AS invoiced_quantity,
            COALESCE(ile.remaining_quantity, 0) AS remaining_quantity,
            COALESCE(ile.unit_price, 0) AS unit_price,
            COALESCE(ile.unit_cost, 0) AS unit_cost,
            COALESCE(ile.sales_amount, 0) AS sales_amount,
            COALESCE(ile.cost_amount, 0) AS cost_amount,
            ile.vendor_no,
            ile.vendor_name,
            ile.customer_no,
            ile.customer_name,
            COALESCE(ile.is_reversal, false) AS is_reversal,
            ile.reversal_no,
            ile.reversed_entry_no,
            ile.source_posted_document_no,
            ile.reversal_reason,
            COALESCE(ile.open, true) AS open
          FROM item_ledger_entries ile
          LEFT JOIN items i
            ON i.item_no = ile.item_no
           AND COALESCE(i.is_deleted, false) = false
          LEFT JOIN families f
            ON f.family_no = i.family_no
          ORDER BY ile.entry_no DESC
          LIMIT 1000
        `);

      res.json(
        result.rows
      );

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to fetch item ledger entries",
      });
    }
  }
);

module.exports =
  router;
