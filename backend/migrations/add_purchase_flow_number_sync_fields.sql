ALTER TABLE inward_gate_entries
  ADD COLUMN IF NOT EXISTS grn_document_no varchar(50),
  ADD COLUMN IF NOT EXISTS posted_purchase_receipt_id integer;
