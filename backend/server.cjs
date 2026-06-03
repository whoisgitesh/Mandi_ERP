const express =
  require("express");

const cors =
  require("cors");

/**
 * ROUTES
 */
const authRoutes =
  require("./routes/auth.cjs");

const noSeriesRoutes =
  require("./routes/noSeries.cjs");

/**
 * SETUP ROUTES
 */
const inventorySetupRoutes =
  require(
    "./routes/setup/inventorySetup.cjs"
  );

const purchasePayablesSetupRoutes =
  require(
    "./routes/setup/purchasePayablesSetup.cjs"
  );

const salesReceivablesSetupRoutes =
  require(
    "./routes/setup/salesReceivablesSetup.cjs"
  );

/**
 * MASTER ROUTES
 */
const locationsRoutes =
  require("./routes/locations.cjs");

const customerRoutes =
  require("./routes/customers.cjs");

const vendorRoutes =
  require("./routes/vendors.cjs");

const itemRoutes =
  require("./routes/items.cjs");

const itemCategoriesRoutes =
  require("./routes/itemCategories.cjs");

const familiesRoutes =
  require("./routes/families.cjs");

const itemQualitySpecsRoutes =
  require("./routes/itemQualitySpecs.cjs");

const inwardGateEntryQualityRoutes =
  require("./routes/inwardGateEntryQuality.cjs");

const statesRoutes =
  require("./routes/states.cjs");

const currenciesRoutes =
  require("./routes/currencies.cjs");

const salespeoplePurchasersRoutes =
  require("./routes/salespeoplePurchasers.cjs");

const departmentsRoutes =
  require("./routes/departments.cjs");

const customerGroupsRoutes =
  require("./routes/customerGroups.cjs");

/**
 * TRANSACTION ROUTES
 */
const purchaseOrderRoutes =
  require(
    "./routes/purchaseOrders.cjs"
  );

const inwardGateEntriesRoutes =
  require(
    "./routes/inwardGateEntries.cjs"
  );

const grnRoutes =
  require(
    "./routes/grn.cjs"
  );

/**
 * MANDI ROUTES
 */
const mandiMasterRoutes =
  require(
    "./routes/mandiMaster.cjs"
  );

const mandiPurchasesRoutes =
  require(
    "./routes/mandiPurchase.cjs"
  );

const postedPurchaseReceiptsRoutes =
  require(
    "./routes/postedPurchaseReceipts.cjs"
  );
const purchaseInvoicesRoutes =
  require(
    "./routes/purchaseInvoices.cjs"
  );
const postedPurchaseInvoicesRoutes =
  require(
    "./routes/postedPurchaseInvoices.cjs"
  );
const itemLedgerEntriesRoutes =
  require(
    "./routes/itemLedgerEntries.cjs"
  );
const reversalEntriesRoutes =
  require(
    "./routes/reversalEntries.cjs"
  );
const itemJournalsRoutes =
  require(
    "./routes/itemJournals.cjs"
  );
const inventoryRoutes =
  require(
    "./routes/inventory.cjs"
  );
const vendorLedgerEntriesRoutes =
  require(
    "./routes/vendorLedgerEntries.cjs"
  );
const customerLedgerEntriesRoutes =
  require(
    "./routes/customerLedgerEntries.cjs"
  );

const gstGroupsRoutes =
  require(
    "./routes/gstGroups.cjs"
  );

const gstSetupRoutes =
  require(
    "./routes/gstSetup.cjs"
  );

const gstRatesRoutes =
  require(
    "./routes/gstRates.cjs"
  );

const tdsSetupRoutes =
  require(
    "./routes/tdsSetup.cjs"
  );

const tdsSectionCodesRoutes =
  require(
    "./routes/tdsSectionCodes.cjs"
  );

const tdsAssesseeCodesRoutes =
  require(
    "./routes/tdsAssesseeCodes.cjs"
  );

const tdsRatesRoutes =
  require(
    "./routes/tdsRates.cjs"
  );


const mandiVendorsRoutes =
  require(
    "./routes/mandiVendors.cjs"
  );

const postedSalesShipmentsRoutes =
  require(
    "./routes/postedSalesShipments.cjs"
  );

const salesInvoicesRoutes =
  require(
    "./routes/salesInvoices.cjs"
  );

const postedSalesInvoicesRoutes =
  require(
    "./routes/postedSalesInvoices.cjs"
  );

const salesOrdersRoutes =
  require(
    "./routes/salesOrders.cjs"
  );

const manufacturingSetupRoutes =
  require(
    "./routes/manufacturingSetup.cjs"
  );

const productionBomsRoutes =
  require(
    "./routes/productionBoms.cjs"
  );

const releasedProductionOrdersRoutes =
  require(
    "./routes/releasedProductionOrders.cjs"
  );

const assemblyBomRoutes =
  require(
    "./routes/assemblyBom.cjs"
  );

const assemblyOrdersRoutes =
  require(
    "./routes/assemblyOrders.cjs"
  );

const postedAssemblyOrdersRoutes =
  require(
    "./routes/postedAssemblyOrders.cjs"
  );


  const uomRoutes =
  require(
    "./routes/uom.cjs"
  );
/**
 * APP
 */
const app = express();

/**
 * MIDDLEWARE
 */
app.use(cors());

app.use(
  express.json({
    limit: "25mb",
  })
);

/**
 * HEALTH CHECK
 */
app.get(
  "/api/health",
  (req, res) => {

    res.json({
      success: true,

      message:
        "ERP Backend Running",
    });
  }
);

/**
 * AUTH
 */
app.use(
  "/api/auth",
  authRoutes
);

/**
 * NO SERIES
 */
app.use(
  "/api/no-series",
  noSeriesRoutes
);

/**
 * SETUP
 */
app.use(
  "/api/setup/inventory",
  inventorySetupRoutes
);

app.use(
  "/api/setup/purchase-payables",
  purchasePayablesSetupRoutes
);

app.use(
  "/api/setup/sales-receivables",
  salesReceivablesSetupRoutes
);

app.use(
  "/api/posted-purchase-receipts",
  postedPurchaseReceiptsRoutes
);

app.use(
  "/api/purchase-invoices",
  purchaseInvoicesRoutes
);

app.use(
  "/api/posted-purchase-invoices",
  postedPurchaseInvoicesRoutes
);
/**
 * MASTERS
 */
app.use(
  "/api/locations",
  locationsRoutes
);

app.use(
  "/api/customers",
  customerRoutes
);

app.use(
  "/api/vendors",
  vendorRoutes
);

app.use(
  "/api/items",
  itemRoutes
);

app.use(
  "/api/item-categories",
  itemCategoriesRoutes
);

app.use(
  "/api/families",
  familiesRoutes
);

app.use(
  "/api/item-quality-specs",
  itemQualitySpecsRoutes
);

app.use(
  "/api/item-quality-specifications",
  itemQualitySpecsRoutes
);

app.use(
  "/api/inward-gate-entry-quality",
  inwardGateEntryQualityRoutes
);

app.use(
  "/api/states",
  statesRoutes
);

app.use(
  "/api/currencies",
  currenciesRoutes
);

app.use(
  "/api/salespeople-purchasers",
  salespeoplePurchasersRoutes
);

app.use(
  "/api/departments",
  departmentsRoutes
);

app.use(
  "/api/customer-groups",
  customerGroupsRoutes
);

app.use(
  "/api/item-ledger-entries",
  itemLedgerEntriesRoutes
);

app.use(
  "/api/reversal-entries",
  reversalEntriesRoutes
);

app.use(
  "/api/item-journals",
  itemJournalsRoutes
);

app.use(
  "/api/inventory",
  inventoryRoutes
);

app.use(
  "/api/vendor-ledger-entries",
  vendorLedgerEntriesRoutes
);

app.use(
  "/api/customer-ledger-entries",
  customerLedgerEntriesRoutes
);

app.use(
  "/api/gst-groups",
  gstGroupsRoutes
);

app.use(
  "/api/gst-setup",
  gstSetupRoutes
);

app.use(
  "/api/gst-rates",
  gstRatesRoutes
);

app.use(
  "/api/tds-setup",
  tdsSetupRoutes
);

app.use(
  "/api/tds-section-codes",
  tdsSectionCodesRoutes
);

app.use(
  "/api/tds-assessee-codes",
  tdsAssesseeCodesRoutes
);

app.use(
  "/api/tds-rates",
  tdsRatesRoutes
);
/**
 * TRANSACTIONS
 */
app.use(
  "/api/purchase-orders",
  purchaseOrderRoutes
);

app.use(
  "/api/inward-gate-entries",
  inwardGateEntriesRoutes
);

app.use(
  "/api/grn",
  grnRoutes
);

/**
 * MANDI
 */
app.use(
  "/api/mandi-master",
  mandiMasterRoutes
);

app.use(
  "/api/mandi-purchases",
  mandiPurchasesRoutes
);
app.use(
  "/api/mandi-vendors",
  mandiVendorsRoutes
);


app.use(
  "/api/posted-sales-shipments",
  postedSalesShipmentsRoutes
);

app.use(
  "/api/sales-invoices",
  salesInvoicesRoutes
);

app.use(
  "/api/posted-sales-invoices",
  postedSalesInvoicesRoutes
);

app.use(
  "/api/sales-orders",
  salesOrdersRoutes
);

app.use(
  "/api/uom",
  uomRoutes
);

app.use(
  "/api/manufacturing-setup",
  manufacturingSetupRoutes
);

app.use(
  "/api/production-boms",
  productionBomsRoutes
);

app.use(
  "/api/released-production-orders",
  releasedProductionOrdersRoutes
);

app.use(
  "/api/assembly-bom",
  assemblyBomRoutes
);

app.use(
  "/api/assembly-orders",
  assemblyOrdersRoutes
);

app.use(
  "/api/posted-assembly-orders",
  postedAssemblyOrdersRoutes
);

/**
 * 404 HANDLER
 */
app.use(
  (req, res) => {

    res.status(404).json({
      error:
        "API route not found",
    });
  }
);

/**
 * SERVER
 */
const PORT =
  process.env.PORT ||
  5000;

app.listen(
  PORT,"0.0.0.0",
  () => {

    console.log(
      `🚀 ERP Backend running on port ${PORT}`
    );
  }
);
