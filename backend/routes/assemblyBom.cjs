const express = require("express");
const router = express.Router();

const db = require("../db.cjs");
const { ensureAssemblySchema, getLookups, num } = require("../services/assemblyService.cjs");

router.get("/lookups/options", async (req, res) => {
  try {
    res.json(await getLookups());
  } catch (err) {
    console.error("GET ASSEMBLY BOM LOOKUPS ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load Assembly BOM lookups" });
  }
});

router.get("/:itemNo", async (req, res) => {
  try {
    await ensureAssemblySchema();
    const itemNo = req.params.itemNo;
    const [item, lines] = await Promise.all([
      db.query(
        `SELECT item_no, description, base_unit_of_measure, assembly_bom, assembly_bom_no, replenishment_system FROM items WHERE item_no = $1 LIMIT 1`,
        [itemNo]
      ),
      db.query(
        `SELECT * FROM assembly_bom_lines WHERE parent_item_no = $1 ORDER BY line_no, id`,
        [itemNo]
      ),
    ]);
    if (!item.rows[0]) return res.status(404).json({ error: "Item not found" });
    res.json({ item: item.rows[0], lines: lines.rows });
  } catch (err) {
    console.error("GET ASSEMBLY BOM ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load Assembly BOM" });
  }
});

router.post("/:itemNo/lines", async (req, res) => {
  try {
    await ensureAssemblySchema();
    const payload = req.body ?? {};
    if (!payload.item_no) return res.status(400).json({ error: "Component Item No. is required" });
    if (num(payload.quantity_per) <= 0) return res.status(400).json({ error: "Quantity Per must be greater than 0" });

    const lineNo = await db.query(
      `SELECT COALESCE(MAX(line_no), 0) + 10000 AS line_no FROM assembly_bom_lines WHERE parent_item_no = $1`,
      [req.params.itemNo]
    );
    const result = await db.query(
      `
      INSERT INTO assembly_bom_lines (
        parent_item_no,line_no,type,item_no,description,variant_code,location_code,quantity_per,unit_of_measure_code
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        req.params.itemNo,
        payload.line_no || lineNo.rows[0].line_no,
        payload.type || "Item",
        payload.item_no,
        payload.description || null,
        payload.variant_code || null,
        payload.location_code || null,
        num(payload.quantity_per),
        payload.unit_of_measure_code || null,
      ]
    );
    await db.query(
      `UPDATE items SET assembly_bom = TRUE, assembly_bom_no = COALESCE(assembly_bom_no, item_no), updated_at = NOW() WHERE item_no = $1`,
      [req.params.itemNo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("CREATE ASSEMBLY BOM LINE ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to create Assembly BOM line" });
  }
});

router.put("/lines/:id", async (req, res) => {
  try {
    await ensureAssemblySchema();
    const payload = req.body ?? {};
    if (num(payload.quantity_per) <= 0) return res.status(400).json({ error: "Quantity Per must be greater than 0" });
    const result = await db.query(
      `
      UPDATE assembly_bom_lines
      SET type=$1,item_no=$2,description=$3,variant_code=$4,location_code=$5,quantity_per=$6,unit_of_measure_code=$7,updated_at=NOW()
      WHERE id = $8
      RETURNING *
      `,
      [
        payload.type || "Item",
        payload.item_no,
        payload.description || null,
        payload.variant_code || null,
        payload.location_code || null,
        num(payload.quantity_per),
        payload.unit_of_measure_code || null,
        req.params.id,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Assembly BOM line not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE ASSEMBLY BOM LINE ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to update Assembly BOM line" });
  }
});

router.delete("/lines/:id", async (req, res) => {
  try {
    await ensureAssemblySchema();
    await db.query(`DELETE FROM assembly_bom_lines WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE ASSEMBLY BOM LINE ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to delete Assembly BOM line" });
  }
});

module.exports = router;
