const db = require("../db.cjs");
const {
  ensureManufacturingSchema,
  getInventoryNoSeriesCode,
  getManufacturingSetup,
  getNextNumberInTransaction,
  getItemInventory,
  num,
} = require("./manufacturingService.cjs");

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
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return match[0];
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
};

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

async function ensureAssemblySchema(connection = db) {
  await ensureManufacturingSchema(connection);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS assembly_bom_lines (
      id SERIAL PRIMARY KEY,
      parent_item_no VARCHAR(50) NOT NULL,
      line_no INT NOT NULL,
      type VARCHAR(30) DEFAULT 'Item',
      item_no VARCHAR(50) NOT NULL,
      description VARCHAR(150),
      variant_code VARCHAR(50),
      location_code VARCHAR(50),
      quantity_per NUMERIC(12,4) DEFAULT 0,
      unit_of_measure_code VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS assembly_orders (
      id SERIAL PRIMARY KEY,
      document_no VARCHAR(50) UNIQUE NOT NULL,
      item_no VARCHAR(50) NOT NULL,
      description VARCHAR(150),
      quantity NUMERIC(12,2) DEFAULT 0,
      quantity_to_assemble NUMERIC(12,2) DEFAULT 0,
      assembled_quantity NUMERIC(12,2) DEFAULT 0,
      remaining_quantity NUMERIC(12,2) DEFAULT 0,
      unit_of_measure_code VARCHAR(50),
      location_code VARCHAR(50),
      posting_date DATE,
      due_date DATE,
      starting_date DATE,
      ending_date DATE,
      status VARCHAR(30) DEFAULT 'Open',
      assemble_to_order BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS assembly_order_lines (
      id SERIAL PRIMARY KEY,
      document_no VARCHAR(50) NOT NULL,
      line_no INT NOT NULL,
      type VARCHAR(30) DEFAULT 'Item',
      item_no VARCHAR(50) NOT NULL,
      description VARCHAR(150),
      variant_code VARCHAR(50),
      location_code VARCHAR(50),
      quantity_per NUMERIC(12,4) DEFAULT 0,
      quantity_to_consume NUMERIC(12,2) DEFAULT 0,
      consumed_quantity NUMERIC(12,2) DEFAULT 0,
      remaining_quantity NUMERIC(12,2) DEFAULT 0,
      unit_of_measure_code VARCHAR(50),
      available_warning BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS posted_assembly_orders (
      id SERIAL PRIMARY KEY,
      document_no VARCHAR(50) UNIQUE NOT NULL,
      source_assembly_order_no VARCHAR(50),
      item_no VARCHAR(50),
      description VARCHAR(150),
      quantity NUMERIC(12,2),
      assembled_quantity NUMERIC(12,2),
      unit_of_measure_code VARCHAR(50),
      location_code VARCHAR(50),
      posting_date DATE,
      due_date DATE,
      starting_date DATE,
      ending_date DATE,
      status VARCHAR(30) DEFAULT 'Posted',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS posted_assembly_order_lines (
      id SERIAL PRIMARY KEY,
      document_no VARCHAR(50) NOT NULL,
      line_no INT,
      type VARCHAR(30),
      item_no VARCHAR(50),
      description VARCHAR(150),
      variant_code VARCHAR(50),
      location_code VARCHAR(50),
      quantity_per NUMERIC(12,4),
      consumed_quantity NUMERIC(12,2),
      unit_of_measure_code VARCHAR(50)
    )
  `);
}

async function getLookups(connection = db) {
  await ensureAssemblySchema(connection);
  const [items, locations] = await Promise.all([
    connection.query(`
      SELECT item_no, description, base_unit_of_measure, unit_cost, inventory, replenishment_system
      FROM items
      WHERE COALESCE(is_deleted, false) = false
      ORDER BY item_no
    `),
    connection.query(`SELECT code, name AS description FROM locations WHERE COALESCE(is_deleted, false) = false ORDER BY code`),
  ]);
  return { items: items.rows, locations: locations.rows };
}

async function getAssemblyOrder(documentNo, connection = db) {
  const order = await connection.query(
    `SELECT * FROM assembly_orders WHERE document_no = $1 LIMIT 1`,
    [documentNo]
  );
  if (!order.rows[0]) return null;
  const lines = await connection.query(
    `SELECT * FROM assembly_order_lines WHERE document_no = $1 ORDER BY line_no, id`,
    [documentNo]
  );
  return { ...order.rows[0], lines: lines.rows };
}

async function rebuildAssemblyLines(client, order) {
  const bomLines = await client.query(
    `SELECT * FROM assembly_bom_lines WHERE parent_item_no = $1 ORDER BY line_no, id`,
    [order.item_no]
  );
  if (bomLines.rows.length === 0) {
    throw badRequest(`Assembly BOM lines are required for item ${order.item_no}.`);
  }

  await client.query(`DELETE FROM assembly_order_lines WHERE document_no = $1`, [order.document_no]);
  for (const line of bomLines.rows) {
    const qtyToConsume = num(order.quantity_to_assemble) * num(line.quantity_per);
    await client.query(
      `
      INSERT INTO assembly_order_lines (
        document_no,line_no,type,item_no,description,variant_code,location_code,
        quantity_per,quantity_to_consume,consumed_quantity,remaining_quantity,
        unit_of_measure_code,available_warning
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$9,$10,false)
      `,
      [
        order.document_no,
        line.line_no,
        line.type || "Item",
        line.item_no,
        line.description || null,
        line.variant_code || null,
        line.location_code || order.location_code || null,
        num(line.quantity_per),
        qtyToConsume,
        line.unit_of_measure_code || null,
      ]
    );
  }
}

module.exports = {
  ensureAssemblySchema,
  getAssemblyOrder,
  getLookups,
  rebuildAssemblyLines,
  getInventoryNoSeriesCode,
  getManufacturingSetup,
  getNextNumberInTransaction,
  getItemInventory,
  badRequest,
  dateOnly,
  today,
  num,
};
