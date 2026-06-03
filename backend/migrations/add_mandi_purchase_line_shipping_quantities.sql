ALTER TABLE mandi_purchase_line
  ADD COLUMN IF NOT EXISTS shipped_quantity NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_quantity NUMERIC(18,2) DEFAULT 0;

UPDATE mandi_purchase_line
SET
  shipped_quantity = COALESCE(shipped_quantity, 0),
  balance_quantity = COALESCE(quantity, 0) - COALESCE(shipped_quantity, 0),
  line_amount = COALESCE(quantity, 0) * COALESCE(rate, 0),
  updated_at = NOW()
WHERE COALESCE(is_deleted, false) = false;
