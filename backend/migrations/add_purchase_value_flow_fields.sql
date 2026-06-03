ALTER TABLE public.purchase_order_lines
  ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(12,2) DEFAULT 0;

ALTER TABLE public.inward_gate_entry_lines
  ADD COLUMN IF NOT EXISTS line_discount_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(50);

ALTER TABLE public.posted_purchase_receipt_lines
  ADD COLUMN IF NOT EXISTS source_purchase_order_line_id INTEGER,
  ADD COLUMN IF NOT EXISTS variant_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS location_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS uom_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS direct_unit_cost NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_discount_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_amount NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(50);

UPDATE public.purchase_order_lines
SET
  line_discount_amount =
    COALESCE(quantity, 0)
    * COALESCE(direct_unit_cost_excl_vat, 0)
    * COALESCE(line_discount_pct, 0) / 100,
  line_amount =
    COALESCE(quantity, 0)
    * COALESCE(direct_unit_cost_excl_vat, 0)
    - (
      COALESCE(quantity, 0)
      * COALESCE(direct_unit_cost_excl_vat, 0)
      * COALESCE(line_discount_pct, 0) / 100
    ),
  tax_amount =
    (
      COALESCE(quantity, 0)
      * COALESCE(direct_unit_cost_excl_vat, 0)
      - (
        COALESCE(quantity, 0)
        * COALESCE(direct_unit_cost_excl_vat, 0)
        * COALESCE(line_discount_pct, 0) / 100
      )
    ) * COALESCE(tax_pct, 0) / 100,
  amount_including_tax =
    (
      COALESCE(quantity, 0)
      * COALESCE(direct_unit_cost_excl_vat, 0)
      - (
        COALESCE(quantity, 0)
        * COALESCE(direct_unit_cost_excl_vat, 0)
        * COALESCE(line_discount_pct, 0) / 100
      )
    )
    + (
      (
        COALESCE(quantity, 0)
        * COALESCE(direct_unit_cost_excl_vat, 0)
        - (
          COALESCE(quantity, 0)
          * COALESCE(direct_unit_cost_excl_vat, 0)
          * COALESCE(line_discount_pct, 0) / 100
        )
      ) * COALESCE(tax_pct, 0) / 100
    );
