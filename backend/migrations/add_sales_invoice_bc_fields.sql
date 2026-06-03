/* =========================================================
   SALES INVOICE BC-STYLE HEADER + LINE FIELDS
========================================================= */

ALTER TABLE public.sales_invoice
  ADD COLUMN IF NOT EXISTS bill_to_customer_no VARCHAR(30),
  ADD COLUMN IF NOT EXISTS bill_to_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0;

ALTER TABLE public.sales_invoice_line
  ADD COLUMN IF NOT EXISTS shipment_no VARCHAR(30),
  ADD COLUMN IF NOT EXISTS shipment_line_no INTEGER,
  ADD COLUMN IF NOT EXISTS type VARCHAR(30) DEFAULT 'Item',
  ADD COLUMN IF NOT EXISTS quantity_shipped NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_invoiced NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_to_invoice NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_qty NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0;

ALTER TABLE public.posted_sales_invoice_lines
  ADD COLUMN IF NOT EXISTS shipment_no VARCHAR(30),
  ADD COLUMN IF NOT EXISTS shipment_line_no INTEGER,
  ADD COLUMN IF NOT EXISTS type VARCHAR(30) DEFAULT 'Item',
  ADD COLUMN IF NOT EXISTS quantity_shipped NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_invoiced NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_to_invoice NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_qty NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0;

ALTER TABLE public.posted_sales_invoices
  ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0;
