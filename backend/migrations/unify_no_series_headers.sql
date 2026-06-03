/* =========================================================
   UNIFY NO. SERIES HEADERS
   The BC-style setup pages reference public.number_series.
   Copy legacy public.no_series headers into public.number_series
   so setup dropdowns and the No. Series page share one list.
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
  description = COALESCE(
    EXCLUDED.description,
    public.number_series.description
  ),
  updated_at = NOW();
