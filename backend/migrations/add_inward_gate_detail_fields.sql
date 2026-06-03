/* =========================================================
   INWARD GATE ENTRY DETAIL FIELDS
   Aligns the detail page with the BC-style IGE card.
========================================================= */

ALTER TABLE public.inward_gate_entries
  ADD COLUMN IF NOT EXISTS entry_type VARCHAR(50) DEFAULT 'Inward',
  ADD COLUMN IF NOT EXISTS vehicle_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS challan_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS lr_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS lr_date DATE,
  ADD COLUMN IF NOT EXISTS description TEXT;

UPDATE public.inward_gate_entries
SET entry_type = COALESCE(entry_type, 'Inward')
WHERE entry_type IS NULL;

ALTER TABLE public.inward_gate_entry_lines
  ADD COLUMN IF NOT EXISTS first_weight NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS second_weight NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_quantity NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vendor_weight NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS excess_weight NUMERIC(18,2) DEFAULT 0;

UPDATE public.inward_gate_entry_lines
SET
  first_weight = COALESCE(first_weight, 0),
  second_weight = COALESCE(second_weight, 0),
  net_quantity = COALESCE(net_quantity, received_quantity, 0),
  vendor_weight = COALESCE(vendor_weight, 0),
  excess_weight = COALESCE(excess_weight, 0);
