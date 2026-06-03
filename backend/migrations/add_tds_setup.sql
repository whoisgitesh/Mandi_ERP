CREATE TABLE IF NOT EXISTS tds_setup (
  id SERIAL PRIMARY KEY,
  tax_type VARCHAR(20) DEFAULT 'TDS',
  tds_nil_challan_nos VARCHAR(50),
  nil_pay_tds_document_nos VARCHAR(50),
  tds_rounding_precision NUMERIC(12,2) DEFAULT 1,
  tds_rounding_type VARCHAR(20) DEFAULT 'Nearest',
  tds_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tds_setup (id, tax_type)
VALUES (1, 'TDS')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS tds_section_codes (
  code VARCHAR(50) PRIMARY KEY,
  description VARCHAR(200) NOT NULL,
  etds_code VARCHAR(50),
  parent_code VARCHAR(50),
  is_group BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tds_assessee_codes (
  code VARCHAR(50) PRIMARY KEY,
  description VARCHAR(150) NOT NULL,
  is_resident BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tds_rates (
  id SERIAL PRIMARY KEY,
  section_code VARCHAR(50) NOT NULL REFERENCES tds_section_codes(code),
  assessee_code VARCHAR(50) NOT NULL REFERENCES tds_assessee_codes(code),
  effective_date DATE NOT NULL,
  concessional_code VARCHAR(50),
  nature_of_remittance VARCHAR(100),
  act_applicable VARCHAR(20),
  country_code VARCHAR(20),
  tds_pct NUMERIC(7,3) NOT NULL DEFAULT 0,
  surcharge_pct NUMERIC(7,3) DEFAULT 0,
  cess_pct NUMERIC(7,3) DEFAULT 0,
  total_tds_pct NUMERIC(7,3) DEFAULT 0,
  threshold_amount NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_tds_rates_non_negative
    CHECK (
      tds_pct >= 0
      AND surcharge_pct >= 0
      AND cess_pct >= 0
      AND total_tds_pct >= 0
      AND threshold_amount >= 0
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tds_rates_active_key
  ON tds_rates(
    section_code,
    assessee_code,
    effective_date,
    COALESCE(concessional_code, ''),
    COALESCE(country_code, '')
  )
  WHERE is_active = true;

INSERT INTO tds_section_codes (code, description, etds_code, parent_code, is_group)
VALUES
  ('192', 'Salary', '192', NULL, true),
  ('193', 'Interest on securities', '193', NULL, true),
  ('194A', 'Interest other than securities', '94A', NULL, true),
  ('194A-BP', 'Bank/Post Office Interest', '94A', '194A', false),
  ('194A-OT', 'Interest any other', '94A', '194A', false),
  ('194C', 'Contractor', '94C', NULL, true),
  ('194C-S', 'Contractor Single Transaction', '94C', '194C', false),
  ('194C-C', 'Contractor Consolidated Payment', '94C', '194C', false),
  ('194D', 'Insurance commission', '94D', NULL, false),
  ('194H', 'Commission or brokerage', '94H', NULL, false),
  ('194I', 'Rent', '94I', NULL, true),
  ('194I-LB', 'Rent Land or Building', '94I', '194I', false),
  ('194I-PM', 'Rent Plant and Machinery', '94I', '194I', false),
  ('194IA', 'Transfer of immovable property', '94IA', NULL, false),
  ('194J', 'Professional Fees', '94J', NULL, true),
  ('194J-PF', 'Professional Fees', '94J', '194J', false),
  ('194Q', 'Purchase of goods', '194Q', NULL, false),
  ('195', 'Non-resident payments', '195', NULL, false),
  ('206C', 'TCS related', '206C', NULL, false)
ON CONFLICT (code) DO UPDATE
SET description = EXCLUDED.description,
    etds_code = EXCLUDED.etds_code,
    parent_code = EXCLUDED.parent_code,
    is_group = EXCLUDED.is_group,
    updated_at = NOW();

INSERT INTO tds_assessee_codes (code, description, is_resident)
VALUES
  ('IND', 'Individual', true),
  ('HUF', 'Hindu Undivided Family', true),
  ('COM', 'Company', true),
  ('FIRM', 'Firm', true),
  ('AOP', 'Association of Persons', true),
  ('BOI', 'Body of Individuals', true),
  ('NRI', 'Non Resident Indian', false),
  ('BAK', 'Bank', true),
  ('GOV', 'Government', true),
  ('OTH', 'Others', true)
ON CONFLICT (code) DO UPDATE
SET description = EXCLUDED.description,
    is_resident = EXCLUDED.is_resident,
    updated_at = NOW();

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tds_section_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tds_assessee_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS pan_no VARCHAR(20),
  ADD COLUMN IF NOT EXISTS lower_deduction_certificate_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS concessional_code VARCHAR(50);

ALTER TABLE purchase_invoices
  ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tds_section_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tds_assessee_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS total_tds_base_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tds_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_payable_amount NUMERIC(18,2) DEFAULT 0;

ALTER TABLE posted_purchase_invoices
  ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tds_section_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tds_assessee_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS total_tds_base_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tds_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_payable_amount NUMERIC(18,2) DEFAULT 0;

ALTER TABLE purchase_order_lines
  ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tds_section_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tds_assessee_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tds_base_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds_pct NUMERIC(7,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS surcharge_pct NUMERIC(7,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cess_pct NUMERIC(7,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tds_pct NUMERIC(7,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_after_tds NUMERIC(18,2) DEFAULT 0;

ALTER TABLE purchase_invoice_lines
  ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tds_section_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tds_assessee_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tds_base_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds_pct NUMERIC(7,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS surcharge_pct NUMERIC(7,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cess_pct NUMERIC(7,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tds_pct NUMERIC(7,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_after_tds NUMERIC(18,2) DEFAULT 0;

ALTER TABLE posted_purchase_invoice_lines
  ADD COLUMN IF NOT EXISTS tds_applicable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tds_section_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tds_assessee_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tds_base_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds_pct NUMERIC(7,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS surcharge_pct NUMERIC(7,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cess_pct NUMERIC(7,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tds_pct NUMERIC(7,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_after_tds NUMERIC(18,2) DEFAULT 0;
