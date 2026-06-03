import { api } from "@/lib/api";

/**
 * Series codes used across the app. Keep in sync with the
 * `number_series` rows seeded in the database.
 */
export const SERIES = {
  VENDOR: "VENDOR",
  ITEM: "ITEM",
  MANDI_MASTER: "MANDI_MASTER",
  MANDI_VENDOR: "MANDI_VENDOR",
  MANDI_PURCHASE: "MANDI_PURCHASE",
  PURCHASE_ORDER: "PURCHASE_ORDER",
  PURCHASE_INVOICE: "PURCHASE_INVOICE",
  POSTED_PURCHASE_INVOICE: "POSTED_PURCHASE_INVOICE",
  INWARD_GATE_ENTRY: "INWARD_GATE_ENTRY",
  POSTED_PURCHASE_RECEIPT: "POSTED_PURCHASE_RECEIPT",
  CUSTOMER: "CUSTOMER",
  LOCATION: "LOCATION",
  GRN: "GRN",
  GOODS_RECEIPT_NOTE: "GOODS_RECEIPT_NOTE",
  SALES_ORDER: "SALES_ORDER",
  SALES_INVOICE: "SALES_INVOICE",
  POSTED_SALES_INVOICE: "POSTED_SALES_INVOICE",
  POSTED_SALES_SHIPMENT: "POSTED_SALES_SHIPMENT",
  UOM: "UOM",
} as const;

export type SeriesCode = (typeof SERIES)[keyof typeof SERIES];

/**
 * Fetches the next number from the centralized Number Series master.
 * Falls back to a timestamp-based code if the series is missing or fails.
 */
export async function getNextNumber(code: SeriesCode | string): Promise<string> {
  const res = await api.post(`/no-series/${encodeURIComponent(code)}/next`);
  const next = res.data?.number || res.data?.next_no || res.data?.data?.number;

  if (!next) {
    throw new Error(`No. Series ${code} did not return a next number.`);
  }

  return String(next);
}
