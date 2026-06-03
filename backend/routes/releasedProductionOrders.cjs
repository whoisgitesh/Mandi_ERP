const express = require("express");
const router = express.Router();

const db = require("../db.cjs");
const {
  componentExpectedQuantity,
  ensureManufacturingSchema,
  getInventoryNoSeriesCode,
  getItemInventory,
  getNextNumberInTransaction,
  num,
} = require("../services/manufacturingService.cjs");

const today = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const dateOnly = (value) => {
  if (!value) return null;

  const text = String(value).trim();
  const dateOnlyMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnlyMatch) return dateOnlyMatch[0];

  const usDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usDate) {
    const [, month, day, year] = usDate;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return null;
};

async function getOrder(documentNo, connection = db) {
  const result = await connection.query(
    `SELECT * FROM released_production_orders WHERE document_no = $1 LIMIT 1`,
    [documentNo]
  );

  return result.rows[0] ?? null;
}

async function getOrderWithComponents(documentNo, connection = db) {
  const order = await getOrder(documentNo, connection);
  if (!order) return null;

  const components = await connection.query(
    `
    SELECT *
    FROM production_order_components
    WHERE production_order_no = $1
    ORDER BY line_no, id
    `,
    [documentNo]
  );

  return { ...order, components: components.rows };
}

function assertOrderEditable(order) {
  if (["Finished", "Completed", "Closed"].includes(order.status)) {
    const error = new Error("Finished production order cannot be edited");
    error.statusCode = 400;
    throw error;
  }
}

async function resolveFinishedGood(sourceNo, connection = db) {
  const result = await connection.query(
    `
    SELECT *
    FROM items
    WHERE item_no = $1
      AND COALESCE(is_deleted, false) = false
    LIMIT 1
    `,
    [sourceNo]
  );

  const item = result.rows[0];
  if (!item) {
    const error = new Error("Finished Goods item not found");
    error.statusCode = 400;
    throw error;
  }

  if (String(item.replenishment_system || "").toLowerCase() !== "production order") {
    const error = new Error("Finished Goods item must use Replenishment System = Production Order");
    error.statusCode = 400;
    throw error;
  }

  if (!item.production_bom_no) {
    const error = new Error("Finished Goods item is not linked with a Certified Production BOM.");
    error.statusCode = 400;
    throw error;
  }

  const bom = await connection.query(
    `SELECT * FROM production_boms WHERE bom_no = $1 LIMIT 1`,
    [item.production_bom_no]
  );

  if (!bom.rows[0] || bom.rows[0].status !== "Certified") {
    const error = new Error("Finished Goods item is not linked with a Certified Production BOM.");
    error.statusCode = 400;
    throw error;
  }

  return { item, bom: bom.rows[0] };
}

router.get("/", async (req, res) => {
  try {
    await ensureManufacturingSchema();

    const result = await db.query(
      `
      SELECT *
      FROM released_production_orders
      ORDER BY id DESC
      `
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET RELEASED PRODUCTION ORDERS ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load Released Production Orders" });
  }
});

router.get("/lookups/options", async (req, res) => {
  try {
    await ensureManufacturingSchema();

    const [
      items,
      locations,
      inventoryPostingGroups,
      genProductPostingGroups,
      genBusinessPostingGroups,
      departments,
      customerGroups,
      bins,
    ] = await Promise.all([
      db.query(
        `
        SELECT
          item_no,
          description,
          base_unit_of_measure,
          production_bom_no,
          unit_cost,
          unit_price
        FROM items
        WHERE COALESCE(is_deleted, false) = false
        ORDER BY item_no
        `
      ),
      db.query(`SELECT code, name AS description FROM locations WHERE COALESCE(is_deleted, false) = false ORDER BY code`),
      db.query(`SELECT code, description FROM inventory_posting_groups WHERE COALESCE(is_active, true) = true ORDER BY code`),
      db.query(`SELECT code, description FROM gen_product_posting_groups WHERE COALESCE(is_active, true) = true ORDER BY code`),
      db.query(`SELECT code, description FROM gen_business_posting_groups WHERE COALESCE(is_active, true) = true ORDER BY code`),
      db.query(`SELECT code, description FROM departments WHERE COALESCE(is_active, true) = true ORDER BY code`),
      db.query(`SELECT code, description FROM customer_groups WHERE COALESCE(is_active, true) = true ORDER BY code`),
      db.query(`SELECT code, location_code, description FROM bins WHERE COALESCE(is_active, true) = true ORDER BY code`),
    ]);

    res.json({
      items: items.rows,
      locations: locations.rows,
      inventory_posting_groups: inventoryPostingGroups.rows,
      gen_product_posting_groups: genProductPostingGroups.rows,
      gen_business_posting_groups: genBusinessPostingGroups.rows,
      departments: departments.rows,
      customer_groups: customerGroups.rows,
      bins: bins.rows,
    });
  } catch (err) {
    console.error("GET PRODUCTION ORDER LOOKUPS ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load production order lookups" });
  }
});

router.get("/:documentNo", async (req, res) => {
  try {
    await ensureManufacturingSchema();

    const order = await getOrderWithComponents(req.params.documentNo);
    if (!order) return res.status(404).json({ error: "Released Production Order not found" });

    res.json(order);
  } catch (err) {
    console.error("GET RELEASED PRODUCTION ORDER ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to load Released Production Order" });
  }
});

router.post("/", async (req, res) => {
  const client = await db.connect();

  try {
    await ensureManufacturingSchema(client);
    await client.query("BEGIN");

    const payload = req.body ?? {};
    const isDraft = Boolean(payload.draft);

    if (!isDraft && !payload.source_no) {
      throw Object.assign(new Error("Source No. is required"), { statusCode: 400 });
    }
    if (!isDraft && !payload.location_code) {
      throw Object.assign(new Error("Location Code is required"), { statusCode: 400 });
    }
    if (!isDraft && num(payload.quantity) <= 0) {
      throw Object.assign(new Error("Quantity must be greater than 0"), { statusCode: 400 });
    }

    const resolved = payload.source_no
      ? await resolveFinishedGood(payload.source_no, client)
      : { item: null, bom: null };
    const item = resolved.item;
    const bom = resolved.bom;
    const releasedProdOrderNos = await getInventoryNoSeriesCode(
      client,
      "released_prod_order_nos",
      "RELEASED_PROD_ORDER"
    );
    const documentNo = await getNextNumberInTransaction(
      client,
      releasedProdOrderNos
    );

    const result = await client.query(
      `
      INSERT INTO released_production_orders (
        document_no,
        source_type,
        source_no,
        description,
        unit_of_measure_code,
        description_2,
        status,
        quantity,
        finished_quantity,
        remaining_quantity,
        location_code,
        posting_date,
        starting_date,
        ending_date,
        due_date,
        production_bom_no,
        referred_production_order_no,
        refresh_no,
        total_cost_rm,
        search_description,
        assigned_user_id,
        blocked,
        last_date_modified,
        starting_datetime,
        ending_datetime,
        inventory_posting_group,
        gen_prod_posting_group,
        gen_bus_posting_group,
        department_code,
        customer_group_code,
        bin_code
      )
      VALUES ($1,'Item',$2,$3,$4,$5,'Released',$6,0,$6,$7,$8,$9,$10,$11,$12,$13,$14,0,$15,$16,$17,CURRENT_DATE,$18,$19,$20,$21,$22,$23,$24,$25)
      RETURNING *
      `,
      [
        documentNo,
        item?.item_no || "",
        payload.description || item?.description || bom?.description || null,
        item?.base_unit_of_measure || payload.unit_of_measure_code || null,
        payload.description_2 || null,
        num(payload.quantity),
        payload.location_code || "",
        dateOnly(payload.posting_date) || today(),
        dateOnly(payload.starting_date),
        dateOnly(payload.ending_date),
        dateOnly(payload.due_date),
        bom?.bom_no || null,
        payload.referred_production_order_no || null,
        payload.refresh_no || null,
        payload.search_description || item?.description || null,
        payload.assigned_user_id || null,
        Boolean(payload.blocked),
        payload.starting_datetime || null,
        payload.ending_datetime || null,
        payload.inventory_posting_group || null,
        payload.gen_prod_posting_group || null,
        payload.gen_bus_posting_group || null,
        payload.department_code || null,
        payload.customer_group_code || null,
        payload.bin_code || null,
      ]
    );

    await client.query("COMMIT");
    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("CREATE RELEASED PRODUCTION ORDER ERROR:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Failed to create Released Production Order" });
  } finally {
    client.release();
  }
});

router.put("/:documentNo", async (req, res) => {
  try {
    await ensureManufacturingSchema();

    const order = await getOrder(req.params.documentNo);
    if (!order) return res.status(404).json({ error: "Released Production Order not found" });
    assertOrderEditable(order);

    const payload = req.body ?? {};
    let resolved = null;
    if (payload.source_no && payload.source_no !== order.source_no) {
      resolved = await resolveFinishedGood(payload.source_no);
    }

    const quantity = num(payload.quantity || order.quantity);
    if (quantity <= 0) {
      return res.status(400).json({ error: "Quantity must be greater than 0" });
    }

    const finishedQuantity = num(order.finished_quantity);
    if (quantity < finishedQuantity) {
      return res.status(400).json({ error: "Quantity cannot be less than finished quantity" });
    }

    const componentCount = await db.query(
      `SELECT COUNT(*)::int AS count FROM production_order_components WHERE production_order_no = $1`,
      [order.document_no]
    );
    const hasComponents = Number(componentCount.rows[0]?.count || 0) > 0;
    const nextSourceNo = payload.source_no || order.source_no;
    const nextLocationCode = payload.location_code || order.location_code;
    const nextBomNo = payload.production_bom_no || resolved?.bom?.bom_no || order.production_bom_no;
    const nextUom =
      resolved?.item?.base_unit_of_measure ||
      payload.unit_of_measure_code ||
      order.unit_of_measure_code ||
      null;
    const shouldNeedRefresh =
      hasComponents &&
      (
        num(order.quantity) !== quantity ||
        String(order.source_no || "") !== String(nextSourceNo || "") ||
        String(order.location_code || "") !== String(nextLocationCode || "") ||
        String(order.production_bom_no || "") !== String(nextBomNo || "")
      );

    const result = await db.query(
      `
      UPDATE released_production_orders
      SET
        source_no = $1,
        description = $2,
        description_2 = $3,
        quantity = $4,
        remaining_quantity = $4 - COALESCE(finished_quantity, 0),
        location_code = $5,
        posting_date = $6,
        starting_date = $7,
        ending_date = $8,
        due_date = $9,
        production_bom_no = COALESCE($10, production_bom_no),
        referred_production_order_no = $11,
        refresh_no = $12,
        search_description = $13,
        assigned_user_id = $14,
        blocked = $15,
        starting_datetime = $16,
        ending_datetime = $17,
        inventory_posting_group = $18,
        gen_prod_posting_group = $19,
        gen_bus_posting_group = $20,
        department_code = $21,
        customer_group_code = $22,
        bin_code = $23,
        unit_of_measure_code = $24,
        needs_refresh = CASE WHEN $25 THEN TRUE ELSE COALESCE(needs_refresh, FALSE) END,
        last_date_modified = CURRENT_DATE,
        updated_at = NOW()
      WHERE document_no = $26
      RETURNING *
      `,
      [
        nextSourceNo,
        payload.description || null,
        payload.description_2 || null,
        quantity,
        nextLocationCode,
        dateOnly(payload.posting_date),
        dateOnly(payload.starting_date),
        dateOnly(payload.ending_date),
        dateOnly(payload.due_date),
        nextBomNo || null,
        payload.referred_production_order_no || null,
        payload.refresh_no || null,
        payload.search_description || null,
        payload.assigned_user_id || null,
        Boolean(payload.blocked),
        payload.starting_datetime || null,
        payload.ending_datetime || null,
        payload.inventory_posting_group || null,
        payload.gen_prod_posting_group || null,
        payload.gen_bus_posting_group || null,
        payload.department_code || null,
        payload.customer_group_code || null,
        payload.bin_code || null,
        nextUom,
        shouldNeedRefresh,
        req.params.documentNo,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE RELEASED PRODUCTION ORDER ERROR:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Failed to update Released Production Order" });
  }
});

router.delete("/:documentNo", async (req, res) => {
  try {
    await ensureManufacturingSchema();

    const order = await getOrder(req.params.documentNo);
    if (!order) return res.status(404).json({ error: "Released Production Order not found" });
    assertOrderEditable(order);

    const ledger = await db.query(
      `SELECT 1 FROM item_ledger_entries WHERE production_order_no = $1 LIMIT 1`,
      [req.params.documentNo]
    );
    if (ledger.rows.length > 0) {
      return res.status(400).json({ error: "Cannot delete production order with posted ledger entries" });
    }

    await db.query(`DELETE FROM released_production_orders WHERE document_no = $1`, [
      req.params.documentNo,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE RELEASED PRODUCTION ORDER ERROR:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Failed to delete Released Production Order" });
  }
});

router.post("/:documentNo/refresh", async (req, res) => {
  const client = await db.connect();

  try {
    await ensureManufacturingSchema(client);
    await client.query("BEGIN");

    const order = await getOrder(req.params.documentNo, client);
    if (!order) throw Object.assign(new Error("Released Production Order not found"), { statusCode: 404 });
    assertOrderEditable(order);

    if (String(order.source_type || "Item") !== "Item") {
      throw Object.assign(new Error("Source Type must be Item before refreshing Production Order"), {
        statusCode: 400,
      });
    }
    if (!String(order.source_no || "").trim()) {
      throw Object.assign(new Error("Source No. is required before refreshing Production Order"), {
        statusCode: 400,
      });
    }
    if (num(order.quantity) <= 0) {
      throw Object.assign(new Error("Quantity is required before refreshing Production Order."), {
        statusCode: 400,
      });
    }
    if (!String(order.location_code || "").trim()) {
      throw Object.assign(new Error("Location Code is required before refreshing Production Order"), {
        statusCode: 400,
      });
    }

    const posted = await client.query(
      `SELECT 1 FROM item_ledger_entries WHERE production_order_no = $1 LIMIT 1`,
      [order.document_no]
    );
    if (posted.rows.length > 0) {
      throw Object.assign(new Error("Production order with posted entries cannot be refreshed"), {
        statusCode: 400,
      });
    }

    const { bom } = await resolveFinishedGood(order.source_no, client);

    const bomLines = await client.query(
      `
      SELECT *
      FROM production_bom_lines
      WHERE bom_no = $1
      ORDER BY line_no, id
      `,
      [bom.bom_no]
    );

    if (bomLines.rows.length === 0) {
      throw Object.assign(new Error("Certified BOM has no component lines"), { statusCode: 400 });
    }

    await client.query(`DELETE FROM production_order_components WHERE production_order_no = $1`, [
      order.document_no,
    ]);

    for (const line of bomLines.rows) {
      const usesGrossLossFields = num(line.gross_qty) > 0;
      const baseQuantityPer = usesGrossLossFields ? num(line.gross_qty) : num(line.quantity_per);
      const lossPct = usesGrossLossFields
        ? num(line.scrap_pct)
        : num(line.scrap_pct) + num(line.shortage_pct);
      const expected = componentExpectedQuantity(
        order.quantity,
        baseQuantityPer,
        lossPct
      );
      const itemResult = await client.query(
        `SELECT unit_cost FROM items WHERE item_no = $1 LIMIT 1`,
        [line.item_no]
      );
      const unitCost = num(itemResult.rows[0]?.unit_cost);
      const costAmount = expected * unitCost;

      await client.query(
        `
        INSERT INTO production_order_components (
          production_order_no,
          line_no,
          item_no,
          variant_code,
          description,
          location_code,
          unit_of_measure_code,
          quantity_per,
          quantity,
          expected_quantity,
          consumed_quantity,
          finished_quantity,
          remaining_quantity,
          scrap_pct,
          due_date,
          starting_datetime,
          ending_datetime,
          unit_cost,
          cost_amount
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,0,$10,$11,$12,$13,$14,$15,$16)
        `,
        [
          order.document_no,
          line.line_no,
          line.item_no,
          line.variant_code,
          line.description,
          order.location_code,
          line.unit_of_measure_code,
          baseQuantityPer,
          expected,
          expected,
          lossPct,
          dateOnly(order.due_date),
          order.starting_datetime || null,
          order.ending_datetime || null,
          unitCost,
          costAmount,
        ]
      );
    }

    await client.query(
      `
      UPDATE released_production_orders
      SET
        refresh_no = COALESCE(refresh_no, $2),
        production_bom_no = $3,
        total_cost_rm = (
          SELECT COALESCE(SUM(cost_amount), 0)
          FROM production_order_components
          WHERE production_order_no = $1
        ),
        needs_refresh = FALSE,
        last_date_modified = CURRENT_DATE,
        updated_at = NOW()
      WHERE document_no = $1
      `,
      [order.document_no, `REF-${Date.now()}`, bom.bom_no]
    );

    await client.query("COMMIT");
    res.json(await getOrderWithComponents(order.document_no));
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("REFRESH PRODUCTION ORDER ERROR:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Failed to refresh Production Order" });
  } finally {
    client.release();
  }
});

router.post("/:documentNo/post-consumption", async (req, res) => {
  const client = await db.connect();

  try {
    await ensureManufacturingSchema(client);
    await client.query("BEGIN");

    const order = await getOrder(req.params.documentNo, client);
    if (!order) throw Object.assign(new Error("Released Production Order not found"), { statusCode: 404 });
    assertOrderEditable(order);

    const components = await client.query(
      `
      SELECT *
      FROM production_order_components
      WHERE production_order_no = $1
      ORDER BY line_no, id
      FOR UPDATE
      `,
      [order.document_no]
    );

    if (components.rows.length === 0) {
      throw Object.assign(new Error("Refresh Production Order before posting consumption"), {
        statusCode: 400,
      });
    }

    const consumptionJournalNos = await getInventoryNoSeriesCode(
      client,
      "consumption_journal_nos",
      "CONSUMPTION_JOURNAL"
    );
    const journalNo = await getNextNumberInTransaction(
      client,
      consumptionJournalNos
    );
    const postingDate = dateOnly(req.body?.posting_date) || dateOnly(order.posting_date) || today();
    const requestedLines = new Map(
      (Array.isArray(req.body?.lines) ? req.body.lines : []).map((line) => [
        Number(line.component_id),
        num(line.quantity),
      ])
    );

    for (const component of components.rows) {
      const requested = requestedLines.has(component.id)
        ? requestedLines.get(component.id)
        : num(component.remaining_quantity);
      const quantityToConsume = num(requested);

      if (quantityToConsume <= 0) continue;
      if (quantityToConsume > num(component.remaining_quantity)) {
        throw Object.assign(
          new Error(`Consumption cannot exceed remaining quantity for ${component.item_no}`),
          { statusCode: 400 }
        );
      }

      const available = await getItemInventory(
        client,
        component.item_no,
        component.location_code,
        component.variant_code
      );
      if (available < quantityToConsume) {
        throw Object.assign(
          new Error(
            `Insufficient raw material inventory for ${component.item_no}. Available quantity is ${available.toFixed(2)}.`
          ),
          { statusCode: 400 }
        );
      }

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
          remaining_quantity,
          source_type,
          source_no,
          production_order_no,
          unit_cost,
          cost_amount,
          open
        )
        VALUES ($1,'Consumption','Production Consumption',$2,$3,$4,$5,$6,$7,$8,0,'Production Order',$9,$9,0,0,false)
        `,
        [
          postingDate,
          journalNo,
          component.item_no,
          component.description,
          component.location_code,
          component.variant_code,
          component.unit_of_measure_code,
          -quantityToConsume,
          order.document_no,
        ]
      );

      await client.query(
        `
        INSERT INTO consumption_journal_lines (
          journal_no,
          production_order_no,
          posting_date,
          item_no,
          variant_code,
          location_code,
          unit_of_measure_code,
          quantity,
          document_no
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$1)
        `,
        [
          journalNo,
          order.document_no,
          postingDate,
          component.item_no,
          component.variant_code,
          component.location_code,
          component.unit_of_measure_code,
          quantityToConsume,
        ]
      );

      await client.query(
        `
        UPDATE production_order_components
        SET
          consumed_quantity = COALESCE(consumed_quantity, 0) + $1,
          finished_quantity = COALESCE(finished_quantity, 0) + $1,
          remaining_quantity = GREATEST(COALESCE(expected_quantity, 0) - (COALESCE(consumed_quantity, 0) + $1), 0),
          updated_at = NOW()
        WHERE id = $2
        `,
        [quantityToConsume, component.id]
      );

      await client.query(
        `
        UPDATE items
        SET inventory = COALESCE(inventory, 0) - $1,
            updated_at = NOW()
        WHERE item_no = $2
        `,
        [quantityToConsume, component.item_no]
      );
    }

    await client.query("COMMIT");
    res.json(await getOrderWithComponents(order.document_no));
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("POST CONSUMPTION ERROR:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Failed to post consumption" });
  } finally {
    client.release();
  }
});

router.post("/:documentNo/change-status", async (req, res) => {
  try {
    await ensureManufacturingSchema();

    const order = await getOrder(req.params.documentNo);
    if (!order) return res.status(404).json({ error: "Released Production Order not found" });

    const nextStatus = req.body?.status || (order.status === "Released" ? "Finished" : "Released");
    if (!["Released", "Finished", "Closed"].includes(nextStatus)) {
      return res.status(400).json({ error: "Invalid production order status" });
    }

    if (nextStatus === "Finished" && num(order.remaining_quantity) > 0) {
      return res.status(400).json({ error: "Use Finish Order when production remaining quantity is zero" });
    }

    const result = await db.query(
      `
      UPDATE released_production_orders
      SET status = $1,
          last_date_modified = CURRENT_DATE,
          updated_at = NOW()
      WHERE document_no = $2
      RETURNING *
      `,
      [nextStatus, req.params.documentNo]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("CHANGE PRODUCTION ORDER STATUS ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to change production order status" });
  }
});

router.post("/:documentNo/post-output", async (req, res) => {
  const client = await db.connect();

  try {
    await ensureManufacturingSchema(client);
    await client.query("BEGIN");

    const orderResult = await client.query(
      `SELECT * FROM released_production_orders WHERE document_no = $1 FOR UPDATE`,
      [req.params.documentNo]
    );
    const order = orderResult.rows[0];
    if (!order) throw Object.assign(new Error("Released Production Order not found"), { statusCode: 404 });
    assertOrderEditable(order);

    const quantityToOutput = num(req.body?.quantity || order.remaining_quantity);
    if (quantityToOutput <= 0) {
      throw Object.assign(new Error("Output quantity must be greater than 0"), { statusCode: 400 });
    }
    if (quantityToOutput > num(order.remaining_quantity)) {
      throw Object.assign(new Error("Output quantity cannot exceed remaining production quantity"), {
        statusCode: 400,
      });
    }

    const outputJournalNos = await getInventoryNoSeriesCode(
      client,
      "output_journal_nos",
      "OUTPUT_JOURNAL"
    );
    const journalNo = await getNextNumberInTransaction(
      client,
      outputJournalNos
    );
    const postingDate = dateOnly(req.body?.posting_date) || dateOnly(order.posting_date) || today();
    const itemResult = await client.query(
      `
      SELECT base_unit_of_measure
      FROM items
      WHERE item_no = $1
        AND COALESCE(is_deleted, false) = false
      LIMIT 1
      `,
      [order.source_no]
    );
    const outputUom =
      itemResult.rows[0]?.base_unit_of_measure ||
      order.unit_of_measure_code ||
      null;

    if (!outputUom) {
      throw Object.assign(new Error("Finished Goods UOM is required before posting output"), {
        statusCode: 400,
      });
    }

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
        quantity,
        remaining_quantity,
        unit_of_measure_code,
        source_type,
        source_no,
        production_order_no,
        unit_cost,
        cost_amount,
        open
      )
      VALUES ($1,'Output','Production Output',$2,$3,$4,$5,$6,$6,$7,'Production Order',$8,$8,0,0,true)
      `,
      [
        postingDate,
        journalNo,
        order.source_no,
        order.description,
        order.location_code,
        quantityToOutput,
        outputUom,
        order.document_no,
      ]
    );

    await client.query(
      `
      INSERT INTO output_journal_lines (
        journal_no,
        production_order_no,
        posting_date,
        item_no,
        location_code,
        unit_of_measure_code,
        quantity,
        document_no
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$1)
      `,
      [
        journalNo,
        order.document_no,
        postingDate,
        order.source_no,
        order.location_code,
        outputUom,
        quantityToOutput,
      ]
    );

    await client.query(
      `
      UPDATE released_production_orders
      SET
        finished_quantity = COALESCE(finished_quantity, 0) + $1,
        remaining_quantity = GREATEST(COALESCE(quantity, 0) - (COALESCE(finished_quantity, 0) + $1), 0),
        status = CASE
          WHEN GREATEST(COALESCE(quantity, 0) - (COALESCE(finished_quantity, 0) + $1), 0) = 0 THEN 'Finished'
          ELSE status
        END,
        unit_of_measure_code = COALESCE(unit_of_measure_code, $3),
        updated_at = NOW()
      WHERE document_no = $2
      `,
      [quantityToOutput, order.document_no, outputUom]
    );

    await client.query(
      `
      UPDATE items
      SET inventory = COALESCE(inventory, 0) + $1,
          updated_at = NOW()
      WHERE item_no = $2
      `,
      [quantityToOutput, order.source_no]
    );

    await client.query("COMMIT");
    res.json(await getOrderWithComponents(order.document_no));
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("POST OUTPUT ERROR:", err);
    res
      .status(err.statusCode || 500)
      .json({ error: err.message || "Failed to post output" });
  } finally {
    client.release();
  }
});

router.post("/:documentNo/finish", async (req, res) => {
  try {
    await ensureManufacturingSchema();

    const order = await getOrder(req.params.documentNo);
    if (!order) return res.status(404).json({ error: "Released Production Order not found" });

    if (num(order.remaining_quantity) > 0) {
      return res.status(400).json({ error: "Production order cannot be finished while remaining quantity exists" });
    }

    const result = await db.query(
      `UPDATE released_production_orders SET status = 'Finished', updated_at = NOW() WHERE document_no = $1 RETURNING *`,
      [req.params.documentNo]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("FINISH PRODUCTION ORDER ERROR:", err);
    res.status(500).json({ error: err.message || "Failed to finish Production Order" });
  }
});

module.exports = router;
