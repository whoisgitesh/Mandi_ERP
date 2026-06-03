CREATE TABLE IF NOT EXISTS inward_gate_entry_quality (
  id SERIAL PRIMARY KEY,
  inward_gate_entry_id INTEGER NOT NULL REFERENCES inward_gate_entries(id) ON DELETE CASCADE,
  inward_gate_entry_line_id INTEGER NOT NULL REFERENCES inward_gate_entry_lines(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
  item_no VARCHAR(50),
  spec_id INTEGER REFERENCES item_quality_specs(id) ON DELETE SET NULL,
  specification TEXT,
  expected_value TEXT,
  tolerance TEXT,
  actual_value TEXT,
  result VARCHAR(30),
  remarks TEXT,
  quality_stage VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_ige_quality_line_stage
ON inward_gate_entry_quality(inward_gate_entry_line_id, quality_stage);
