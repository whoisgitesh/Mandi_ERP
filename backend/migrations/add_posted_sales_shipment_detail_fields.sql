ALTER TABLE posted_sales_shipment
  ADD COLUMN IF NOT EXISTS source_sales_order_no varchar(50),
  ADD COLUMN IF NOT EXISTS shipment_date date,
  ADD COLUMN IF NOT EXISTS location_code varchar(50),
  ADD COLUMN IF NOT EXISTS salesperson_code varchar(50),
  ADD COLUMN IF NOT EXISTS shipment_method_code varchar(50),
  ADD COLUMN IF NOT EXISTS external_document_no varchar(100),
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city varchar(100),
  ADD COLUMN IF NOT EXISTS post_code varchar(30);

ALTER TABLE posted_sales_shipment_line
  ADD COLUMN IF NOT EXISTS quantity_shipped numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_quantity numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS line_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sales_order_line_id integer;
