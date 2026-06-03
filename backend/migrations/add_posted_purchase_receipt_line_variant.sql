ALTER TABLE posted_purchase_receipt_lines
  ADD COLUMN IF NOT EXISTS variant_code varchar(100);
