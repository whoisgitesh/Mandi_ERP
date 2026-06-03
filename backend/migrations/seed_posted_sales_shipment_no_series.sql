INSERT INTO number_series (
  code,
  description,
  manual_nos,
  date_order
)
VALUES (
  'POSTED_SALES_SHIPMENT',
  'Posted Sales Shipment Nos.',
  false,
  false
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO no_series_lines (
  no_series_code,
  sequence_no,
  starting_date,
  starting_no,
  ending_no,
  last_no_used,
  increment_by,
  open
)
SELECT
  'POSTED_SALES_SHIPMENT',
  1,
  CURRENT_DATE,
  'PSS-00001',
  'PSS-99999',
  NULL,
  1,
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM no_series_lines
  WHERE no_series_code = 'POSTED_SALES_SHIPMENT'
);

UPDATE sales_receivables_setup
SET
  posted_shipment_nos = COALESCE(NULLIF(posted_shipment_nos, ''), 'POSTED_SALES_SHIPMENT'),
  posted_sales_shipment_nos = COALESCE(NULLIF(posted_sales_shipment_nos, ''), 'POSTED_SALES_SHIPMENT'),
  updated_at = NOW();
