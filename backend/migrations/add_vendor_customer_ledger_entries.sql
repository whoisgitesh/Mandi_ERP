CREATE TABLE IF NOT EXISTS public.vendor_ledger_entries (
  entry_no SERIAL PRIMARY KEY,
  vendor_no VARCHAR(50) NOT NULL,
  vendor_name VARCHAR(150),
  document_no VARCHAR(50) NOT NULL,
  document_type VARCHAR(30) NOT NULL,
  posting_date DATE NOT NULL,
  due_date DATE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  open BOOLEAN DEFAULT TRUE,
  source_code VARCHAR(50) DEFAULT 'PURCHASE',
  external_document_no VARCHAR(100),
  challan_no VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT vendor_ledger_entries_document_unique
    UNIQUE (document_no, document_type, source_code)
);

CREATE TABLE IF NOT EXISTS public.customer_ledger_entries (
  entry_no SERIAL PRIMARY KEY,
  customer_no VARCHAR(50) NOT NULL,
  customer_name VARCHAR(150),
  document_no VARCHAR(50) NOT NULL,
  document_type VARCHAR(30) NOT NULL,
  posting_date DATE NOT NULL,
  due_date DATE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  open BOOLEAN DEFAULT TRUE,
  source_code VARCHAR(50) DEFAULT 'SALES',
  external_document_no VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT customer_ledger_entries_document_unique
    UNIQUE (document_no, document_type, source_code)
);

CREATE INDEX IF NOT EXISTS idx_vendor_ledger_entries_vendor_no
  ON public.vendor_ledger_entries(vendor_no);

CREATE INDEX IF NOT EXISTS idx_vendor_ledger_entries_document_no
  ON public.vendor_ledger_entries(document_no);

CREATE INDEX IF NOT EXISTS idx_vendor_ledger_entries_posting_date
  ON public.vendor_ledger_entries(posting_date);

CREATE INDEX IF NOT EXISTS idx_vendor_ledger_entries_open
  ON public.vendor_ledger_entries(open);

CREATE INDEX IF NOT EXISTS idx_customer_ledger_entries_customer_no
  ON public.customer_ledger_entries(customer_no);

CREATE INDEX IF NOT EXISTS idx_customer_ledger_entries_document_no
  ON public.customer_ledger_entries(document_no);

CREATE INDEX IF NOT EXISTS idx_customer_ledger_entries_posting_date
  ON public.customer_ledger_entries(posting_date);

CREATE INDEX IF NOT EXISTS idx_customer_ledger_entries_open
  ON public.customer_ledger_entries(open);
