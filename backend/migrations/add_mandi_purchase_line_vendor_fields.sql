/* =========================================================
   MANDI PURCHASE LINE VENDOR FIELDS
   The Mandi Purchase details page tracks a Mandi Vendor per line.
========================================================= */

ALTER TABLE public.mandi_purchase_line
  ADD COLUMN IF NOT EXISTS mandi_vendor_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS mandi_vendor_name VARCHAR(255);
