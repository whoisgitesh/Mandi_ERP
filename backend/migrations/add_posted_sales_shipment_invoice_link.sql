/* =========================================================
   POSTED SALES SHIPMENT -> SALES INVOICE LINK
========================================================= */

ALTER TABLE public.sales_invoice
  ADD COLUMN IF NOT EXISTS source_posted_sales_shipment_id INTEGER;

ALTER TABLE public.posted_sales_invoices
  ADD COLUMN IF NOT EXISTS source_posted_sales_shipment_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_sales_invoice_source_posted_sales_shipment'
  ) THEN
    ALTER TABLE public.sales_invoice
      ADD CONSTRAINT fk_sales_invoice_source_posted_sales_shipment
      FOREIGN KEY (source_posted_sales_shipment_id)
      REFERENCES public.posted_sales_shipment(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_posted_sales_invoice_source_posted_sales_shipment'
  ) THEN
    ALTER TABLE public.posted_sales_invoices
      ADD CONSTRAINT fk_posted_sales_invoice_source_posted_sales_shipment
      FOREIGN KEY (source_posted_sales_shipment_id)
      REFERENCES public.posted_sales_shipment(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sales_invoice_source_posted_sales_shipment
ON public.sales_invoice(source_posted_sales_shipment_id);
