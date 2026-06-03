CREATE TABLE IF NOT EXISTS gst_groups (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(150),
  gst_group_type VARCHAR(30) DEFAULT 'Goods',
  gst_rate NUMERIC(5,2) DEFAULT 0,
  gst_place_of_supply VARCHAR(50),
  component_calc_type VARCHAR(50) DEFAULT 'General',
  cess_uom VARCHAR(50),
  cess_credit BOOLEAN DEFAULT FALSE,
  hsn_sac_required BOOLEAN DEFAULT FALSE,
  reverse_charge BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_gst_groups_type
    CHECK (gst_group_type IN ('Goods', 'Service'))
);

ALTER TABLE gst_groups
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_place_of_supply VARCHAR(50),
  ADD COLUMN IF NOT EXISTS component_calc_type VARCHAR(50) DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS cess_uom VARCHAR(50),
  ADD COLUMN IF NOT EXISTS cess_credit BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS gst_rates (
  id SERIAL PRIMARY KEY,
  gst_group_code VARCHAR(50) NOT NULL REFERENCES gst_groups(code),
  hsn_sac VARCHAR(50),
  from_state_code VARCHAR(20),
  to_state_code VARCHAR(20),
  effective_from DATE NOT NULL,
  effective_to DATE,
  gst_calculation_type VARCHAR(30) NOT NULL DEFAULT 'Intra-State',
  cgst_pct NUMERIC(5,2) DEFAULT 0,
  sgst_pct NUMERIC(5,2) DEFAULT 0,
  igst_pct NUMERIC(5,2) DEFAULT 0,
  total_gst_pct NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_gst_rates_type
    CHECK (gst_calculation_type IN ('Intra-State', 'Inter-State')),
  CONSTRAINT chk_gst_rates_dates
    CHECK (effective_to IS NULL OR effective_to >= effective_from),
  CONSTRAINT chk_gst_rates_non_negative
    CHECK (
      COALESCE(cgst_pct, 0) >= 0
      AND COALESCE(sgst_pct, 0) >= 0
      AND COALESCE(igst_pct, 0) >= 0
      AND COALESCE(total_gst_pct, 0) >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_gst_rates_group
  ON gst_rates(gst_group_code);

CREATE INDEX IF NOT EXISTS idx_gst_rates_resolve
  ON gst_rates(gst_group_code, gst_calculation_type, from_state_code, to_state_code, effective_from, effective_to, is_active);

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS gst_group_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(50);

ALTER TABLE purchase_order_lines
  ADD COLUMN IF NOT EXISTS line_discount_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_group_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gst_calculation_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS cgst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_gst NUMERIC(18,2) DEFAULT 0;

ALTER TABLE inward_gate_entry_lines
  ADD COLUMN IF NOT EXISTS line_discount_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_group_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gst_calculation_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS cgst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_gst NUMERIC(18,2) DEFAULT 0;

ALTER TABLE posted_purchase_receipt_lines
  ADD COLUMN IF NOT EXISTS line_discount_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_group_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gst_calculation_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS cgst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_gst NUMERIC(18,2) DEFAULT 0;

ALTER TABLE purchase_invoice_lines
  ADD COLUMN IF NOT EXISTS line_discount_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_group_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gst_calculation_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS cgst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_gst NUMERIC(18,2) DEFAULT 0;

ALTER TABLE posted_purchase_invoice_lines
  ADD COLUMN IF NOT EXISTS line_discount_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_group_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gst_calculation_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS cgst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_gst NUMERIC(18,2) DEFAULT 0;

ALTER TABLE sales_order_lines
  ADD COLUMN IF NOT EXISTS line_discount_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_group_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gst_calculation_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS cgst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_gst NUMERIC(18,2) DEFAULT 0;

ALTER TABLE posted_sales_shipment_line
  ADD COLUMN IF NOT EXISTS line_discount_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_group_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gst_calculation_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS cgst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_gst NUMERIC(18,2) DEFAULT 0;

ALTER TABLE sales_invoice_line
  ADD COLUMN IF NOT EXISTS line_discount_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_group_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gst_calculation_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS cgst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_gst NUMERIC(18,2) DEFAULT 0;

ALTER TABLE posted_sales_invoice_lines
  ADD COLUMN IF NOT EXISTS line_discount_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_discount_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_tax NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gst_group_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gst_calculation_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS cgst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gst_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_gst_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_including_gst NUMERIC(18,2) DEFAULT 0;

CREATE OR REPLACE FUNCTION erp_sync_gst_line_values()
RETURNS TRIGGER AS $$
DECLARE
  row_data JSONB;
  qty NUMERIC := 0;
  unit_value NUMERIC := 0;
  gross_amount NUMERIC := 0;
  discount_pct NUMERIC := 0;
  total_pct NUMERIC := 0;
  cgst NUMERIC := 0;
  sgst NUMERIC := 0;
  igst NUMERIC := 0;
  taxable NUMERIC := 0;
BEGIN
  row_data := to_jsonb(NEW);

  qty := COALESCE(
    NULLIF(NULLIF(row_data->>'qty_to_invoice', '')::NUMERIC, 0),
    NULLIF(NULLIF(row_data->>'accepted_quantity', '')::NUMERIC, 0),
    NULLIF(NULLIF(row_data->>'quantity_received', '')::NUMERIC, 0),
    NULLIF(NULLIF(row_data->>'qty_received', '')::NUMERIC, 0),
    NULLIF(NULLIF(row_data->>'quantity_shipped', '')::NUMERIC, 0),
    NULLIF(NULLIF(row_data->>'qty_shipped', '')::NUMERIC, 0),
    NULLIF(NULLIF(row_data->>'qty_to_ship', '')::NUMERIC, 0),
    NULLIF(NULLIF(row_data->>'quantity', '')::NUMERIC, 0),
    0
  );

  unit_value := COALESCE(
    NULLIF(NULLIF(row_data->>'direct_unit_cost_excl_vat', '')::NUMERIC, 0),
    NULLIF(NULLIF(row_data->>'direct_unit_cost', '')::NUMERIC, 0),
    NULLIF(NULLIF(row_data->>'unit_cost', '')::NUMERIC, 0),
    NULLIF(NULLIF(row_data->>'unit_price', '')::NUMERIC, 0),
    NULLIF(NULLIF(row_data->>'rate', '')::NUMERIC, 0),
    0
  );

  discount_pct := COALESCE(NEW.line_discount_pct, 0);
  gross_amount := ROUND(qty * unit_value, 2);

  IF COALESCE(NEW.line_discount_amount, 0) = 0 THEN
    NEW.line_discount_amount := ROUND(gross_amount * discount_pct / 100, 2);
  END IF;

  IF COALESCE(NEW.line_amount, 0) = 0 THEN
    NEW.line_amount := ROUND(gross_amount - COALESCE(NEW.line_discount_amount, 0), 2);
  END IF;

  taxable := COALESCE(NULLIF(NEW.taxable_amount, 0), NEW.line_amount, 0);
  NEW.taxable_amount := ROUND(taxable, 2);

  total_pct := COALESCE(
    NULLIF(NEW.total_gst_pct, 0),
    NULLIF(NEW.tax_pct, 0),
    NULLIF(COALESCE(NEW.cgst_pct, 0) + COALESCE(NEW.sgst_pct, 0) + COALESCE(NEW.igst_pct, 0), 0),
    0
  );

  IF total_pct > 0 THEN
    IF COALESCE(NEW.gst_calculation_type, '') = 'Inter-State' THEN
      cgst := 0;
      sgst := 0;
      igst := COALESCE(NULLIF(NEW.igst_pct, 0), total_pct);
      NEW.gst_calculation_type := 'Inter-State';
    ELSIF COALESCE(NEW.igst_pct, 0) > 0 AND COALESCE(NEW.cgst_pct, 0) = 0 AND COALESCE(NEW.sgst_pct, 0) = 0 THEN
      cgst := 0;
      sgst := 0;
      igst := NEW.igst_pct;
      NEW.gst_calculation_type := 'Inter-State';
    ELSE
      cgst := COALESCE(NULLIF(NEW.cgst_pct, 0), ROUND(total_pct / 2, 2));
      sgst := COALESCE(NULLIF(NEW.sgst_pct, 0), ROUND(total_pct - cgst, 2));
      igst := 0;
      NEW.gst_calculation_type := 'Intra-State';
    END IF;
  END IF;

  NEW.cgst_pct := cgst;
  NEW.sgst_pct := sgst;
  NEW.igst_pct := igst;
  NEW.total_gst_pct := ROUND(total_pct, 2);
  NEW.tax_pct := ROUND(total_pct, 2);
  NEW.cgst_amount := ROUND(taxable * cgst / 100, 2);
  NEW.sgst_amount := ROUND(taxable * sgst / 100, 2);
  NEW.igst_amount := ROUND(taxable * igst / 100, 2);
  NEW.total_gst_amount := ROUND(NEW.cgst_amount + NEW.sgst_amount + NEW.igst_amount, 2);
  NEW.tax_amount := NEW.total_gst_amount;
  NEW.amount_including_gst := ROUND(taxable + NEW.total_gst_amount, 2);
  NEW.amount_including_tax := NEW.amount_including_gst;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'purchase_order_lines',
    'inward_gate_entry_lines',
    'posted_purchase_receipt_lines',
    'purchase_invoice_lines',
    'posted_purchase_invoice_lines',
    'sales_order_lines',
    'posted_sales_shipment_line',
    'sales_invoice_line',
    'posted_sales_invoice_lines'
  ]
  LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_erp_sync_gst_line_values ON %I', table_name);
      EXECUTE format(
        'CREATE TRIGGER trg_erp_sync_gst_line_values
         BEFORE INSERT OR UPDATE ON %I
         FOR EACH ROW
         EXECUTE FUNCTION erp_sync_gst_line_values()',
        table_name
      );
    END IF;
  END LOOP;
END $$;
