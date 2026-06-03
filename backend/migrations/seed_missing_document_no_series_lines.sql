/* =========================================================
   DEFAULT DOCUMENT NO. SERIES LINES
   Headers alone cannot generate numbers. This seeds one open
   default range for document series that have no lines yet.
========================================================= */

INSERT INTO public.no_series_lines (
  no_series_code,
  starting_date,
  starting_no,
  ending_no,
  last_no_used,
  increment_by,
  open,
  allow_gaps,
  sequence_no
)
SELECT
  seed.code,
  CURRENT_DATE,
  seed.starting_no,
  seed.ending_no,
  NULL,
  1,
  true,
  false,
  1
FROM (
  VALUES
    ('MANDI_PURCHASE', 'MP-00001', 'MP-99999'),
    ('SALES_ORDER', 'SO-00001', 'SO-99999'),
    ('PURCHASE_ORDER', 'PO-00001', 'PO-99999'),
    ('SALES_INVOICE', 'SI-00001', 'SI-99999'),
    ('SALES_SHIPMENT', 'SS-00001', 'SS-99999'),
    ('POSTED_PURCHASE_RECEIPT', 'PPR-00001', 'PPR-99999')
) AS seed(code, starting_no, ending_no)
WHERE EXISTS (
  SELECT 1
  FROM public.number_series ns
  WHERE ns.code = seed.code
)
AND NOT EXISTS (
  SELECT 1
  FROM public.no_series_lines nsl
  WHERE nsl.no_series_code = seed.code
);
