const express = require("express");
const router = express.Router();

const db = require("../db.cjs");
const {
  ensureManufacturingSchema,
  getInventoryNoSeriesCode,
  getNextNumberInTransaction,
  calculateProductionBomLineFields,
  num,
} = require("../services/manufacturingService.cjs");

const EDITABLE_STATUSES = new Set(["New", "Under Development"]);

async function getBom(bomNo, connection = db) {
  const result = await connection.query(
    `SELECT * FROM production_boms WHERE bom_no = $1 LIMIT 1`,
    [bomNo]
  );

  return result.rows[0] ?? null;
}

async function assertEditable(bomNo, connection = db) {
  const bom = await getBom(bomNo, connection);
  if (!bom) {
    const error = new Error("Production BOM not found");
    error.statusCode = 404;
    throw error;
  }

  if (!EDITABLE_STATUSES.has(bom.status)) {
    const error = new Error("Certified or closed Production BOM cannot be edited");
    error.statusCode = 400;
    throw error;
  }

  return bom;
}

async function nextBomNo(connection = db) {
  const result = await connection.query(
    `
    SELECT bom_no
    FROM production_boms
    WHERE bom_no ~ '^PBOM-[0-9]+$'
    ORDER BY bom_no DESC
    LIMIT 1
    `
  );

  const last = result.rows[0]?.bom_no;
  const next = last ? Number(last.split("-")[1] || 0) + 1 : 1;
  return `PBOM-${String(next).padStart(5, "0")}`;
}

router.get("/", async (req, res) => {
  try {
    await ensureManufacturingSchema();

    const result = await db.query(
      `
      SELECT *
      FROM production_boms
      ORDER BY id DESC
      `
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET PRODUCTION BOMS ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load Production BOMs" });
  }
});

router.get("/:bomNo", async (req, res) => {
  try {
    await ensureManufacturingSchema();

    const bom = await getBom(req.params.bomNo);
    if (!bom) return res.status(404).json({ error: "Production BOM not found" });

    const lines = await db.query(
      `
      SELECT *
      FROM production_bom_lines
      WHERE bom_no = $1
      ORDER BY line_no, id
      `,
      [req.params.bomNo]
    );

    res.json({ ...bom, lines: lines.rows });
  } catch (err) {
    console.error("GET PRODUCTION BOM ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load Production BOM" });
  }
});

router.post("/", async (req, res) => {
  const client = await db.connect();

  try {
    await ensureManufacturingSchema(client);
    await client.query("BEGIN");

    const payload = req.body ?? {};
    const requestedNo = String(payload.bom_no || "AUTO").trim().toUpperCase();
    let bomNo = requestedNo;

    if (!bomNo || bomNo === "AUTO") {
      const seriesCode = await getInventoryNoSeriesCode(
        client,
        "production_bom_nos",
        "PRODUCTION_BOM"
      );
      if (seriesCode) {
        bomNo = await getNextNumberInTransaction(client, seriesCode);
      } else {
        bomNo = await nextBomNo(client);
      }
    }

    const productionBomVersionNos = await getInventoryNoSeriesCode(
      client,
      "production_bom_version_nos",
      null
    );

    const result = await client.query(
      `
      INSERT INTO production_boms (
        bom_no,
        description,
        status,
        unit_of_measure_code,
        version_nos,
        active_version,
        last_date_modified
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
      RETURNING *
      `,
      [
        bomNo,
        payload.description || null,
        payload.status || "New",
        payload.unit_of_measure_code || null,
        payload.version_nos || productionBomVersionNos || null,
        payload.active_version || null,
      ]
    );

    await client.query("COMMIT");
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("CREATE PRODUCTION BOM ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to create Production BOM" });
  } finally {
    client.release();
  }
});

router.put("/:bomNo", async (req, res) => {
  try {
    await ensureManufacturingSchema();
    await assertEditable(req.params.bomNo);

    const payload = req.body ?? {};

    const result = await db.query(
      `
      UPDATE production_boms
      SET
        description = $1,
        unit_of_measure_code = $2,
        version_nos = $3,
        active_version = $4,
        last_date_modified = CURRENT_DATE,
        updated_at = NOW()
      WHERE bom_no = $5
      RETURNING *
      `,
      [
        payload.description || null,
        payload.unit_of_measure_code || null,
        payload.version_nos || null,
        payload.active_version || null,
        req.params.bomNo,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE PRODUCTION BOM ERROR:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Failed to update Production BOM" });
  }
});

router.delete("/:bomNo", async (req, res) => {
  try {
    await ensureManufacturingSchema();

    const usedByItem = await db.query(
      `SELECT 1 FROM items WHERE production_bom_no = $1 LIMIT 1`,
      [req.params.bomNo]
    );
    if (usedByItem.rows.length > 0) {
      return res.status(400).json({ error: "Cannot delete BOM used by an item" });
    }

    const usedByOrder = await db.query(
      `SELECT 1 FROM released_production_orders WHERE production_bom_no = $1 LIMIT 1`,
      [req.params.bomNo]
    );
    if (usedByOrder.rows.length > 0) {
      return res.status(400).json({ error: "Cannot delete BOM used by a production order" });
    }

    await db.query(`DELETE FROM production_boms WHERE bom_no = $1`, [req.params.bomNo]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE PRODUCTION BOM ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to delete Production BOM" });
  }
});

router.post("/:bomNo/clone", async (req, res) => {
  const client = await db.connect();

  try {
    await ensureManufacturingSchema(client);
    await client.query("BEGIN");

    const sourceResult = await client.query(
      `SELECT * FROM production_boms WHERE bom_no = $1 LIMIT 1`,
      [req.params.bomNo]
    );
    const source = sourceResult.rows[0];

    if (!source) {
      throw Object.assign(new Error("Source Production BOM not found"), {
        statusCode: 404,
      });
    }

    const payload = req.body ?? {};
    const requestedNo = String(payload.new_bom_no || "AUTO").trim().toUpperCase();
    let newBomNo = requestedNo;

    if (!newBomNo || newBomNo === "AUTO") {
      const seriesCode = await getInventoryNoSeriesCode(
        client,
        "production_bom_nos",
        "PRODUCTION_BOM"
      );
      if (!seriesCode) {
        throw Object.assign(new Error("Production BOM No. Series is not configured."), {
          statusCode: 400,
        });
      }
      newBomNo = await getNextNumberInTransaction(client, seriesCode);
    }

    const exists = await client.query(
      `SELECT 1 FROM production_boms WHERE bom_no = $1 LIMIT 1`,
      [newBomNo]
    );
    if (exists.rows.length > 0) {
      throw Object.assign(new Error("New BOM No. already exists"), { statusCode: 400 });
    }

    const status = payload.status || "New";
    const copyVersionInfo = Boolean(payload.copy_version_info);

    const newBom = await client.query(
      `
      INSERT INTO production_boms (
        bom_no,
        description,
        status,
        unit_of_measure_code,
        version_nos,
        active_version,
        last_date_modified
      )
      VALUES ($1,$2,$3,$4,$5,$6,CURRENT_DATE)
      RETURNING *
      `,
      [
        newBomNo,
        payload.description || `Copy of ${source.description || source.bom_no}`,
        status,
        source.unit_of_measure_code || null,
        copyVersionInfo ? source.version_nos || null : null,
        copyVersionInfo ? source.active_version || null : null,
      ]
    );

    if (payload.copy_lines !== false) {
      await client.query(
        `
        INSERT INTO production_bom_lines (
          bom_no,
          line_no,
          type,
          item_no,
          variant_code,
          description,
          unit_of_measure_code,
          quantity_per,
          scrap_pct,
          gross_qty,
          shorting_loss_qty,
          cutting_loss_qty,
          peeling_loss_qty,
          any_other_loss_qty,
          net_qty,
          shortage_pct
        )
        SELECT
          $1,
          line_no,
          type,
          item_no,
          variant_code,
          description,
          unit_of_measure_code,
          quantity_per,
          scrap_pct,
          gross_qty,
          shorting_loss_qty,
          cutting_loss_qty,
          peeling_loss_qty,
          any_other_loss_qty,
          net_qty,
          shortage_pct
        FROM production_bom_lines
        WHERE bom_no = $2
        ORDER BY line_no, id
        `,
        [newBomNo, source.bom_no]
      );
    }

    await client.query("COMMIT");
    res.status(201).json(newBom.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("CLONE PRODUCTION BOM ERROR:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Failed to clone Production BOM" });
  } finally {
    client.release();
  }
});

router.post("/:bomNo/lines", async (req, res) => {
  try {
    await ensureManufacturingSchema();
    await assertEditable(req.params.bomNo);

    const payload = req.body ?? {};
    if (!payload.item_no) {
      return res.status(400).json({ error: "Item No. is required" });
    }
    const calculated = calculateProductionBomLineFields(payload);

    const lineNoResult = await db.query(
      `SELECT COALESCE(MAX(line_no), 0) + 10000 AS next_line_no FROM production_bom_lines WHERE bom_no = $1`,
      [req.params.bomNo]
    );

    const result = await db.query(
      `
      INSERT INTO production_bom_lines (
        bom_no,
        line_no,
        type,
        item_no,
        variant_code,
        description,
        unit_of_measure_code,
        quantity_per,
        scrap_pct,
        gross_qty,
        shorting_loss_qty,
        cutting_loss_qty,
        peeling_loss_qty,
        any_other_loss_qty,
        net_qty,
        shortage_pct
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *
      `,
      [
        req.params.bomNo,
        payload.line_no || lineNoResult.rows[0].next_line_no,
        payload.type || "Item",
        payload.item_no,
        payload.variant_code || null,
        payload.description || null,
        payload.unit_of_measure_code || null,
        calculated.quantity_per,
        num(payload.scrap_pct),
        calculated.gross_qty,
        calculated.shorting_loss_qty,
        calculated.cutting_loss_qty,
        calculated.peeling_loss_qty,
        calculated.any_other_loss_qty,
        calculated.net_qty,
        calculated.shortage_pct,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("CREATE PRODUCTION BOM LINE ERROR:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Failed to create Production BOM line" });
  }
});

router.put("/lines/:lineId", async (req, res) => {
  try {
    await ensureManufacturingSchema();

    const line = await db.query(
      `SELECT * FROM production_bom_lines WHERE id = $1 LIMIT 1`,
      [req.params.lineId]
    );

    if (line.rows.length === 0) {
      return res.status(404).json({ error: "Production BOM line not found" });
    }

    await assertEditable(line.rows[0].bom_no);

    const payload = req.body ?? {};
    const calculated = calculateProductionBomLineFields({
      ...line.rows[0],
      ...payload,
    });
    const result = await db.query(
      `
      UPDATE production_bom_lines
      SET
        line_no = $1,
        type = $2,
        item_no = $3,
        variant_code = $4,
        description = $5,
        unit_of_measure_code = $6,
        quantity_per = $7,
        scrap_pct = $8,
        gross_qty = $9,
        shorting_loss_qty = $10,
        cutting_loss_qty = $11,
        peeling_loss_qty = $12,
        any_other_loss_qty = $13,
        net_qty = $14,
        shortage_pct = $15,
        updated_at = NOW()
      WHERE id = $16
      RETURNING *
      `,
      [
        Number(payload.line_no || line.rows[0].line_no),
        payload.type || "Item",
        payload.item_no || line.rows[0].item_no,
        payload.variant_code || null,
        payload.description || null,
        payload.unit_of_measure_code || null,
        calculated.quantity_per,
        num(payload.scrap_pct),
        calculated.gross_qty,
        calculated.shorting_loss_qty,
        calculated.cutting_loss_qty,
        calculated.peeling_loss_qty,
        calculated.any_other_loss_qty,
        calculated.net_qty,
        calculated.shortage_pct,
        req.params.lineId,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE PRODUCTION BOM LINE ERROR:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Failed to update Production BOM line" });
  }
});

router.delete("/lines/:lineId", async (req, res) => {
  try {
    await ensureManufacturingSchema();

    const line = await db.query(
      `SELECT * FROM production_bom_lines WHERE id = $1 LIMIT 1`,
      [req.params.lineId]
    );

    if (line.rows.length === 0) {
      return res.status(404).json({ error: "Production BOM line not found" });
    }

    await assertEditable(line.rows[0].bom_no);
    await db.query(`DELETE FROM production_bom_lines WHERE id = $1`, [req.params.lineId]);

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE PRODUCTION BOM LINE ERROR:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Failed to delete Production BOM line" });
  }
});

router.post("/:bomNo/certify", async (req, res) => {
  try {
    await ensureManufacturingSchema();

    const lineCount = await db.query(
      `SELECT COUNT(*)::int AS count FROM production_bom_lines WHERE bom_no = $1`,
      [req.params.bomNo]
    );

    if (lineCount.rows[0].count === 0) {
      return res.status(400).json({ error: "Production BOM must have at least one line before certification" });
    }

    const lines = await db.query(
      `SELECT * FROM production_bom_lines WHERE bom_no = $1 ORDER BY line_no, id`,
      [req.params.bomNo]
    );
    for (const line of lines.rows) {
      const calculated = calculateProductionBomLineFields(line);
      await db.query(
        `
        UPDATE production_bom_lines
        SET
          quantity_per = $1,
          gross_qty = $2,
          shorting_loss_qty = $3,
          cutting_loss_qty = $4,
          peeling_loss_qty = $5,
          any_other_loss_qty = $6,
          net_qty = $7,
          shortage_pct = $8,
          updated_at = NOW()
        WHERE id = $9
        `,
        [
          calculated.quantity_per,
          calculated.gross_qty,
          calculated.shorting_loss_qty,
          calculated.cutting_loss_qty,
          calculated.peeling_loss_qty,
          calculated.any_other_loss_qty,
          calculated.net_qty,
          calculated.shortage_pct,
          line.id,
        ]
      );
    }

    const result = await db.query(
      `UPDATE production_boms SET status = 'Certified', updated_at = NOW() WHERE bom_no = $1 RETURNING *`,
      [req.params.bomNo]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("CERTIFY PRODUCTION BOM ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to certify Production BOM" });
  }
});

router.post("/:bomNo/reopen", async (req, res) => {
  try {
    await ensureManufacturingSchema();
    const result = await db.query(
      `UPDATE production_boms SET status = 'Under Development', updated_at = NOW() WHERE bom_no = $1 RETURNING *`,
      [req.params.bomNo]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("REOPEN PRODUCTION BOM ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to reopen Production BOM" });
  }
});

router.post("/:bomNo/close", async (req, res) => {
  try {
    await ensureManufacturingSchema();
    const result = await db.query(
      `UPDATE production_boms SET status = 'Closed', updated_at = NOW() WHERE bom_no = $1 RETURNING *`,
      [req.params.bomNo]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("CLOSE PRODUCTION BOM ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to close Production BOM" });
  }
});

module.exports = router;
