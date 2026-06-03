const express = require("express");

const router = express.Router();

const db = require("../db.cjs");

const {
  getNextNumber,
} = require("../services/noSeriesService.cjs");

const {
  resolveSalesNoSeries,
} = require("../services/salesNoSeriesService.cjs");

const {
  applyCustomerToSalesHeader,
  applyItemToSalesLine,
} = require("../services/fieldMappingService.cjs");

const {
  ensureInventoryAvailabilityColumns,
  enrichSalesOrderLinesWithAvailability,
  getAvailableInventory,
  validateSalesOrderLineAvailability,
} = require("../services/inventoryAvailabilityService.cjs");

const blankToNull = (value) =>
  value === "" ? null : value ?? null;

const num = (value, fallback = 0) =>
  value === "" || value === null || value === undefined
    ? fallback
    : Number(value);

const today = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const calculateValueFields = (line, quantityValue = line.quantity) => {
  const quantity = num(quantityValue);
  const unitPrice = num(line.unit_price);
  const discountPct = num(line.line_discount_pct);
  const taxPct = num(line.tax_pct);
  const lineDiscountAmount =
    Number((quantity * unitPrice * discountPct / 100).toFixed(2));
  const lineAmount =
    Number((quantity * unitPrice - lineDiscountAmount).toFixed(2));
  const taxAmount =
    Number((lineAmount * taxPct / 100).toFixed(2));

  return {
    line_discount_amount: lineDiscountAmount,
    line_amount: lineAmount,
    tax_amount: taxAmount,
    amount_including_tax:
      Number((lineAmount + taxAmount).toFixed(2)),
  };
};

const calculateSalesLine = (line, source = {}) => {
  const quantity =
    num(line.quantity);

  const qtyShipped =
    num(line.qty_shipped);

  const outstanding =
    Math.max(quantity - qtyShipped, 0);

  const requestedQtyToShip =
    Object.prototype.hasOwnProperty.call(source, "qty_to_ship")
      ? num(source.qty_to_ship)
      : num(line.qty_to_ship);

  const values =
    calculateValueFields(line, quantity);

  return {
    ...line,
    quantity,
    qty_shipped: qtyShipped,
    qty_to_ship: Math.min(
      Math.max(requestedQtyToShip, 0),
      outstanding
    ),
    line_discount_amount:
      values.line_discount_amount,
    line_amount:
      values.line_amount,
    tax_amount:
      values.tax_amount,
    amount_including_tax:
      values.amount_including_tax,
  };
};

/**
 * ============================================================
 * GET ALL
 * ============================================================
 */
router.get("/", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT *
      FROM sales_orders
      WHERE COALESCE(is_deleted, false) = false
      ORDER BY posting_date DESC,
               created_at DESC
    `);

    res.json(result.rows);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Failed to fetch sales orders",
    });
  }
});

/**
 * ============================================================
 * CREATE
 * ============================================================
 */
router.post("/", async (req, res) => {
  try {
    const payload =
      await applyCustomerToSalesHeader(
        db,
        req.body
      );

    const seriesCode =
      await resolveSalesNoSeries(
        db,
        [
          "order_nos",
          "sales_order_nos",
        ],
        "SALES_ORDER"
      );

    const document_no =
      await getNextNumber(seriesCode);

    const result =
      await db.query(
        `
        INSERT INTO sales_orders (
          document_no,
          customer_no,
          customer_name,
          customer_gst_reg_no,
          gst_customer_type,
          location_code,
          address,
          address_2,
          city,
          post_code,
          country_region_code,
          contact,
          email,
          phone_no,
          payment_terms_code,
          payment_method_code,
          shipment_method_code,
          posting_date,
          document_date,
          status
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15,
          $16,
          $17,
          $18,
          $19,
          'Open'
        )
        RETURNING *
        `,
        [
          document_no,
          blankToNull(payload.customer_no),
          blankToNull(payload.customer_name),
          blankToNull(payload.customer_gst_reg_no),
          blankToNull(payload.gst_customer_type),
          blankToNull(payload.location_code),
          blankToNull(payload.address),
          blankToNull(payload.address_2),
          blankToNull(payload.city),
          blankToNull(payload.post_code),
          blankToNull(payload.country_region_code),
          blankToNull(payload.contact),
          blankToNull(payload.email),
          blankToNull(payload.phone_no),
          blankToNull(payload.payment_terms_code),
          blankToNull(payload.payment_method_code),
          blankToNull(payload.shipment_method_code),
          payload.posting_date,
          payload.document_date,
        ]
      );

    res.json({
      success: true,
      data: result.rows[0],
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        err.message ||
        "Failed to create sales order",
    });
  }
});

/**
 * ============================================================
 * GET SINGLE
 * ============================================================
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const headerResult =
      await db.query(
        `
        SELECT *
        FROM sales_orders
        WHERE id = $1
          AND COALESCE(is_deleted, false) = false
        `,
        [id]
      );

    if (
      headerResult.rows.length === 0
    ) {
      return res.status(404).json({
        error:
          "Sales Order not found",
      });
    }

    await ensureInventoryAvailabilityColumns(db);

    const linesResult =
      await db.query(
        `
        SELECT *
        FROM sales_order_lines
        WHERE sales_order_id = $1
          AND COALESCE(is_deleted, false) = false
        ORDER BY line_no
        `,
        [id]
      );

    const linesWithAvailability =
      await enrichSalesOrderLinesWithAvailability(
        db,
        linesResult.rows
      );

    res.json({
      header:
        headerResult.rows[0],

      lines:
        linesWithAvailability,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        "Failed to load sales order",
    });
  }
});

/**
 * ============================================================
 * UPDATE HEADER
 * ============================================================
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } =
      req.params;

    const payload =
      await applyCustomerToSalesHeader(
        db,
        req.body
      );

    await ensureInventoryAvailabilityColumns(db);

    const lineResult =
      await db.query(
        `
        SELECT *
        FROM sales_order_lines
        WHERE sales_order_id = $1
          AND COALESCE(is_deleted, false) = false
          AND NULLIF(item_no, '') IS NOT NULL
        `,
        [id]
      );

    for (const line of lineResult.rows) {
      const lineForValidation = {
        ...line,
        location_code:
          line.location_code ||
          payload.location_code,
      };

      const validation =
        await validateSalesOrderLineAvailability(
          db,
          lineForValidation,
          {
            exclude_sales_order_line_id:
              line.id,
          }
        );

      if (!validation.ok) {
        return res.status(400).json({
          error:
            validation.error,
        });
      }
    }

    const result =
      await db.query(
        `
        UPDATE sales_orders
        SET
          customer_no = $1,
          customer_name = $2,
          customer_gst_reg_no = $3,
          gst_customer_type = $4,
          salesperson_code = $5,
          location_code = $6,
          external_document_no = $7,
          your_reference = $8,
          discount = $9,
          narration = $10,
          address = $11,
          address_2 = $12,
          city = $13,
          post_code = $14,
          country_region_code = $15,
          contact = $16,
          email = $17,
          phone_no = $18,
          ship_to_code = $19,
          ship_to_name = $20,
          ship_to_address = $21,
          ship_to_city = $22,
          document_date = $23,
          posting_date = $24,
          due_date = $25,
          shipment_date = $26,
          requested_delivery_date = $27,
          promised_delivery_date = $28,
          currency_code = $29,
          payment_terms_code = $30,
          payment_method_code = $31,
          shipment_method_code = $32,
          total_amount = $33,
          updated_at = NOW()
        WHERE id = $34
        RETURNING *
        `,
        [
          blankToNull(payload.customer_no),
          blankToNull(payload.customer_name),
          blankToNull(payload.customer_gst_reg_no),
          blankToNull(payload.gst_customer_type),
          blankToNull(payload.salesperson_code),
          blankToNull(payload.location_code),
          blankToNull(payload.external_document_no),
          blankToNull(payload.your_reference),
          num(payload.discount),
          blankToNull(payload.narration),
          blankToNull(payload.address),
          blankToNull(payload.address_2),
          blankToNull(payload.city),
          blankToNull(payload.post_code),
          blankToNull(payload.country_region_code),
          blankToNull(payload.contact),
          blankToNull(payload.email),
          blankToNull(payload.phone_no),
          blankToNull(payload.ship_to_code),
          blankToNull(payload.ship_to_name),
          blankToNull(payload.ship_to_address),
          blankToNull(payload.ship_to_city),
          blankToNull(payload.document_date),
          blankToNull(payload.posting_date),
          blankToNull(payload.due_date),
          blankToNull(payload.shipment_date),
          blankToNull(payload.requested_delivery_date),
          blankToNull(payload.promised_delivery_date),
          blankToNull(payload.currency_code),
          blankToNull(payload.payment_terms_code),
          blankToNull(payload.payment_method_code),
          blankToNull(payload.shipment_method_code),
          num(payload.total_amount),
          id,
        ]
      );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Sales order not found",
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        "Failed to update sales order",
    });
  }
});

/**
 * ============================================================
 * ADD LINE
 * ============================================================
 */
router.post("/:id/lines", async (req, res) => {
  try {
    const { id } =
      req.params;

    await ensureInventoryAvailabilityColumns(db);

    const headerResult =
      await db.query(
        `
        SELECT *
        FROM sales_orders
        WHERE id = $1
          AND COALESCE(is_deleted, false) = false
        `,
        [id]
      );

    if (headerResult.rows.length === 0) {
      return res.status(404).json({
        error: "Sales order not found",
      });
    }

    const header =
      headerResult.rows[0];

    const payload =
      await applyItemToSalesLine(
        db,
        {
          ...req.body,
          location_code:
            req.body.location_code ||
            header.location_code,
        }
      );

    const nextLineResult =
      await db.query(
        `
        SELECT COALESCE(MAX(line_no), 0) + 10 AS line_no
        FROM sales_order_lines
        WHERE sales_order_id = $1
          AND COALESCE(is_deleted, false) = false
        `,
        [id]
      );

    const lineNo =
      payload.line_no ??
      nextLineResult.rows[0].line_no;

    const calculatedPayload =
      calculateSalesLine(payload, req.body);

    if (
      blankToNull(calculatedPayload.item_no) &&
      num(calculatedPayload.quantity) > 0
    ) {
      const validation =
        await validateSalesOrderLineAvailability(
          db,
          calculatedPayload
        );

      if (!validation.ok) {
        return res.status(400).json({
          error:
            validation.error,
        });
      }
    }

    const result =
      await db.query(
        `
        INSERT INTO sales_order_lines (
          sales_order_id,
          line_no,
          item_no,
          item_description,
          location_code,
          gst_group_code,
          unit_of_measure_code,
          quantity,
          unit_price,
          line_discount_pct,
          line_discount_amount,
          line_amount,
          tax_pct,
          tax_amount,
          amount_including_tax,
          qty_to_ship,
          qty_shipped,
          hsn_sac_code
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
        )
        RETURNING *
        `,
        [
          id,
          lineNo,
          blankToNull(calculatedPayload.item_no),
          blankToNull(calculatedPayload.item_description),
          blankToNull(calculatedPayload.location_code),
          blankToNull(calculatedPayload.gst_group_code),
          blankToNull(calculatedPayload.unit_of_measure_code),
          num(calculatedPayload.quantity),
          num(calculatedPayload.unit_price),
          num(calculatedPayload.line_discount_pct),
          num(calculatedPayload.line_discount_amount),
          num(calculatedPayload.line_amount),
          num(calculatedPayload.tax_pct),
          num(calculatedPayload.tax_amount),
          num(calculatedPayload.amount_including_tax),
          num(calculatedPayload.qty_to_ship),
          num(calculatedPayload.qty_shipped),
          blankToNull(calculatedPayload.hsn_sac_code),
        ]
      );

    const enriched =
      await enrichSalesOrderLinesWithAvailability(
        db,
        result.rows
      );

    res.json(
      enriched[0]
    );

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        "Failed to add line",
    });
  }
});

/**
 * ============================================================
 * UPDATE LINE
 * ============================================================
 */
router.put("/line/:id", async (req, res) => {
  try {
    const { id } =
      req.params;

    const incomingPayload =
      await applyItemToSalesLine(
        db,
        req.body
      );

    await ensureInventoryAvailabilityColumns(db);

    const existingResult =
      await db.query(
        `
        SELECT
          sol.*,
          so.location_code AS header_location_code
        FROM sales_order_lines sol
        JOIN sales_orders so
          ON so.id = sol.sales_order_id
        WHERE sol.id = $1
          AND COALESCE(sol.is_deleted, false) = false
          AND COALESCE(so.is_deleted, false) = false
        `,
        [id]
      );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        error: "Line not found",
      });
    }

    const payload =
      calculateSalesLine(
        {
          ...existingResult.rows[0],
          ...incomingPayload,
          location_code:
            incomingPayload.location_code ||
            existingResult.rows[0].location_code ||
            existingResult.rows[0].header_location_code,
        },
        req.body
      );

    if (
      blankToNull(payload.item_no) &&
      num(payload.quantity) > 0
    ) {
      const validation =
        await validateSalesOrderLineAvailability(
          db,
          payload,
          {
            exclude_sales_order_line_id:
              id,
          }
        );

      if (!validation.ok) {
        return res.status(400).json({
          error:
            validation.error,
        });
      }
    }

    const result =
      await db.query(
        `
        UPDATE sales_order_lines
        SET
          item_no = $1,
          item_description = $2,
          variant_code = $3,
          location_code = $4,
          gst_group_code = $5,
          unit_of_measure_code = $6,
          quantity = $7,
          unit_price = $8,
          line_discount_pct = $9,
          line_discount_amount = $10,
          line_amount = $11,
          tax_pct = $12,
          tax_amount = $13,
          amount_including_tax = $14,
          qty_to_ship = $15,
          qty_shipped = $16,
          hsn_sac_code = $17,
          updated_at = NOW()
        WHERE id = $18
        RETURNING *
        `,
        [
          blankToNull(payload.item_no),
          blankToNull(payload.item_description),
          blankToNull(payload.variant_code),
          blankToNull(payload.location_code),
          blankToNull(payload.gst_group_code),
          blankToNull(payload.unit_of_measure_code),
          num(payload.quantity),
          num(payload.unit_price),
          num(payload.line_discount_pct),
          num(payload.line_discount_amount),
          num(payload.line_amount),
          num(payload.tax_pct),
          num(payload.tax_amount),
          num(payload.amount_including_tax),
          num(payload.qty_to_ship),
          num(payload.qty_shipped),
          blankToNull(payload.hsn_sac_code),
          id,
        ]
      );

    const enriched =
      await enrichSalesOrderLinesWithAvailability(
        db,
        result.rows
      );

    res.json(enriched[0]);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        "Failed to update line",
    });
  }
});

/**
 * ============================================================
 * DELETE LINE
 * ============================================================
 */
router.delete("/line/:id", async (req, res) => {
  try {
    await db.query(
      `
      UPDATE sales_order_lines
      SET is_deleted = true,
          updated_at = NOW()
      WHERE id = $1
      `,
      [req.params.id]
    );

    res.json({
      success: true,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        "Failed to delete line",
    });
  }
});

/**
 * ============================================================
 * DELETE ORDER
 * ============================================================
 */
router.delete("/:id", async (req, res) => {
  try {
    await db.query(
      `
      UPDATE sales_orders
      SET is_deleted = true,
          updated_at = NOW()
      WHERE id = $1
      `,
      [req.params.id]
    );

    res.json({
      success: true,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error:
        "Failed to delete sales order",
    });
  }
});

/**
 * ============================================================
 * POST SHIPMENT
 * ============================================================
 */
router.post("/:id/post-shipment", async (req, res) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params;

    const headerResult = await client.query(
      `
      SELECT *
      FROM sales_orders
      WHERE id = $1
        AND COALESCE(is_deleted, false) = false
      `,
      [id]
    );

    if (headerResult.rows.length === 0) {
      throw new Error("Sales Order not found");
    }

    const header = headerResult.rows[0];

    if (!String(header.location_code ?? "").trim()) {
      throw new Error("Location Code is required");
    }

    const lineResult = await client.query(
      `
      SELECT *
      FROM sales_order_lines
      WHERE sales_order_id = $1
        AND COALESCE(is_deleted, false) = false
      ORDER BY line_no
      `,
      [id]
    );

    const shippableLines = lineResult.rows
      .map((line) => {
        const outstanding =
          num(line.quantity) -
          num(line.qty_shipped);

        const qtyToShip =
          num(line.qty_to_ship) > 0
            ? num(line.qty_to_ship)
            : outstanding;

        return {
          ...line,
          quantity_shipped:
            Math.min(qtyToShip, outstanding),
          remaining_quantity:
            Math.max(outstanding - qtyToShip, 0),
        };
      })
      .filter((line) => line.quantity_shipped > 0);

    if (shippableLines.length === 0) {
      throw new Error("No quantity to ship");
    }

    await ensureInventoryAvailabilityColumns(client);

    for (const line of shippableLines) {
      await client.query(
        `
        SELECT id
        FROM item_ledger_entries
        WHERE item_no = $1
          AND location_code = $2
          AND (
            $3::varchar IS NULL
            OR COALESCE(variant_code, '') = $3
          )
          AND COALESCE(is_deleted, false) = false
        FOR UPDATE
        `,
        [
          line.item_no,
          line.location_code || header.location_code,
          blankToNull(line.variant_code),
        ]
      );

      const availability =
        await getAvailableInventory(
          client,
          {
            item_no: line.item_no,
            variant_code: line.variant_code,
            location_code:
              line.location_code ||
              header.location_code,
            exclude_sales_order_line_id:
              line.id,
          }
        );

      if (num(line.quantity_shipped) > availability.available_qty) {
        throw new Error(
          `Insufficient inventory for item ${line.item_no} at location ${line.location_code || header.location_code}. ` +
          `Available quantity is ${availability.available_qty.toFixed(2)}.`
        );
      }
    }

    const seriesCode = await resolveSalesNoSeries(
      client,
      [
        "posted_shipment_nos",
        "posted_sales_shipment_nos",
      ],
      "POSTED_SALES_SHIPMENT"
    );

    const documentNo =
      await getNextNumber(seriesCode);

    const postedHeaderResult = await client.query(
      `
      INSERT INTO posted_sales_shipment (
        document_no,
        customer_no,
        customer_name,
        posting_date,
        document_date,
        shipment_date,
        source_sales_order_id,
        source_sales_order_no,
        location_code,
        salesperson_code,
        shipment_method_code,
        external_document_no,
        address,
        city,
        post_code,
        status
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13,$14,$15,$16
      )
      RETURNING *
      `,
      [
        documentNo,
        blankToNull(header.customer_no),
        blankToNull(header.customer_name),
        blankToNull(header.posting_date),
        blankToNull(header.document_date),
        blankToNull(header.shipment_date || header.posting_date),
        header.id,
        header.document_no,
        blankToNull(header.location_code),
        blankToNull(header.salesperson_code),
        blankToNull(header.shipment_method_code),
        blankToNull(header.external_document_no),
        blankToNull(header.address),
        blankToNull(header.city),
        blankToNull(header.post_code),
        "Posted",
      ]
    );

    const postedHeader =
      postedHeaderResult.rows[0];

    for (const line of shippableLines) {
      const values =
        calculateValueFields(
          line,
          line.quantity_shipped
        );

      const postedLineResult = await client.query(
        `
        INSERT INTO posted_sales_shipment_line (
          posted_sales_shipment_id,
          line_no,
          item_no,
          item_description,
          variant_code,
          location_code,
          unit_of_measure_code,
          quantity,
          quantity_shipped,
          remaining_quantity,
          unit_price,
          line_discount_pct,
          line_discount_amount,
          line_amount,
          tax_pct,
          tax_amount,
          amount_including_tax,
          hsn_sac_code,
          sales_order_line_id
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,
          $8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
        )
        RETURNING id
        `,
        [
          postedHeader.id,
          line.line_no,
          blankToNull(line.item_no),
          blankToNull(line.item_description),
          blankToNull(line.variant_code),
          blankToNull(line.location_code),
          blankToNull(line.unit_of_measure_code),
          num(line.quantity_shipped),
          num(line.quantity_shipped),
          num(line.remaining_quantity),
          num(line.unit_price),
          num(line.line_discount_pct),
          values.line_discount_amount,
          values.line_amount,
          num(line.tax_pct),
          values.tax_amount,
          values.amount_including_tax,
          blankToNull(line.hsn_sac_code),
          line.id,
        ]
      );

      await client.query(
        `
        UPDATE sales_order_lines
        SET
          qty_shipped = COALESCE(qty_shipped, 0) + $1,
          qty_to_ship = 0,
          updated_at = NOW()
        WHERE id = $2
        `,
        [
          num(line.quantity_shipped),
          line.id,
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
          customer_no,
          customer_name,
          open,
          source_table,
          source_id,
          source_line_id
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,
          $19,$20,$21,$22
        )
        `,
        [
          postedHeader.posting_date,
          "Sale",
          "Sales Shipment",
          postedHeader.document_no,
          line.item_no,
          line.item_description,
          line.location_code,
          line.variant_code,
          line.unit_of_measure_code,
          -num(line.quantity_shipped),
          -num(line.quantity_shipped),
          0,
          num(line.unit_price),
          0,
          values.line_amount,
          0,
          postedHeader.customer_no,
          postedHeader.customer_name,
          false,
          "posted_sales_shipment_line",
          postedHeader.id,
          postedLineResult.rows[0].id,
        ]
      );
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      posted_sales_shipment_id:
        postedHeader.id,
      posted_sales_shipment_no:
        postedHeader.document_no,
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);

    res.status(500).json({
      error:
        err.message ||
        "Failed to post shipment",
    });
  } finally {
    client.release();
  }
});

/**
 * ============================================================
 * CREATE INVOICE
 * ============================================================
 */
router.post("/:id/create-invoice", async (req, res) => {
  const client =
    await db.connect();

  try {
    await client.query("BEGIN");

    const existingInvoice =
      await client.query(
        `
        SELECT id
        FROM sales_invoice
        WHERE source_sales_order_id = $1
          AND COALESCE(is_deleted, false) = false
        ORDER BY id DESC
        LIMIT 1
        `,
        [req.params.id]
      );

    if (existingInvoice.rows.length > 0) {
      await client.query("COMMIT");

      return res.json({
        success: true,
        sales_invoice_id:
          existingInvoice.rows[0].id,
      });
    }

    const orderResult =
      await client.query(
        `
        SELECT *
        FROM sales_orders
        WHERE id = $1
          AND COALESCE(is_deleted, false) = false
        `,
        [req.params.id]
      );

    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error:
          "Sales order not found",
      });
    }

    const order =
      orderResult.rows[0];

    if (!String(order.location_code ?? "").trim()) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error:
          "Location Code is required",
      });
    }

    const lineResult =
      await client.query(
        `
        SELECT *
        FROM sales_order_lines
        WHERE sales_order_id = $1
          AND COALESCE(is_deleted, false) = false
        ORDER BY line_no
        `,
        [req.params.id]
      );

    if (lineResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error:
          "At least one sales order line is required to create an invoice",
      });
    }

    const seriesCode =
      await resolveSalesNoSeries(
        client,
        [
          "invoice_nos",
          "sales_invoice_nos",
        ],
        "SALES_INVOICE"
      );

    const documentNo =
      await getNextNumber(seriesCode);

    const invoiceResult =
      await client.query(
        `
        INSERT INTO sales_invoice (
          document_no,
          customer_no,
          customer_name,
          bill_to_customer_no,
          bill_to_name,
          posting_date,
          document_date,
          location_code,
          customer_gst_reg_no,
          source_sales_order_id,
          status
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Open')
        RETURNING *
        `,
        [
          documentNo,
          blankToNull(order.customer_no),
          blankToNull(order.customer_name),
          blankToNull(order.customer_no),
          blankToNull(order.customer_name),
          blankToNull(order.posting_date) || today(),
          blankToNull(order.document_date) || today(),
          blankToNull(order.location_code),
          blankToNull(order.customer_gst_reg_no),
          order.id,
        ]
      );

    const invoice =
      invoiceResult.rows[0];

    let totalAmount = 0;
    let totalTax = 0;
    let amountIncludingTax = 0;

    for (const line of lineResult.rows) {
      const quantity =
        num(line.qty_shipped) > 0
          ? num(line.qty_shipped)
          : num(line.quantity);

      const values =
        calculateValueFields(line, quantity);

      totalAmount += values.line_amount;
      totalTax += values.tax_amount;
      amountIncludingTax += values.amount_including_tax;

      await client.query(
        `
        INSERT INTO sales_invoice_line (
          sales_invoice_id,
          line_no,
          item_no,
          item_description,
          type,
          variant_code,
          location_code,
          unit_of_measure_code,
          quantity,
          quantity_shipped,
          quantity_invoiced,
          qty_to_invoice,
          balance_qty,
          unit_price,
          line_discount_pct,
          line_discount_amount,
          line_amount,
          tax_pct,
          tax_amount,
          amount_including_tax,
          hsn_sac_code
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
        `,
        [
          invoice.id,
          line.line_no,
          blankToNull(line.item_no),
          blankToNull(line.item_description),
          "Item",
          blankToNull(line.variant_code),
          blankToNull(line.location_code || order.location_code),
          blankToNull(line.unit_of_measure_code),
          quantity,
          quantity,
          0,
          quantity,
          0,
          num(line.unit_price),
          num(line.line_discount_pct),
          values.line_discount_amount,
          values.line_amount,
          num(line.tax_pct),
          values.tax_amount,
          values.amount_including_tax,
          blankToNull(line.hsn_sac_code),
        ]
      );
    }

    await client.query(
      `
      UPDATE sales_invoice
      SET total_amount = $2,
          total_tax = $3,
          amount_including_tax = $4,
          updated_at = NOW()
      WHERE id = $1
      `,
      [
        invoice.id,
        totalAmount,
        totalTax,
        amountIncludingTax,
      ]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      sales_invoice_id:
        invoice.id,
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error(err);

    res.status(500).json({
      error:
        "Failed to create invoice",
    });
  } finally {
    client.release();
  }
});

module.exports = router;


