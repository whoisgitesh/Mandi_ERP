ALTER TABLE inward_gate_entries
  ADD COLUMN IF NOT EXISTS vendor_gst_reg_no varchar(50);
