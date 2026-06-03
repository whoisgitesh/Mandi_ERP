ALTER TABLE purchase_order_lines
ADD COLUMN IF NOT EXISTS qty_to_invoice NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS qty_invoiced NUMERIC(12,2) DEFAULT 0;

ALTER TABLE mandi_purchase
ADD COLUMN IF NOT EXISTS location_code VARCHAR(30);

ALTER TABLE posted_purchase_receipt_lines
ADD COLUMN IF NOT EXISTS source_purchase_order_line_id INTEGER;

ALTER TABLE purchase_invoice_lines
ADD COLUMN IF NOT EXISTS source_purchase_order_line_id INTEGER;

ALTER TABLE posted_purchase_invoice_lines
ADD COLUMN IF NOT EXISTS source_purchase_order_line_id INTEGER;

UPDATE purchase_order_lines
SET
  qty_invoiced = COALESCE(qty_invoiced, 0),
  qty_to_invoice = GREATEST(COALESCE(received_quantity, 0) - COALESCE(qty_invoiced, 0), 0)
WHERE qty_to_invoice IS NULL
   OR qty_invoiced IS NULL;
