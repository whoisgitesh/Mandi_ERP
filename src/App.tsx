import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import MandiMaster from "./pages/MandiMaster";
import Vendors from "./pages/Vendors";
import Customers from "./pages/Customers";
import Locations from "./pages/Locations";
import Items from "./pages/Items";
import MandiPurchaseList from "./pages/MandiPurchaseList";
import MandiPurchaseDetails from "./pages/MandiPurchaseDetails";
import { PurchaseOrderList, PurchaseOrderDetails } from "./pages/PurchaseOrders";
import InwardGateEntries from "./pages/InwardGateEntries";
import InwardGateEntryDetails from "./pages/InwardGateEntryDetails";
import GRN from "./pages/GRN";
import { PostedPurchaseReceiptsList, PostedPurchaseReceiptDetails } from "./pages/PostedPurchaseReceipts";
import { PurchaseInvoiceDetails, PurchaseInvoiceList } from "./pages/PurchaseInvoices";
import { PostedPurchaseInvoiceDetails, PostedPurchaseInvoiceList } from "./pages/PostedPurchaseInvoices";
import { SalesOrderList, SalesOrderDetails } from "./pages/SalesOrders";
import { SalesInvoiceList, SalesInvoiceDetails } from "./pages/SalesInvoices";
import { PostedSalesShipmentList, PostedSalesShipmentDetails } from "./pages/PostedSalesShipments";
import { PostedSalesInvoiceDetails, PostedSalesInvoiceList } from "./pages/PostedSalesInvoices";
import NumberSeries from "./pages/NumberSeries";
import UnitOfMeasure from "./pages/UnitOfMeasure";
import ItemLedgerEntries from "./pages/ItemLedgerEntries";
import { ReversalEntryCard, ReversalEntryList } from "./pages/ReversalEntries";
import ItemJournal from "./pages/ItemJournal";
import VendorLedgerEntries from "./pages/VendorLedgerEntries";
import CustomerLedgerEntries from "./pages/CustomerLedgerEntries";
import GSTGroups from "./pages/GSTGroups";
import GSTRates from "./pages/GSTRates";
import GstSetup from "./pages/GstSetup";
import TDSSetup from "./pages/TDSSetup";
import TDSSectionCodes, { TDSSections } from "./pages/TDSSectionCodes";
import TDSAssesseeCodes from "./pages/TDSAssesseeCodes";
import TDSRates from "./pages/TDSRates";
import MandiVendor from "./pages/MandiVendor";
import NotFound from "./pages/NotFound.tsx";
import ForgotFlow from "./pages/ForgotFlow.tsx";
import ProtectedRoute from "./routes/ProtectedRoute.tsx";
import NoSeriesPage from "./pages/NoSeries.tsx";
import SalesSetupPage from "./pages/Salessetup.tsx";
import PurchaseSetupPage from "./pages/Purchasesetup.tsx";
import InventorySetupPage from "./pages/Inventorysetup.tsx";
import ManufacturingSetup from "./pages/ManufacturingSetup";
import { ProductionBOMDetails, ProductionBOMList } from "./pages/ProductionBOMs";
import { ReleasedProductionOrderDetails, ReleasedProductionOrderList } from "./pages/ReleasedProductionOrders";
import ConsumptionJournal from "./pages/ConsumptionJournal";
import OutputJournal from "./pages/OutputJournal";
import AssemblyBOM from "./pages/AssemblyBOM";
import { AssemblyOrderDetails, AssemblyOrderList } from "./pages/AssemblyOrders";
import { PostedAssemblyOrderDetails, PostedAssemblyOrderList } from "./pages/PostedAssemblyOrders";
import States from "./pages/States";
import { ItemCategoryCard, ItemCategoryList } from "./pages/ItemCategories";
import { FamilyCard, FamilyList } from "./pages/Families";
import { CurrencyCard, CurrencyExchangeRates, CurrencyList } from "./pages/Currencies";
import { SalespeoplePurchaserCard, SalespeoplePurchaserList } from "./pages/SalespeoplePurchasers";
import {
  GoodsReceiptNotesList,
} from "./pages/GoodsReceiptNotes";

const queryClient = new QueryClient();
 
  const App = () => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
              <Route path="/vendors" element={<ProtectedRoute><AppLayout><Vendors /></AppLayout></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute><AppLayout><Customers /></AppLayout></ProtectedRoute>} />
              <Route path="/locations" element={<ProtectedRoute><AppLayout><Locations /></AppLayout></ProtectedRoute>} />
              <Route path="/items" element={<ProtectedRoute><AppLayout><Items /></AppLayout></ProtectedRoute>} />
              <Route path="/item-categories" element={<ProtectedRoute><AppLayout><ItemCategoryList /></AppLayout></ProtectedRoute>} />
              <Route path="/item-categories/:code" element={<ProtectedRoute><AppLayout><ItemCategoryCard /></AppLayout></ProtectedRoute>} />
              <Route path="/families" element={<ProtectedRoute><AppLayout><FamilyList /></AppLayout></ProtectedRoute>} />
              <Route path="/families/:familyNo" element={<ProtectedRoute><AppLayout><FamilyCard /></AppLayout></ProtectedRoute>} />
              <Route path="/currencies" element={<ProtectedRoute><AppLayout><CurrencyList /></AppLayout></ProtectedRoute>} />
              <Route path="/currencies/:code" element={<ProtectedRoute><AppLayout><CurrencyCard /></AppLayout></ProtectedRoute>} />
              <Route path="/currencies/:code/exchange-rates" element={<ProtectedRoute><AppLayout><CurrencyExchangeRates /></AppLayout></ProtectedRoute>} />
              <Route path="/salespeople-purchasers" element={<ProtectedRoute><AppLayout><SalespeoplePurchaserList /></AppLayout></ProtectedRoute>} />
              <Route path="/salespeople-purchasers/:code" element={<ProtectedRoute><AppLayout><SalespeoplePurchaserCard /></AppLayout></ProtectedRoute>} />
              <Route path="/item-variants" element={<ProtectedRoute><AppLayout><Items /></AppLayout></ProtectedRoute>} />
              <Route path="/mandi-master" element={<ProtectedRoute><AppLayout><MandiMaster /></AppLayout></ProtectedRoute>} />
              <Route path="/mandi-purchase" element={<ProtectedRoute><AppLayout><MandiPurchaseList /></AppLayout></ProtectedRoute>} />
              <Route path="/mandi-purchase/:id" element={<ProtectedRoute><AppLayout><MandiPurchaseDetails /></AppLayout></ProtectedRoute>} />
              <Route path="/purchase-orders" element={<ProtectedRoute><AppLayout><PurchaseOrderList /></AppLayout></ProtectedRoute>} />
              <Route path="/purchase-orders/:id" element={<ProtectedRoute><AppLayout><PurchaseOrderDetails /></AppLayout></ProtectedRoute>} />
              <Route path="/inward-gate-entries" element={<ProtectedRoute><AppLayout><InwardGateEntries /></AppLayout></ProtectedRoute>} />
              <Route path="/inward-gate-entries/:id" element={<ProtectedRoute><AppLayout><InwardGateEntryDetails /></AppLayout></ProtectedRoute>} />
              <Route path="/inward-gate-entries/:id/grn" element={<ProtectedRoute><AppLayout><GRN /></AppLayout></ProtectedRoute>} />
              <Route path="/posted-purchase-receipts" element={<ProtectedRoute><AppLayout><PostedPurchaseReceiptsList /></AppLayout></ProtectedRoute>} />
              <Route path="/posted-purchase-receipts/:id" element={<ProtectedRoute><AppLayout><PostedPurchaseReceiptDetails /></AppLayout></ProtectedRoute>} />
              <Route path="/purchase-invoices" element={<ProtectedRoute><AppLayout><PurchaseInvoiceList /></AppLayout></ProtectedRoute>} />
              <Route path="/purchase-invoices/:id" element={<ProtectedRoute><AppLayout><PurchaseInvoiceDetails /></AppLayout></ProtectedRoute>} />
              <Route path="/posted-purchase-invoices" element={<ProtectedRoute><AppLayout><PostedPurchaseInvoiceList /></AppLayout></ProtectedRoute>} />
              <Route path="/posted-purchase-invoices/:id" element={<ProtectedRoute><AppLayout><PostedPurchaseInvoiceDetails /></AppLayout></ProtectedRoute>} />
              <Route path="/goods-receipt-notes" element={<ProtectedRoute><AppLayout><GoodsReceiptNotesList /></AppLayout></ProtectedRoute>} />
              <Route path="/goods-receipt-notes/:id" element={<ProtectedRoute><AppLayout><GRN /></AppLayout></ProtectedRoute>} />
              <Route path="/sales-orders" element={<ProtectedRoute><AppLayout><SalesOrderList /></AppLayout></ProtectedRoute>} />
              <Route path="/sales-orders/:id" element={<ProtectedRoute><AppLayout><SalesOrderDetails /></AppLayout></ProtectedRoute>} />
              <Route path="/no-series" element={<ProtectedRoute><AppLayout><NoSeriesPage /></AppLayout></ProtectedRoute>} />
              <Route path="/sales-invoices" element={<ProtectedRoute><AppLayout><SalesInvoiceList /></AppLayout></ProtectedRoute>} />
              <Route path="/sales-invoices/:id" element={<ProtectedRoute><AppLayout><SalesInvoiceDetails /></AppLayout></ProtectedRoute>} />
              <Route path="/posted-sales-shipments" element={<ProtectedRoute><AppLayout><PostedSalesShipmentList /></AppLayout></ProtectedRoute>} />
              <Route path="/posted-sales-shipments/:id" element={<ProtectedRoute><AppLayout><PostedSalesShipmentDetails /></AppLayout></ProtectedRoute>} />
              <Route path="/posted-sales-invoices" element={<ProtectedRoute><AppLayout><PostedSalesInvoiceList /></AppLayout></ProtectedRoute>} />
              <Route path="/posted-sales-invoices/:id" element={<ProtectedRoute><AppLayout><PostedSalesInvoiceDetails /></AppLayout></ProtectedRoute>} />
              <Route path="/number-series" element={<ProtectedRoute><AppLayout><NumberSeries /></AppLayout></ProtectedRoute>} />
              <Route path="/mandi-vendor" element={<ProtectedRoute><AppLayout><MandiVendor /></AppLayout></ProtectedRoute>} />
              <Route path="/unit-of-measure" element={<ProtectedRoute><AppLayout><UnitOfMeasure /></AppLayout></ProtectedRoute>} />
              <Route path="/item-ledger-entries" element={<ProtectedRoute><AppLayout><ItemLedgerEntries /></AppLayout></ProtectedRoute>} />
              <Route path="/reversal-entries" element={<ProtectedRoute><AppLayout><ReversalEntryList /></AppLayout></ProtectedRoute>} />
              <Route path="/reversal-entries/:reversalNo" element={<ProtectedRoute><AppLayout><ReversalEntryCard /></AppLayout></ProtectedRoute>} />
              <Route path="/item-journal" element={<ProtectedRoute><AppLayout><ItemJournal /></AppLayout></ProtectedRoute>} />
              <Route path="/vendor-ledger-entries" element={<ProtectedRoute><AppLayout><VendorLedgerEntries /></AppLayout></ProtectedRoute>} />
              <Route path="/customer-ledger-entries" element={<ProtectedRoute><AppLayout><CustomerLedgerEntries /></AppLayout></ProtectedRoute>} />
              <Route path="/gst-groups" element={<ProtectedRoute><AppLayout><GSTGroups /></AppLayout></ProtectedRoute>} />
              <Route path="/gst-rates" element={<ProtectedRoute><AppLayout><GSTRates /></AppLayout></ProtectedRoute>} />
              <Route path="/gst-setup" element={<ProtectedRoute><AppLayout><GstSetup /></AppLayout></ProtectedRoute>} />
              <Route path="/tds-setup" element={<ProtectedRoute><AppLayout><TDSSetup /></AppLayout></ProtectedRoute>} />
              <Route path="/tds-sections" element={<ProtectedRoute><AppLayout><TDSSections /></AppLayout></ProtectedRoute>} />
              <Route path="/tds-section-codes" element={<ProtectedRoute><AppLayout><TDSSectionCodes /></AppLayout></ProtectedRoute>} />
              <Route path="/tds-assessee-codes" element={<ProtectedRoute><AppLayout><TDSAssesseeCodes /></AppLayout></ProtectedRoute>} />
              <Route path="/tds-rates" element={<ProtectedRoute><AppLayout><TDSRates /></AppLayout></ProtectedRoute>} />
              <Route path="/states" element={<ProtectedRoute><AppLayout><States /></AppLayout></ProtectedRoute>} />
              <Route path="/setup/sales" element={<ProtectedRoute><AppLayout><SalesSetupPage /></AppLayout></ProtectedRoute>} />
              <Route path="/setup/purchase" element={<ProtectedRoute><AppLayout><PurchaseSetupPage /></AppLayout></ProtectedRoute>} />
              <Route path="/setup/inventory" element={<ProtectedRoute><AppLayout><InventorySetupPage /></AppLayout></ProtectedRoute>} />
              <Route path="/manufacturing-setup" element={<ProtectedRoute><AppLayout><ManufacturingSetup /></AppLayout></ProtectedRoute>} />
              <Route path="/production-boms" element={<ProtectedRoute><AppLayout><ProductionBOMList /></AppLayout></ProtectedRoute>} />
              <Route path="/production-boms/:bomNo" element={<ProtectedRoute><AppLayout><ProductionBOMDetails /></AppLayout></ProtectedRoute>} />
              <Route path="/released-production-orders" element={<ProtectedRoute><AppLayout><ReleasedProductionOrderList /></AppLayout></ProtectedRoute>} />
              <Route path="/released-production-orders/:documentNo" element={<ProtectedRoute><AppLayout><ReleasedProductionOrderDetails /></AppLayout></ProtectedRoute>} />
              <Route path="/consumption-journal" element={<ProtectedRoute><AppLayout><ConsumptionJournal /></AppLayout></ProtectedRoute>} />
              <Route path="/output-journal" element={<ProtectedRoute><AppLayout><OutputJournal /></AppLayout></ProtectedRoute>} />
              <Route path="/assembly-bom" element={<ProtectedRoute><AppLayout><AssemblyBOM /></AppLayout></ProtectedRoute>} />
              <Route path="/assembly-bom/:itemNo" element={<ProtectedRoute><AppLayout><AssemblyBOM /></AppLayout></ProtectedRoute>} />
              <Route path="/assembly-orders" element={<ProtectedRoute><AppLayout><AssemblyOrderList /></AppLayout></ProtectedRoute>} />
              <Route path="/assembly-orders/:documentNo" element={<ProtectedRoute><AppLayout><AssemblyOrderDetails /></AppLayout></ProtectedRoute>} />
              <Route path="/posted-assembly-orders" element={<ProtectedRoute><AppLayout><PostedAssemblyOrderList /></AppLayout></ProtectedRoute>} />
              <Route path="/posted-assembly-orders/:documentNo" element={<ProtectedRoute><AppLayout><PostedAssemblyOrderDetails /></AppLayout></ProtectedRoute>} />
              <Route path="/forgot-password" element={<ForgotFlow />} />
              <Route path="/verify-otp" element={<ForgotFlow />} />
              <Route path="/reset-password" element={<ForgotFlow />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
export default App;
