/* =========================================================
   INWARD GATE ENTRY NO. SERIES
   Required when creating IGE documents from Purchase Orders.
========================================================= */

INSERT INTO public.number_series (
  code,
  description,
  manual_nos,
  date_order
)
VALUES (
  'INWARD_GATE_ENTRY',
  'Inward Gate Entry',
  false,
  false
)
ON CONFLICT (code)
DO UPDATE SET
  description = EXCLUDED.description,
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
  'INWARD_GATE_ENTRY',
  CURRENT_DATE,
  'IGE-00001',
  'IGE-99999',
  NULL,
  1,
  true,
  false,
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM public.no_series_lines
  WHERE no_series_code = 'INWARD_GATE_ENTRY'
);
