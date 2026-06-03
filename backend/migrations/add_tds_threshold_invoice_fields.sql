ALTER TABLE purchase_invoices
ADD COLUMN IF NOT EXISTS tds_threshold_amount NUMERIC(18,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tds_base_amount NUMERIC(18,2) DEFAULT 0;

ALTER TABLE posted_purchase_invoices
ADD COLUMN IF NOT EXISTS tds_threshold_amount NUMERIC(18,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tds_base_amount NUMERIC(18,2) DEFAULT 0;

ALTER TABLE purchase_invoice_lines
ADD COLUMN IF NOT EXISTS tds_threshold_amount NUMERIC(18,2) DEFAULT 0;

ALTER TABLE posted_purchase_invoice_lines
ADD COLUMN IF NOT EXISTS tds_threshold_amount NUMERIC(18,2) DEFAULT 0;
