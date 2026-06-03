const db = require("../db.cjs");

const INDIAN_STATES = [
  ["AD", "Andhra Pradesh", "02", "37"],
  ["AN", "Andaman and Nicobar Islands", "01", "35"],
  ["AR", "Arunachal Pradesh", "03", "12"],
  ["AS", "Assam", "04", "18"],
  ["BR", "Bihar", "05", "10"],
  ["CG", "Chhattisgarh", "33", "22"],
  ["CH", "Chandigarh", "06", "04"],
  ["DD", "Daman and Diu", "08", "25"],
  ["DL", "Delhi", "07", "07"],
  ["DN", "Dadra and Nagar Haveli", "07", "26"],
  ["GA", "Goa", "10", "30"],
  ["GJ", "Gujarat", "11", "24"],
  ["HP", "Himachal Pradesh", "13", "02"],
  ["HR", "Haryana", "12", "06"],
  ["JH", "Jharkhand", "35", "20"],
  ["JK", "Jammu and Kashmir", "14", "01"],
  ["KA", "Karnataka", "15", "29"],
  ["KL", "Kerala", "16", "32"],
  ["LA", "Ladakh", "37", "38"],
  ["LD", "Lakshadweep Islands", "17", "31"],
  ["MH", "Maharashtra", "19", "27"],
  ["ML", "Meghalaya", "21", "17"],
  ["MN", "Manipur", "20", "14"],
  ["MP", "Madhya Pradesh", "18", "23"],
  ["MZ", "Mizoram", "28", "15"],
  ["NL", "Nagaland", "25", "13"],
  ["OD", "Odisha", "26", "21"],
  ["PB", "Punjab", "22", "03"],
  ["PY", "Puducherry", "27", "34"],
  ["RJ", "Rajasthan", "23", "08"],
  ["SK", "Sikkim", "24", "11"],
  ["TN", "Tamil Nadu", "29", "33"],
  ["TR", "Tripura", "30", "16"],
  ["TS", "Telangana", "36", "36"],
  ["UK", "Uttarakhand", "32", "05"],
  ["UP", "Uttar Pradesh", "31", "09"],
  ["WB", "West Bengal", "34", "19"],
];

const cleanCode = (value) => String(value ?? "").trim().toUpperCase();

async function ensureStatesSchema(connection = db) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS states (
      code VARCHAR(10) PRIMARY KEY,
      description VARCHAR(100) NOT NULL,
      etds_tcs_state_code VARCHAR(10),
      gst_state_code VARCHAR(10),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    ALTER TABLE states
      ADD COLUMN IF NOT EXISTS etds_tcs_state_code VARCHAR(10),
      ADD COLUMN IF NOT EXISTS gst_state_code VARCHAR(10),
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await connection.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS states_gst_state_code_unique
      ON states (gst_state_code)
      WHERE gst_state_code IS NOT NULL AND gst_state_code <> ''
  `);

  for (const [code, description, etdsCode, gstCode] of INDIAN_STATES) {
    await connection.query(
      `
      INSERT INTO states (
        code,
        description,
        etds_tcs_state_code,
        gst_state_code,
        is_active
      )
      VALUES ($1,$2,$3,$4,true)
      ON CONFLICT (code) DO UPDATE
      SET
        description = EXCLUDED.description,
        etds_tcs_state_code = EXCLUDED.etds_tcs_state_code,
        gst_state_code = EXCLUDED.gst_state_code,
        updated_at = NOW()
      `,
      [code, description, etdsCode, gstCode]
    );
  }
}

async function resolveStateCode(connection = db, value) {
  const input = cleanCode(value);
  if (!input) return null;

  await ensureStatesSchema(connection);
  const result = await connection.query(
    `
    SELECT code
    FROM states
    WHERE COALESCE(is_active, true) = true
      AND (code = $1 OR gst_state_code = $1 OR etds_tcs_state_code = $1)
    ORDER BY CASE WHEN code = $1 THEN 0 WHEN gst_state_code = $1 THEN 1 ELSE 2 END
    LIMIT 1
    `,
    [input]
  );

  return result.rows[0]?.code || null;
}

async function assertStateExists(connection = db, value, label = "State Code") {
  const input = cleanCode(value);
  if (!input) return null;

  const code = await resolveStateCode(connection, input);
  if (!code) {
    const error = new Error(`${label} must reference an existing State.`);
    error.statusCode = 400;
    throw error;
  }

  return code;
}

module.exports = {
  INDIAN_STATES,
  cleanCode,
  ensureStatesSchema,
  resolveStateCode,
  assertStateExists,
};
