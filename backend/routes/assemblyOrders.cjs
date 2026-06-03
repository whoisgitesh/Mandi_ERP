const express = require("express");
const router = express.Router();

const db = require("../db.cjs");
const {
  badRequest,
  dateOnly,
  ensureAssemblySchema,
  getAssemblyOrder,
  getItemInventory,
  getInventoryNoSeriesCode,
  getLookups,
  getNextNumberInTransaction,
  num,
  rebuildAssemblyLines,
  today,
} = require("../services/assemblyService.cjs");

router.get("/lookups/options", async (req, res) => {
  try {
    res.json(await getLookups());
  } catch (err) {
    console.error("GET ASSEMBLY ORDER LOOKUPS ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load Assembly Order lookups" });
  }
});

router.get("/", async (req, res) => {
  try {
    await ensureAssemblySchema();
    const result = await db.query(`SELECT * FROM assembly_orders ORDER BY id DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error("GET ASSEMBLY ORDERS ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load Assembly Orders" });
  }
});

router.get("/:documentNo", async (req, res) => {
  try {
    await ensureAssemblySchema();
    const order = await getAssemblyOrder(req.params.documentNo);
    if (!order) return res.status(404).json({ error: "Assembly Order not found" });
    res.json(order);
  } catch (err) {
    console.error("GET ASSEMBLY ORDER ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load Assembly Order" });
  }
});

router.post("/", async (req, res) => {
  const client = await db.connect();
  try {
    await ensureAssemblySchema(client);
    await client.query("BEGIN");
    const payload = req.body ?? {};
    const itemNo = String(payload.item_no || "").trim();
    const qty = num(payload.quantity);
    if (!itemNo) throw badRequest("Assembly Item No. is required");
    if (qty <= 0) throw badRequest("Quantity must be greater than 0");
    if (!payload.location_code) throw badRequest("Location Code is required");

    const itemResult = await client.query(
      `SELECT item_no, description, base_unit_of_measure FROM items WHERE item_no = $1 AND COALESCE(is_deleted, false) = false LIMIT 1`,
      [itemNo]
    );
    const item = itemResult.rows[0];
    if (!item) throw badRequest(`Item ${itemNo} does not exist`);

    const assemblyOrderNos = await getInventoryNoSeriesCode(
      client,
      "assembly_order_nos",
      "ASSEMBLY_ORDER"
    );
    const documentNo = await getNextNumberInTransaction(client, assemblyOrderNos);
    const qtyToAssemble = num(payload.quantity_to_assemble || qty);

    const result = await client.query(
      `
      INSERT INTO assembly_orders (
        document_no,item_no,description,quantity,quantity_to_assemble,assembled_quantity,remaining_quantity,
        unit_of_measure_code,location_code,posting_date,due_date,starting_date,ending_date,status,assemble_to_order
      )
      VALUES ($1,$2,$3,$4,$5,0,$4,$6,$7,$8,$9,$10,$11,'Open',$12)
      RETURNING *
      `,
      [
        documentNo,
        itemNo,
        payload.description || item.description || null,
        qty,
        qtyToAssemble,
        payload.unit_of_measure_code || item.base_unit_of_measure || null,
        payload.location_code,
        dateOnly(payload.posting_date) || today(),
        dateOnly(payload.due_date),
        dateOnly(payload.starting_date),
        dateOnly(payload.ending_date),
        Boolean(payload.assemble_to_order),
      ]
    );

    await rebuildAssemblyLines(client, result.rows[0]);
    await client.query("COMMIT");
    res.status(201).json(await getAssemblyOrder(documentNo));
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("CREATE ASSEMBLY ORDER ERROR:", err);
    res.status(err.statusCode || 500).json({ error: err.message || "Failed to create Assembly Order" });
  } finally {
    client.release();
  }
});

router.put("/:documentNo", async (req, res) => {
  const client = await db.connect();
  try {
    await ensureAssemblySchema(client);
    await client.query("BEGIN");
    const current = await getAssemblyOrder(req.params.documentNo, client);
    if (!current) throw Object.assign(new Error("Assembly Order not found"), { statusCode: 404 });
    if (current.status === "Posted") throw badRequest("Posted Assembly Order cannot be edited");

    const payload = req.body ?? {};
    const qty = num(payload.quantity || current.quantity);
    const qtyToAssemble = num(payload.quantity_to_assemble || qty);
    if (qty <= 0) throw badRequest("Quantity must be greater than 0");
    if (qtyToAssemble <= 0) throw badRequest("Quantity to Assemble must be greater than 0");
    if (!payload.location_code && !current.location_code) throw badRequest("Location Code is required");

    const result = await client.query(
      `
      UPDATE assembly_orders
      SET item_no=$1,description=$2,quantity=$3,quantity_to_assemble=$4,
          remaining_quantity=GREATEST($3-COALESCE(assembled_quantity,0),0),
          unit_of_measure_code=$5,location_code=$6,posting_date=$7,due_date=$8,starting_date=$9,ending_date=$10,
          assemble_to_order=$11,updated_at=NOW()
      WHERE document_no=$12
      RETURNING *
      `,
      [
        payload.item_no || current.item_no,
        payload.description || null,
        qty,
        qtyToAssemble,
        payload.unit_of_measure_code || current.unit_of_measure_code || null,
        payload.location_code || current.location_code || null,
        dateOnly(payload.posting_date),
        dateOnly(payload.due_date),
        dateOnly(payload.starting_date),
        dateOnly(payload.ending_date),
        Boolean(payload.assemble_to_order),
        req.params.documentNo,
      ]
    );
    await rebuildAssemblyLines(client, result.rows[0]);
    await client.query("COMMIT");
    res.json(await getAssemblyOrder(req.params.documentNo));
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("UPDATE ASSEMBLY ORDER ERROR:", err);
    res.status(err.statusCode || 500).json({ error: err.message || "Failed to update Assembly Order" });
  } finally {
    client.release();
  }
});

router.post("/:documentNo/release", async (req, res) => {
  try {
    await ensureAssemblySchema();
    const result = await db.query(
      `UPDATE assembly_orders SET status='Released', updated_at=NOW() WHERE document_no=$1 AND status <> 'Posted' RETURNING *`,
      [req.params.documentNo]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Assembly Order not found" });
    res.json(await getAssemblyOrder(req.params.documentNo));
  } catch (err) {
    console.error("RELEASE ASSEMBLY ORDER ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to release Assembly Order" });
  }
});

router.post("/:documentNo/post", async (req, res) => {
  const client = await db.connect();
  try {
    await ensureAssemblySchema(client);
    await client.query("BEGIN");
    const order = await getAssemblyOrder(req.params.documentNo, client);
    if (!order) throw Object.assign(new Error("Assembly Order not found"), { statusCode: 404 });
    if (order.status === "Posted") throw badRequest("Assembly Order is already posted");
    if (!order.lines?.length) throw badRequest("Assembly BOM lines are required before posting");
    if (!order.location_code) throw badRequest("Location Code is required");

    const postingDate = dateOnly(req.body?.posting_date) || dateOnly(order.posting_date) || today();
    for (const line of order.lines) {
      if (num(line.quantity_per) <= 0) throw badRequest(`Quantity Per must be greater than 0 for item ${line.item_no}`);
      const required = num(line.quantity_to_consume);
      const available = await getItemInventory(client, line.item_no, line.location_code || order.location_code, line.variant_code || null);
      if (available < required) {
        throw badRequest(`Insufficient inventory for item ${line.item_no}. Available quantity is ${available.toFixed(2)}.`);
      }
    }

    const postedAssemblyOrderNos = await getInventoryNoSeriesCode(
      client,
      "posted_assembly_order_nos",
      "POSTED_ASSEMBLY_ORDER"
    );
    const postedNo = await getNextNumberInTransaction(client, postedAssemblyOrderNos);
    const outputQty = num(order.quantity_to_assemble);

    await client.query(
      `
      INSERT INTO posted_assembly_orders (
        document_no,source_assembly_order_no,item_no,description,quantity,assembled_quantity,
        unit_of_measure_code,location_code,posting_date,due_date,starting_date,ending_date,status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'Posted')
      `,
      [
        postedNo,
        order.document_no,
        order.item_no,
        order.description || null,
        num(order.quantity),
        outputQty,
        order.unit_of_measure_code || null,
        order.location_code,
        postingDate,
        dateOnly(order.due_date),
        dateOnly(order.starting_date),
        dateOnly(order.ending_date),
      ]
    );

    for (const line of order.lines) {
      const consumeQty = num(line.quantity_to_consume);
      const loc = line.location_code || order.location_code;
      await client.query(
        `
        INSERT INTO item_ledger_entries (
          posting_date,entry_type,document_type,document_no,item_no,description,location_code,variant_code,
          unit_of_measure_code,quantity,remaining_quantity,source_type,source_no,assembly_order_no,open
        )
        VALUES ($1,'Consumption','Assembly Consumption',$2,$3,$4,$5,$6,$7,($8::numeric * -1),($8::numeric * -1),'Assembly Order',$9,$9,true)
        `,
        [postingDate, order.document_no, line.item_no, line.description || null, loc, line.variant_code || null, line.unit_of_measure_code || null, consumeQty, order.document_no]
      );
      await client.query(`UPDATE items SET inventory = COALESCE(inventory,0) - $1, updated_at=NOW() WHERE item_no=$2`, [consumeQty, line.item_no]);
      await client.query(
        `INSERT INTO posted_assembly_order_lines (document_no,line_no,type,item_no,description,variant_code,location_code,quantity_per,consumed_quantity,unit_of_measure_code)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [postedNo, line.line_no, line.type, line.item_no, line.description, line.variant_code, loc, num(line.quantity_per), consumeQty, line.unit_of_measure_code]
      );
    }

    await client.query(
      `
      INSERT INTO item_ledger_entries (
        posting_date,entry_type,document_type,document_no,item_no,description,location_code,unit_of_measure_code,
        quantity,remaining_quantity,source_type,source_no,assembly_order_no,open
      )
      VALUES ($1,'Output','Assembly Output',$2,$3,$4,$5,$6,$7,$7,'Assembly Order',$8,$8,true)
      `,
      [postingDate, postedNo, order.item_no, order.description || null, order.location_code, order.unit_of_measure_code || null, outputQty, order.document_no]
    );
    await client.query(`UPDATE items SET inventory = COALESCE(inventory,0) + $1, updated_at=NOW() WHERE item_no=$2`, [outputQty, order.item_no]);
    await client.query(
      `UPDATE assembly_orders SET status='Posted', assembled_quantity=$1, remaining_quantity=0, updated_at=NOW() WHERE document_no=$2`,
      [outputQty, order.document_no]
    );

    await client.query("COMMIT");
    res.status(201).json({ document_no: postedNo, posted_order: await getAssemblyOrder(order.document_no) });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("POST ASSEMBLY ORDER ERROR:", err);
    res.status(err.statusCode || 500).json({ error: err.message || "Failed to post Assembly Order" });
  } finally {
    client.release();
  }
});

module.exports = router;
