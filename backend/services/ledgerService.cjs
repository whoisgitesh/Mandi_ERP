const num = (value) => {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }

  return Number(value);
};

const blankToNull = (value) =>
  value === "" ? null : value ?? null;

const ensureLedgerTables = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS vendor_ledger_entries (
      entry_no SERIAL PRIMARY KEY,
      vendor_no VARCHAR(50) NOT NULL,
      vendor_name VARCHAR(150),
      document_no VARCHAR(50) NOT NULL,
      document_type VARCHAR(30) NOT NULL,
      posting_date DATE NOT NULL,
      due_date DATE,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      remaining_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      currency_code VARCHAR(20),
      open BOOLEAN DEFAULT TRUE,
      source_code VARCHAR(50) DEFAULT 'PURCHASE',
      external_document_no VARCHAR(100),
      challan_no VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT vendor_ledger_entries_document_unique
        UNIQUE (document_no, document_type, source_code)
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS customer_ledger_entries (
      entry_no SERIAL PRIMARY KEY,
      customer_no VARCHAR(50) NOT NULL,
      customer_name VARCHAR(150),
      document_no VARCHAR(50) NOT NULL,
      document_type VARCHAR(30) NOT NULL,
      posting_date DATE NOT NULL,
      due_date DATE,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      remaining_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      currency_code VARCHAR(20),
      open BOOLEAN DEFAULT TRUE,
      source_code VARCHAR(50) DEFAULT 'SALES',
      external_document_no VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT customer_ledger_entries_document_unique
        UNIQUE (document_no, document_type, source_code)
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_vendor_ledger_entries_vendor_no
      ON vendor_ledger_entries(vendor_no)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_vendor_ledger_entries_document_no
      ON vendor_ledger_entries(document_no)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_vendor_ledger_entries_posting_date
      ON vendor_ledger_entries(posting_date)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_vendor_ledger_entries_open
      ON vendor_ledger_entries(open)
  `);

  await client.query(`
    ALTER TABLE vendor_ledger_entries
    ADD COLUMN IF NOT EXISTS gross_invoice_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS tds_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS net_payable_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS currency_code VARCHAR(20)
  `);

  await client.query(`
    ALTER TABLE customer_ledger_entries
    ADD COLUMN IF NOT EXISTS currency_code VARCHAR(20)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_customer_ledger_entries_customer_no
      ON customer_ledger_entries(customer_no)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_customer_ledger_entries_document_no
      ON customer_ledger_entries(document_no)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_customer_ledger_entries_posting_date
      ON customer_ledger_entries(posting_date)
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_customer_ledger_entries_open
      ON customer_ledger_entries(open)
  `);
};

const createVendorLedgerEntryForPostedInvoice = async (
  client,
  postedInvoice
) => {
  await ensureLedgerTables(client);

  const amount =
    num(postedInvoice.net_payable_amount) ||
    num(postedInvoice.amount_including_tax) ||
    num(postedInvoice.total_amount);

  if (amount <= 0) {
    throw new Error(
      "Posted Purchase Invoice amount must be greater than 0 to create Vendor Ledger Entry"
    );
  }

  await client.query(
    `
    INSERT INTO vendor_ledger_entries (
      vendor_no,
      vendor_name,
      document_no,
      document_type,
      posting_date,
      due_date,
      amount,
      remaining_amount,
      currency_code,
      open,
      source_code,
      external_document_no,
      challan_no,
      gross_invoice_amount,
      tds_amount,
      net_payable_amount
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$7,$8,true,
      'PURCHASE',$9,$10,$11,$12,$13
    )
    ON CONFLICT (document_no, document_type, source_code)
    DO NOTHING
    `,
    [
      postedInvoice.vendor_no,
      blankToNull(postedInvoice.vendor_name),
      postedInvoice.document_no,
      "Invoice",
      postedInvoice.posting_date,
      postedInvoice.due_date || postedInvoice.posting_date,
      amount,
      blankToNull(postedInvoice.currency_code) || "INR",
      blankToNull(postedInvoice.vendor_invoice_no),
      blankToNull(postedInvoice.challan_no),
      num(postedInvoice.amount_including_tax) ||
        num(postedInvoice.total_incl_vat) ||
        num(postedInvoice.total_amount),
      num(postedInvoice.tds_amount) ||
        num(postedInvoice.total_tds_amount),
      amount,
    ]
  );
};

const createCustomerLedgerEntryForPostedInvoice = async (
  client,
  postedInvoice
) => {
  await ensureLedgerTables(client);

  const amount =
    num(postedInvoice.amount_including_tax) ||
    num(postedInvoice.total_incl_vat) ||
    (
      num(postedInvoice.total_amount) +
      num(
        postedInvoice.total_tax_amount ??
        postedInvoice.total_tax
      )
    );

  if (amount <= 0) {
    throw new Error(
      "Posted Sales Invoice amount must be greater than 0 to create Customer Ledger Entry"
    );
  }

  await client.query(
    `
    INSERT INTO customer_ledger_entries (
      customer_no,
      customer_name,
      document_no,
      document_type,
      posting_date,
      due_date,
      amount,
      remaining_amount,
      currency_code,
      open,
      source_code,
      external_document_no
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$7,$8,true,
      'SALES',$9
    )
    ON CONFLICT (document_no, document_type, source_code)
    DO NOTHING
    `,
    [
      postedInvoice.customer_no,
      blankToNull(postedInvoice.customer_name),
      postedInvoice.document_no,
      "Invoice",
      postedInvoice.posting_date,
      postedInvoice.due_date || postedInvoice.posting_date,
      amount,
      blankToNull(postedInvoice.currency_code) || "INR",
      blankToNull(postedInvoice.external_document_no),
    ]
  );
};

module.exports = {
  ensureLedgerTables,
  createVendorLedgerEntryForPostedInvoice,
  createCustomerLedgerEntryForPostedInvoice,
};
