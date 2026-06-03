ALTER TABLE public.inward_gate_entry_lines
  ADD COLUMN IF NOT EXISTS gate_quantity NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qc_quantity NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accepted_quantity NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_amount NUMERIC(18,2) DEFAULT 0;

UPDATE public.inward_gate_entry_lines l
SET
  gate_quantity = COALESCE(NULLIF(l.gate_quantity, 0), NULLIF(l.actual_quantity, 0), NULLIF(l.net_quantity, 0), l.received_quantity, 0),
  accepted_quantity = COALESCE(NULLIF(l.accepted_quantity, 0), NULLIF(l.received_quantity, 0), NULLIF(l.actual_quantity, 0), 0),
  qc_quantity = COALESCE(NULLIF(l.qc_quantity, 0), NULLIF(l.received_quantity, 0), NULLIF(l.actual_quantity, 0), 0),
  unit_cost = COALESCE(NULLIF(l.unit_cost, 0), pol.direct_unit_cost_excl_vat, 0),
  line_amount = COALESCE(NULLIF(l.accepted_quantity, 0), NULLIF(l.received_quantity, 0), NULLIF(l.actual_quantity, 0), 0)
    * COALESCE(NULLIF(l.unit_cost, 0), pol.direct_unit_cost_excl_vat, 0)
FROM public.purchase_order_lines pol
WHERE pol.id = l.po_line_id;

UPDATE public.inward_gate_entry_lines
SET
  gate_quantity = COALESCE(NULLIF(gate_quantity, 0), NULLIF(actual_quantity, 0), NULLIF(net_quantity, 0), received_quantity, 0),
  accepted_quantity = COALESCE(NULLIF(accepted_quantity, 0), NULLIF(received_quantity, 0), NULLIF(actual_quantity, 0), 0),
  qc_quantity = COALESCE(NULLIF(qc_quantity, 0), NULLIF(received_quantity, 0), NULLIF(actual_quantity, 0), 0),
  line_amount = COALESCE(accepted_quantity, 0) * COALESCE(unit_cost, 0)
WHERE po_line_id IS NULL;

ALTER TABLE public.posted_purchase_receipt_lines
  ADD COLUMN IF NOT EXISTS qc_quantity NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accepted_quantity NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejected_quantity NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_amount NUMERIC(18,2) DEFAULT 0;
