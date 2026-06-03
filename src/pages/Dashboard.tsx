import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ClipboardCheck,
  FileText,
  ListOrdered,
  Receipt,
  Send,
  Settings2,
  ShoppingCart,
  Truck,
} from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { DashboardSkeleton } from "@/components/skeletons/ErpSkeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

type CountKey =
  | "mandiMaster"
  | "mandiPurchases"
  | "openPurchases"
  | "purchaseOrders"
  | "inwardGateEntries"
  | "goodsReceiptNotes"
  | "postedPurchaseReceipts"
  | "salesOrders"
  | "postedSalesShipments"
  | "itemLedgerEntries";

type Counts = Record<CountKey, number>;

type DashboardCard = {
  label: string;
  value: number;
  icon: typeof Settings2;
  color: string;
};

const EMPTY_COUNTS: Counts = {
  mandiMaster: 0,
  mandiPurchases: 0,
  openPurchases: 0,
  purchaseOrders: 0,
  inwardGateEntries: 0,
  goodsReceiptNotes: 0,
  postedPurchaseReceipts: 0,
  salesOrders: 0,
  postedSalesShipments: 0,
  itemLedgerEntries: 0,
};

function rowsFromResponse(payload: any) {
  const data = payload?.data ?? payload;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  if (data && typeof data === "object") return [data];

  return [];
}

async function fetchRows(path: string) {
  try {
    const response = await api.get(path);
    return rowsFromResponse(response.data);
  } catch (error) {
    console.error(`Failed to load dashboard count for ${path}`, error);
    return [];
  }
}

function isOpenPurchase(row: any) {
  return String(row?.status ?? "").toLowerCase() === "open";
}

export default function Dashboard() {
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function loadCounts() {
      const [
        mandiMaster,
        mandiPurchases,
        purchaseOrders,
        inwardGateEntries,
        goodsReceiptNotes,
        postedPurchaseReceipts,
        salesOrders,
        postedSalesShipments,
        itemLedgerEntries,
      ] = await Promise.all([
        fetchRows("/mandi-master"),
        fetchRows("/mandi-purchases"),
        fetchRows("/purchase-orders"),
        fetchRows("/inward-gate-entries"),
        fetchRows("/grn"),
        fetchRows("/posted-purchase-receipts"),
        fetchRows("/sales-orders"),
        fetchRows("/posted-sales-shipments"),
        fetchRows("/item-ledger-entries"),
      ]);

      if (!alive) return;

      setCounts({
        mandiMaster: mandiMaster.length,
        mandiPurchases: mandiPurchases.length,
        openPurchases: mandiPurchases.filter(isOpenPurchase).length,
        purchaseOrders: purchaseOrders.length,
        inwardGateEntries: inwardGateEntries.length,
        goodsReceiptNotes: goodsReceiptNotes.length,
        postedPurchaseReceipts: postedPurchaseReceipts.length,
        salesOrders: salesOrders.length,
        postedSalesShipments: postedSalesShipments.length,
        itemLedgerEntries: itemLedgerEntries.length,
      });

      setLoading(false);
    }

    loadCounts();

    return () => {
      alive = false;
    };
  }, []);

  const operationCards = useMemo<DashboardCard[]>(
    () => [
      {
        label: "Mandi Master entries",
        value: counts.mandiMaster,
        icon: Settings2,
        color: "text-primary",
      },
      {
        label: "Mandi Purchases",
        value: counts.mandiPurchases,
        icon: ListOrdered,
        color: "text-success",
      },
      {
        label: "Open Purchases",
        value: counts.openPurchases,
        icon: ListOrdered,
        color: "text-warning",
      },
      {
        label: "Purchase Orders",
        value: counts.purchaseOrders,
        icon: FileText,
        color: "text-primary",
      },
      {
        label: "Inward Gate Entries",
        value: counts.inwardGateEntries,
        icon: Truck,
        color: "text-primary",
      },
      {
        label: "Goods Receipt Notes",
        value: counts.goodsReceiptNotes,
        icon: Receipt,
        color: "text-primary",
      },
      {
        label: "Posted Purchase Receipts",
        value: counts.postedPurchaseReceipts,
        icon: ClipboardCheck,
        color: "text-success",
      },
      {
        label: "Sales Orders",
        value: counts.salesOrders,
        icon: ShoppingCart,
        color: "text-primary",
      },
      {
        label: "Posted Sales Shipments",
        value: counts.postedSalesShipments,
        icon: Send,
        color: "text-success",
      },
      {
        label: "Item Ledger Entries",
        value: counts.itemLedgerEntries,
        icon: BookOpen,
        color: "text-primary",
      },
    ],
    [counts]
  );

  const renderCards = (cards: DashboardCard[]) => (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.label}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (loading) return <DashboardSkeleton />;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of Mandi procurement activity"
      />

      <div className="p-6 space-y-6">
        {renderCards(operationCards)}
      </div>
    </div>
  );
}
