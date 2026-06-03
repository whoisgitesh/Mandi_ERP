/* =========================================================
   TRANSACTION TABLES FIX
   Adds the document tables referenced by the Node backend
   routes but missing from enterprise_migration_v2.sql.
========================================================= */

CREATE TABLE IF NOT EXISTS mandi_purchase (
    id SERIAL PRIMARY KEY,
    document_no VARCHAR(30) UNIQUE NOT NULL,
    vendor_no VARCHAR(30),
    vendor_name VARCHAR(255),
    posting_date DATE,
    status VARCHAR(30)
      CHECK (status IN ('Open', 'Released', 'PO Created', 'Cancelled'))
      DEFAULT 'Open',
    remarks TEXT,
    challan_no VARCHAR(100),
    serial_no VARCHAR(100),
    name VARCHAR(255),
    po_no VARCHAR(30),
    purchaser_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_mandi_purchase_vendor
      FOREIGN KEY (vendor_no)
      REFERENCES vendors(vendor_no)
);

CREATE TABLE IF NOT EXISTS mandi_purchase_line (
    id SERIAL PRIMARY KEY,
    mandi_purchase_id INTEGER NOT NULL,
    line_no INTEGER,
    item_no VARCHAR(30),
    item_description TEXT,
    variant_code VARCHAR(30),
    quantity NUMERIC(18,2) DEFAULT 0,
    rate NUMERIC(18,2) DEFAULT 0,
    line_amount NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_mandi_purchase_line_header
      FOREIGN KEY (mandi_purchase_id)
      REFERENCES mandi_purchase(id)
      ON DELETE CASCADE,
    CONSTRAINT fk_mandi_purchase_line_item
      FOREIGN KEY (item_no)
      REFERENCES items(item_no)
);

CREATE TABLE IF NOT EXISTS sales_orders (
    id SERIAL PRIMARY KEY,
    document_no VARCHAR(30) UNIQUE NOT NULL,
    customer_no VARCHAR(30),
    customer_name VARCHAR(255),
    posting_date DATE,
    document_date DATE,
    status VARCHAR(30)
      CHECK (status IN ('Open', 'Released', 'Posted', 'Cancelled'))
      DEFAULT 'Open',
    total_amount NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT,
    posted_by TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_sales_order_customer
      FOREIGN KEY (customer_no)
      REFERENCES customers(customer_no)
);

CREATE TABLE IF NOT EXISTS sales_order_lines (
    id SERIAL PRIMARY KEY,
    sales_order_id INTEGER NOT NULL,
    line_no INTEGER,
    item_no VARCHAR(30),
    item_description TEXT,
    variant_code VARCHAR(30),
    location_code VARCHAR(30),
    unit_of_measure_code VARCHAR(20),
    quantity NUMERIC(18,2) DEFAULT 0,
    unit_price NUMERIC(18,2) DEFAULT 0,
    line_discount_pct NUMERIC(18,2) DEFAULT 0,
    line_amount NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_sales_order_line_header
      FOREIGN KEY (sales_order_id)
      REFERENCES sales_orders(id)
      ON DELETE CASCADE,
    CONSTRAINT fk_sales_order_line_item
      FOREIGN KEY (item_no)
      REFERENCES items(item_no),
    CONSTRAINT fk_sales_order_line_location
      FOREIGN KEY (location_code)
      REFERENCES locations(code),
    CONSTRAINT fk_sales_order_line_uom
      FOREIGN KEY (unit_of_measure_code)
      REFERENCES unit_of_measure(code)
);

CREATE TABLE IF NOT EXISTS posted_sales_shipment (
    id SERIAL PRIMARY KEY,
    document_no VARCHAR(30) UNIQUE,
    customer_no VARCHAR(30),
    customer_name VARCHAR(255),
    posting_date DATE,
    document_date DATE,
    source_sales_order_id INTEGER,
    status VARCHAR(30) DEFAULT 'Posted',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    posted_by TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_posted_sales_shipment_customer
      FOREIGN KEY (customer_no)
      REFERENCES customers(customer_no),
    CONSTRAINT fk_posted_sales_shipment_order
      FOREIGN KEY (source_sales_order_id)
      REFERENCES sales_orders(id)
);

CREATE TABLE IF NOT EXISTS posted_sales_shipment_line (
    id SERIAL PRIMARY KEY,
    posted_sales_shipment_id INTEGER NOT NULL,
    line_no INTEGER,
    item_no VARCHAR(30),
    item_description TEXT,
    variant_code VARCHAR(30),
    location_code VARCHAR(30),
    unit_of_measure_code VARCHAR(20),
    quantity NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_posted_sales_shipment_line_header
      FOREIGN KEY (posted_sales_shipment_id)
      REFERENCES posted_sales_shipment(id)
      ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sales_invoice (
    id SERIAL PRIMARY KEY,
    document_no VARCHAR(30) UNIQUE NOT NULL,
    customer_no VARCHAR(30),
    customer_name VARCHAR(255),
    posting_date DATE DEFAULT CURRENT_DATE,
    document_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(30)
      CHECK (status IN ('Open', 'Released', 'Posted', 'Cancelled'))
      DEFAULT 'Open',
    total_amount NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT,
    posted_by TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_sales_invoice_customer
      FOREIGN KEY (customer_no)
      REFERENCES customers(customer_no)
);

CREATE TABLE IF NOT EXISTS sales_invoice_line (
    id SERIAL PRIMARY KEY,
    sales_invoice_id INTEGER NOT NULL,
    line_no INTEGER,
    item_no VARCHAR(30),
    item_description TEXT,
    quantity NUMERIC(18,2) DEFAULT 0,
    unit_price NUMERIC(18,2) DEFAULT 0,
    line_amount NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_sales_invoice_line_header
      FOREIGN KEY (sales_invoice_id)
      REFERENCES sales_invoice(id)
      ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS posted_purchase_receipts (
    id SERIAL PRIMARY KEY,
    document_no VARCHAR(30) UNIQUE NOT NULL,
    vendor_no VARCHAR(30),
    posting_date DATE,
    document_date DATE,
    lr_no VARCHAR(100),
    lr_date DATE,
    description TEXT,
    source_purchase_order_id INTEGER,
    source_inward_gate_entry_id INTEGER,
    vehicle_no VARCHAR(100),
    challan_no VARCHAR(100),
    entry_type VARCHAR(50),
    location_code VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    posted_by TEXT,
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_posted_purchase_receipt_vendor
      FOREIGN KEY (vendor_no)
      REFERENCES vendors(vendor_no),
    CONSTRAINT fk_posted_purchase_receipt_po
      FOREIGN KEY (source_purchase_order_id)
      REFERENCES purchase_orders(id),
    CONSTRAINT fk_posted_purchase_receipt_ige
      FOREIGN KEY (source_inward_gate_entry_id)
      REFERENCES inward_gate_entries(id),
    CONSTRAINT fk_posted_purchase_receipt_location
      FOREIGN KEY (location_code)
      REFERENCES locations(code)
);

CREATE TABLE IF NOT EXISTS posted_purchase_receipt_lines (
    id SERIAL PRIMARY KEY,
    posted_purchase_receipt_id INTEGER NOT NULL,
    line_no INTEGER,
    item_no VARCHAR(30),
    item_description TEXT,
    quantity_received NUMERIC(18,2) DEFAULT 0,
    first_weight NUMERIC(18,2) DEFAULT 0,
    second_weight NUMERIC(18,2) DEFAULT 0,
    net_quantity NUMERIC(18,2) DEFAULT 0,
    vendor_weight NUMERIC(18,2) DEFAULT 0,
    excess_weight NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_posted_purchase_receipt_line_header
      FOREIGN KEY (posted_purchase_receipt_id)
      REFERENCES posted_purchase_receipts(id)
      ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS item_ledger_entries (
    id SERIAL PRIMARY KEY,
    entry_no SERIAL UNIQUE,
    posting_date DATE DEFAULT CURRENT_DATE,
    document_no VARCHAR(30),
    item_no VARCHAR(30),
    location_code VARCHAR(30),
    entry_type VARCHAR(50),
    quantity NUMERIC(18,2) DEFAULT 0,
    remaining_quantity NUMERIC(18,2) DEFAULT 0,
    unit_cost NUMERIC(18,2) DEFAULT 0,
    cost_amount NUMERIC(18,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_item_ledger_item
      FOREIGN KEY (item_no)
      REFERENCES items(item_no),
    CONSTRAINT fk_item_ledger_location
      FOREIGN KEY (location_code)
      REFERENCES locations(code)
);

CREATE INDEX IF NOT EXISTS idx_mandi_purchase_document_no
ON mandi_purchase(document_no);

CREATE INDEX IF NOT EXISTS idx_sales_orders_document_no
ON sales_orders(document_no);

CREATE INDEX IF NOT EXISTS idx_posted_sales_shipment_document_no
ON posted_sales_shipment(document_no);

CREATE INDEX IF NOT EXISTS idx_sales_invoice_document_no
ON sales_invoice(document_no);

CREATE INDEX IF NOT EXISTS idx_posted_purchase_receipts_document_no
ON posted_purchase_receipts(document_no);

CREATE INDEX IF NOT EXISTS idx_item_ledger_entries_entry_no
ON item_ledger_entries(entry_no);
