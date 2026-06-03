const db = require("../db.cjs");

const DEFAULT_SERIES = [
  {
    code: "PRODUCTION_BOM",
    description: "Production BOM Nos.",
    starting_no: "PBOM-00001",
    ending_no: "PBOM-99999",
  },
  {
    code: "PRODUCTION_BOM_VERSION",
    description: "Production BOM Version Nos.",
    starting_no: "PBOMV-00001",
    ending_no: "PBOMV-99999",
  },
  {
    code: "RELEASED_PROD_ORDER",
    description: "Released Production Order Nos.",
    starting_no: "RPO-00001",
    ending_no: "RPO-99999",
  },
  {
    code: "CONSUMPTION_JOURNAL",
    description: "Consumption Journal Nos.",
    starting_no: "CONS-00001",
    ending_no: "CONS-99999",
  },
  {
    code: "ITEM_JOURNAL",
    description: "Item Journal Nos.",
    starting_no: "IJNL-00001",
    ending_no: "IJNL-99999",
  },
  {
    code: "OUTPUT_JOURNAL",
    description: "Output Journal Nos.",
    starting_no: "OUT-00001",
    ending_no: "OUT-99999",
  },
  {
    code: "ASSEMBLY_ORDER",
    description: "Assembly Order Nos.",
    starting_no: "AO-00001",
    ending_no: "AO-99999",
  },
  {
    code: "POSTED_ASSEMBLY_ORDER",
    description: "Posted Assembly Order Nos.",
    starting_no: "PAO-00001",
    ending_no: "PAO-99999",
  },
  {
    code: "REVERSAL_ENTRY",
    description: "Reversal Entry Nos.",
    starting_no: "REV-00001",
    ending_no: "REV-99999",
  },
];

const num = (value) => Number(value ?? 0) || 0;

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function roundTo(value, decimals) {
  return Number(num(value).toFixed(decimals));
}

function calculateProductionBomLineFields(payload = {}) {
  const grossQty = num(payload.gross_qty);
  const shortingLossQty = num(payload.shorting_loss_qty);
  const cuttingLossQty = num(payload.cutting_loss_qty);
  const peelingLossQty = num(payload.peeling_loss_qty);
  const anyOtherLossQty = num(payload.any_other_loss_qty);
  const losses = [
    shortingLossQty,
    cuttingLossQty,
    peelingLossQty,
    anyOtherLossQty,
  ];
  const totalLossQty = losses.reduce((sum, value) => sum + value, 0);

  if (grossQty < 0) throw validationError("Gross Qty cannot be negative.");
  if (losses.some((value) => value < 0)) {
    throw validationError("Loss quantities cannot be negative.");
  }
  if (totalLossQty > grossQty) {
    throw validationError("Total loss quantity cannot exceed Gross Qty.");
  }

  const netQty = Math.max(grossQty - totalLossQty, 0);
  const shortagePct = grossQty > 0 ? (totalLossQty / grossQty) * 100 : 0;

  return {
    gross_qty: roundTo(grossQty, 4),
    shorting_loss_qty: roundTo(shortingLossQty, 4),
    cutting_loss_qty: roundTo(cuttingLossQty, 4),
    peeling_loss_qty: roundTo(peelingLossQty, 4),
    any_other_loss_qty: roundTo(anyOtherLossQty, 4),
    net_qty: roundTo(netQty, 4),
    quantity_per: roundTo(netQty, 4),
    shortage_pct: roundTo(shortagePct, 3),
  };
}

async function ensureManufacturingSchema(connection = db) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS manufacturing_setup (
      id SERIAL PRIMARY KEY,
      released_prod_order_nos VARCHAR(50),
      production_bom_nos VARCHAR(50),
      production_bom_version_nos VARCHAR(50),
      item_journal_nos VARCHAR(50),
      assembly_order_nos VARCHAR(50),
      posted_assembly_order_nos VARCHAR(50),
      consumption_journal_nos VARCHAR(50),
      output_journal_nos VARCHAR(50),
      normal_starting_time TIME DEFAULT '08:00',
      normal_ending_time TIME DEFAULT '17:00',
      default_safety_lead_time VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    ALTER TABLE manufacturing_setup
      ADD COLUMN IF NOT EXISTS production_bom_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS production_bom_version_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS item_journal_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS assembly_order_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS posted_assembly_order_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS consumption_journal_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS output_journal_nos VARCHAR(50)
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS production_boms (
      id SERIAL PRIMARY KEY,
      bom_no VARCHAR(50) UNIQUE NOT NULL,
      description VARCHAR(150),
      status VARCHAR(20) DEFAULT 'New',
      unit_of_measure_code VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    ALTER TABLE production_boms
      ADD COLUMN IF NOT EXISTS version_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS active_version VARCHAR(50),
      ADD COLUMN IF NOT EXISTS last_date_modified DATE DEFAULT CURRENT_DATE
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS production_bom_lines (
      id SERIAL PRIMARY KEY,
      bom_no VARCHAR(50) NOT NULL REFERENCES production_boms(bom_no) ON DELETE CASCADE,
      line_no INT NOT NULL,
      type VARCHAR(30) DEFAULT 'Item',
      item_no VARCHAR(50) NOT NULL,
      variant_code VARCHAR(50),
      description VARCHAR(150),
      unit_of_measure_code VARCHAR(50),
      quantity_per NUMERIC(12,4) NOT NULL DEFAULT 0,
      scrap_pct NUMERIC(7,3) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    ALTER TABLE production_bom_lines
      ADD COLUMN IF NOT EXISTS gross_qty NUMERIC(12,4) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS shorting_loss_qty NUMERIC(12,4) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS cutting_loss_qty NUMERIC(12,4) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS peeling_loss_qty NUMERIC(12,4) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS any_other_loss_qty NUMERIC(12,4) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS net_qty NUMERIC(12,4) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS shortage_pct NUMERIC(7,3) DEFAULT 0
  `);

  await connection.query(`
    ALTER TABLE items
      ADD COLUMN IF NOT EXISTS replenishment_system VARCHAR(50),
      ADD COLUMN IF NOT EXISTS production_bom_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS routing_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS assembly_bom BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS assembly_policy VARCHAR(50),
      ADD COLUMN IF NOT EXISTS assembly_bom_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS item_category VARCHAR(50),
      ADD COLUMN IF NOT EXISTS item_type VARCHAR(50)
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS released_production_orders (
      id SERIAL PRIMARY KEY,
      document_no VARCHAR(50) UNIQUE NOT NULL,
      source_type VARCHAR(30) DEFAULT 'Item',
      source_no VARCHAR(50) NOT NULL,
      description VARCHAR(150),
      status VARCHAR(30) DEFAULT 'Released',
      quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
      finished_quantity NUMERIC(12,2) DEFAULT 0,
      remaining_quantity NUMERIC(12,2) DEFAULT 0,
      location_code VARCHAR(50) NOT NULL,
      posting_date DATE,
      starting_date DATE,
      ending_date DATE,
      due_date DATE,
      production_bom_no VARCHAR(50),
      referred_production_order_no VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    ALTER TABLE released_production_orders
      ADD COLUMN IF NOT EXISTS description_2 VARCHAR(150),
      ADD COLUMN IF NOT EXISTS refresh_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS total_cost_rm NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS search_description VARCHAR(150),
      ADD COLUMN IF NOT EXISTS assigned_user_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS last_date_modified DATE DEFAULT CURRENT_DATE,
      ADD COLUMN IF NOT EXISTS starting_datetime TIMESTAMP,
      ADD COLUMN IF NOT EXISTS ending_datetime TIMESTAMP,
      ADD COLUMN IF NOT EXISTS inventory_posting_group VARCHAR(50),
      ADD COLUMN IF NOT EXISTS gen_prod_posting_group VARCHAR(50),
      ADD COLUMN IF NOT EXISTS gen_bus_posting_group VARCHAR(50),
      ADD COLUMN IF NOT EXISTS department_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS customer_group_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS bin_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS unit_of_measure_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS needs_refresh BOOLEAN DEFAULT FALSE
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS production_order_components (
      id SERIAL PRIMARY KEY,
      production_order_no VARCHAR(50) NOT NULL REFERENCES released_production_orders(document_no) ON DELETE CASCADE,
      line_no INT NOT NULL,
      item_no VARCHAR(50) NOT NULL,
      variant_code VARCHAR(50),
      description VARCHAR(150),
      location_code VARCHAR(50),
      unit_of_measure_code VARCHAR(50),
      quantity_per NUMERIC(12,4) DEFAULT 0,
      expected_quantity NUMERIC(12,2) DEFAULT 0,
      consumed_quantity NUMERIC(12,2) DEFAULT 0,
      remaining_quantity NUMERIC(12,2) DEFAULT 0,
      scrap_pct NUMERIC(7,3) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    ALTER TABLE production_order_components
      ADD COLUMN IF NOT EXISTS due_date DATE,
      ADD COLUMN IF NOT EXISTS starting_datetime TIMESTAMP,
      ADD COLUMN IF NOT EXISTS ending_datetime TIMESTAMP,
      ADD COLUMN IF NOT EXISTS quantity NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS finished_quantity NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS cost_amount NUMERIC(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS subcontracting_order_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS subcontractor_code VARCHAR(50)
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS inventory_posting_groups (
      code VARCHAR(50) PRIMARY KEY,
      description VARCHAR(150),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS gen_product_posting_groups (
      code VARCHAR(50) PRIMARY KEY,
      description VARCHAR(150),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS gen_business_posting_groups (
      code VARCHAR(50) PRIMARY KEY,
      description VARCHAR(150),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS departments (
      code VARCHAR(50) PRIMARY KEY,
      description VARCHAR(150),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS customer_groups (
      code VARCHAR(50) PRIMARY KEY,
      description VARCHAR(150),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS bins (
      code VARCHAR(50) PRIMARY KEY,
      location_code VARCHAR(50),
      description VARCHAR(150),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS consumption_journal_lines (
      id SERIAL PRIMARY KEY,
      journal_no VARCHAR(50),
      production_order_no VARCHAR(50),
      posting_date DATE,
      item_no VARCHAR(50),
      variant_code VARCHAR(50),
      location_code VARCHAR(50),
      unit_of_measure_code VARCHAR(50),
      quantity NUMERIC(12,2),
      document_no VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS output_journal_lines (
      id SERIAL PRIMARY KEY,
      journal_no VARCHAR(50),
      production_order_no VARCHAR(50),
      posting_date DATE,
      item_no VARCHAR(50),
      variant_code VARCHAR(50),
      location_code VARCHAR(50),
      unit_of_measure_code VARCHAR(50),
      quantity NUMERIC(12,2),
      document_no VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    ALTER TABLE item_ledger_entries
      ADD COLUMN IF NOT EXISTS document_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS description VARCHAR(150),
      ADD COLUMN IF NOT EXISTS variant_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS unit_of_measure_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS source_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS source_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS production_order_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS assembly_order_no VARCHAR(50),
      ADD COLUMN IF NOT EXISTS unit_price NUMERIC(18,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS sales_amount NUMERIC(18,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS invoiced_quantity NUMERIC(18,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS open BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE
  `);

  await ensureDefaultManufacturingSeries(connection);

  await connection.query(`
    INSERT INTO manufacturing_setup (
      production_bom_nos,
      production_bom_version_nos,
      item_journal_nos,
      assembly_order_nos,
      posted_assembly_order_nos,
      released_prod_order_nos,
      consumption_journal_nos,
      output_journal_nos
    )
    SELECT
      'PRODUCTION_BOM',
      'PRODUCTION_BOM_VERSION',
      'ITEM_JOURNAL',
      'ASSEMBLY_ORDER',
      'POSTED_ASSEMBLY_ORDER',
      'RELEASED_PROD_ORDER',
      'CONSUMPTION_JOURNAL',
      'OUTPUT_JOURNAL'
    WHERE NOT EXISTS (SELECT 1 FROM manufacturing_setup)
  `);

  await connection.query(`
    UPDATE manufacturing_setup
    SET
      production_bom_nos = COALESCE(NULLIF(production_bom_nos, ''), 'PRODUCTION_BOM'),
      production_bom_version_nos = COALESCE(NULLIF(production_bom_version_nos, ''), 'PRODUCTION_BOM_VERSION'),
      item_journal_nos = COALESCE(NULLIF(item_journal_nos, ''), 'ITEM_JOURNAL'),
      assembly_order_nos = COALESCE(NULLIF(assembly_order_nos, ''), 'ASSEMBLY_ORDER'),
      posted_assembly_order_nos = COALESCE(NULLIF(posted_assembly_order_nos, ''), 'POSTED_ASSEMBLY_ORDER'),
      released_prod_order_nos = COALESCE(NULLIF(released_prod_order_nos, ''), 'RELEASED_PROD_ORDER'),
      consumption_journal_nos = COALESCE(NULLIF(consumption_journal_nos, ''), 'CONSUMPTION_JOURNAL'),
      output_journal_nos = COALESCE(NULLIF(output_journal_nos, ''), 'OUTPUT_JOURNAL')
    WHERE id = (SELECT id FROM manufacturing_setup ORDER BY id LIMIT 1)
  `);
}

async function ensureDefaultManufacturingSeries(connection = db) {
  for (const series of DEFAULT_SERIES) {
    await connection.query(
      `
      INSERT INTO number_series (code, description, manual_nos, date_order)
      VALUES ($1, $2, false, false)
      ON CONFLICT (code) DO UPDATE SET
        description = COALESCE(number_series.description, EXCLUDED.description),
        updated_at = NOW()
      `,
      [series.code, series.description]
    );

    await connection.query(
      `
      INSERT INTO no_series_lines (
        no_series_code,
        sequence_no,
        starting_date,
        starting_no,
        ending_no,
        last_no_used,
        increment_by,
        open
      )
      SELECT $1::text, 1, CURRENT_DATE, $2::text, $3::text, NULL, 1, true
      WHERE NOT EXISTS (
        SELECT 1 FROM no_series_lines WHERE no_series_code = $1::text
      )
      `,
      [series.code, series.starting_no, series.ending_no]
    );
  }
}

async function ensureInventorySetupNoSeriesColumns(connection = db) {
  await ensureDefaultManufacturingSeries(connection);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS inventory_setup (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    ALTER TABLE inventory_setup
      ADD COLUMN IF NOT EXISTS item_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS location_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS uom_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS lot_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS serial_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS production_bom_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS production_bom_version_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS released_prod_order_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS consumption_journal_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS output_journal_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS assembly_order_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS posted_assembly_order_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS item_journal_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS reversal_entry_nos VARCHAR(50),
      ADD COLUMN IF NOT EXISTS location_mandatory BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS prevent_negative_inventory BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS variant_mandatory_if_exists BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS automatic_cost_posting BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS automatic_cost_adjustment VARCHAR(50),
      ADD COLUMN IF NOT EXISTS cost_adjustment_logging VARCHAR(50),
      ADD COLUMN IF NOT EXISTS default_costing_method VARCHAR(50),
      ADD COLUMN IF NOT EXISTS average_cost_period VARCHAR(50),
      ADD COLUMN IF NOT EXISTS average_cost_calc_type VARCHAR(100),
      ADD COLUMN IF NOT EXISTS skip_prompt_to_create_item BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS copy_item_descr_to_entries BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS allow_inventory_adjustment BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS current_demand_forecast VARCHAR(100),
      ADD COLUMN IF NOT EXISTS use_forecast_on_locations BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS use_forecast_on_variants BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS default_safety_lead_time VARCHAR(20),
      ADD COLUMN IF NOT EXISTS blank_overflow_level VARCHAR(100),
      ADD COLUMN IF NOT EXISTS combined_mps_mrp_calculation BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS default_dampener_period VARCHAR(20),
      ADD COLUMN IF NOT EXISTS default_dampener_percent VARCHAR(20)
  `);

  await connection.query(`
    INSERT INTO inventory_setup (
      production_bom_nos,
      production_bom_version_nos,
      released_prod_order_nos,
      consumption_journal_nos,
      output_journal_nos,
      assembly_order_nos,
      posted_assembly_order_nos,
      item_journal_nos,
      reversal_entry_nos
    )
    SELECT
      'PRODUCTION_BOM',
      'PRODUCTION_BOM_VERSION',
      'RELEASED_PROD_ORDER',
      'CONSUMPTION_JOURNAL',
      'OUTPUT_JOURNAL',
      'ASSEMBLY_ORDER',
      'POSTED_ASSEMBLY_ORDER',
      'ITEM_JOURNAL',
      'REVERSAL_ENTRY'
    WHERE NOT EXISTS (SELECT 1 FROM inventory_setup)
  `);

  await connection.query(`
    UPDATE inventory_setup
    SET
      production_bom_nos = COALESCE(NULLIF(production_bom_nos, ''), 'PRODUCTION_BOM'),
      production_bom_version_nos = COALESCE(NULLIF(production_bom_version_nos, ''), 'PRODUCTION_BOM_VERSION'),
      released_prod_order_nos = COALESCE(NULLIF(released_prod_order_nos, ''), 'RELEASED_PROD_ORDER'),
      consumption_journal_nos = COALESCE(NULLIF(consumption_journal_nos, ''), 'CONSUMPTION_JOURNAL'),
      output_journal_nos = COALESCE(NULLIF(output_journal_nos, ''), 'OUTPUT_JOURNAL'),
      assembly_order_nos = COALESCE(NULLIF(assembly_order_nos, ''), 'ASSEMBLY_ORDER'),
      posted_assembly_order_nos = COALESCE(NULLIF(posted_assembly_order_nos, ''), 'POSTED_ASSEMBLY_ORDER'),
      item_journal_nos = COALESCE(NULLIF(item_journal_nos, ''), 'ITEM_JOURNAL'),
      reversal_entry_nos = COALESCE(NULLIF(reversal_entry_nos, ''), 'REVERSAL_ENTRY')
    WHERE id = (SELECT id FROM inventory_setup ORDER BY id LIMIT 1)
  `);
}

async function getInventorySetupNoSeries(connection = db) {
  await ensureInventorySetupNoSeriesColumns(connection);

  const result = await connection.query(
    `SELECT * FROM inventory_setup ORDER BY id LIMIT 1`
  );

  return result.rows[0] || {};
}

async function getInventoryNoSeriesCode(connection = db, fieldName, fallbackCode = null) {
  const inventorySetup = await getInventorySetupNoSeries(connection);
  const inventoryValue = String(inventorySetup?.[fieldName] || "").trim();
  if (inventoryValue) return inventoryValue;

  const manufacturingSetup = await getManufacturingSetup(connection);
  const manufacturingValue = String(manufacturingSetup?.[fieldName] || "").trim();
  return manufacturingValue || fallbackCode;
}

async function getManufacturingSetup(connection = db) {
  await ensureManufacturingSchema(connection);

  const result = await connection.query(
    `SELECT * FROM manufacturing_setup ORDER BY id LIMIT 1`
  );

  return result.rows[0];
}

async function getNextNumberInTransaction(client, seriesCode) {
  if (!seriesCode) {
    throw new Error("No. Series is required");
  }

  const result = await client.query(
    `
    SELECT *
    FROM no_series_lines
    WHERE no_series_code = $1
      AND COALESCE(open, true) = true
    ORDER BY COALESCE(sequence_no, 0), id
    LIMIT 1
    FOR UPDATE
    `,
    [seriesCode]
  );

  if (result.rows.length === 0) {
    throw new Error(`No open No. Series line found for ${seriesCode}`);
  }

  const line = result.rows[0];
  let nextNo = line.starting_no;

  if (line.last_no_used) {
    const match = String(line.last_no_used).match(/(.*?)(\d+)$/);
    if (!match) {
      throw new Error(`Invalid last number format for ${seriesCode}`);
    }

    nextNo =
      match[1] +
      String(parseInt(match[2], 10) + num(line.increment_by || 1)).padStart(
        match[2].length,
        "0"
      );
  }

  await client.query(
    `
    UPDATE no_series_lines
    SET last_no_used = $1,
        last_date_used = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = $2
    `,
    [nextNo, line.id]
  );

  return nextNo;
}

async function getItemInventory(connection, itemNo, locationCode, variantCode = null) {
  const result = await connection.query(
    `
    SELECT COALESCE(SUM(quantity), 0) AS inventory_qty
    FROM item_ledger_entries
    WHERE item_no = $1
      AND ($2::text IS NULL OR location_code = $2)
      AND ($3::text IS NULL OR COALESCE(variant_code, '') = COALESCE($3, ''))
      AND COALESCE(is_deleted, false) = false
    `,
    [itemNo, locationCode || null, variantCode || null]
  );

  return num(result.rows[0]?.inventory_qty);
}

function componentExpectedQuantity(orderQty, quantityPer, scrapPct) {
  return num(orderQty) * num(quantityPer) * (1 + num(scrapPct) / 100);
}

module.exports = {
  ensureManufacturingSchema,
  ensureInventorySetupNoSeriesColumns,
  getInventorySetupNoSeries,
  getInventoryNoSeriesCode,
  getManufacturingSetup,
  getNextNumberInTransaction,
  getItemInventory,
  componentExpectedQuantity,
  calculateProductionBomLineFields,
  num,
};
