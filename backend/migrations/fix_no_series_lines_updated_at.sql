/* =========================================================
   FIX NO. SERIES LINES UPDATED_AT
   Existing DB has trg_no_series_lines_updated, but older
   no_series_lines table was missing updated_at.
========================================================= */

ALTER TABLE public.no_series_lines
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
