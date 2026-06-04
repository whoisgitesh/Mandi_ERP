const fs = require("fs");

const path = require("path");

const pool = require("./db.cjs");

/**
 * MIGRATION FILES
 */
const migrations = [
  "setup-module.sql",

  "alter_setup-module.sql",

  "migration_complete_fix.sql",

  "fix_no_series_line_fields.sql",

  "fix_no_series_lines_updated_at.sql",

  "auth_tables.sql",

  "enterprise_migration_v2.sql",

  "expand_item_card_fields.sql",

  "fix_items_blank_description.sql",

  "fix_items_invalid_fk_values.sql",

  "transaction_tables_fix.sql",

  "fix_blank_transaction_foreign_keys.sql",

  "mandi_master_and_purchase_order_ui_fix.sql",

  "create_mandi_vendor_master.sql",

  "expand_mandi_vendor_fields.sql",

  "trim_mandi_vendor_fields.sql",

  "add_inward_gate_bc_quantity_fields.sql",

  "add_inward_gate_detail_fields.sql",

  "add_inward_gate_vendor_name.sql",

  "add_inward_gate_vendor_gst_reg_no.sql",

  "add_inward_gate_entry_quality.sql",

  "add_no_series_relationships.sql",

  "default_master_setup_no_series.sql",

  "default_purchase_flow_setup_no_series.sql",

  "normalize_setup_no_series_defaults.sql",

  "seed_missing_master_no_series_lines.sql",

  "seed_missing_document_no_series_lines.sql",

  "seed_inward_gate_entry_no_series.sql",

  "seed_goods_receipt_note_no_series.sql",

  "seed_posted_sales_shipment_no_series.sql",

  "baseline_master_seed.sql",

  "add_purchase_flow_number_sync_fields.sql",

  "add_purchase_invoice_flow.sql",

  "add_purchase_invoice_no_series_mapping.sql",

  "add_purchase_order_invoice_quantities.sql",

  "add_purchase_order_challan_no.sql",

  "add_posted_purchase_invoice_bc_fields.sql",

  "add_grn_qc_costing_fields.sql",

  "add_mandi_purchase_line_shipping_quantities.sql",

  "add_mandi_purchase_line_vendor_fields.sql",

  "add_posted_purchase_receipt_line_variant.sql",

  "add_posted_purchase_receipt_vendor_name.sql",

  "add_item_ledger_detail_fields.sql",

  "backfill_purchase_receipt_item_ledger_entries.sql",

  "add_vendor_customer_ledger_entries.sql",

  "add_vendor_ledger_tds_reference_amounts.sql",

  "add_purchase_value_flow_fields.sql",

  "add_sales_invoice_posting_flow.sql",

  "add_sales_invoice_bc_fields.sql",

  "add_sales_order_detail_fields.sql",

  "add_sales_shipment_partial_invoice_fields.sql",

  "add_posted_sales_shipment_detail_fields.sql",

  "add_posted_sales_shipment_invoice_link.sql",

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
