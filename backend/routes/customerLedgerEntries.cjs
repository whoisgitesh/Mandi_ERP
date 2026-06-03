const express =
  require("express");

const router =
  express.Router();

const db =
  require("../db.cjs");

const {
  ensureLedgerTables,
} = require("../services/ledgerService.cjs");

const buildWhere = (query, partyColumn) => {
  const conditions = [];
  const values = [];

  const add = (condition, value) => {
    values.push(value);
    conditions.push(
      condition.replace("?", `$${values.length}`)
    );
  };

  if (query[partyColumn]) {
    add(`${partyColumn} = ?`, query[partyColumn]);
  }

  if (query.document_no) {
    add("document_no ILIKE ?", `%${query.document_no}%`);
  }

  if (query.open !== undefined) {
    add(
      "open = ?",
      String(query.open).toLowerCase() === "true"
    );
  }

  if (query.date_from) {
    add("posting_date >= ?", query.date_from);
  }

  if (query.date_to) {
    add("posting_date <= ?", query.date_to);
  }

  return {
    where:
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "",
    values,
  };
};

router.get("/", async (req, res) => {
  try {
    await ensureLedgerTables(db);

    const {
      where,
      values,
    } = buildWhere(req.query, "customer_no");

    const result =
      await db.query(
        `
        SELECT *
        FROM customer_ledger_entries
        ${where}
        ORDER BY posting_date DESC, entry_no DESC
        LIMIT 1000
        `,
        values
      );

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        "Failed to fetch customer ledger entries",
    });
  }
});

router.get("/customer/:customerNo", async (req, res) => {
  try {
    await ensureLedgerTables(db);

    const result =
      await db.query(
        `
        SELECT *
        FROM customer_ledger_entries
        WHERE customer_no = $1
        ORDER BY posting_date DESC, entry_no DESC
        `,
        [req.params.customerNo]
      );

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        "Failed to fetch customer ledger entries",
    });
  }
});

router.get("/:entryNo", async (req, res) => {
  try {
    await ensureLedgerTables(db);

    const result =
      await db.query(
        `
        SELECT *
        FROM customer_ledger_entries
        WHERE entry_no = $1
        `,
        [req.params.entryNo]
      );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error:
          "Customer Ledger Entry not found",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        "Failed to fetch customer ledger entry",
    });
  }
});

module.exports =
  router;
