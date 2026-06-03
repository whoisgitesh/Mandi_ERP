const express = require("express");
const router = express.Router();

const db = require("../db.cjs");
const {
  assignMasterNumber,
} = require("../services/masterNumberService.cjs");

const COLUMNS = [
  "item_no",
  "description",
  "description_2",
  "blocked",
  "type",
  "base_unit_of_measure",
  "report_unit_of_measure",
  "is_by_product",
  "by_product_cost",
  "last_date_modified",
  "gtin",
  "item_category_code",
  "family_no",
  "sub_category_code",
  "quality_to_be_done",
  "automatic_ext_texts",
  "common_item_no",
  "purchasing_code",
  "purchase_tolerance_pct",
  "sales_tolerance_pct",
  "brand_name",
  "variant_mandatory_if_exists",
  "shelf_no",
  "created_from_catalog_item",
  "search_description",
  "inventory",
  "qty_on_purch_order",
  "qty_on_prod_order",
  "qty_on_component_lines",
  "qty_on_sales_order",
  "qty_on_service_order",
  "qty_on_project_order",
  "qty_on_assembly_order",
  "qty_on_asm_component",
  "stockout_warning",
  "prevent_negative_inventory",
  "net_weight",
  "gross_weight",
  "unit_volume",
  "over_receipt_code",
  "costing_method",
  "standard_cost",
  "unit_cost",
  "indirect_cost_pct",
  "last_direct_cost",
  "net_invoiced_qty",
  "cost_is_adjusted",
  "cost_is_posted_to_gl",
  "default_deferral_template",
  "hsn_sac_code",
  "exempted",
  "subcontracting",
  "sub_comp_location",
  "unit_price",
  "profit_pct",
  "sales_unit_of_measure",
  "subscription_option",
  "sales_blocked",
  "service_blocked",
  "replenishment_system",
  "lead_time_calculation",
  "vendor_no",
  "vendor_name",
  "vendor_item_no",
  "purch_unit_of_measure",
  "purchasing_blocked",
  "manufacturing_policy",
  "routing_no",
  "production_bom_no",
  "rounding_precision",
  "flushing_method",
  "scrap_pct",
  "lot_size",
  "allow_whse_overpick",
  "production_blocked",
  "assembly_policy",
  "assembly_bom",
  "assembly_bom_no",
  "reordering_policy",
  "order_tracking_policy",
  "stockkeeping_unit_exists",
  "critical",
  "safety_lead_time",
  "safety_stock_quantity",
  "include_inventory",
  "lot_accumulation_period",
  "rescheduling_period",
  "reorder_point",
  "reorder_quantity",
  "maximum_inventory",
  "minimum_order_quantity",
  "maximum_order_quantity",
  "order_multiple",
  "item_tracking_code",
  "serial_nos",
  "lot_nos",
  "expiration_calculation",
  "warehouse_class_code",
  "put_away_template_code",
  "put_away_unit_of_measure_code",
  "phys_invt_counting_period_code",
  "last_phys_invt_date",
  "last_counting_period_update",
  "next_counting_start_date",
  "next_counting_end_date",
];

const NUMERIC = new Set([
  "inventory",
  "qty_on_purch_order",
  "qty_on_prod_order",
  "qty_on_component_lines",
  "qty_on_sales_order",
  "qty_on_service_order",
  "qty_on_project_order",
  "qty_on_assembly_order",
  "qty_on_asm_component",
  "by_product_cost",
  "purchase_tolerance_pct",
  "sales_tolerance_pct",
  "standard_cost",
  "unit_cost",
  "last_direct_cost",
  "net_invoiced_qty",
  "unit_price",
  "indirect_cost_pct",
  "profit_pct",
  "net_weight",
  "gross_weight",
  "unit_volume",
  "reorder_point",
  "reorder_quantity",
  "maximum_inventory",
  "minimum_order_quantity",
  "maximum_order_quantity",
  "safety_stock_quantity",
  "order_multiple",
  "rounding_precision",
  "scrap_pct",
  "lot_size",
]);

const BOOLEAN = new Set([
  "blocked",
  "is_by_product",
  "quality_to_be_done",
  "automatic_ext_texts",
  "created_from_catalog_item",
  "cost_is_adjusted",
  "cost_is_posted_to_gl",
  "exempted",
  "subcontracting",
  "stockkeeping_unit_exists",
  "critical",
  "include_inventory",
  "allow_whse_overpick",
  "sales_blocked",
  "purchasing_blocked",
  "service_blocked",
  "assembly_bom",
]);

function cleanValue(key, value) {
  if (key === "description") return value ?? "";
  if (value === "") return null;
  if (NUMERIC.has(key)) return Number(value ?? 0);
  if (BOOLEAN.has(key)) return Boolean(value);
  return value ?? null;
}

async function ensureItemQualitySpecColumns() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS item_quality_specifications (
      id SERIAL PRIMARY KEY,
      item_no VARCHAR(50) NOT NULL,
      section_code VARCHAR(50),
      quality_specific VARCHAR(100) NOT NULL,
      unit_of_measure_code VARCHAR(50),
      quality_type VARCHAR(30) NOT NULL DEFAULT 'Range',
      quality_from NUMERIC(18,4) DEFAULT 0,
      quality_to NUMERIC(18,4) DEFAULT 0,
      standard_value VARCHAR(100),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function normalizeQualityType(value) {
  if (value === "Minimum" || value === "Min") return "Minimum";
  if (value === "Maximum" || value === "Max") return "Maximum";
  if (value === "Fixed" || value === "Equal") return "Fixed";
  return "Range";
}

async function validateQualitySpecPayload(itemNo, payload = {}, existingId = null) {
  const qualitySpecific = String(payload.quality_specific || "").trim();
  const sectionCode = payload.section_code ? String(payload.section_code).trim().toUpperCase() : null;
  const qualityType = normalizeQualityType(payload.quality_type);
  const qualityFrom = Number(payload.quality_from ?? 0) || 0;
  const qualityTo = Number(payload.quality_to ?? 0) || 0;
  const standardValue =
    payload.standard_value === null || payload.standard_value === undefined
      ? ""
      : String(payload.standard_value).trim();

  if (!qualitySpecific) {
    const err = new Error("Quality Specific is required.");
    err.statusCode = 400;
    throw err;
  }

  if (qualityFrom < 0 || qualityTo < 0) {
    const err = new Error("Quality numeric limits cannot be negative.");
    err.statusCode = 400;
    throw err;
  }

  if (qualityType === "Range" && qualityFrom > qualityTo) {
    const err = new Error("Quality From must be less than or equal to Quality To.");
    err.statusCode = 400;
    throw err;
  }

  if (qualityType === "Fixed" && !standardValue) {
    const err = new Error("Standard Value is required when Quality Type is Fixed.");
    err.statusCode = 400;
    throw err;
  }

  const duplicate = await db.query(
    `SELECT 1
     FROM item_quality_specifications
     WHERE item_no = $1
       AND COALESCE(section_code, '') = COALESCE($2, '')
       AND lower(quality_specific) = lower($3)
       AND ($4::int IS NULL OR id <> $4::int)
     LIMIT 1`,
    [itemNo, sectionCode, qualitySpecific, existingId ? Number(existingId) : null]
  );

  if (duplicate.rows.length > 0) {
    const err = new Error("Duplicate Quality Specific for the same item and section is not allowed.");
    err.statusCode = 400;
    throw err;
  }

  return {
    item_no: itemNo,
    section_code: sectionCode,
    quality_specific: qualitySpecific,
    unit_of_measure_code: payload.unit_of_measure_code
      ? String(payload.unit_of_measure_code).trim().toUpperCase()
      : null,
    quality_type: qualityType,
    quality_from: qualityFrom,
    quality_to: qualityTo,
    standard_value: standardValue || null,
    is_active: payload.is_active !== false,
  };
}

async function ensureItemAssemblyColumns() {
  await db.query(`
    ALTER TABLE items
      ADD COLUMN IF NOT EXISTS assembly_bom BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS assembly_policy VARCHAR(50),
      ADD COLUMN IF NOT EXISTS assembly_bom_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS item_category_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS family_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(150)
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS item_categories (
      code VARCHAR(50) PRIMARY KEY,
      description VARCHAR(150) NOT NULL,
      parent_category_code VARCHAR(50),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS families (
      family_no VARCHAR(50) PRIMARY KEY,
      description VARCHAR(150) NOT NULL,
      description_2 VARCHAR(150),
      search_name VARCHAR(150),
      item_category_code VARCHAR(50),
      routing_no VARCHAR(50),
      blocked BOOLEAN DEFAULT FALSE,
      last_date_modified DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function normalizeForeignKeys(payload) {
  const next = { ...payload };

  if (next.item_category_code) {
    next.item_category_code = String(next.item_category_code).trim().toUpperCase();
    const found = await db.query(
      `SELECT 1
       FROM item_categories
       WHERE code = $1
         AND COALESCE(is_active, true) = true
       LIMIT 1`,
      [next.item_category_code]
    );

    if (found.rows.length === 0) {
      const err = new Error("Selected Item Category Code must reference an existing active Item Category.");
      err.statusCode = 400;
      throw err;
    }
  }

  if (next.sub_category_code) {
    const found = await db.query(
      `SELECT 1
       FROM item_subcategories
       WHERE code = $1
         AND COALESCE(is_deleted, false) = false
       LIMIT 1`,
      [next.sub_category_code]
    );

    if (found.rows.length === 0) {
      next.sub_category_code = null;
    }
  }

  if (next.family_no) {
    next.family_no = String(next.family_no).trim().toUpperCase();
    const found = await db.query(
      `SELECT item_category_code, blocked
       FROM families
       WHERE family_no = $1
       LIMIT 1`,
      [next.family_no]
    );

    if (found.rows.length === 0 || found.rows[0].blocked === true) {
      const err = new Error("Selected Family must reference an existing unblocked Family.");
      err.statusCode = 400;
      throw err;
    }

    if (!next.item_category_code && found.rows[0].item_category_code) {
      next.item_category_code = found.rows[0].item_category_code;
    }
  }

  if (next.vendor_no) {
    next.vendor_no = String(next.vendor_no).trim().toUpperCase();
    const found = await db.query(
      `SELECT vendor_no, name, blocked
       FROM vendors
       WHERE vendor_no = $1
         AND COALESCE(is_deleted, false) = false
       LIMIT 1`,
      [next.vendor_no]
    );

    if (found.rows.length === 0 || found.rows[0].blocked === true) {
      const err = new Error("Selected Vendor No. must reference an existing unblocked Vendor.");
      err.statusCode = 400;
      throw err;
    }

    next.vendor_name = found.rows[0].name || null;
  } else {
    next.vendor_name = null;
  }

  return next;
}

router.get("/", async (req, res) => {
  try {
    await ensureItemAssemblyColumns();
    const result = await db.query(
      `SELECT * FROM items
       WHERE COALESCE(is_deleted, false) = false
       ORDER BY id DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

async function findItemByKey(itemKey) {
  const result = await db.query(
    `SELECT id, item_no
     FROM items
     WHERE (id::text = $1 OR item_no = $1)
       AND COALESCE(is_deleted, false) = false
     LIMIT 1`,
    [itemKey]
  );

  return result.rows[0] ?? null;
}

router.get("/:itemKey/quality-specifications", async (req, res) => {
  try {
    await ensureItemQualitySpecColumns();
    const item = await findItemByKey(req.params.itemKey);
    if (!item) return res.status(404).json({ error: "Item not found" });

    const result = await db.query(
      `SELECT *
       FROM item_quality_specifications
       WHERE item_no = $1
       ORDER BY section_code NULLS LAST, quality_specific, id`,
      [item.item_no]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to fetch item quality specifications" });
  }
});

router.post("/:itemKey/quality-specifications", async (req, res) => {
  try {
    await ensureItemQualitySpecColumns();
    const item = await findItemByKey(req.params.itemKey);
    if (!item) return res.status(404).json({ error: "Item not found" });

    const payload = await validateQualitySpecPayload(item.item_no, req.body);
    const result = await db.query(
      `INSERT INTO item_quality_specifications (
         item_no,
         section_code,
         quality_specific,
         unit_of_measure_code,
         quality_type,
         quality_from,
         quality_to,
         standard_value,
         is_active
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        payload.item_no,
        payload.section_code,
        payload.quality_specific,
        payload.unit_of_measure_code,
        payload.quality_type,
        payload.quality_from,
        payload.quality_to,
        payload.standard_value,
        payload.is_active,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Failed to create item quality specification",
    });
  }
});

router.get("/:itemKey/variants", async (req, res) => {
  try {
    const item = await findItemByKey(req.params.itemKey);

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    const includeBlocked =
      req.query.include_blocked === "true" ||
      req.query.include_blocked === "1";

    const result = await db.query(
      `SELECT
         id,
         item_id,
         item_no,
         code,
         description,
         description_2,
         unit_of_measure_code,
         weight,
         blocked
       FROM item_variants
       WHERE item_no = $1
         AND ($2::boolean = true OR COALESCE(blocked, false) = false)
         AND COALESCE(is_deleted, false) = false
       ORDER BY code`,
      [item.item_no, includeBlocked]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch item variants" });
  }
});

async function createVariant(itemKey, payload) {
  const item = await findItemByKey(itemKey);

  if (!item) {
    const err = new Error("Item not found");
    err.statusCode = 404;
    throw err;
  }

  if (!payload.code) {
    const err = new Error("Variant code is required");
    err.statusCode = 400;
    throw err;
  }

  const result = await db.query(
    `INSERT INTO item_variants (
       item_id,
       item_no,
       code,
       description,
       description_2,
       blocked,
       weight,
       unit_of_measure_code
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      item.id,
      item.item_no,
      payload.code,
      payload.description ?? null,
      payload.description_2 ?? null,
      Boolean(payload.blocked),
      Number(payload.weight ?? 0),
      payload.unit_of_measure_code || null,
    ]
  );

  return result.rows[0];
}

router.post("/variants", async (req, res) => {
  try {
    const payload = req.body;
    const itemKey = payload.item_id ?? payload.item_no;
    const variant = await createVariant(itemKey, payload);

    res.status(201).json(variant);
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Failed to create item variant",
    });
  }
});

router.post("/:itemKey/variants", async (req, res) => {
  try {
    const variant = await createVariant(req.params.itemKey, req.body);
    res.status(201).json(variant);
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({
      error: err.message || "Failed to create item variant",
    });
  }
});

router.put("/variants/:id", async (req, res) => {
  try {
    const payload = req.body;

    const result = await db.query(
      `UPDATE item_variants
       SET
         code = COALESCE($1, code),
         description = $2,
         description_2 = $3,
         blocked = $4,
         weight = $5,
         unit_of_measure_code = $6,
         updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        payload.code ?? null,
        payload.description ?? null,
        payload.description_2 ?? null,
        Boolean(payload.blocked),
        Number(payload.weight ?? 0),
        payload.unit_of_measure_code || null,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Variant not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update item variant" });
  }
});

router.delete("/variants/:id", async (req, res) => {
  try {
    await db.query(
      `UPDATE item_variants
       SET is_deleted = true,
           updated_at = NOW()
       WHERE id = $1`,
      [req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete item variant" });
  }
});

router.post("/", async (req, res) => {
  try {
    await ensureItemAssemblyColumns();
    const body = req.body;
    const itemNo = await assignMasterNumber(db, {
      masterKey: "item",
      selectedSeriesCode: body.no_series_code,
      selectedSeriesLineId: body.no_series_line_id,
      currentNo: body.item_no,
    });

    const payload = await normalizeForeignKeys({
      ...body,
      item_no: itemNo,
    });

    const fields = COLUMNS;
    const placeholders = fields.map((_, i) => `$${i + 1}`);
    const values = fields.map((field) => cleanValue(field, payload[field]));

    const result = await db.query(
      `INSERT INTO items (${fields.join(", ")})
       VALUES (${placeholders.join(", ")})
       RETURNING *`,
      values
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || "Failed to create item",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    await ensureItemAssemblyColumns();
    const fields = COLUMNS.filter((field) => field !== "item_no");
    const assignments = fields.map((field, i) => `${field} = $${i + 1}`);
    const payload = await normalizeForeignKeys(req.body);
    const values = fields.map((field) => cleanValue(field, payload[field]));

    const result = await db.query(
      `UPDATE items
       SET ${assignments.join(", ")},
           updated_at = NOW()
       WHERE id = $${fields.length + 1}
       RETURNING *`,
      [...values, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.query(
      `UPDATE items
       SET is_deleted = true,
           updated_at = NOW()
       WHERE id = $1`,
      [req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

module.exports = router;
