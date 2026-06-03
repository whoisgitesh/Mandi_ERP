const express = require("express");
const router = express.Router();

const db = require("../db.cjs");
const { ensureAssemblySchema } = require("../services/assemblyService.cjs");

router.get("/", async (req, res) => {
  try {
    await ensureAssemblySchema();
    const result = await db.query(`SELECT * FROM posted_assembly_orders ORDER BY id DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error("GET POSTED ASSEMBLY ORDERS ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load Posted Assembly Orders" });
  }
});

router.get("/:documentNo", async (req, res) => {
  try {
    await ensureAssemblySchema();
    const order = await db.query(
      `SELECT * FROM posted_assembly_orders WHERE document_no = $1 LIMIT 1`,
      [req.params.documentNo]
    );
    if (!order.rows[0]) return res.status(404).json({ error: "Posted Assembly Order not found" });
    const lines = await db.query(
      `SELECT * FROM posted_assembly_order_lines WHERE document_no = $1 ORDER BY line_no, id`,
      [req.params.documentNo]
    );
    res.json({ ...order.rows[0], lines: lines.rows });
  } catch (err) {
    console.error("GET POSTED ASSEMBLY ORDER ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load Posted Assembly Order" });
  }
});

module.exports = router;
