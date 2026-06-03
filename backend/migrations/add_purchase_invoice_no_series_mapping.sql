/* =========================================================
   PURCHASE INVOICE NO. SERIES + PAGE MAPPING
   Uses the ERP's active No. Series tables:
   - number_series is the current No. Series header table
   - no_series_lines stores ranges and last used numbers
   - no_series_page_mapping controls page/document mapping
========================================================= */

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.no_series_page_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL,
  page_name text NOT NULL,
  no_series_code text NOT NULL REFERENCES public.number_series(code) ON DELETE RESTRICT,
  document_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_no_series_page_mapping_page_key
ON public.no_series_page_mapping(page_key);

INSERT INTO public.number_series (
  code,
  description,
  manual_nos,
  date_order
)
VALUES
  ('PURCHASE_INVOICE', 'Purchase Invoice Nos', false, false),
  ('POSTED_PURCHASE_INVOICE', 'Posted Purchase Invoice Nos', false, false)
ON CONFLICT (code)
DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

DO $$
BEGIN
  IF to_regclass('public.no_series') IS NOT NULL THEN
    INSERT INTO public.no_series (
      code,
      description
    )
    VALUES
      ('PURCHASE_INVOICE', 'Purchase Invoice Nos'),
      ('POSTED_PURCHASE_INVOICE', 'Posted Purchase Invoice Nos')
    ON CONFLICT (code)
    DO UPDATE SET
      description = EXCLUDED.description;
  END IF;
END $$;

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
    ('PURCHASE_INVOICE', 'PI-00001', 'PI-99999'),
    ('POSTED_PURCHASE_INVOICE', 'PPI-00001', 'PPI-99999')
) AS seed(code, starting_no, ending_no)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.no_series_lines nsl
  WHERE nsl.no_series_code = seed.code
);

INSERT INTO public.no_series_page_mapping (
  page_key,
  page_name,
  no_series_code,
  document_type
)
VALUES
  (
    'purchase_invoices',
    'Purchase Invoice',
    'PURCHASE_INVOICE',
    'DOCUMENT'
  ),
  (
    'posted_purchase_invoices',
    'Posted Purchase Invoice',
    'POSTED_PURCHASE_INVOICE',
    'POSTED_DOCUMENT'
  )
ON CONFLICT (page_key)
DO UPDATE SET
  page_name = EXCLUDED.page_name,
  no_series_code = EXCLUDED.no_series_code,
  document_type = EXCLUDED.document_type,
  updated_at = NOW();
