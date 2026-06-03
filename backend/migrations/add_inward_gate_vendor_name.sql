ALTER TABLE inward_gate_entries
  ADD COLUMN IF NOT EXISTS vendor_name varchar(255);
