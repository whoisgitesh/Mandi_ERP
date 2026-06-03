ALTER TABLE posted_purchase_receipts
  ADD COLUMN IF NOT EXISTS vendor_name text;

UPDATE posted_purchase_receipts ppr
SET vendor_name = v.name
FROM vendors v
WHERE ppr.vendor_no = v.vendor_no
  AND ppr.vendor_name IS NULL;
