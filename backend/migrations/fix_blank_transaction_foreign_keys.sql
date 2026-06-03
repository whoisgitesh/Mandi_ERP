/* =========================================================
   BLANK TRANSACTION FK NORMALIZATION
   New document buttons create empty headers before a customer
   or vendor is selected. Empty string FK values should be NULL.
========================================================= */

CREATE OR REPLACE FUNCTION public.normalize_sales_order_customer_fk()
RETURNS trigger AS $$
BEGIN
  NEW.customer_no := NULLIF(NEW.customer_no, '');
  NEW.customer_name := NULLIF(NEW.customer_name, '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_orders_normalize_customer_fk
ON public.sales_orders;

CREATE TRIGGER trg_sales_orders_normalize_customer_fk
BEFORE INSERT OR UPDATE ON public.sales_orders
FOR EACH ROW
EXECUTE FUNCTION public.normalize_sales_order_customer_fk();

CREATE OR REPLACE FUNCTION public.normalize_mandi_purchase_vendor_fk()
RETURNS trigger AS $$
BEGIN
  NEW.vendor_no := NULLIF(NEW.vendor_no, '');
  NEW.vendor_name := NULLIF(NEW.vendor_name, '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mandi_purchase_normalize_vendor_fk
ON public.mandi_purchase;

CREATE TRIGGER trg_mandi_purchase_normalize_vendor_fk
BEFORE INSERT OR UPDATE ON public.mandi_purchase
FOR EACH ROW
EXECUTE FUNCTION public.normalize_mandi_purchase_vendor_fk();
