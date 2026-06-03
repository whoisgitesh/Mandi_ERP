/* =========================================================
   PURCHASE INVOICE FLOW
   Posted Purchase Receipt -> Purchase Invoice -> Posted Purchase Invoice
   Non-financial implementation: no G/L, tax, posting groups, or payables ledger.
========================================================= */

INSERT INTO public.number_series (code, description)
VALUES
  ('PURCHASE_INVOICE', 'Purchase Invoice Nos'),
  ('POSTED_PURCHASE_INVOICE', 'Posted Purchase Invoice Nos')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.no_series_lines (
  no_series_code,
  starting_date,
  starting_no,
  ending_no,
  last_no_used,
  increment_by,
  open,
  allow_gaps,
  sequence_no
)
SELECT
  seed.code,
  CURRENT_DATE,
  seed.starting_no,
  seed.ending_no,
  NULL,
  1,
  true,
  false,
  1
FROM (
  VALUES
    ('PURCHASE_INVOICE', 'PI-00001', 'PI-99999'),
    ('POSTED_PURCHASE_INVOICE', 'PPI-00001', 'PPI-99999')
) AS seed(code, starting_no, ending_no)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.no_series_lines nsl
  WHERE nsl.no_series_code = seed.code
);

UPDATE public.purchase_payables_setup
SET
  invoice_nos = COALESCE(NULLIF(invoice_nos, ''), 'PURCHASE_INVOICE'),
  posted_invoice_nos = COALESCE(NULLIF(posted_invoice_nos, ''), 'POSTED_PURCHASE_INVOICE')
WHERE id IN (
  SELECT id
  FROM public.purchase_payables_setup
  ORDER BY id
  LIMIT 1
);

CREATE TABLE IF NOT EXISTS public.purchase_invoices (
  id SERIAL PRIMARY KEY,
  document_no VARCHAR(30) UNIQUE NOT NULL,
  vendor_no VARCHAR(30),
  vendor_name TEXT,
  vendor_invoice_no VARCHAR(100),
  vendor_invoice_date DATE,
  posting_date DATE DEFAULT CURRENT_DATE,
  document_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  location_code VARCHAR(30),
  challan_no VARCHAR(100),
  source_posted_purchase_receipt_id INTEGER,
  source_purchase_order_id INTEGER,
  source_inward_gate_entry_id INTEGER,
  source_grn_no VARCHAR(30),
  status VARCHAR(30) DEFAULT 'Open',
  total_amount NUMERIC(18,2) DEFAULT 0,
  posted_purchase_invoice_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  posted_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE,
  CONSTRAINT fk_purchase_invoice_vendor
    FOREIGN KEY (vendor_no)
    REFERENCES public.vendors(vendor_no),
  CONSTRAINT fk_purchase_invoice_location
    FOREIGN KEY (location_code)
    REFERENCES public.locations(code),
  CONSTRAINT fk_purchase_invoice_receipt
    FOREIGN KEY (source_posted_purchase_receipt_id)
    REFERENCES public.posted_purchase_receipts(id),
  CONSTRAINT fk_purchase_invoice_po
    FOREIGN KEY (source_purchase_order_id)
    REFERENCES public.purchase_orders(id),
  CONSTRAINT fk_purchase_invoice_ige
    FOREIGN KEY (source_inward_gate_entry_id)
    REFERENCES public.inward_gate_entries(id)
);

CREATE TABLE IF NOT EXISTS public.purchase_invoice_lines (
  id SERIAL PRIMARY KEY,
  purchase_invoice_id INTEGER NOT NULL,
  source_posted_purchase_receipt_line_id INTEGER,
  line_no INTEGER,
  item_no VARCHAR(30),
  variant_code VARCHAR(30),
  item_description TEXT,
  location_code VARCHAR(30),
  uom_code VARCHAR(30),
  quantity_received NUMERIC(18,2) DEFAULT 0,
  quantity_invoiced NUMERIC(18,2) DEFAULT 0,
  qty_to_invoice NUMERIC(18,2) DEFAULT 0,
  direct_unit_cost NUMERIC(18,2) DEFAULT 0,
  line_discount_pct NUMERIC(18,2) DEFAULT 0,
  line_amount NUMERIC(18,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'Open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  CONSTRAINT fk_purchase_invoice_line_header
    FOREIGN KEY (purchase_invoice_id)
    REFERENCES public.purchase_invoices(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_purchase_invoice_line_receipt_line
    FOREIGN KEY (source_posted_purchase_receipt_line_id)
    REFERENCES public.posted_purchase_receipt_lines(id)
);

CREATE TABLE IF NOT EXISTS public.posted_purchase_invoices (
  id SERIAL PRIMARY KEY,
  document_no VARCHAR(30) UNIQUE NOT NULL,
  source_purchase_invoice_id INTEGER,
  source_purchase_invoice_no VARCHAR(30),
  vendor_no VARCHAR(30),
  vendor_name TEXT,
  vendor_invoice_no VARCHAR(100),
  vendor_invoice_date DATE,
  posting_date DATE,
  document_date DATE,
  due_date DATE,
  location_code VARCHAR(30),
  challan_no VARCHAR(100),
  source_posted_purchase_receipt_id INTEGER,
  source_purchase_order_id INTEGER,
  source_inward_gate_entry_id INTEGER,
  source_grn_no VARCHAR(30),
  total_amount NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  CONSTRAINT fk_posted_purchase_invoice_source
    FOREIGN KEY (source_purchase_invoice_id)
    REFERENCES public.purchase_invoices(id)
);

CREATE TABLE IF NOT EXISTS public.posted_purchase_invoice_lines (
  id SERIAL PRIMARY KEY,
  posted_purchase_invoice_id INTEGER NOT NULL,
  source_purchase_invoice_line_id INTEGER,
  source_posted_purchase_receipt_line_id INTEGER,
  line_no INTEGER,
  item_no VARCHAR(30),
  variant_code VARCHAR(30),
  item_description TEXT,
  location_code VARCHAR(30),
  uom_code VARCHAR(30),
  quantity_received NUMERIC(18,2) DEFAULT 0,
  quantity_invoiced NUMERIC(18,2) DEFAULT 0,
  direct_unit_cost NUMERIC(18,2) DEFAULT 0,
  line_discount_pct NUMERIC(18,2) DEFAULT 0,
  line_amount NUMERIC(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  CONSTRAINT fk_posted_purchase_invoice_line_header
    FOREIGN KEY (posted_purchase_invoice_id)
    REFERENCES public.posted_purchase_invoices(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_document_no
ON public.purchase_invoices(document_no);

CREATE INDEX IF NOT EXISTS idx_purchase_invoice_lines_header
ON public.purchase_invoice_lines(purchase_invoice_id);

CREATE INDEX IF NOT EXISTS idx_posted_purchase_invoices_document_no
ON public.posted_purchase_invoices(document_no);

CREATE INDEX IF NOT EXISTS idx_posted_purchase_invoice_lines_header
ON public.posted_purchase_invoice_lines(posted_purchase_invoice_id);
