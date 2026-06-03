INSERT INTO item_ledger_entries (
  posting_date,
  entry_type,
  document_type,
  document_no,
  item_no,
  description,
  location_code,
  variant_code,
  unit_of_measure_code,
  quantity,
  invoiced_quantity,
  remaining_quantity,
  unit_price,
  unit_cost,
  sales_amount,
  cost_amount,
  vendor_no,
  vendor_name,
  open,
  source_table,
  source_id,
  source_line_id
)
SELECT
  ppr.posting_date,
  'Purchase',
  'Purchase Receipt',
  ppr.document_no,
  line.item_no,
  line.item_description,
  ppr.location_code,
  NULL,
  NULL,
  COALESCE(line.quantity_received, 0),
  COALESCE(line.quantity_received, 0),
  COALESCE(line.quantity_received, 0),
  0,
  0,
  0,
  0,
  ppr.vendor_no,
  v.name,
  true,
  'posted_purchase_receipt_lines',
  ppr.id,
  line.id
FROM posted_purchase_receipts ppr
JOIN posted_purchase_receipt_lines line
  ON line.posted_purchase_receipt_id = ppr.id
LEFT JOIN vendors v
  ON v.vendor_no = ppr.vendor_no
WHERE COALESCE(ppr.is_deleted, false) = false
  AND COALESCE(line.is_deleted, false) = false
  AND NOT EXISTS (
    SELECT 1
    FROM item_ledger_entries ile
    WHERE ile.source_table = 'posted_purchase_receipt_lines'
      AND ile.source_line_id = line.id
  );
