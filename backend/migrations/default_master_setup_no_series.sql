UPDATE sales_receivables_setup
SET
  customer_nos = COALESCE(NULLIF(customer_nos, ''), 'CUST'),
  quote_nos = COALESCE(NULLIF(quote_nos, ''), 'SALES_QUOTE'),
  blanket_order_nos = COALESCE(NULLIF(blanket_order_nos, ''), 'SALES_BLANKET_ORDER'),
  order_nos = COALESCE(NULLIF(order_nos, ''), 'SALES_ORDER'),
  return_order_nos = COALESCE(NULLIF(return_order_nos, ''), 'SALES_RETURN_ORDER'),
  invoice_nos = COALESCE(NULLIF(invoice_nos, ''), 'SALES_INVOICE'),
  posted_invoice_nos = COALESCE(NULLIF(posted_invoice_nos, ''), 'POSTED_SALES_INVOICE'),
  credit_memo_nos = COALESCE(NULLIF(credit_memo_nos, ''), 'SALES_CREDIT_MEMO'),
  posted_credit_memo_nos = COALESCE(NULLIF(posted_credit_memo_nos, ''), 'POSTED_SALES_CREDIT_MEMO'),
  shipment_nos = COALESCE(NULLIF(shipment_nos, ''), 'SALES_SHIPMENT'),
  posted_shipment_nos = COALESCE(NULLIF(posted_shipment_nos, ''), 'POSTED_SALES_SHIPMENT'),
  posted_return_receipt_nos = COALESCE(NULLIF(posted_return_receipt_nos, ''), 'POSTED_RETURN_RECEIPT'),
  updated_at = now();

UPDATE purchase_payables_setup
SET
  vendor_nos = COALESCE(NULLIF(vendor_nos, ''), 'VENDOR'),
  quote_nos = COALESCE(NULLIF(quote_nos, ''), 'PURCHASE_QUOTE'),
  blanket_order_nos = COALESCE(NULLIF(blanket_order_nos, ''), 'PURCHASE_BLANKET_ORDER'),
  order_nos = COALESCE(NULLIF(order_nos, ''), 'PURCHASE_ORDER'),
  purchase_order_nos = COALESCE(NULLIF(purchase_order_nos, ''), 'PURCHASE_ORDER'),
  return_order_nos = COALESCE(NULLIF(return_order_nos, ''), 'PURCHASE_RETURN_ORDER'),
  invoice_nos = COALESCE(NULLIF(invoice_nos, ''), 'PURCHASE_INVOICE'),
  posted_invoice_nos = COALESCE(NULLIF(posted_invoice_nos, ''), 'POSTED_PURCHASE_INVOICE'),
  credit_memo_nos = COALESCE(NULLIF(credit_memo_nos, ''), 'PURCHASE_CREDIT_MEMO'),
  posted_credit_memo_nos = COALESCE(NULLIF(posted_credit_memo_nos, ''), 'POSTED_PURCHASE_CREDIT_MEMO'),
  posted_receipt_nos = COALESCE(NULLIF(posted_receipt_nos, ''), 'POSTED_PURCHASE_RECEIPT'),
  posted_return_shipment_nos = COALESCE(NULLIF(posted_return_shipment_nos, ''), 'POSTED_RETURN_SHIPMENT'),
  mandi_purchase_nos = COALESCE(NULLIF(mandi_purchase_nos, ''), 'MANDI_PURCHASE'),
  mandi_vendor_nos = COALESCE(NULLIF(mandi_vendor_nos, ''), 'MANDI_VENDOR'),
  inward_gate_entry_nos = COALESCE(NULLIF(inward_gate_entry_nos, ''), 'INWARD_GATE_ENTRY'),
  goods_receipt_note_nos = COALESCE(NULLIF(goods_receipt_note_nos, ''), 'GOODS_RECEIPT_NOTE'),
  updated_at = now();

UPDATE inventory_setup
SET
  item_nos = COALESCE(NULLIF(item_nos, ''), 'ITEM'),
  location_nos = COALESCE(NULLIF(location_nos, ''), 'LOCATION'),
  uom_nos = COALESCE(NULLIF(uom_nos, ''), 'UOM'),
  lot_nos = COALESCE(NULLIF(lot_nos, ''), 'LOT'),
  serial_nos = COALESCE(NULLIF(serial_nos, ''), 'SERIAL'),
  updated_at = now();
