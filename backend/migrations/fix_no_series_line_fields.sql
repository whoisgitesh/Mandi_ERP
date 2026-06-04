/* =========================================================
   FIX NO. SERIES LINE FIELDS
   Aligns no_series_lines with the BC-style No. Series page.
========================================================= */

ALTER TABLE public.no_series_lines
  ADD COLUMN IF NOT EXISTS starting_date date,
  ADD COLUMN IF NOT EXISTS open boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_gaps boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sequence_no integer,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.no_series_lines
  ALTER COLUMN ending_no DROP NOT NULL;

UPDATE public.no_series_lines
SET
  open = COALESCE(open, true),
  allow_gaps = COALESCE(allow_gaps, false);

WITH numbered_lines AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY no_series_code
      ORDER BY
        COALESCE(starting_date, DATE '1900-01-01'),
        starting_no,
        id::text
    ) AS generated_sequence_no
  FROM public.no_series_lines
  WHERE sequence_no IS NULL
)
UPDATE public.no_series_lines line
SET sequence_no = numbered_lines.generated_sequence_no
FROM numbered_lines
WHERE line.id = numbered_lines.id;
