const blankToNull = (value) =>
  value === "" || value === undefined ? null : value;

const num = (value, fallback = 0) =>
  value === "" || value === null || value === undefined
    ? fallback
    : Number(value);

const ensureInventoryAvailabilityColumns = async (client) => {
  await client.query(`
    ALTER TABLE item_ledger_entries
    ADD COLUMN IF NOT EXISTS variant_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE
  `);

  await client.query(`
    ALTER TABLE sales_order_lines
    ADD COLUMN IF NOT EXISTS available_qty NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS inventory_qty NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS committed_qty NUMERIC(12,2) DEFAULT 0
  `);
};

const getAvailableInventory = async (
  client,
  {
    item_no,
    variant_code,
    location_code,
    exclude_sales_order_line_id,
  }
) => {
  await ensureInventoryAvailabilityColumns(client);

  const itemNo =
    blankToNull(item_no);
  const locationCode =
    blankToNull(location_code);
  const variantCode =
    blankToNull(variant_code);
  const excludeLineId =
    blankToNull(exclude_sales_order_line_id);

  if (!itemNo || !locationCode) {
    return {
      item_no: itemNo,
      variant_code: variantCode,
      location_code: locationCode,
      inventory_qty: 0,
      open_sales_order_qty: 0,
      committed_qty: 0,
      available_qty: 0,
    };
  }

  const inventoryResult =
    await client.query(
      `
      SELECT COALESCE(SUM(quantity), 0) AS inventory_qty
      FROM item_ledger_entries
      WHERE item_no = $1
        AND location_code = $2
        AND (
          $3::varchar IS NULL
          OR COALESCE(variant_code, '') = $3
        )
        AND COALESCE(is_deleted, false) = false
      `,
      [
        itemNo,
        locationCode,
        variantCode,
      ]
    );

  const committedResult =
    await client.query(
      `
      SELECT
        COALESCE(
          SUM(
            GREATEST(
              COALESCE(sol.quantity, 0) - COALESCE(sol.qty_shipped, 0),
              0
            )
          ),
          0
        ) AS open_sales_order_qty
      FROM sales_order_lines sol
      JOIN sales_orders so
        ON so.id = sol.sales_order_id
      WHERE sol.item_no = $1
        AND sol.location_code = $2
        AND (
          $3::varchar IS NULL
          OR COALESCE(sol.variant_code, '') = $3
        )
        AND COALESCE(sol.is_deleted, false) = false
        AND COALESCE(so.is_deleted, false) = false
        AND COALESCE(so.status, 'Open') IN ('Open', 'Released')
        AND (
          $4::int IS NULL
          OR sol.id <> $4::int
        )
      `,
      [
        itemNo,
        locationCode,
        variantCode,
        excludeLineId,
      ]
    );

  const inventoryQty =
    num(inventoryResult.rows[0]?.inventory_qty);
  let resolvedInventoryQty =
    inventoryQty;

  if (resolvedInventoryQty === 0) {
    const itemColumnResult =
      await client.query(
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'items'
          AND column_name IN ('inventory', 'inventory_qty', 'quantity_on_hand')
        ORDER BY
          CASE column_name
            WHEN 'inventory_qty' THEN 1
            WHEN 'inventory' THEN 2
            WHEN 'quantity_on_hand' THEN 3
            ELSE 4
          END
        LIMIT 1
        `
      );

    const inventoryColumn =
      itemColumnResult.rows[0]?.column_name;

    if (inventoryColumn) {
      const fallbackResult =
        await client.query(
          `
          SELECT COALESCE(${inventoryColumn}, 0) AS inventory_qty
          FROM items
          WHERE item_no = $1
            AND COALESCE(is_deleted, false) = false
          LIMIT 1
          `,
          [itemNo]
        );

      resolvedInventoryQty =
        num(fallbackResult.rows[0]?.inventory_qty);
    }
  }

  const committedQty =
    num(committedResult.rows[0]?.open_sales_order_qty);
  const availableQty =
    Number((resolvedInventoryQty - committedQty).toFixed(2));

  return {
    item_no: itemNo,
    variant_code: variantCode,
    location_code: locationCode,
    inventory_qty: Number(resolvedInventoryQty.toFixed(2)),
    open_sales_order_qty: Number(committedQty.toFixed(2)),
    committed_qty: Number(committedQty.toFixed(2)),
    available_qty: availableQty,
  };
};

const enrichSalesOrderLinesWithAvailability = async (client, lines) => {
  const enriched = [];

  for (const line of lines) {
    const availability =
      await getAvailableInventory(client, {
        item_no: line.item_no,
        variant_code: line.variant_code,
        location_code: line.location_code,
        exclude_sales_order_line_id: line.id,
      });

    enriched.push({
      ...line,
      inventory_qty: availability.inventory_qty,
      committed_qty: availability.committed_qty,
      open_sales_order_qty: availability.open_sales_order_qty,
      available_qty: availability.available_qty,
    });
  }

  return enriched;
};

const validateSalesOrderLineAvailability = async (
  client,
  line,
  {
    exclude_sales_order_line_id,
    quantity,
  } = {}
) => {
  const itemNo =
    blankToNull(line.item_no);
  const locationCode =
    blankToNull(line.location_code);

  if (!itemNo) {
    return {
      ok: false,
      error: "Item No. is required",
    };
  }

  if (!locationCode) {
    return {
      ok: false,
      error: "Location Code is required",
    };
  }

  const requestedQuantity =
    num(quantity ?? line.quantity);

  if (requestedQuantity <= 0) {
    return {
      ok: false,
      error: "Quantity must be greater than 0",
    };
  }

  const qtyShipped =
    num(line.qty_shipped);
  const outstandingQty =
    Math.max(requestedQuantity - qtyShipped, 0);

  const availability =
    await getAvailableInventory(client, {
      item_no: itemNo,
      variant_code: line.variant_code,
      location_code: locationCode,
      exclude_sales_order_line_id,
    });

  if (outstandingQty > availability.available_qty) {
    return {
      ok: false,
      availability,
      error:
        `Insufficient inventory for item ${itemNo} at location ${locationCode}. ` +
        `Available quantity is ${availability.available_qty.toFixed(2)}.`,
    };
  }

  return {
    ok: true,
    availability,
  };
};

module.exports = {
  ensureInventoryAvailabilityColumns,
  getAvailableInventory,
  enrichSalesOrderLinesWithAvailability,
  validateSalesOrderLineAvailability,
};
