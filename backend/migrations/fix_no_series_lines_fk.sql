/* =========================================================
   FIX NO. SERIES LINE PARENT TABLE
   New No. Series headers are stored in public.number_series.
   Older databases can still have no_series_lines.no_series_code
   constrained against legacy public.no_series(code), which blocks
   saving lines for newly-created series.
========================================================= */

INSERT INTO public.number_series (
  code,
  description,
  manual_nos,
  date_order
)
SELECT
  code,
  description,
  false,
  false
FROM public.no_series
ON CONFLICT (code)
DO UPDATE SET
  description = COALESCE(EXCLUDED.description, public.number_series.description),
  updated_at = NOW();

ALTER TABLE public.no_series_lines
  DROP CONSTRAINT IF EXISTS no_series_lines_series_code_fkey;

ALTER TABLE public.no_series_lines
  DROP CONSTRAINT IF EXISTS no_series_lines_no_series_code_fkey;

ALTER TABLE public.no_series_lines
  ADD CONSTRAINT no_series_lines_no_series_code_fkey
  FOREIGN KEY (no_series_code)
  REFERENCES public.number_series(code)
  ON DELETE CASCADE;
