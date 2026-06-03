const db = require("../db.cjs");

const {
  getInventoryNoSeriesCode,
  getNextNumberInTransaction,
  ensureInventorySetupNoSeriesColumns,
} = require("./manufacturingService.cjs");

async function ensureReversalSchema(connection = db) {
  await ensureInventorySetupNoSeriesColumns(connection);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS reversal_entries (
      entry_no SERIAL PRIMARY KEY,
      reversal_no VARCHAR(50) UNIQUE NOT NULL,
      reversal_type VARCHAR(50) NOT NULL,
      source_document_type VARCHAR(80) NOT NULL,
      source_document_no VARCHAR(50) NOT NULL,
      source_line_no INT,
      source_entry_no INT,
      item_no VARCHAR(50),
      description VARCHAR(150),
      variant_code VARCHAR(50),
      location_code VARCHAR(50),
      unit_of_measure_code VARCHAR(50),
      original_quantity NUMERIC(12,2) DEFAULT 0,
      reversal_quantity NUMERIC(12,2) DEFAULT 0,
      original_entry_type VARCHAR(50),
      reversal_entry_type VARCHAR(50),
      original_document_type VARCHAR(80),
      reversal_document_type VARCHAR(80),
      original_item_ledger_entry_no INT,
      reversal_item_ledger_entry_no INT,
      reason TEXT,
      posting_date DATE,
      reversed_by VARCHAR(100),
      reversed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(30) DEFAULT 'Posted',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE INDEX IF NOT EXISTS idx_reversal_entries_source
    ON reversal_entries(source_document_type, source_document_no)
  `);

  await connection.query(`
    ALTER TABLE inventory_setup
    ADD COLUMN IF NOT EXISTS reversal_entry_nos VARCHAR(50)
  `);

  await connection.query(`
    UPDATE inventory_setup
    SET reversal_entry_nos = COALESCE(NULLIF(reversal_entry_nos, ''), 'REVERSAL_ENTRY')
    WHERE id = (SELECT id FROM inventory_setup ORDER BY id LIMIT 1)
  `);

  await connection.query(`
    ALTER TABLE item_ledger_entries
    ADD COLUMN IF NOT EXISTS is_reversal BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS reversed_entry_no INT,
    ADD COLUMN IF NOT EXISTS reversal_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS source_posted_document_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS reversal_reason TEXT
  `);
}

async function getNextReversalNo(client) {
  await ensureReversalSchema(client);

  const seriesCode = await getInventoryNoSeriesCode(
    client,
    "reversal_entry_nos",
    "REVERSAL_ENTRY"
  );

  return getNextNumberInTransaction(client, seriesCode);
}

async function insertReversalEntry(client, payload) {
  await ensureReversalSchema(client);

  const result = await client.query(
    `
    INSERT INTO reversal_entries (
      reversal_no,
      reversal_type,
      source_document_type,
      source_document_no,
      source_line_no,
      source_entry_no,
      item_no,
      description,
      variant_code,
      location_code,
      unit_of_measure_code,
      original_quantity,
      reversal_quantity,
      original_entry_type,
      reversal_entry_type,
      original_document_type,
      reversal_document_type,
      original_item_ledger_entry_no,
      reversal_item_ledger_entry_no,
      reason,
      posting_date,
      reversed_by,
      status
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,$17,$18,
      $19,$20,$21,$22,COALESCE($23, 'Posted')
    )
    RETURNING *
    `,
    [
      payload.reversal_no,
      payload.reversal_type,
      payload.source_document_type,
      payload.source_document_no,
      payload.source_line_no ?? null,
      payload.source_entry_no ?? null,
      payload.item_no ?? null,
      payload.description ?? null,
      payload.variant_code ?? null,
      payload.location_code ?? null,
      payload.unit_of_measure_code ?? null,
      payload.original_quantity ?? 0,
      payload.reversal_quantity ?? 0,
      payload.original_entry_type ?? null,
      payload.reversal_entry_type ?? null,
      payload.original_document_type ?? null,
      payload.reversal_document_type ?? null,
      payload.original_item_ledger_entry_no ?? null,
      payload.reversal_item_ledger_entry_no ?? null,
      payload.reason ?? null,
      payload.posting_date ?? null,
      payload.reversed_by ?? null,
      payload.status ?? "Posted",
    ]
  );

  return result.rows[0];
}

module.exports = {
  ensureReversalSchema,
  getNextReversalNo,
  insertReversalEntry,
};
