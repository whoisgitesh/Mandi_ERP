const express =
  require("express");

const router =
  express.Router();

const db =
  require("../db.cjs");

const {
  getNextNumber,
} = require(
  "../services/noSeriesService.cjs"
);

const {
  resolvePurchaseNoSeries,
} = require(
  "../services/purchaseNoSeriesService.cjs"
);

const blankToNull = (value) =>
  value === "" ? null : value ?? null;

const numberOrZero = (value) => {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }

  return Number(value);
};

const calculateIgeLine = (line) => {
  const poQuantity =
    numberOrZero(line.po_quantity);

  const qtyPerBag =
    numberOrZero(line.qty_per_bag);

  const receiveBags =
    numberOrZero(line.receive_bags);

  const actualQuantity =
    qtyPerBag || receiveBags
      ? qtyPerBag * receiveBags
      : numberOrZero(line.actual_quantity ?? line.received_quantity);

  const billQuantity =
    numberOrZero(line.bill_quantity);

  const firstWeight =
    numberOrZero(line.first_weight);

  const secondWeight =
    numberOrZero(line.second_weight);

  const netQuantity =
    firstWeight - secondWeight;

  const balanceBase =
    netQuantity !== 0
      ? netQuantity
      : billQuantity !== 0
        ? billQuantity
        : actualQuantity;

  return {
    ...line,
    po_quantity: poQuantity,
    bill_quantity: billQuantity,
    qty_per_bag: qtyPerBag,
    receive_bags: receiveBags,
    actual_quantity: actualQuantity,
    received_quantity: actualQuantity,
    first_weight: firstWeight,
    second_weight: secondWeight,
    net_quantity: netQuantity,
    excess_weight:
      netQuantity - billQuantity,
    balance_quantity:
      poQuantity - balanceBase,
  };
};

/**
 * GET ALL IGE
 */
router.get(
  "/",
  async (req, res) => {

    try {

      const result =
        await db.query(`
          SELECT
            i.*,
            COALESCE(i.challan_no, po.challan_no, mp.challan_no) AS challan_no,
            COALESCE(i.vendor_name, v.name) AS vendor_name
          FROM inward_gate_entries i
          LEFT JOIN vendors v
            ON v.vendor_no = i.vendor_no
          LEFT JOIN purchase_orders po
            ON po.id = i.source_purchase_order_id
          LEFT JOIN mandi_purchase mp
            ON mp.id = po.source_mandi_purchase_id
          WHERE i.is_deleted = false
          ORDER BY
            i.posting_date DESC,
            i.created_at DESC
        `);

      res.json(
        result.rows
      );

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to fetch inward gate entries",
      });
    }
  }
);

/**
 * GET SINGLE IGE
 */
router.get(
  "/:id",
  async (req, res) => {

    try {

      const { id } =
        req.params;

      /**
       * HEADER
       */
      const headerResult =
        await db.query(
          `
          SELECT
            i.*,
            COALESCE(i.challan_no, po.challan_no, mp.challan_no) AS challan_no,
            COALESCE(i.vendor_name, v.name) AS vendor_name,
            COALESCE(i.vendor_gst_reg_no, v.gst_registration_no) AS vendor_gst_reg_no,
            po.document_no AS source_purchase_order_no
          FROM inward_gate_entries i
          LEFT JOIN vendors v
            ON v.vendor_no = i.vendor_no
          LEFT JOIN purchase_orders po
            ON po.id = i.source_purchase_order_id
          LEFT JOIN mandi_purchase mp
            ON mp.id = po.source_mandi_purchase_id
          WHERE i.id = $1
          `,
          [id]
        );

      if (
        headerResult.rows.length === 0
      ) {

        return res.status(404).json({
          error:
            "Inward Gate Entry not found",
        });
      }

      /**
       * LINES
       */
      const linesResult =
        await db.query(
          `
          SELECT
            l.*,
            CASE
              WHEN l.po_line_id IS NOT NULL THEN
                COALESCE(l.po_quantity, 0) -
                COALESCE(
                  SUM(COALESCE(l.actual_quantity, l.received_quantity, 0))
                    OVER (PARTITION BY l.po_line_id),
                  0
                )
              ELSE
                COALESCE(l.po_quantity, 0) -
                COALESCE(l.actual_quantity, l.received_quantity, 0)
            END AS balance_quantity
          FROM inward_gate_entry_lines l
          WHERE inward_gate_entry_id = $1
          ORDER BY line_no
          `,
          [id]
        );

      res.json({
        header:
          headerResult.rows[0],

        lines:
          linesResult.rows,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to fetch inward gate entry",
      });
    }
  }
);

/**
 * CREATE IGE
 */
router.post(
  "/",
  async (req, res) => {

    const client =
      await db.connect();

    try {

      await client.query(
        "BEGIN"
      );

      const payload =
        {
          ...req.body,
        };

      if (payload.source_purchase_order_id) {
        const sourceResult =
          await client.query(
            `
            SELECT
              po.vendor_no,
              COALESCE(po.vendor_name, v.name) AS vendor_name,
              po.broker_name,
              COALESCE(po.challan_no, mp.challan_no) AS challan_no,
              po.location_code
            FROM purchase_orders po
            LEFT JOIN vendors v
              ON v.vendor_no = po.vendor_no
            LEFT JOIN mandi_purchase mp
              ON mp.id = po.source_mandi_purchase_id
            WHERE po.id = $1
            LIMIT 1
            `,
            [payload.source_purchase_order_id]
          );

        const source =
          sourceResult.rows[0];

        if (source) {
          if (!String(source.broker_name ?? "").trim()) {
            await client.query("ROLLBACK");

            return res.status(400).json({
              error:
                "Broker Name is required on Purchase Order before creating Inward Gate Entry",
            });
          }

          if (!String(source.challan_no ?? "").trim()) {
            await client.query("ROLLBACK");

            return res.status(400).json({
              error:
                "Challan No. is required on Purchase Order before creating Inward Gate Entry",
            });
          }

          payload.vendor_no =
            blankToNull(payload.vendor_no) ??
            source.vendor_no;

          payload.vendor_name =
            blankToNull(payload.vendor_name) ??
            source.vendor_name;

          payload.location_code =
            blankToNull(payload.location_code) ??
            source.location_code;

          payload.challan_no =
            blankToNull(payload.challan_no) ??
            source.challan_no;
        }

        if (!String(payload.location_code ?? "").trim()) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            error:
              "Location Code is required",
          });
        }

        const lineResult =
          await client.query(
            `
            SELECT
              pol.id AS po_line_id,
              pol.line_no,
              pol.item_no,
              pol.item_description,
              pol.variant_code,
              COALESCE(pol.quantity, 0) AS po_quantity,
              COALESCE(pol.received_quantity, 0) AS posted_received_quantity,
              COALESCE(gate.total_gate_quantity, 0) AS total_gate_quantity
            FROM purchase_order_lines pol
            LEFT JOIN (
              SELECT
                po_line_id,
                SUM(
                    COALESCE(
                    NULLIF(net_quantity, 0),
                    NULLIF(actual_quantity, 0),
                    NULLIF(po_pending_quantity, 0),
                    received_quantity,
                    0
                  )
                ) AS total_gate_quantity
              FROM inward_gate_entry_lines
              WHERE po_line_id IS NOT NULL
                AND COALESCE(is_deleted, false) = false
              GROUP BY po_line_id
            ) gate
              ON gate.po_line_id = pol.id
            WHERE pol.purchase_order_id = $1
              AND COALESCE(pol.is_deleted, false) = false
            ORDER BY pol.line_no, pol.id
            `,
            [payload.source_purchase_order_id]
          );

        payload.lines =
          lineResult.rows
            .map((line) => {
              const poQuantity =
                Number(line.po_quantity ?? 0);

              const trackedQuantity =
                Math.max(
                  Number(line.posted_received_quantity ?? 0),
                  Number(line.total_gate_quantity ?? 0)
                );

              const pendingQuantity =
                Number(
                  Math.max(poQuantity - trackedQuantity, 0).toFixed(2)
                );

              return {
                po_line_id: line.po_line_id,
                line_no: line.line_no,
                item_no: line.item_no,
                item_description: line.item_description,
                variant_code: line.variant_code,
                po_quantity: poQuantity,
                po_pending_quantity: pendingQuantity,
                balance_quantity: pendingQuantity,
              };
            })
            .filter(
              (line) =>
                Number(line.po_pending_quantity ?? 0) > 0
            );

        if (payload.lines.length === 0) {
          await client.query("ROLLBACK");

          return res.status(400).json({
            error:
              "No pending quantity remains on this Purchase Order",
          });
        }
      }

      const seriesCode =
        await resolvePurchaseNoSeries(
          client,
          "inward_gate_entry_nos",
          "INWARD_GATE_ENTRY"
        );

      const documentNo =
        await getNextNumber(seriesCode);

      /**
       * CREATE HEADER
       */
      const headerResult =
        await client.query(
          `
          INSERT INTO inward_gate_entries (
            document_no,
            source_purchase_order_id,
            vendor_no,
            vendor_name,
            challan_no,
            location_code,
            document_date,
            posting_date,
            status,
            remarks
          )
          VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
          )
          RETURNING *
          `,
          [
            documentNo,
            blankToNull(payload.source_purchase_order_id),
            blankToNull(payload.vendor_no),
            blankToNull(payload.vendor_name),
            blankToNull(payload.challan_no),
            blankToNull(payload.location_code),
            payload.document_date,
            payload.posting_date,
            "Open",
            payload.remarks,
          ]
        );

      const header =
        headerResult.rows[0];

      /**
       * INSERT LINES
       */
      if (
        Array.isArray(
          payload.lines
        )
      ) {

        for (
          let i = 0;
          i < payload.lines.length;
          i++
        ) {

          const line =
            calculateIgeLine(
              payload.lines[i]
            );

          await client.query(
            `
            INSERT INTO inward_gate_entry_lines (
              inward_gate_entry_id,
              line_no,
              po_line_id,
              item_no,
              item_description,
              variant_code,
              po_quantity,
              po_pending_quantity,
              bill_quantity,
              qty_per_bag,
              receive_bags,
              actual_quantity,
              received_quantity,
              rejected_quantity,
              first_weight,
              second_weight,
              net_quantity,
              excess_weight,
              balance_quantity
            )
            VALUES (
              $1,$2,$3,$4,$5,
              $6,$7,$8,$9,$10,
              $11,$12,$13,$14,$15,
              $16,$17,$18,$19
            )
            `,
            [
              header.id,
              line.line_no || (i + 1) * 10000,
              line.po_line_id,
              line.item_no,
              line.item_description,
              line.variant_code,
              Number(
                line.po_quantity ?? 0
              ),
              Number(
                line.po_pending_quantity ?? 0
              ),
              Number(
                line.bill_quantity ?? 0
              ),
              Number(
                line.qty_per_bag ?? 0
              ),
              Number(
                line.receive_bags ?? 0
              ),
              Number(
                line.actual_quantity ?? 0
              ),
              Number(
                line.received_quantity ?? line.actual_quantity ?? 0
              ),
              Number(
                line.rejected_quantity ?? 0
              ),
              Number(
                line.first_weight ?? 0
              ),
              Number(
                line.second_weight ?? 0
              ),
              Number(
                line.net_quantity ?? 0
              ),
              Number(
                line.excess_weight ?? 0
              ),
              Number(
                line.balance_quantity ?? 0
              ),
            ]
          );
        }
      }

      await client.query(
        "COMMIT"
      );

      res.json({
        success: true,

        message:
          "Inward Gate Entry created successfully",

        data: header,
      });

    } catch (err) {

      await client.query(
        "ROLLBACK"
      );

      console.error(err);

      res.status(500).json({
        error:
          err.message ||
          "Failed to create inward gate entry",
      });

    } finally {

      client.release();
    }
  }
);

/**
 * UPDATE IGE
 */
router.put(
  "/:id",
  async (req, res) => {

    try {

      const { id } =
        req.params;

        const {
        entry_type,
        vendor_no,
        vendor_name,
        vendor_gst_reg_no,
        location_code,
        document_date,
        posting_date,
        status,
        remarks,
        vehicle_no,
        challan_no,
        lr_no,
        lr_date,
        description,
      } = req.body;

      if (!String(vehicle_no ?? "").trim()) {
        return res.status(400).json({
          error:
            "Vehicle No. is required",
        });
      }

      if (!String(location_code ?? "").trim()) {
        return res.status(400).json({
          error:
            "Location Code is required",
        });
      }

      const result =
        await db.query(
          `
          UPDATE inward_gate_entries
          SET
            entry_type = $1,
            vendor_no = $2,
            vendor_name = $3,
            vendor_gst_reg_no = $4,
            location_code = $5,
            document_date = $6,
            posting_date = $7,
            status = $8,
            remarks = $9,
            vehicle_no = $10,
            challan_no = $11,
            lr_no = $12,
            lr_date = $13,
            description = $14,
            updated_at = NOW()
          WHERE id = $15
          RETURNING *
          `,
          [
            entry_type || "Inward",
            blankToNull(vendor_no),
            blankToNull(vendor_name),
            blankToNull(vendor_gst_reg_no),
            blankToNull(location_code),
            blankToNull(document_date),
            blankToNull(posting_date),
            blankToNull(status),
            blankToNull(remarks),
            blankToNull(vehicle_no),
            blankToNull(challan_no),
            blankToNull(lr_no),
            blankToNull(lr_date),
            blankToNull(description),
            id,
          ]
        );

      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          error:
            "Inward Gate Entry not found",
        });
      }

      res.json(
        result.rows[0]
      );

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to update inward gate entry",
      });
    }
  }
);

/**
 * SOFT DELETE
 */
router.delete(
  "/:id",
  async (req, res) => {

    try {

      const { id } =
        req.params;

      await db.query(
        `
        UPDATE inward_gate_entries
        SET
          is_deleted = true,
          updated_at = NOW()
        WHERE id = $1
        `,
        [id]
      );

      res.json({
        success: true,
      });

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to delete inward gate entry",
      });
    }
  }
);

/**
 * UPDATE IGE LINE
 */
router.put(
  "/line/:lineId",
  async (req, res) => {

    try {

      const { lineId } =
        req.params;

      const patch =
        req.body;

      const existingResult =
        await db.query(
          `
          SELECT *
          FROM inward_gate_entry_lines
          WHERE id = $1
            AND COALESCE(is_deleted, false) = false
          `,
          [lineId]
        );

      if (existingResult.rows.length === 0) {
        return res.status(404).json({
          error: "Inward Gate Entry line not found",
        });
      }

      const nextLine =
        calculateIgeLine({
          ...existingResult.rows[0],
          ...patch,
        });

      const fields =
        [];
      const values =
        [];

      let idx = 1;

      Object.entries(
        nextLine
      ).forEach(
        ([key, value]) => {
          const allowed =
            new Set([
              "variant_code",
              "bill_quantity",
              "qty_per_bag",
              "receive_bags",
              "actual_quantity",
              "first_weight",
              "second_weight",
              "net_quantity",
              "excess_weight",
              "balance_quantity",
              "received_quantity",
            ]);

          if (!allowed.has(key)) {
            return;
          }

          fields.push(
            `${key} = $${idx}`
          );

          values.push(
            value
          );

          idx++;
        }
      );

      values.push(
        lineId
      );

      if (fields.length === 0) {
        return res.status(400).json({
          error: "No valid line fields supplied",
        });
      }

      const result =
        await db.query(
          `
          UPDATE inward_gate_entry_lines
          SET
            ${fields.join(
              ", "
            )},
            updated_at = NOW()
          WHERE id = $${idx}
          RETURNING *
          `,
          values
        );

      const updatedLine =
        result.rows[0];

      if (updatedLine.po_line_id) {
        const totalResult =
          await db.query(
            `
            SELECT COALESCE(SUM(COALESCE(actual_quantity, received_quantity, 0)), 0) AS total_received
            FROM inward_gate_entry_lines
            WHERE po_line_id = $1
              AND COALESCE(is_deleted, false) = false
            `,
            [updatedLine.po_line_id]
          );

        await db.query(
          `
          UPDATE inward_gate_entry_lines
          SET balance_quantity = COALESCE(po_quantity, 0) - $2,
              updated_at = NOW()
          WHERE po_line_id = $1
            AND COALESCE(is_deleted, false) = false
          `,
          [
            updatedLine.po_line_id,
            Number(totalResult.rows[0]?.total_received ?? 0),
          ]
        );
      }

      const refreshedResult =
        await db.query(
          `
          SELECT *
          FROM inward_gate_entry_lines
          WHERE id = $1
          `,
          [lineId]
        );

      res.json(
        refreshedResult.rows[0]
      );

    } catch (err) {

      console.error(err);

      res.status(500).json({
        error:
          "Failed to update line",
      });
    }
  }
);

module.exports =
  router;
