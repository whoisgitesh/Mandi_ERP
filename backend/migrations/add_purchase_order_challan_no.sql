ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS challan_no varchar(100);

UPDATE purchase_orders po
SET challan_no = mp.challan_no
FROM mandi_purchase mp
WHERE po.source_mandi_purchase_id = mp.id
  AND po.challan_no IS NULL;
