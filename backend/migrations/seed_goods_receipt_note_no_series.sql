INSERT INTO number_series (
  code,
  description,
  manual_nos,
  date_order
)
VALUES (
  'GOODS_RECEIPT_NOTE',
  'Goods Receipt Note Nos.',
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
  'GOODS_RECEIPT_NOTE',
  1,
  CURRENT_DATE,
  'GRN-00001',
  'GRN-99999',
  NULL,
  1,
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM no_series_lines
  WHERE no_series_code = 'GOODS_RECEIPT_NOTE'
);
