/* =========================================================
   MANDI VENDOR MASTER
   Required by /api/mandi-vendors and the Mandi Vendor page.
========================================================= */

CREATE TABLE IF NOT EXISTS public.mandi_vendor (
  id SERIAL PRIMARY KEY,
  vendor_no VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  phone_no VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT false
);

DROP TRIGGER IF EXISTS trg_mandi_vendor_updated
ON public.mandi_vendor;

CREATE TRIGGER trg_mandi_vendor_updated
BEFORE UPDATE ON public.mandi_vendor
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
