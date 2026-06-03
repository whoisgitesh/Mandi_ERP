CREATE TABLE IF NOT EXISTS gst_setup (
  id SERIAL PRIMARY KEY,
  gst_tax_type VARCHAR(50) DEFAULT 'GST',
  cess_tax_type VARCHAR(50) DEFAULT 'GST CESS',
  generate_einv_on_service_post BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO gst_setup (
  id,
  gst_tax_type,
  cess_tax_type,
  generate_einv_on_service_post
)
VALUES (
  1,
  'GST',
  'GST CESS',
  false
)
ON CONFLICT (id) DO NOTHING;
