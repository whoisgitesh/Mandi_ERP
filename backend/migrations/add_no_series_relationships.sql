CREATE TABLE IF NOT EXISTS public.no_series_relationships (
  id SERIAL PRIMARY KEY,
  series_code VARCHAR(50) NOT NULL REFERENCES public.number_series(code) ON DELETE CASCADE,
  related_series_code VARCHAR(50) NOT NULL REFERENCES public.number_series(code) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_no_series_relationships UNIQUE (series_code, related_series_code),
  CONSTRAINT chk_no_series_relationship_not_self CHECK (series_code <> related_series_code)
);

DROP TRIGGER IF EXISTS trg_no_series_relationships_updated
ON public.no_series_relationships;

CREATE TRIGGER trg_no_series_relationships_updated
BEFORE UPDATE ON public.no_series_relationships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
