UPDATE purchase_payables_setup
SET
  mandi_purchase_nos = COALESCE(NULLIF(mandi_purchase_nos, ''), 'MANDI_PURCHASE'),
  order_nos = COALESCE(NULLIF(order_nos, ''), 'PURCHASE_ORDER'),
  inward_gate_entry_nos = COALESCE(NULLIF(inward_gate_entry_nos, ''), 'INWARD_GATE_ENTRY'),
  goods_receipt_note_nos = COALESCE(NULLIF(goods_receipt_note_nos, ''), 'GOODS_RECEIPT_NOTE'),
  posted_receipt_nos = COALESCE(NULLIF(posted_receipt_nos, ''), 'POSTED_PURCHASE_RECEIPT'),
  updated_at = NOW();
