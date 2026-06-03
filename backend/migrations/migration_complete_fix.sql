-- ============================================================
-- COMPLETE FIX MIGRATION
-- Run this on your existing database to add all missing columns
-- for the new No. Series mapping fields in all three setup
-- tables, plus the new general/behaviour fields.
-- ============================================================

-- ============================================================
-- 1. SEED MISSING NUMBER SERIES ROWS
--    (safe — ON CONFLICT DO NOTHING)
-- ============================================================

INSERT INTO public.number_series (code, description)
VALUES
  -- Purchase
  ('PURCHASE_QUOTE',                'Purchase Quote Nos'),
  ('PURCHASE_BLANKET_ORDER',        'Purchase Blanket Order Nos'),
  ('PURCHASE_RETURN_ORDER',         'Purchase Return Order Nos'),
  ('PURCHASE_INVOICE',              'Purchase Invoice Nos'),
  ('POSTED_PURCHASE_INVOICE',       'Posted Purchase Invoice Nos'),
  ('PURCHASE_CREDIT_MEMO',          'Purchase Credit Memo Nos'),
  ('POSTED_PURCHASE_CREDIT_MEMO',   'Posted Purchase Credit Memo Nos'),
  ('POSTED_RETURN_SHIPMENT',        'Posted Return Shipment Nos'),
  -- Inventory tracking
  ('LOT',                           'Lot Nos'),
  ('SERIAL',                        'Serial Nos'),
  -- Sales (extras)
  ('SALES_QUOTE',                   'Sales Quote Nos'),
  ('SALES_BLANKET_ORDER',           'Sales Blanket Order Nos'),
  ('SALES_RETURN_ORDER',            'Sales Return Order Nos'),
  ('POSTED_SALES_INVOICE',          'Posted Sales Invoice Nos'),
  ('SALES_CREDIT_MEMO',             'Sales Credit Memo Nos'),
  ('POSTED_SALES_CREDIT_MEMO',      'Posted Sales Credit Memo Nos'),
  ('POSTED_RETURN_RECEIPT',         'Posted Return Receipt Nos')
ON CONFLICT (code) DO NOTHING;


-- ============================================================
-- 2. SALES & RECEIVABLES SETUP — new No. Series columns
-- ============================================================

ALTER TABLE public.sales_receivables_setup
  ADD COLUMN IF NOT EXISTS quote_nos                      text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS blanket_order_nos              text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_nos                      text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS return_order_nos               text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_nos                    text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS posted_invoice_nos             text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS credit_memo_nos                text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS posted_credit_memo_nos         text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shipment_nos                   text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS posted_shipment_nos            text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS posted_return_receipt_nos      text REFERENCES public.number_series(code) ON DELETE SET NULL;

-- Sales — new general / behaviour columns
ALTER TABLE public.sales_receivables_setup
  ADD COLUMN IF NOT EXISTS return_receipt_on_credit_memo  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS copy_customer_name_to_entries  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ext_doc_no_mandatory            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS calc_inv_discount               boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_vat_difference            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exact_cost_reversing_mandatory  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS check_prepmt_when_posting       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS posting_date_check_on_posting   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_multiple_posting_groups   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ignore_updated_addresses        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS skip_manual_reservation         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS copy_line_descr_to_gl_entry     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_item_quantity           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS create_item_from_description    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_posting                text    NOT NULL DEFAULT 'All Discounts',
  ADD COLUMN IF NOT EXISTS default_posting_date            text    NOT NULL DEFAULT 'Work Date',
  ADD COLUMN IF NOT EXISTS default_quantity_to_ship        text    NOT NULL DEFAULT 'Remainder',
  ADD COLUMN IF NOT EXISTS prepayment_auto_update_frequency text   NOT NULL DEFAULT 'Never',
  ADD COLUMN IF NOT EXISTS check_multiple_posting_groups   text    NOT NULL DEFAULT 'Alternative Groups',
  ADD COLUMN IF NOT EXISTS appl_between_currencies         text    NOT NULL DEFAULT 'All',
  ADD COLUMN IF NOT EXISTS logo_position_on_documents      text    NOT NULL DEFAULT 'No Logo',
  ADD COLUMN IF NOT EXISTS quote_validity_calculation      text;

-- Back-fill defaults for the No. Series FK columns
UPDATE public.sales_receivables_setup
SET
  quote_nos               = COALESCE(quote_nos,               'SALES_QUOTE'),
  blanket_order_nos       = COALESCE(blanket_order_nos,       'SALES_BLANKET_ORDER'),
  order_nos               = COALESCE(order_nos,               'SALES_ORDER'),
  return_order_nos        = COALESCE(return_order_nos,        'SALES_RETURN_ORDER'),
  invoice_nos             = COALESCE(invoice_nos,             'SALES_INVOICE'),
  posted_invoice_nos      = COALESCE(posted_invoice_nos,      'POSTED_SALES_INVOICE'),
  credit_memo_nos         = COALESCE(credit_memo_nos,         'SALES_CREDIT_MEMO'),
  posted_credit_memo_nos  = COALESCE(posted_credit_memo_nos,  'POSTED_SALES_CREDIT_MEMO'),
  shipment_nos            = COALESCE(shipment_nos,            'SALES_SHIPMENT'),
  posted_return_receipt_nos = COALESCE(posted_return_receipt_nos, 'POSTED_RETURN_RECEIPT');


-- ============================================================
-- 3. PURCHASE & PAYABLES SETUP — new No. Series columns
-- ============================================================

ALTER TABLE public.purchase_payables_setup
  ADD COLUMN IF NOT EXISTS quote_nos                      text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS blanket_order_nos              text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS order_nos                      text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS return_order_nos               text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_nos                    text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS posted_invoice_nos             text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS credit_memo_nos                text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS posted_credit_memo_nos         text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS posted_return_shipment_nos     text REFERENCES public.number_series(code) ON DELETE SET NULL;

-- Purchase — new general / behaviour columns (non-financial)
ALTER TABLE public.purchase_payables_setup
  ADD COLUMN IF NOT EXISTS discount_posting               text    NOT NULL DEFAULT 'All Discounts',
  ADD COLUMN IF NOT EXISTS return_shipment_on_credit_memo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_rounding               boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_gl_account_quantity    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS copy_vendor_name_to_entries    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ext_doc_no_mandatory           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_vat_difference           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS appln_between_currencies       text    NOT NULL DEFAULT 'All',
  ADD COLUMN IF NOT EXISTS copy_comments_blanket_to_order boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS prepmt_auto_update_frequency   text    NOT NULL DEFAULT 'Never',
  ADD COLUMN IF NOT EXISTS default_posting_date           text    NOT NULL DEFAULT 'Work Date',
  ADD COLUMN IF NOT EXISTS posting_date_check_on_posting  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_multiple_posting_groups  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS check_multiple_posting_groups  text    NOT NULL DEFAULT 'Alternative Groups',
  ADD COLUMN IF NOT EXISTS ignore_updated_addresses       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS copy_line_descr_to_gl_entry    boolean NOT NULL DEFAULT false;

-- Back-fill Purchase No. Series FKs
UPDATE public.purchase_payables_setup
SET
  quote_nos               = COALESCE(quote_nos,               'PURCHASE_QUOTE'),
  blanket_order_nos       = COALESCE(blanket_order_nos,       'PURCHASE_BLANKET_ORDER'),
  order_nos               = COALESCE(order_nos,               'PURCHASE_ORDER'),
  return_order_nos        = COALESCE(return_order_nos,        'PURCHASE_RETURN_ORDER'),
  invoice_nos             = COALESCE(invoice_nos,             'PURCHASE_INVOICE'),
  posted_invoice_nos      = COALESCE(posted_invoice_nos,      'POSTED_PURCHASE_INVOICE'),
  credit_memo_nos         = COALESCE(credit_memo_nos,         'PURCHASE_CREDIT_MEMO'),
  posted_credit_memo_nos  = COALESCE(posted_credit_memo_nos,  'POSTED_PURCHASE_CREDIT_MEMO'),
  posted_return_shipment_nos = COALESCE(posted_return_shipment_nos, 'POSTED_RETURN_SHIPMENT');


-- ============================================================
-- 4. INVENTORY SETUP — new columns
-- ============================================================

ALTER TABLE public.inventory_setup
  ADD COLUMN IF NOT EXISTS lot_nos                        text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS serial_nos                     text REFERENCES public.number_series(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS automatic_cost_adjustment      text    NOT NULL DEFAULT 'Always',
  ADD COLUMN IF NOT EXISTS cost_adjustment_logging        text    NOT NULL DEFAULT 'Disabled',
  ADD COLUMN IF NOT EXISTS skip_prompt_to_create_item     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS copy_item_descr_to_entries     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_inventory_adjustment     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS current_demand_forecast        text,
  ADD COLUMN IF NOT EXISTS use_forecast_on_locations      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS use_forecast_on_variants       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_safety_lead_time       text,
  ADD COLUMN IF NOT EXISTS blank_overflow_level           text    NOT NULL DEFAULT 'Allow Default Calculation',
  ADD COLUMN IF NOT EXISTS combined_mps_mrp_calculation   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_dampener_period        text,
  ADD COLUMN IF NOT EXISTS default_dampener_percent       numeric(10,2);

-- Back-fill Inventory No. Series FKs
UPDATE public.inventory_setup
SET
  lot_nos    = COALESCE(lot_nos,    'LOT'),
  serial_nos = COALESCE(serial_nos, 'SERIAL');