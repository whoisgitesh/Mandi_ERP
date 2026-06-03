ALTER TABLE public.sales_order_lines
  ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0;

ALTER TABLE public.posted_sales_shipment_line
  ADD COLUMN IF NOT EXISTS line_discount_pct NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(50);

ALTER TABLE public.sales_invoice_line
  ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0;

ALTER TABLE public.posted_sales_invoice_lines
  ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0;

UPDATE public.sales_order_lines
SET
  line_discount_amount =
    COALESCE(quantity, 0)
    * COALESCE(unit_price, 0)
    * COALESCE(line_discount_pct, 0) / 100,
  line_amount =
    COALESCE(quantity, 0)
    * COALESCE(unit_price, 0)
    - (
      COALESCE(quantity, 0)
      * COALESCE(unit_price, 0)
      * COALESCE(line_discount_pct, 0) / 100
    ),
  tax_amount =
    (
      COALESCE(quantity, 0)
      * COALESCE(unit_price, 0)
      - (
        COALESCE(quantity, 0)
        * COALESCE(unit_price, 0)
        * COALESCE(line_discount_pct, 0) / 100
      )
    ) * COALESCE(tax_pct, 0) / 100,
  amount_including_tax =
    (
      COALESCE(quantity, 0)
      * COALESCE(unit_price, 0)
      - (
        COALESCE(quantity, 0)
        * COALESCE(unit_price, 0)
        * COALESCE(line_discount_pct, 0) / 100
      )
    )
    + (
      (
        COALESCE(quantity, 0)
        * COALESCE(unit_price, 0)
        - (
          COALESCE(quantity, 0)
          * COALESCE(unit_price, 0)
          * COALESCE(line_discount_pct, 0) / 100
        )
      ) * COALESCE(tax_pct, 0) / 100
    );
