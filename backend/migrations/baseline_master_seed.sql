INSERT INTO public.locations (
  code,
  name,
  city,
  country,
  blocked,
  is_deleted
)
VALUES
  ('MAIN', 'Main Location', NULL, 'India', false, false)
ON CONFLICT (code) DO UPDATE SET
  name = COALESCE(NULLIF(public.locations.name, ''), EXCLUDED.name),
  blocked = false,
  is_deleted = false,
  updated_at = NOW();

INSERT INTO public.unit_of_measure (
  code,
  description,
  qty_per_unit,
  is_deleted
)
VALUES
  ('PCS', 'Pieces', 1, false),
  ('KG', 'Kilogram', 1, false),
  ('GM', 'Gram', 1, false),
  ('BOX', 'Box', 1, false),
  ('BAG', 'Bag', 1, false)
ON CONFLICT (code) DO UPDATE SET
  description = COALESCE(NULLIF(public.unit_of_measure.description, ''), EXCLUDED.description),
  qty_per_unit = COALESCE(public.unit_of_measure.qty_per_unit, EXCLUDED.qty_per_unit),
  is_deleted = false,
  updated_at = NOW();

UPDATE public.sales_receivables_setup
SET default_location_code = COALESCE(NULLIF(default_location_code, ''), 'MAIN')
WHERE id IN (
  SELECT id FROM public.sales_receivables_setup ORDER BY id LIMIT 1
);

UPDATE public.purchase_payables_setup
SET default_location_code = COALESCE(NULLIF(default_location_code, ''), 'MAIN')
WHERE id IN (
  SELECT id FROM public.purchase_payables_setup ORDER BY id LIMIT 1
);
