INSERT INTO no_series_lines (
  no_series_code,
  sequence_no,
  starting_no,
  ending_no,
  last_no_used,
  increment_by,
  open
)
SELECT 'CUST', 1, 'CUST-00001', 'CUST-99999', NULL, 1, true
WHERE EXISTS (SELECT 1 FROM number_series WHERE code = 'CUST')
  AND NOT EXISTS (
    SELECT 1
    FROM no_series_lines
    WHERE no_series_code = 'CUST'
  );

INSERT INTO no_series_lines (
  no_series_code,
  sequence_no,
  starting_no,
  ending_no,
  last_no_used,
  increment_by,
  open
)
SELECT 'LOCATION', 1, 'LOC-00001', 'LOC-99999', NULL, 1, true
WHERE EXISTS (SELECT 1 FROM number_series WHERE code = 'LOCATION')
  AND NOT EXISTS (
    SELECT 1
    FROM no_series_lines
    WHERE no_series_code = 'LOCATION'
  );

INSERT INTO no_series_lines (
  no_series_code,
  sequence_no,
  starting_no,
  ending_no,
  last_no_used,
  increment_by,
  open
)
SELECT 'UOM', 1, 'UOM-00001', 'UOM-99999', NULL, 1, true
WHERE EXISTS (SELECT 1 FROM number_series WHERE code = 'UOM')
  AND NOT EXISTS (
    SELECT 1
    FROM no_series_lines
    WHERE no_series_code = 'UOM'
  );
