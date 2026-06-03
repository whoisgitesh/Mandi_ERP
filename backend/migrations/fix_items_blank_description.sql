/* =========================================================
   ITEM DESCRIPTION NULL GUARD
   The item master page can save a blank description. The DB
   column is NOT NULL, so normalize explicit NULL to an empty
   string before insert/update.
========================================================= */

CREATE OR REPLACE FUNCTION public.normalize_item_description()
RETURNS trigger AS $$
BEGIN
  NEW.description := COALESCE(NEW.description, '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_items_normalize_description
ON public.items;

CREATE TRIGGER trg_items_normalize_description
BEFORE INSERT OR UPDATE ON public.items
FOR EACH ROW
EXECUTE FUNCTION public.normalize_item_description();
