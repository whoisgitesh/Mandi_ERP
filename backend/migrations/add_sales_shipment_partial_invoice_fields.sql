ALTER TABLE posted_sales_shipment_line
ADD COLUMN IF NOT EXISTS quantity_shipped NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantity_invoiced NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS qty_to_invoice NUMERIC(12,2) DEFAULT 0;

ALTER TABLE sales_invoice
ADD COLUMN IF NOT EXISTS source_posted_sales_shipment_id INTEGER;

ALTER TABLE posted_sales_invoices
ADD COLUMN IF NOT EXISTS source_posted_sales_shipment_id INTEGER;

ALTER TABLE posted_sales_invoice_lines
ADD COLUMN IF NOT EXISTS source_shipment_line_no INTEGER,
ADD COLUMN IF NOT EXISTS shipment_line_no INTEGER,
ADD COLUMN IF NOT EXISTS qty_to_invoice NUMERIC(18,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantity_shipped NUMERIC(18,2) DEFAULT 0;

WITH invoice_totals AS (
  SELECT
    psi.source_posted_sales_shipment_id AS posted_sales_shipment_id,
    COALESCE(psil.source_shipment_line_no, psil.shipment_line_no) AS line_no,
    SUM(
      COALESCE(
        NULLIF(psil.qty_to_invoice, 0),
        NULLIF(psil.quantity_invoiced, 0),
        NULLIF(psil.quantity_shipped, 0),
        0
      )
    ) AS quantity_invoiced
  FROM posted_sales_invoice_lines psil
  JOIN posted_sales_invoices psi
    ON psi.id = psil.posted_sales_invoice_id
  WHERE COALESCE(psil.is_deleted, false) = false
    AND COALESCE(psi.is_deleted, false) = false
    AND psi.source_posted_sales_shipment_id IS NOT NULL
    AND COALESCE(psil.source_shipment_line_no, psil.shipment_line_no) IS NOT NULL
  GROUP BY
    psi.source_posted_sales_shipment_id,
    COALESCE(psil.source_shipment_line_no, psil.shipment_line_no)
),
line_totals AS (
  SELECT
    pssl.id,
    COALESCE(NULLIF(pssl.quantity_shipped, 0), pssl.quantity, 0) AS quantity_shipped,
    COALESCE(it.quantity_invoiced, 0) AS quantity_invoiced
  FROM posted_sales_shipment_line pssl
  LEFT JOIN invoice_totals it
    ON it.posted_sales_shipment_id = pssl.posted_sales_shipment_id
   AND it.line_no = pssl.line_no
)
UPDATE posted_sales_shipment_line pssl
SET quantity_shipped = line_totals.quantity_shipped,
    quantity_invoiced = line_totals.quantity_invoiced,
    qty_to_invoice = GREATEST(
      line_totals.quantity_shipped - line_totals.quantity_invoiced,
      0
    )
FROM line_totals
WHERE line_totals.id = pssl.id;

ALTER TABLE sales_invoice_line
ADD COLUMN IF NOT EXISTS source_shipment_no VARCHAR(50),
ADD COLUMN IF NOT EXISTS source_shipment_line_no INTEGER;
