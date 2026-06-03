ALTER TABLE public.inward_gate_entry_lines
  ADD COLUMN IF NOT EXISTS first_weight NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS second_weight NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_quantity NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS excess_weight NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bill_quantity NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qty_per_bag NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS receive_bags NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_quantity NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_quantity NUMERIC(18,2) DEFAULT 0;

UPDATE public.inward_gate_entry_lines
SET
  bill_quantity = COALESCE(NULLIF(bill_quantity, 0), received_quantity, 0),
  actual_quantity = CASE
    WHEN COALESCE(qty_per_bag, 0) <> 0 OR COALESCE(receive_bags, 0) <> 0
      THEN COALESCE(qty_per_bag, 0) * COALESCE(receive_bags, 0)
    ELSE COALESCE(actual_quantity, received_quantity, 0)
  END,
  net_quantity = COALESCE(first_weight, 0) - COALESCE(second_weight, 0),
  excess_weight = CASE
    WHEN COALESCE(qty_per_bag, 0) <> 0 OR COALESCE(receive_bags, 0) <> 0
      THEN (COALESCE(qty_per_bag, 0) * COALESCE(receive_bags, 0)) - COALESCE(bill_quantity, 0)
    ELSE COALESCE(actual_quantity, received_quantity, 0) - COALESCE(bill_quantity, 0)
  END,
  balance_quantity = COALESCE(po_quantity, 0) - CASE
    WHEN COALESCE(qty_per_bag, 0) <> 0 OR COALESCE(receive_bags, 0) <> 0
      THEN COALESCE(qty_per_bag, 0) * COALESCE(receive_bags, 0)
    ELSE COALESCE(actual_quantity, received_quantity, 0)
  END;
