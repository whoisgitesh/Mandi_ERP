const fs = require("fs");

const path = require("path");

const pool = require("./db.cjs");

/**
 * MIGRATION FILES
 */
const migrations = [
  "setup-module.sql",

  "alter_setup-module.sql",

  "enterprise_migration_v2.sql",

  "add_inward_gate_bc_quantity_fields.sql",

  "add_no_series_relationships.sql",

  "add_purchase_order_invoice_quantities.sql",

  "add_posted_purchase_invoice_bc_fields.sql",

  "add_grn_qc_costing_fields.sql",

  "add_vendor_customer_ledger_entries.sql",

  "add_vendor_ledger_tds_reference_amounts.sql",

  "add_purchase_value_flow_fields.sql",

  "add_sales_value_flow_fields.sql",

  "add_gst_setup.sql",

  "add_gst_global_setup.sql",

  "add_tds_setup.sql",

  "add_tds_threshold_invoice_fields.sql",

  "add_purchase_invoice_tds_vendor_threshold_fields.sql",

  "seed_tds_no_series.sql",

  "add_purchase_invoice_gst_tds_totals.sql",

  "update_inward_gate_weight_formulas.sql",

  "normalize_percentage_decimal_precision.sql",
];

/**
 * RUN SINGLE MIGRATION
 */
async function runSingleMigration(
  client,
  fileName
) {

  const filePath = path.join(
    __dirname,
    "migrations",
    fileName
  );

  if (!fs.existsSync(filePath)) {

    throw new Error(
      `Migration file not found: ${fileName}`
    );
  }

  console.log(
    `\n🚀 Running migration: ${fileName}`
  );

  const sql = fs.readFileSync(
    filePath,
    "utf8"
  );

  await client.query(sql);

  console.log(
    `✅ Completed: ${fileName}`
  );
}

/**
 * MAIN
 */
async function runMigration() {

  const client =
    await pool.connect();

  try {

    console.log(
      "\n======================================"
    );

    console.log(
      "🚀 STARTING ERP MIGRATIONS"
    );

    console.log(
      "======================================\n"
    );

    await client.query("BEGIN");

    for (const migration of migrations) {

      await runSingleMigration(
        client,
        migration
      );
    }

    await client.query("COMMIT");

    console.log(
      "\n======================================"
    );

    console.log(
      "✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY"
    );

    console.log(
      "======================================\n"
    );

    process.exit(0);

  } catch (err) {

    await client.query("ROLLBACK");

    console.error(
      "\n======================================"
    );

    console.error(
      "❌ MIGRATION FAILED"
    );

    console.error(
      "======================================\n"
    );

    console.error(err);

    process.exit(1);

  } finally {

    client.release();
  }
}

runMigration();
