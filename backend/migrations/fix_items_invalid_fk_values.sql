/* =========================================================
   ITEM OPTIONAL FK NORMALIZATION
   Item master can be saved before category/subcategory/vendor
   master values exist. Invalid optional FK values are normalized
   to NULL instead of blocking item creation.
========================================================= */

CREATE OR REPLACE FUNCTION public.normalize_item_optional_fks()
RETURNS trigger AS $$
BEGIN
  IF NEW.item_category_code IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.item_categories
       WHERE code = NEW.item_category_code
         AND COALESCE(is_deleted, false) = false
     ) THEN
    NEW.item_category_code := NULL;
  END IF;

  IF NEW.sub_category_code IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.item_subcategories
       WHERE code = NEW.sub_category_code
         AND COALESCE(is_deleted, false) = false
     ) THEN
    NEW.sub_category_code := NULL;
  END IF;

  IF NEW.vendor_no IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.vendors
       WHERE vendor_no = NEW.vendor_no
         AND COALESCE(is_deleted, false) = false
     ) THEN
    NEW.vendor_no := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_items_normalize_optional_fks
ON public.items;

CREATE TRIGGER trg_items_normalize_optional_fks
BEFORE INSERT OR UPDATE ON public.items
FOR EACH ROW
EXECUTE FUNCTION public.normalize_item_optional_fks();
