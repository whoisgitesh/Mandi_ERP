UPDATE inward_gate_entry_lines
SET
  actual_quantity = CASE
    WHEN COALESCE(qty_per_bag, 0) <> 0 OR COALESCE(receive_bags, 0) <> 0
      THEN COALESCE(qty_per_bag, 0) * COALESCE(receive_bags, 0)
    ELSE COALESCE(actual_quantity, received_quantity, 0)
  END,
  received_quantity = CASE
    WHEN COALESCE(qty_per_bag, 0) <> 0 OR COALESCE(receive_bags, 0) <> 0
      THEN COALESCE(qty_per_bag, 0) * COALESCE(receive_bags, 0)
    ELSE COALESCE(received_quantity, actual_quantity, 0)
  END,
  net_quantity = COALESCE(first_weight, 0) - COALESCE(second_weight, 0),
  excess_weight = (COALESCE(first_weight, 0) - COALESCE(second_weight, 0)) - COALESCE(bill_quantity, 0),
  balance_quantity = COALESCE(po_quantity, 0) - CASE
    WHEN (COALESCE(first_weight, 0) - COALESCE(second_weight, 0)) <> 0
      THEN COALESCE(first_weight, 0) - COALESCE(second_weight, 0)
    WHEN COALESCE(bill_quantity, 0) <> 0
      THEN COALESCE(bill_quantity, 0)
    WHEN COALESCE(qty_per_bag, 0) <> 0 OR COALESCE(receive_bags, 0) <> 0
      THEN COALESCE(qty_per_bag, 0) * COALESCE(receive_bags, 0)
    ELSE COALESCE(actual_quantity, received_quantity, 0)
  END
WHERE COALESCE(is_deleted, false) = false;
