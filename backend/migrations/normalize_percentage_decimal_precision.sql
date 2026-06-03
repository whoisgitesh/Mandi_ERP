/* =========================================================
   NORMALIZE PERCENTAGE DECIMAL PRECISION
   Keeps all percentage fields decimal-friendly for values
   such as 0.10, 0.75, 1.50, 5.25, and 18.00.
========================================================= */

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('gst_rates', 'cgst_pct'),
        ('gst_rates', 'sgst_pct'),
        ('gst_rates', 'igst_pct'),
        ('gst_rates', 'total_gst_pct'),
        ('inward_gate_entry_lines', 'cgst_pct'),
        ('inward_gate_entry_lines', 'sgst_pct'),
        ('inward_gate_entry_lines', 'igst_pct'),
        ('inward_gate_entry_lines', 'total_gst_pct'),
        ('inward_gate_entry_lines', 'tax_pct'),
        ('inward_gate_entry_lines', 'line_discount_pct'),
        ('items', 'purchase_tolerance_pct'),
        ('items', 'sales_tolerance_pct'),
        ('items', 'indirect_cost_pct'),
        ('items', 'profit_pct'),
        ('items', 'scrap_pct'),
        ('posted_purchase_invoice_lines', 'cgst_pct'),
        ('posted_purchase_invoice_lines', 'sgst_pct'),
        ('posted_purchase_invoice_lines', 'igst_pct'),
        ('posted_purchase_invoice_lines', 'total_gst_pct'),
        ('posted_purchase_invoice_lines', 'tax_pct'),
        ('posted_purchase_invoice_lines', 'line_discount_pct'),
        ('posted_purchase_invoice_lines', 'tds_pct'),
        ('posted_purchase_invoice_lines', 'surcharge_pct'),
        ('posted_purchase_invoice_lines', 'cess_pct'),
        ('posted_purchase_invoice_lines', 'total_tds_pct'),
        ('posted_purchase_invoices', 'invoice_discount_pct'),
        ('posted_purchase_receipt_lines', 'cgst_pct'),
        ('posted_purchase_receipt_lines', 'sgst_pct'),
        ('posted_purchase_receipt_lines', 'igst_pct'),
        ('posted_purchase_receipt_lines', 'total_gst_pct'),
        ('posted_purchase_receipt_lines', 'tax_pct'),
        ('posted_purchase_receipt_lines', 'line_discount_pct'),
        ('posted_sales_invoice_lines', 'cgst_pct'),
        ('posted_sales_invoice_lines', 'sgst_pct'),
        ('posted_sales_invoice_lines', 'igst_pct'),
        ('posted_sales_invoice_lines', 'total_gst_pct'),
        ('posted_sales_invoice_lines', 'tax_pct'),
        ('posted_sales_invoice_lines', 'line_discount_pct'),
        ('posted_sales_shipment_line', 'cgst_pct'),
        ('posted_sales_shipment_line', 'sgst_pct'),
        ('posted_sales_shipment_line', 'igst_pct'),
        ('posted_sales_shipment_line', 'total_gst_pct'),
        ('posted_sales_shipment_line', 'tax_pct'),
        ('posted_sales_shipment_line', 'line_discount_pct'),
        ('purchase_invoice_lines', 'cgst_pct'),
        ('purchase_invoice_lines', 'sgst_pct'),
        ('purchase_invoice_lines', 'igst_pct'),
        ('purchase_invoice_lines', 'total_gst_pct'),
        ('purchase_invoice_lines', 'tax_pct'),
        ('purchase_invoice_lines', 'line_discount_pct'),
        ('purchase_invoice_lines', 'tds_pct'),
        ('purchase_invoice_lines', 'surcharge_pct'),
        ('purchase_invoice_lines', 'cess_pct'),
        ('purchase_invoice_lines', 'total_tds_pct'),
        ('purchase_invoices', 'invoice_discount_pct'),
        ('purchase_order_lines', 'cgst_pct'),
        ('purchase_order_lines', 'sgst_pct'),
        ('purchase_order_lines', 'igst_pct'),
        ('purchase_order_lines', 'total_gst_pct'),
        ('purchase_order_lines', 'tax_pct'),
        ('purchase_order_lines', 'line_discount_pct'),
        ('purchase_order_lines', 'tds_pct'),
        ('purchase_order_lines', 'surcharge_pct'),
        ('purchase_order_lines', 'cess_pct'),
        ('purchase_order_lines', 'total_tds_pct'),
        ('purchase_orders', 'payment_discount_pct'),
        ('sales_invoice_line', 'cgst_pct'),
        ('sales_invoice_line', 'sgst_pct'),
        ('sales_invoice_line', 'igst_pct'),
        ('sales_invoice_line', 'total_gst_pct'),
        ('sales_invoice_line', 'tax_pct'),
        ('sales_invoice_line', 'line_discount_pct'),
        ('sales_order_lines', 'cgst_pct'),
        ('sales_order_lines', 'sgst_pct'),
        ('sales_order_lines', 'igst_pct'),
        ('sales_order_lines', 'total_gst_pct'),
        ('sales_order_lines', 'tax_pct'),
        ('sales_order_lines', 'line_discount_pct'),
        ('tds_rates', 'tds_pct'),
        ('tds_rates', 'surcharge_pct'),
        ('tds_rates', 'cess_pct'),
        ('tds_rates', 'total_tds_pct'),
        ('inventory_setup', 'default_dampener_percent')
    ) AS fields(table_name, column_name)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = rec.table_name
        AND column_name = rec.column_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN %I TYPE NUMERIC(7,3) USING COALESCE(%I, 0)::NUMERIC',
        rec.table_name,
        rec.column_name,
        rec.column_name
      );
    END IF;
  END LOOP;
END $$;
