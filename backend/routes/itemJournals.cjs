const express = require("express");
const router = express.Router();

const db = require("../db.cjs");
const {
  ensureManufacturingSchema,
  getInventoryNoSeriesCode,
  getNextNumberInTransaction,
  num,
} = require("../services/manufacturingService.cjs");

const dateOnly = (value) => (value ? String(value).slice(0, 10) : null);
const today = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

async function ensureItemJournalSchema(client = db) {
  await ensureManufacturingSchema(client);

  await client.query(`
    ALTER TABLE item_ledger_entries
      ADD COLUMN IF NOT EXISTS source_table VARCHAR(100),
      ADD COLUMN IF NOT EXISTS source_id INT,
      ADD COLUMN IF NOT EXISTS source_line_id INT,
      ADD COLUMN IF NOT EXISTS vendor_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(150),
      ADD COLUMN IF NOT EXISTS customer_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150)
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS item_journal_lines (
      id SERIAL PRIMARY KEY,
      journal_no VARCHAR(50),
      line_no INT,
      posting_date DATE,
      item_no VARCHAR(50) NOT NULL,
      description VARCHAR(150),
      location_code VARCHAR(50) NOT NULL,
      variant_code VARCHAR(50),
      unit_of_measure_code VARCHAR(50),
      quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
      unit_cost NUMERIC(12,2) DEFAULT 0,
      cost_amount NUMERIC(12,2) DEFAULT 0,
      document_no VARCHAR(50),
      posted BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

router.get("/lookups", async (req, res) => {
  try {
    await ensureItemJournalSchema();

    const [items, locations] = await Promise.all([
      db.query(`
        SELECT
          item_no,
          description,
          base_unit_of_measure,
          unit_cost,
          inventory
        FROM items
        WHERE COALESCE(is_deleted, false) = false
        ORDER BY item_no
      `),
      db.query(`
        SELECT code, name AS description
        FROM locations
        WHERE COALESCE(is_deleted, false) = false
        ORDER BY code
      `),
    ]);

    res.json({
      items: items.rows,
      locations: locations.rows,
    });
  } catch (err) {
    console.error("GET ITEM JOURNAL LOOKUPS ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load Item Journal lookups" });
  }
});

router.post("/post", async (req, res) => {
  const client = await db.connect();

  try {
    await ensureItemJournalSchema(client);
    await client.query("BEGIN");

    const postingDate = dateOnly(req.body?.posting_date) || today();
    const lines = Array.isArray(req.body?.lines) ? req.body.lines : [];

    if (lines.length === 0) {
      throw Object.assign(new Error("At least one Item Journal line is required."), {
        statusCode: 400,
      });
    }

    const itemJournalNos = await getInventoryNoSeriesCode(
      client,
      "item_journal_nos",
      "ITEM_JOURNAL"
    );
    const selectedSeries = req.body?.no_series_code || itemJournalNos;
    const journalNo = await getNextNumberInTransaction(
      client,
      selectedSeries
    );
    const postedLines = [];

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] || {};
      const itemNo = String(line.item_no || "").trim();
      const locationCode = String(line.location_code || "").trim();
      const quantity = num(line.quantity);

      if (!itemNo) {
        throw Object.assign(new Error("Item No. is required on Item Journal lines."), {
          statusCode: 400,
        });
      }
      if (!locationCode) {
        throw Object.assign(new Error(`Location Code is required for item ${itemNo}.`), {
          statusCode: 400,
        });
      }
      if (quantity <= 0) {
        throw Object.assign(new Error(`Quantity must be greater than 0 for item ${itemNo}.`), {
          statusCode: 400,
        });
      }

      const itemResult = await client.query(
        `
        SELECT item_no, description, base_unit_of_measure, unit_cost
        FROM items
        WHERE item_no = $1
          AND COALESCE(is_deleted, false) = false
        LIMIT 1
        `,
        [itemNo]
      );
      const item = itemResult.rows[0];
      if (!item) {
        throw Object.assign(new Error(`Item ${itemNo} does not exist.`), { statusCode: 400 });
      }

      const locationResult = await client.query(
        `
        SELECT 1
        FROM locations
        WHERE code = $1
          AND COALESCE(is_deleted, false) = false
        LIMIT 1
        `,
        [locationCode]
      );
      if (locationResult.rows.length === 0) {
        throw Object.assign(new Error(`Location ${locationCode} does not exist.`), {
          statusCode: 400,
        });
      }

      const unitCost = num(line.unit_cost ?? item.unit_cost);
      const costAmount = quantity * unitCost;

      const journalLine = await client.query(
        `
        INSERT INTO item_journal_lines (
          journal_no,
          line_no,
          posting_date,
          item_no,
          description,
          location_code,
          variant_code,
          unit_of_measure_code,
          quantity,
          unit_cost,
          cost_amount,
          document_no,
          posted
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$1,true)
        RETURNING *
        `,
        [
          journalNo,
          (index + 1) * 10000,
          postingDate,
          itemNo,
          line.description || item.description || null,
          locationCode,
          line.variant_code || null,
          line.unit_of_measure_code || item.base_unit_of_measure || null,
          quantity,
          unitCost,
          costAmount,
        ]
      );

      await client.query(
        `
        INSERT INTO item_ledger_entries (
          posting_date,
          entry_type,
          document_type,
          document_no,
          item_no,
          description,
          location_code,
          variant_code,
          unit_of_measure_code,
          quantity,
          invoiced_quantity,
          remaining_quantity,
          unit_price,
          unit_cost,
          sales_amount,
          cost_amount,
          open,
          source_table,
          source_id,
          source_line_id
        )
        VALUES ($1,'Positive Adjustment','Item Journal',$2,$3,$4,$5,$6,$7,$8,$8,$8,0,$9,0,$10,true,'item_journal_lines',$11,$11)
        `,
        [
          postingDate,
          journalNo,
          itemNo,
          line.description || item.description || null,
          locationCode,
          line.variant_code || null,
          line.unit_of_measure_code || item.base_unit_of_measure || null,
          quantity,
          unitCost,
          costAmount,
          journalLine.rows[0].id,
        ]
      );

      await client.query(
        `
        UPDATE items
        SET inventory = COALESCE(inventory, 0) + $1,
            updated_at = NOW()
        WHERE item_no = $2
        `,
        [quantity, itemNo]
      );

      postedLines.push(journalLine.rows[0]);
    }

    await client.query("COMMIT");
    res.status(201).json({
      journal_no: journalNo,
      posting_date: postingDate,
      lines: postedLines,
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("POST ITEM JOURNAL ERROR:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Failed to post Item Journal" });
  } finally {
    client.release();
  }
});

module.exports = router;
