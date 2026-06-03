/* =========================================================
   MANDI MASTER + PURCHASE ORDER UI FIX
   Adds the tables/columns needed by the current React pages.
========================================================= */

CREATE TABLE IF NOT EXISTS mandi_master (
    id SERIAL PRIMARY KEY,
    vendor_no VARCHAR(30),
    vendor_name VARCHAR(255),
    date DATE,
    item_no VARCHAR(30),
    item_description TEXT,
    today_purchase_quantity NUMERIC(18,2) DEFAULT 0,
    today_purchase_rate NUMERIC(18,2) DEFAULT 0,
    variant_code VARCHAR(30),
    starting_date DATE,
    expected_qty NUMERIC(18,2) DEFAULT 0,
    expected_rate NUMERIC(18,2) DEFAULT 0,
    bardana_weight NUMERIC(18,2) DEFAULT 0,
    dammi NUMERIC(18,2) DEFAULT 0,
    mandi_labour NUMERIC(18,2) DEFAULT 0,
    loading_stiching NUMERIC(18,2) DEFAULT 0,
    commission NUMERIC(18,2) DEFAULT 0,
    dalali NUMERIC(18,2) DEFAULT 0,
    market_fees NUMERIC(18,2) DEFAULT 0,
    hrdf NUMERIC(18,2) DEFAULT 0,
    cancer_fund NUMERIC(18,2) DEFAULT 0,
    mandi_dhara_fof_payment NUMERIC(18,2) DEFAULT 0,
    initial_update_time TIMESTAMPTZ,
    fill_up_time TIMESTAMPTZ,
    per_pack_qty NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_mandi_master_vendor
      FOREIGN KEY (vendor_no)
      REFERENCES vendors(vendor_no),
    CONSTRAINT fk_mandi_master_item
      FOREIGN KEY (item_no)
      REFERENCES items(item_no)
);

CREATE INDEX IF NOT EXISTS idx_mandi_master_date
ON mandi_master(date);

CREATE INDEX IF NOT EXISTS idx_mandi_master_vendor_item
ON mandi_master(vendor_no, item_no);

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS source_mandi_purchase_id INTEGER,
  ADD COLUMN IF NOT EXISTS vendor_gst_reg_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS broker_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS brokerage NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_terms TEXT,
  ADD COLUMN IF NOT EXISTS deduction NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cash_discount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS receiving_no VARCHAR(30),
  ADD COLUMN IF NOT EXISTS discount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS address_2 TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS post_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS country_region_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS phone_no VARCHAR(30),
  ADD COLUMN IF NOT EXISTS mobile_phone_no VARCHAR(30),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact VARCHAR(255),
  ADD COLUMN IF NOT EXISTS invoice_received_date DATE,
  ADD COLUMN IF NOT EXISTS vat_date DATE,
  ADD COLUMN IF NOT EXISTS vendor_invoice_date DATE,
  ADD COLUMN IF NOT EXISTS expected_receipt_date DATE,
  ADD COLUMN IF NOT EXISTS promised_receipt_date DATE,
  ADD COLUMN IF NOT EXISTS requested_receipt_date DATE,
  ADD COLUMN IF NOT EXISTS payment_discount_pct NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100),
  ADD COLUMN IF NOT EXISTS creditor_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS on_hold VARCHAR(100),
  ADD COLUMN IF NOT EXISTS department_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS receiving_no_series VARCHAR(30),
  ADD COLUMN IF NOT EXISTS your_reference VARCHAR(100),
  ADD COLUMN IF NOT EXISTS prepared_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS referred_by VARCHAR(255),
  ADD COLUMN IF NOT EXISTS referred_by_phone_no VARCHAR(30),
  ADD COLUMN IF NOT EXISTS vendor_order_no VARCHAR(100),
  ADD COLUMN IF NOT EXISTS alternate_vendor_address_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS charge_group_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS order_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS broker_code VARCHAR(30);
