const express = require("express");

const router = express.Router();

const db = require("../db.cjs");

const {
  ensureReversalSchema,
} = require("../services/reversalEntryService.cjs");

router.get("/", async (req, res) => {
  try {
    await ensureReversalSchema();

    const result = await db.query(`
      SELECT *
      FROM reversal_entries
      ORDER BY entry_no DESC
      LIMIT 1000
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch reversal entries",
    });
  }
});

router.get("/by-source/:sourceDocumentType/:sourceDocumentNo", async (req, res) => {
  try {
    await ensureReversalSchema();

    const result = await db.query(
      `
      SELECT *
      FROM reversal_entries
      WHERE source_document_type = $1
        AND source_document_no = $2
      ORDER BY entry_no DESC
      `,
      [
        req.params.sourceDocumentType,
        req.params.sourceDocumentNo,
      ]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch source reversal entries",
    });
  }
});

router.get("/:reversalNo", async (req, res) => {
  try {
    await ensureReversalSchema();

    const result = await db.query(
      `
      SELECT *
      FROM reversal_entries
      WHERE reversal_no = $1
         OR entry_no::text = $1
      LIMIT 1
      `,
      [req.params.reversalNo]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Reversal entry not found",
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch reversal entry",
    });
  }
});

module.exports = router;
