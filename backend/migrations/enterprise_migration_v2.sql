/* =========================================================
   ENTERPRISE MIGRATION V2
   SAFE ADDITIVE MIGRATION
   DO NOT MODIFY OLD MIGRATIONS
========================================================= */

/* =========================================================
   EXTENSIONS
========================================================= */

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

/* =========================================================
   LOCATIONS MASTER
========================================================= */

CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,

    code VARCHAR(30) UNIQUE NOT NULL,

    name VARCHAR(255) NOT NULL,

    address TEXT,

    city VARCHAR(100),

    state VARCHAR(100),

    country VARCHAR(100),

    post_code VARCHAR(30),

    phone_no VARCHAR(30),

    blocked BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    created_by TEXT,

    updated_by TEXT,

    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_locations_code
ON locations(code);

/* =========================================================
   UNIT OF MEASURE
========================================================= */

CREATE TABLE IF NOT EXISTS unit_of_measure (
    id SERIAL PRIMARY KEY,

    code VARCHAR(20) UNIQUE NOT NULL,

    description VARCHAR(255),

    qty_per_unit NUMERIC(18,5) DEFAULT 1,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    created_by TEXT,

    updated_by TEXT,

    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_uom_code
ON unit_of_measure(code);

/* =========================================================
   ITEM CATEGORIES
========================================================= */

CREATE TABLE IF NOT EXISTS item_categories (
    id SERIAL PRIMARY KEY,

    code VARCHAR(30) UNIQUE NOT NULL,

    description VARCHAR(255),

    parent_category_code VARCHAR(30),

    blocked BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    is_deleted BOOLEAN DEFAULT FALSE
);

/* =========================================================
   ITEM SUB CATEGORIES
========================================================= */

CREATE TABLE IF NOT EXISTS item_subcategories (
    id SERIAL PRIMARY KEY,

    category_code VARCHAR(30),

    code VARCHAR(30) UNIQUE NOT NULL,

    description VARCHAR(255),

    blocked BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    is_deleted BOOLEAN DEFAULT FALSE
);

/* =========================================================
   CUSTOMERS
========================================================= */

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,

    customer_no VARCHAR(30) UNIQUE NOT NULL,

    name VARCHAR(255) NOT NULL,

    search_name VARCHAR(255),

    address TEXT,

    address_2 TEXT,

    city VARCHAR(100),

    state_code VARCHAR(50),

    country_region_code VARCHAR(50),

    post_code VARCHAR(30),

    phone_no VARCHAR(30),

    mobile_phone_no VARCHAR(30),

    email VARCHAR(255),

    contact_person VARCHAR(255),

    gst_customer_type VARCHAR(100),

    gst_registration_no VARCHAR(50),

    pan_no VARCHAR(20),

    aadhaar_no VARCHAR(20),

    location_code VARCHAR(30),

    responsibility_center VARCHAR(30),

    customer_posting_group VARCHAR(50),

    gen_bus_posting_group VARCHAR(50),

    vat_bus_posting_group VARCHAR(50),

    payment_terms_code VARCHAR(30),

    payment_method_code VARCHAR(30),

    shipment_method_code VARCHAR(30),

    credit_limit NUMERIC(18,2) DEFAULT 0,

    blocked BOOLEAN DEFAULT FALSE,

    opening_balance NUMERIC(18,2) DEFAULT 0,

    closing_balance NUMERIC(18,2) DEFAULT 0,

    balance_lcy NUMERIC(18,2) DEFAULT 0,

    overdue_balance_lcy NUMERIC(18,2) DEFAULT 0,

    sales_lcy NUMERIC(18,2) DEFAULT 0,

    payments_lcy NUMERIC(18,2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    created_by TEXT,

    updated_by TEXT,

    is_deleted BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_customer_location
    FOREIGN KEY (location_code)
    REFERENCES locations(code)
);

CREATE INDEX IF NOT EXISTS idx_customers_customer_no
ON customers(customer_no);

/* =========================================================
   VENDORS
========================================================= */

CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,

    vendor_no VARCHAR(30) UNIQUE NOT NULL,

    name VARCHAR(255) NOT NULL,

    search_name VARCHAR(255),

    address TEXT,

    address_2 TEXT,

    city VARCHAR(100),

    state_code VARCHAR(50),

    country_region_code VARCHAR(50),

    post_code VARCHAR(30),

    phone_no VARCHAR(30),

    mobile_phone_no VARCHAR(30),

    email VARCHAR(255),

    contact_person VARCHAR(255),

    purchaser_code VARCHAR(30),

    responsibility_center VARCHAR(30),

    location_code VARCHAR(30),

    payment_terms_code VARCHAR(30),

    payment_method_code VARCHAR(30),

    shipment_method_code VARCHAR(30),

    gst_registration_no VARCHAR(50),

    gst_vendor_type VARCHAR(100),

    pan_no VARCHAR(20),

    pan_status VARCHAR(50),

    pan_reference_no VARCHAR(100),

    msme BOOLEAN DEFAULT FALSE,

    msme_no VARCHAR(100),

    subcontractor BOOLEAN DEFAULT FALSE,

    transporter BOOLEAN DEFAULT FALSE,

    bank_name VARCHAR(255),

    bank_account_no VARCHAR(100),

    ifsc_code VARCHAR(30),

    balance_lcy NUMERIC(18,2) DEFAULT 0,

    balance_due_lcy NUMERIC(18,2) DEFAULT 0,

    payments_lcy NUMERIC(18,2) DEFAULT 0,

    blocked BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    created_by TEXT,

    updated_by TEXT,

    is_deleted BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_vendor_location
    FOREIGN KEY (location_code)
    REFERENCES locations(code)
);

CREATE INDEX IF NOT EXISTS idx_vendors_vendor_no
ON vendors(vendor_no);

/* =========================================================
   ITEMS
========================================================= */

CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,

    item_no VARCHAR(30) UNIQUE NOT NULL,

    description TEXT NOT NULL,

    description_2 TEXT,

    search_description TEXT,

    blocked BOOLEAN DEFAULT FALSE,

    type VARCHAR(50) DEFAULT 'Inventory',

    base_unit_of_measure VARCHAR(20),

    sales_unit_of_measure VARCHAR(20),

    purch_unit_of_measure VARCHAR(20),

    report_unit_of_measure VARCHAR(20),

    item_category_code VARCHAR(30),

    sub_category_code VARCHAR(30),

    brand_name VARCHAR(100),

    vendor_no VARCHAR(30),

    vendor_item_no VARCHAR(100),

    inventory NUMERIC(18,2) DEFAULT 0,

    qty_on_purch_order NUMERIC(18,2) DEFAULT 0,

    qty_on_sales_order NUMERIC(18,2) DEFAULT 0,

    qty_on_service_order NUMERIC(18,2) DEFAULT 0,

    qty_on_assembly_order NUMERIC(18,2) DEFAULT 0,

    standard_cost NUMERIC(18,2) DEFAULT 0,

    unit_cost NUMERIC(18,2) DEFAULT 0,

    unit_price NUMERIC(18,2) DEFAULT 0,

    indirect_cost_pct NUMERIC(18,2) DEFAULT 0,

    profit_pct NUMERIC(18,2) DEFAULT 0,

    costing_method VARCHAR(50) DEFAULT 'FIFO',

    replenishment_system VARCHAR(50) DEFAULT 'Purchase',

    manufacturing_policy VARCHAR(50),

    stockout_warning VARCHAR(50),

    prevent_negative_inventory VARCHAR(50),

    net_weight NUMERIC(18,2) DEFAULT 0,

    gross_weight NUMERIC(18,2) DEFAULT 0,

    unit_volume NUMERIC(18,2) DEFAULT 0,

    reorder_point NUMERIC(18,2) DEFAULT 0,

    reorder_quantity NUMERIC(18,2) DEFAULT 0,

    maximum_inventory NUMERIC(18,2) DEFAULT 0,

    minimum_order_quantity NUMERIC(18,2) DEFAULT 0,

    maximum_order_quantity NUMERIC(18,2) DEFAULT 0,

    safety_stock_quantity NUMERIC(18,2) DEFAULT 0,

    order_multiple NUMERIC(18,2) DEFAULT 0,

    quality_to_be_done BOOLEAN DEFAULT FALSE,

    automatic_ext_texts BOOLEAN DEFAULT FALSE,

    stockkeeping_unit_exists BOOLEAN DEFAULT FALSE,

    critical BOOLEAN DEFAULT FALSE,

    allow_whse_overpick BOOLEAN DEFAULT FALSE,

    sales_blocked BOOLEAN DEFAULT FALSE,

    purchasing_blocked BOOLEAN DEFAULT FALSE,

    service_blocked BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    created_by TEXT,

    updated_by TEXT,

    is_deleted BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_item_vendor
    FOREIGN KEY (vendor_no)
    REFERENCES vendors(vendor_no),

    CONSTRAINT fk_item_category
    FOREIGN KEY (item_category_code)
    REFERENCES item_categories(code),

    CONSTRAINT fk_item_subcategory
    FOREIGN KEY (sub_category_code)
    REFERENCES item_subcategories(code)
);

CREATE INDEX IF NOT EXISTS idx_items_item_no
ON items(item_no);

/* =========================================================
   ITEM VARIANTS
========================================================= */

CREATE TABLE IF NOT EXISTS item_variants (
    id SERIAL PRIMARY KEY,

    item_id INTEGER NOT NULL,

    item_no VARCHAR(30),

    code VARCHAR(30),

    description TEXT,

    description_2 TEXT,

    blocked BOOLEAN DEFAULT FALSE,

    weight NUMERIC(18,2) DEFAULT 0,

    unit_of_measure_code VARCHAR(20),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    is_deleted BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_variant_item
    FOREIGN KEY (item_id)
    REFERENCES items(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_variant_uom
    FOREIGN KEY (unit_of_measure_code)
    REFERENCES unit_of_measure(code),

    CONSTRAINT uq_variant_item_code
    UNIQUE(item_id, code)
);

/* =========================================================
   ITEM QUALITY SPECS
========================================================= */

CREATE TABLE IF NOT EXISTS item_quality_specs (
    id SERIAL PRIMARY KEY,

    item_id INTEGER NOT NULL,

    specification TEXT,

    expected_value TEXT,

    tolerance TEXT,

    mandatory BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    is_deleted BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_quality_item
    FOREIGN KEY (item_id)
    REFERENCES items(id)
    ON DELETE CASCADE
);

/* =========================================================
   PURCHASE ORDERS
========================================================= */

CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,

    document_no VARCHAR(30) UNIQUE NOT NULL,

    vendor_no VARCHAR(30),

    order_date DATE,

    posting_date DATE,

    document_date DATE,

    due_date DATE,

    vendor_invoice_no VARCHAR(100),

    quote_no VARCHAR(100),

    location_code VARCHAR(30),

    purchaser_code VARCHAR(30),

    payment_terms_code VARCHAR(30),

    payment_method_code VARCHAR(30),

    shipment_method_code VARCHAR(30),

    currency_code VARCHAR(20),

    currency_factor NUMERIC(18,5) DEFAULT 1,

    status VARCHAR(30)
    CHECK (
      status IN (
        'Open',
        'Released',
        'Posted',
        'Cancelled'
      )
    )
    DEFAULT 'Open',

    narration TEXT,

    total_amount NUMERIC(18,2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    created_by TEXT,

    updated_by TEXT,

    posted_by TEXT,

    is_deleted BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_po_vendor
    FOREIGN KEY (vendor_no)
    REFERENCES vendors(vendor_no),

    CONSTRAINT fk_po_location
    FOREIGN KEY (location_code)
    REFERENCES locations(code)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_document_no
ON purchase_orders(document_no);

/* =========================================================
   PURCHASE ORDER LINES
========================================================= */

CREATE TABLE IF NOT EXISTS purchase_order_lines (
    id SERIAL PRIMARY KEY,

    purchase_order_id INTEGER NOT NULL,

    document_no VARCHAR(30),

    line_no INTEGER,

    type VARCHAR(30) DEFAULT 'Item',

    item_no VARCHAR(30),

    item_description TEXT,

    variant_code VARCHAR(30),

    location_code VARCHAR(30),

    unit_of_measure_code VARCHAR(20),

    quantity NUMERIC(18,2) DEFAULT 0,

    direct_unit_cost_excl_vat NUMERIC(18,2) DEFAULT 0,

    line_discount_pct NUMERIC(18,2) DEFAULT 0,

    line_amount NUMERIC(18,2) DEFAULT 0,

    qty_to_receive NUMERIC(18,2) DEFAULT 0,

    received_quantity NUMERIC(18,2) DEFAULT 0,

    rejected_qty NUMERIC(18,2) DEFAULT 0,

    gross_weight NUMERIC(18,2) DEFAULT 0,

    net_weight NUMERIC(18,2) DEFAULT 0,

    hsn_sac_code VARCHAR(50),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    is_deleted BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_po_line_header
    FOREIGN KEY (purchase_order_id)
    REFERENCES purchase_orders(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_po_line_item
    FOREIGN KEY (item_no)
    REFERENCES items(item_no),

    CONSTRAINT fk_po_line_location
    FOREIGN KEY (location_code)
    REFERENCES locations(code),

    CONSTRAINT fk_po_line_uom
    FOREIGN KEY (unit_of_measure_code)
    REFERENCES unit_of_measure(code)
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_document_no
ON purchase_order_lines(document_no);

/* =========================================================
   INWARD GATE ENTRIES
========================================================= */

CREATE TABLE IF NOT EXISTS inward_gate_entries (
    id SERIAL PRIMARY KEY,

    document_no VARCHAR(30) UNIQUE NOT NULL,

    source_purchase_order_id INTEGER,

    vendor_no VARCHAR(30),

    location_code VARCHAR(30),

    document_date DATE,

    posting_date DATE,

    status VARCHAR(30)
    CHECK (
      status IN (
        'Open',
        'Posted',
        'Cancelled'
      )
    )
    DEFAULT 'Open',

    remarks TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    created_by TEXT,

    updated_by TEXT,

    posted_by TEXT,

    is_deleted BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_ige_po
    FOREIGN KEY (source_purchase_order_id)
    REFERENCES purchase_orders(id),

    CONSTRAINT fk_ige_vendor
    FOREIGN KEY (vendor_no)
    REFERENCES vendors(vendor_no),

    CONSTRAINT fk_ige_location
    FOREIGN KEY (location_code)
    REFERENCES locations(code)
);

CREATE INDEX IF NOT EXISTS idx_ige_document_no
ON inward_gate_entries(document_no);

/* =========================================================
   INWARD GATE ENTRY LINES
========================================================= */

CREATE TABLE IF NOT EXISTS inward_gate_entry_lines (
    id SERIAL PRIMARY KEY,

    inward_gate_entry_id INTEGER NOT NULL,

    po_line_id INTEGER,

    line_no INTEGER,

    item_no VARCHAR(30),

    item_description TEXT,

    variant_code VARCHAR(30),

    po_quantity NUMERIC(18,2) DEFAULT 0,

    po_pending_quantity NUMERIC(18,2) DEFAULT 0,

    bill_quantity NUMERIC(18,2) DEFAULT 0,

    qty_per_bag NUMERIC(18,2) DEFAULT 0,

    receive_bags NUMERIC(18,2) DEFAULT 0,

    actual_quantity NUMERIC(18,2) DEFAULT 0,

    received_quantity NUMERIC(18,2) DEFAULT 0,

    rejected_quantity NUMERIC(18,2) DEFAULT 0,

    balance_quantity NUMERIC(18,2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    is_deleted BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_ige_line_header
    FOREIGN KEY (inward_gate_entry_id)
    REFERENCES inward_gate_entries(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_ige_line_po_line
    FOREIGN KEY (po_line_id)
    REFERENCES purchase_order_lines(id),

    CONSTRAINT fk_ige_line_item
    FOREIGN KEY (item_no)
    REFERENCES items(item_no)
);

/* =========================================================
   DEFAULT UOM
========================================================= */

INSERT INTO unit_of_measure (
    code,
    description
)
VALUES
('PCS', 'Pieces'),
('KG', 'Kilogram'),
('BOX', 'Box'),
('LTR', 'Litre')
ON CONFLICT (code) DO NOTHING;

/* =========================================================
   DEFAULT LOCATION
========================================================= */

INSERT INTO locations (
    code,
    name
)
VALUES
('MAIN', 'Main Location')
ON CONFLICT (code) DO NOTHING;
