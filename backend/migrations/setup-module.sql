-- ============================================================
-- Setup Module Migration (Pure PostgreSQL Version)
-- ============================================================

-- ============================================================
-- REQUIRED EXTENSION
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================
-- NUMBER SERIES MASTER
-- ============================================================

CREATE TABLE IF NOT EXISTS public.number_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  manual_nos boolean NOT NULL DEFAULT false,
  date_order boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_number_series_updated
ON public.number_series;

CREATE TRIGGER trg_number_series_updated
BEFORE UPDATE ON public.number_series
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- DEFAULT NUMBER SERIES DATA
-- ============================================================

INSERT INTO public.number_series (code, description)
VALUES
('VENDOR', 'Vendor Nos'),
('PURCHASE_ORDER', 'Purchase Order Nos'),
('POSTED_PURCHASE_RECEIPT', 'Posted Purchase Receipt Nos'),
('MANDI_PURCHASE', 'Mandi Purchase Nos'),
('MANDI_VENDOR', 'Mandi Vendor Nos'),
('INWARD_GATE_ENTRY', 'Inward Gate Entry Nos'),
('GRN', 'Goods Receipt Note Nos'),
('ITEM', 'Item Nos'),
('LOCATION', 'Location Nos'),
('UOM', 'Unit Of Measure Nos'),
('CUSTOMER', 'Customer Nos'),
('SALES_ORDER', 'Sales Order Nos'),
('SALES_INVOICE', 'Sales Invoice Nos'),
('SALES_SHIPMENT', 'Sales Shipment Nos')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 1. NO SERIES LINES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.no_series_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  no_series_code text NOT NULL REFERENCES public.number_series(code) ON DELETE CASCADE,
  starting_date date,
  starting_no text NOT NULL,
  ending_no text,
  last_no_used text,
  last_date_used date,
  increment_by integer NOT NULL DEFAULT 1,
  open boolean NOT NULL DEFAULT true,
  allow_gaps boolean NOT NULL DEFAULT false,
  sequence_no integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_no_series_lines_updated
ON public.no_series_lines;

CREATE TRIGGER trg_no_series_lines_updated
BEFORE UPDATE ON public.no_series_lines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. SALES & RECEIVABLES SETUP
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sales_receivables_setup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  customer_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  sales_order_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  sales_invoice_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  sales_shipment_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  posted_sales_shipment_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,

  default_location_code text,

  shipment_on_invoice boolean NOT NULL DEFAULT true,
  invoice_rounding boolean NOT NULL DEFAULT false,
  copy_comments_order_to_invoice boolean NOT NULL DEFAULT true,
  copy_comments_order_to_shipment boolean NOT NULL DEFAULT true,

  default_payment_terms_code text,
  default_payment_method_code text,
  default_ship_to_code text,

  credit_warnings text NOT NULL DEFAULT 'Both Warnings',
  stockout_warning boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_sales_receivables_setup_updated
ON public.sales_receivables_setup;

CREATE TRIGGER trg_sales_receivables_setup_updated
BEFORE UPDATE ON public.sales_receivables_setup
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.sales_receivables_setup (
  customer_nos,
  sales_order_nos,
  sales_invoice_nos,
  sales_shipment_nos
)
SELECT
  'CUSTOMER',
  'SALES_ORDER',
  'SALES_INVOICE',
  'SALES_SHIPMENT'
WHERE NOT EXISTS (
  SELECT 1 FROM public.sales_receivables_setup
);

-- ============================================================
-- 3. PURCHASE & PAYABLES SETUP
-- ============================================================

CREATE TABLE IF NOT EXISTS public.purchase_payables_setup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  vendor_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  purchase_order_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  purchase_receipt_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  posted_receipt_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  mandi_purchase_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  mandi_vendor_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  inward_gate_entry_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  goods_receipt_note_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,

  default_location_code text,

  receipt_on_invoice boolean NOT NULL DEFAULT true,
  copy_comments_order_to_receipt boolean NOT NULL DEFAULT true,
  copy_comments_order_to_invoice boolean NOT NULL DEFAULT true,

  default_payment_terms_code text,
  default_payment_method_code text,

  allow_purchase_order_archiving boolean NOT NULL DEFAULT false,
  calc_inv_discount boolean NOT NULL DEFAULT false,
  default_qty_to_receive text NOT NULL DEFAULT 'Remainder',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_purchase_payables_setup_updated
ON public.purchase_payables_setup;

CREATE TRIGGER trg_purchase_payables_setup_updated
BEFORE UPDATE ON public.purchase_payables_setup
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.purchase_payables_setup (
  vendor_nos,
  purchase_order_nos,
  posted_receipt_nos,
  mandi_purchase_nos,
  mandi_vendor_nos,
  inward_gate_entry_nos,
  goods_receipt_note_nos
)
SELECT
  'VENDOR',
  'PURCHASE_ORDER',
  'POSTED_PURCHASE_RECEIPT',
  'MANDI_PURCHASE',
  'MANDI_VENDOR',
  'INWARD_GATE_ENTRY',
  'GRN'
WHERE NOT EXISTS (
  SELECT 1 FROM public.purchase_payables_setup
);

-- ============================================================
-- 4. INVENTORY SETUP
-- ============================================================

CREATE TABLE IF NOT EXISTS public.inventory_setup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  item_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  location_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  uom_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  lot_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,
  serial_nos text REFERENCES public.number_series(code) ON DELETE SET NULL,

  location_mandatory boolean NOT NULL DEFAULT false,
  prevent_negative_inventory boolean NOT NULL DEFAULT false,
  automatic_cost_posting boolean NOT NULL DEFAULT false,
  variant_mandatory_if_exists boolean NOT NULL DEFAULT false,

  default_costing_method text NOT NULL DEFAULT 'FIFO',
  average_cost_period text NOT NULL DEFAULT 'Month',
  average_cost_calc_type text NOT NULL DEFAULT 'Item',

  default_phys_invt_counting_period text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_inventory_setup_updated
ON public.inventory_setup;

CREATE TRIGGER trg_inventory_setup_updated
BEFORE UPDATE ON public.inventory_setup
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.inventory_setup (
  item_nos,
  location_nos,
  uom_nos
)
SELECT
  'ITEM',
  'LOCATION',
  'UOM'
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory_setup
);