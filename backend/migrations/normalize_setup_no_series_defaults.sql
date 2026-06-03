/* =========================================================
   NORMALIZE SETUP NO. SERIES DEFAULTS
   Keeps setup pages as the source of truth for document and
   master numbering, with no_series_lines providing the ranges.
========================================================= */

INSERT INTO public.number_series (code, description)
VALUES
  ('CUSTOMER', 'Customer Nos'),
  ('VENDOR', 'Vendor Nos'),
  ('ITEM', 'Item Nos'),
  ('LOCATION', 'Location Nos'),
  ('UOM', 'Unit of Measure Nos'),
  ('MANDI_MASTER', 'Mandi Master Nos'),
  ('MANDI_VENDOR', 'Mandi Vendor Nos'),
  ('MANDI_PURCHASE', 'Mandi Purchase Nos'),
  ('PURCHASE_ORDER', 'Purchase Order Nos'),
  ('INWARD_GATE_ENTRY', 'Inward Gate Entry Nos'),
  ('GOODS_RECEIPT_NOTE', 'Goods Receipt Note Nos'),
  ('POSTED_PURCHASE_RECEIPT', 'Posted Purchase Receipt Nos'),
  ('PURCHASE_INVOICE', 'Purchase Invoice Nos'),
  ('POSTED_PURCHASE_INVOICE', 'Posted Purchase Invoice Nos'),
  ('SALES_ORDER', 'Sales Order Nos'),
  ('SALES_INVOICE', 'Sales Invoice Nos'),
  ('SALES_SHIPMENT', 'Sales Shipment Nos'),
  ('POSTED_SALES_SHIPMENT', 'Posted Sales Shipment Nos'),
  ('POSTED_SALES_INVOICE', 'Posted Sales Invoice Nos'),
  ('LOT', 'Lot Nos'),
  ('SERIAL', 'Serial Nos')
ON CONFLICT (code)
DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

INSERT INTO public.no_series_lines (
  no_series_code,
  starting_date,
  starting_no,
  ending_no,
  last_no_used,
  increment_by,
  open,
  allow_gaps,
  sequence_no
)
SELECT
  seed.code,
  CURRENT_DATE,
  seed.starting_no,
  seed.ending_no,
  NULL,
  1,
  true,
  false,
  1
FROM (
  VALUES
    ('CUSTOMER', 'CUST-00001', 'CUST-99999'),
    ('VENDOR', 'VEN-00001', 'VEN-99999'),
    ('ITEM', 'ITEM-00001', 'ITEM-99999'),
    ('LOCATION', 'LOC-00001', 'LOC-99999'),
    ('UOM', 'UOM-00001', 'UOM-99999'),
    ('MANDI_MASTER', 'MM-00001', 'MM-99999'),
    ('MANDI_VENDOR', 'MV-00001', 'MV-99999'),
    ('MANDI_PURCHASE', 'MP-00001', 'MP-99999'),
    ('PURCHASE_ORDER', 'PO-00001', 'PO-99999'),
    ('INWARD_GATE_ENTRY', 'IGE-00001', 'IGE-99999'),
    ('GOODS_RECEIPT_NOTE', 'GRN-00001', 'GRN-99999'),
    ('POSTED_PURCHASE_RECEIPT', 'PPR-00001', 'PPR-99999'),
    ('PURCHASE_INVOICE', 'PI-00001', 'PI-99999'),
    ('POSTED_PURCHASE_INVOICE', 'PPI-00001', 'PPI-99999'),
    ('SALES_ORDER', 'SO-00001', 'SO-99999'),
    ('SALES_INVOICE', 'SI-00001', 'SI-99999'),
    ('SALES_SHIPMENT', 'SS-00001', 'SS-99999'),
    ('POSTED_SALES_SHIPMENT', 'PSS-00001', 'PSS-99999'),
    ('POSTED_SALES_INVOICE', 'PSI-00001', 'PSI-99999'),
    ('LOT', 'LOT-00001', 'LOT-99999'),
    ('SERIAL', 'SER-00001', 'SER-99999')
) AS seed(code, starting_no, ending_no)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.no_series_lines nsl
  WHERE nsl.no_series_code = seed.code
);

ALTER TABLE public.sales_receivables_setup
  ADD COLUMN IF NOT EXISTS order_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS posted_invoice_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shipment_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS posted_shipment_nos text REFERENCES public.number_series(code) ON DELETE SET NULL;

ALTER TABLE public.purchase_payables_setup
  ADD COLUMN IF NOT EXISTS order_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS posted_invoice_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS posted_return_shipment_nos text REFERENCES public.number_series(code) ON DELETE SET NULL;

UPDATE public.sales_receivables_setup
SET
  customer_nos = COALESCE(NULLIF(customer_nos, ''), 'CUSTOMER'),
  sales_order_nos = COALESCE(NULLIF(sales_order_nos, ''), 'SALES_ORDER'),
  order_nos = COALESCE(NULLIF(order_nos, ''), NULLIF(sales_order_nos, ''), 'SALES_ORDER'),
  sales_invoice_nos = COALESCE(NULLIF(sales_invoice_nos, ''), 'SALES_INVOICE'),
  invoice_nos = COALESCE(NULLIF(invoice_nos, ''), NULLIF(sales_invoice_nos, ''), 'SALES_INVOICE'),
  posted_invoice_nos = COALESCE(NULLIF(posted_invoice_nos, ''), 'POSTED_SALES_INVOICE'),
  sales_shipment_nos = COALESCE(NULLIF(sales_shipment_nos, ''), 'SALES_SHIPMENT'),
  shipment_nos = COALESCE(NULLIF(shipment_nos, ''), NULLIF(sales_shipment_nos, ''), 'SALES_SHIPMENT'),
  posted_sales_shipment_nos = COALESCE(NULLIF(posted_sales_shipment_nos, ''), 'POSTED_SALES_SHIPMENT'),
  posted_shipment_nos = COALESCE(NULLIF(posted_shipment_nos, ''), NULLIF(posted_sales_shipment_nos, ''), 'POSTED_SALES_SHIPMENT');

UPDATE public.purchase_payables_setup
SET
  vendor_nos = COALESCE(NULLIF(vendor_nos, ''), 'VENDOR'),
  purchase_order_nos = COALESCE(NULLIF(purchase_order_nos, ''), 'PURCHASE_ORDER'),
  order_nos = COALESCE(NULLIF(order_nos, ''), NULLIF(purchase_order_nos, ''), 'PURCHASE_ORDER'),
  posted_receipt_nos = COALESCE(NULLIF(posted_receipt_nos, ''), 'POSTED_PURCHASE_RECEIPT'),
  mandi_purchase_nos = COALESCE(NULLIF(mandi_purchase_nos, ''), 'MANDI_PURCHASE'),
  mandi_vendor_nos = COALESCE(NULLIF(mandi_vendor_nos, ''), 'MANDI_VENDOR'),
  inward_gate_entry_nos = COALESCE(NULLIF(inward_gate_entry_nos, ''), 'INWARD_GATE_ENTRY'),
  goods_receipt_note_nos =
    CASE
      WHEN NULLIF(goods_receipt_note_nos, '') IS NULL
        OR goods_receipt_note_nos = 'GRN'
      THEN 'GOODS_RECEIPT_NOTE'
      ELSE goods_receipt_note_nos
    END,
  invoice_nos = COALESCE(NULLIF(invoice_nos, ''), 'PURCHASE_INVOICE'),
  posted_invoice_nos = COALESCE(NULLIF(posted_invoice_nos, ''), 'POSTED_PURCHASE_INVOICE');

UPDATE public.inventory_setup
SET
  item_nos = COALESCE(NULLIF(item_nos, ''), 'ITEM'),
  location_nos = COALESCE(NULLIF(location_nos, ''), 'LOCATION'),
  uom_nos = COALESCE(NULLIF(uom_nos, ''), 'UOM'),
  lot_nos = COALESCE(NULLIF(lot_nos, ''), 'LOT'),
  serial_nos = COALESCE(NULLIF(serial_nos, ''), 'SERIAL');
