/* =========================================================
   TDS NO. SERIES SEED
   Ensures TDS Setup lookup values exist in the current
   Business Central-style number_series master.
========================================================= */

INSERT INTO public.number_series (code, description)
VALUES
  ('TDS_CHALLAN', 'TDS Challan Nos'),
  ('NIL_TDS_DOC', 'Nil Pay TDS Document Nos')
ON CONFLICT (code)
DO UPDATE SET
  description = COALESCE(NULLIF(public.number_series.description, ''), EXCLUDED.description),
  updated_at = NOW();

INSERT INTO public.no_series_lines (
  no_series_code,
  starting_date,
  starting_no,
  ending_no,
  last_no_used,
  increment_by,
  open,
  allow_gaps,
  sequence_no
)
SELECT
  seed.code,
  CURRENT_DATE,
  seed.starting_no,
  seed.ending_no,
  NULL,
  1,
  true,
  false,
  1
FROM (
  VALUES
    ('TDS_CHALLAN', 'TDS-00001', 'TDS-99999'),
    ('NIL_TDS_DOC', 'NIL-00001', 'NIL-99999')
) AS seed(code, starting_no, ending_no)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.no_series_lines nsl
  WHERE nsl.no_series_code = seed.code
);
