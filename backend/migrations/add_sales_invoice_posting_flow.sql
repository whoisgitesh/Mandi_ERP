/* =========================================================
   SALES INVOICE -> POSTED SALES INVOICE FLOW
   Non-financial implementation: no G/L, receivables ledger,
   tax ledger, or posting groups.
========================================================= */

INSERT INTO public.number_series (code, description)
VALUES
  ('SALES_INVOICE', 'Sales Invoice Nos'),
  ('POSTED_SALES_INVOICE', 'Posted Sales Invoice Nos')
ON CONFLICT (code)
DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

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
    ('SALES_INVOICE', 'SI-00001', 'SI-99999'),
    ('POSTED_SALES_INVOICE', 'PSI-00001', 'PSI-99999')
) AS seed(code, starting_no, ending_no)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.no_series_lines nsl
  WHERE nsl.no_series_code = seed.code
);

UPDATE public.sales_receivables_setup
SET
  invoice_nos = COALESCE(NULLIF(invoice_nos, ''), 'SALES_INVOICE'),
  posted_invoice_nos = COALESCE(NULLIF(posted_invoice_nos, ''), 'POSTED_SALES_INVOICE')
WHERE id IN (
  SELECT id
  FROM public.sales_receivables_setup
  ORDER BY id
  LIMIT 1
);

ALTER TABLE public.sales_invoice
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS location_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS customer_gst_reg_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gst_customer_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS salesperson_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS external_document_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS discount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS narration TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS address_2 TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS post_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS country_region_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS contact VARCHAR(100),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS payment_terms_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_method_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS total_tax NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_sales_order_id INTEGER,
  ADD COLUMN IF NOT EXISTS posted_sales_invoice_id INTEGER;

ALTER TABLE public.sales_invoice_line
  ADD COLUMN IF NOT EXISTS variant_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS location_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS unit_of_measure_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS line_discount_pct NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(50);

CREATE TABLE IF NOT EXISTS public.posted_sales_invoices (
  id SERIAL PRIMARY KEY,
  document_no VARCHAR(30) UNIQUE NOT NULL,
  customer_no VARCHAR(30),
  customer_name VARCHAR(255),
  posting_date DATE DEFAULT CURRENT_DATE,
  document_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  location_code VARCHAR(30),
  customer_gst_reg_no VARCHAR(50),
  external_document_no VARCHAR(100),
  source_sales_invoice_id INTEGER,
  source_sales_order_id INTEGER,
  total_amount NUMERIC(18,2) DEFAULT 0,
  total_tax NUMERIC(18,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'Posted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT,
  posted_by TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  CONSTRAINT fk_posted_sales_invoice_source
    FOREIGN KEY (source_sales_invoice_id)
    REFERENCES public.sales_invoice(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_posted_sales_invoice_order
    FOREIGN KEY (source_sales_order_id)
    REFERENCES public.sales_orders(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.posted_sales_invoice_lines (
  id SERIAL PRIMARY KEY,
  posted_sales_invoice_id INTEGER NOT NULL,
  line_no INTEGER,
  item_no VARCHAR(30),
  item_description TEXT,
  variant_code VARCHAR(30),
  location_code VARCHAR(30),
  unit_of_measure_code VARCHAR(20),
  quantity_invoiced NUMERIC(18,2) DEFAULT 0,
  unit_price NUMERIC(18,2) DEFAULT 0,
  line_discount_pct NUMERIC(18,2) DEFAULT 0,
  line_amount NUMERIC(18,2) DEFAULT 0,
  tax_pct NUMERIC(18,2) DEFAULT 0,
  tax_amount NUMERIC(18,2) DEFAULT 0,
  hsn_sac_code VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  CONSTRAINT fk_posted_sales_invoice_line_header
    FOREIGN KEY (posted_sales_invoice_id)
    REFERENCES public.posted_sales_invoices(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_posted_sales_invoices_document_no
ON public.posted_sales_invoices(document_no);

CREATE INDEX IF NOT EXISTS idx_posted_sales_invoice_lines_header
ON public.posted_sales_invoice_lines(posted_sales_invoice_id);
