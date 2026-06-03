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
  allow_gaps = COALESCE(allow_gaps, false),
  sequence_no = COALESCE(sequence_no, id)
WHERE sequence_no IS NULL;
