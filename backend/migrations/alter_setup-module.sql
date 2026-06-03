-- ============================================================
-- ALTER MIGRATION FOR EXISTING DATABASE
-- ONLY NEW COLUMNS
-- ============================================================

-- ============================================================
-- 1. NUMBER SERIES MASTER DATA
-- ============================================================

INSERT INTO public.number_series (code, description)
VALUES
('PURCHASE_QUOTE', 'Purchase Quote Nos'),
('PURCHASE_BLANKET_ORDER', 'Purchase Blanket Order Nos'),
('PURCHASE_RETURN_ORDER', 'Purchase Return Order Nos'),
('PURCHASE_INVOICE', 'Purchase Invoice Nos'),
('POSTED_PURCHASE_INVOICE', 'Posted Purchase Invoice Nos'),
('PURCHASE_CREDIT_MEMO', 'Purchase Credit Memo Nos'),
('POSTED_PURCHASE_CREDIT_MEMO', 'Posted Purchase Credit Memo Nos'),
('POSTED_RETURN_SHIPMENT', 'Posted Return Shipment Nos'),

('LOT', 'Lot Nos'),
('SERIAL', 'Serial Nos'),

('SALES_QUOTE', 'Sales Quote Nos'),
('SALES_BLANKET_ORDER', 'Sales Blanket Order Nos'),
('SALES_RETURN_ORDER', 'Sales Return Order Nos'),
('POSTED_SALES_INVOICE', 'Posted Sales Invoice Nos'),
('SALES_CREDIT_MEMO', 'Sales Credit Memo Nos'),
('POSTED_SALES_CREDIT_MEMO', 'Posted Sales Credit Memo Nos'),
('POSTED_RETURN_RECEIPT', 'Posted Return Receipt Nos')

ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 2. SALES & RECEIVABLES SETUP
-- ============================================================

ALTER TABLE public.sales_receivables_setup
ADD COLUMN IF NOT EXISTS quote_nos text
REFERENCES public.number_series(code)
ON DELETE SET NULL;

ALTER TABLE public.sales_receivables_setup
ADD COLUMN IF NOT EXISTS blanket_order_nos text
REFERENCES public.number_series(code)
ON DELETE SET NULL;

ALTER TABLE public.sales_receivables_setup
ADD COLUMN IF NOT EXISTS order_nos text
REFERENCES public.number_series(code)
ON DELETE SET NULL;

ALTER TABLE public.sales_receivables_setup
ADD COLUMN IF NOT EXISTS return_order_nos text
REFERENCES public.number_series(code)
ON DELETE SET NULL;

ALTER TABLE public.sales_receivables_setup
ADD COLUMN IF NOT EXISTS invoice_nos text
REFERENCES public.number_series(code)
ON DELETE SET NULL;

ALTER TABLE public.sales_receivables_setup
ADD COLUMN IF NOT EXISTS posted_invoice_nos text
REFERENCES public.number_series(code)
ON DELETE SET NULL;

ALTER TABLE public.sales_receivables_setup
ADD COLUMN IF NOT EXISTS credit_memo_nos text
REFERENCES public.number_series(code)
ON DELETE SET NULL;

ALTER TABLE public.sales_receivables_setup
ADD COLUMN IF NOT EXISTS posted_credit_memo_nos text
REFERENCES public.number_series(code)
ON DELETE SET NULL;

ALTER TABLE public.sales_receivables_setup
ADD COLUMN IF NOT EXISTS shipment_nos text
REFERENCES public.number_series(code)
ON DELETE SET NULL;

ALTER TABLE public.sales_receivables_setup
ADD COLUMN IF NOT EXISTS posted_return_receipt_nos text
REFERENCES public.number_series(code)
ON DELETE SET NULL;

-- ============================================================
-- 3. PURCHASE & PAYABLES SETUP
-- ============================================================

ALTER TABLE public.purchase_payables_setup
ADD COLUMN IF NOT EXISTS quote_nos text
REFERENCES public.number_series(code)
ON DELETE SET NULL;

ALTER TABLE public.purchase_payables_setup
ADD COLUMN IF NOT EXISTS blanket_order_nos text
REFERENCES public.number_series(code)
ON DELETE SET NULL;

ALTER TABLE public.purchase_payables_setup
ADD COLUMN IF NOT EXISTS order_nos text
REFERENCES public.number_series(code)
ON DELETE SET NULL;

ALTER TABLE public.purchase_payables_setup
ADD COLUMN IF NOT EXISTS return_order_nos text
REFERENCES public.number_series(code)
ON DELETE SET NULL;

ALTER TABLE public.purchase_payables_setup
ADD COLUMN IF NOT EXISTS invoice_nos text
REFERENCES public.number_series(code)
ON DELETE SET NULL;

ALTER TABLE public.purchase_payables_setup
ADD COLUMN IF NOT EXISTS posted_invoice_nos text
REFERENCES public.number_series(code)
ON DELETE SET NULL;

ALTER TABLE public.purchase_payables_setup
ADD COLUMN IF NOT EXISTS credit_memo_nos text
REFERENCES public.number_series(code)
ON DELETE SET NULL;

ALTER TABLE public.purchase_payables_setup
ADD COLUMN IF NOT EXISTS posted_credit_memo_nos text
REFERENCES public.number_series(code)
ON DELETE SET NULL;

ALTER TABLE public.purchase_payables_setup
ADD COLUMN IF NOT EXISTS posted_return_shipment_nos text
REFERENCES public.number_series(code)
ON DELETE SET NULL;

-- ============================================================
-- 4. INVENTORY SETUP
-- ============================================================

ALTER TABLE public.inventory_setup
ADD COLUMN IF NOT EXISTS automatic_cost_adjustment text
NOT NULL DEFAULT 'Always';

ALTER TABLE public.inventory_setup
ADD COLUMN IF NOT EXISTS cost_adjustment_logging text
NOT NULL DEFAULT 'Disabled';

ALTER TABLE public.inventory_setup
ADD COLUMN IF NOT EXISTS skip_prompt_to_create_item boolean
NOT NULL DEFAULT false;

ALTER TABLE public.inventory_setup
ADD COLUMN IF NOT EXISTS copy_item_descr_to_entries boolean
NOT NULL DEFAULT false;

ALTER TABLE public.inventory_setup
ADD COLUMN IF NOT EXISTS allow_inventory_adjustment boolean
NOT NULL DEFAULT true;

ALTER TABLE public.inventory_setup
ADD COLUMN IF NOT EXISTS current_demand_forecast text;

ALTER TABLE public.inventory_setup
ADD COLUMN IF NOT EXISTS use_forecast_on_locations boolean
NOT NULL DEFAULT false;

ALTER TABLE public.inventory_setup
ADD COLUMN IF NOT EXISTS use_forecast_on_variants boolean
NOT NULL DEFAULT false;

ALTER TABLE public.inventory_setup
ADD COLUMN IF NOT EXISTS default_safety_lead_time text;

ALTER TABLE public.inventory_setup
ADD COLUMN IF NOT EXISTS blank_overflow_level text
NOT NULL DEFAULT 'Allow Default Calculation';

ALTER TABLE public.inventory_setup
ADD COLUMN IF NOT EXISTS combined_mps_mrp_calculation boolean
NOT NULL DEFAULT false;

ALTER TABLE public.inventory_setup
ADD COLUMN IF NOT EXISTS default_dampener_period text;

ALTER TABLE public.inventory_setup
ADD COLUMN IF NOT EXISTS default_dampener_percent numeric(10,2);

-- ============================================================
-- 5. UPDATE EXISTING DEFAULT ROWS
-- ============================================================

UPDATE public.sales_receivables_setup
SET
  quote_nos = COALESCE(quote_nos, 'SALES_QUOTE'),
  blanket_order_nos = COALESCE(blanket_order_nos, 'SALES_BLANKET_ORDER'),
  order_nos = COALESCE(order_nos, 'SALES_ORDER'),
  return_order_nos = COALESCE(return_order_nos, 'SALES_RETURN_ORDER'),
  invoice_nos = COALESCE(invoice_nos, 'SALES_INVOICE'),
  posted_invoice_nos = COALESCE(posted_invoice_nos, 'POSTED_SALES_INVOICE'),
  credit_memo_nos = COALESCE(credit_memo_nos, 'SALES_CREDIT_MEMO'),
  posted_credit_memo_nos = COALESCE(posted_credit_memo_nos, 'POSTED_SALES_CREDIT_MEMO'),
  shipment_nos = COALESCE(shipment_nos, 'SALES_SHIPMENT'),
  posted_return_receipt_nos = COALESCE(posted_return_receipt_nos, 'POSTED_RETURN_RECEIPT');

UPDATE public.purchase_payables_setup
SET
  quote_nos = COALESCE(quote_nos, 'PURCHASE_QUOTE'),
  blanket_order_nos = COALESCE(blanket_order_nos, 'PURCHASE_BLANKET_ORDER'),
  order_nos = COALESCE(order_nos, 'PURCHASE_ORDER'),
  return_order_nos = COALESCE(return_order_nos, 'PURCHASE_RETURN_ORDER'),
  invoice_nos = COALESCE(invoice_nos, 'PURCHASE_INVOICE'),
  posted_invoice_nos = COALESCE(posted_invoice_nos, 'POSTED_PURCHASE_INVOICE'),
  credit_memo_nos = COALESCE(credit_memo_nos, 'PURCHASE_CREDIT_MEMO'),
  posted_credit_memo_nos = COALESCE(posted_credit_memo_nos, 'POSTED_PURCHASE_CREDIT_MEMO'),
  posted_return_shipment_nos = COALESCE(posted_return_shipment_nos, 'POSTED_RETURN_SHIPMENT');

UPDATE public.inventory_setup
SET
  lot_nos = COALESCE(lot_nos, 'LOT'),
  serial_nos = COALESCE(serial_nos, 'SERIAL');