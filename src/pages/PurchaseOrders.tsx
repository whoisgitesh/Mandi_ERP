import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "@/lib/api";
import { dateInputOrToday, formatDateDisplay, normalizeDateFieldsWithDefault, todayDateInput } from "@/lib/date";

import { PageHeader } from "@/components/PageHeader";
import { CurrencySelect } from "@/components/CurrencySelect";
import { LocationSelect } from "@/components/LocationSelect";
import { UomSelect } from "@/components/UomSelect";
import { VariantSelect } from "@/components/VariantSelect";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/NumericInput";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { toast } from "sonner";
import { ArrowLeft, Plus, Save, Truck } from "lucide-react";

type PO = Record<string, any>;
type Line = Record<string, any>;

const calculatePurchaseLine = (line: Line) => {
  const quantity = Number(line.quantity ?? 0);
  const receivedQuantity = Number(line.received_quantity ?? 0);
  const invoicedQuantity = Math.min(
    Math.max(Number(line.qty_invoiced ?? 0), 0),
    receivedQuantity
  );
  const unitCost = Number(line.direct_unit_cost_excl_vat ?? line.rate ?? 0);
  const discountPct = Number(line.line_discount_pct ?? 0);
  const outstandingQuantity = Math.max(quantity - receivedQuantity, 0);
  const remainingToInvoice = Math.max(receivedQuantity - invoicedQuantity, 0);
  const requestedQtyToReceive = Number(line.qty_to_receive ?? outstandingQuantity);
  const requestedQtyToInvoice = Number(line.qty_to_invoice ?? remainingToInvoice);

  return {
    ...line,
    quantity,
    received_quantity: receivedQuantity,
    qty_invoiced: invoicedQuantity,
    rejected_qty: Number(line.rejected_qty ?? line.rejected_quantity ?? 0),
    direct_unit_cost_excl_vat: unitCost,
    line_discount_pct: discountPct,
    qty_to_receive: Math.min(Math.max(requestedQtyToReceive, 0), outstandingQuantity),
    qty_to_invoice: Math.min(Math.max(requestedQtyToInvoice, 0), remainingToInvoice),
    line_amount: quantity * unitCost * (1 - discountPct / 100),
  };
};

const DATE_FIELDS = [
  "order_date",
  "posting_date",
  "document_date",
  "due_date",
  "invoice_received_date",
  "vat_date",
  "vendor_invoice_date",
  "expected_receipt_date",
  "promised_receipt_date",
  "requested_receipt_date",
];

const normalizePurchasePayload = (payload: PO) => {
  return normalizeDateFieldsWithDefault(payload, DATE_FIELDS);
};

const money = (value: any) => Number(value ?? 0).toFixed(2);

export function PurchaseOrderList() {
  const [rows, setRows] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/purchase-orders");
      setRows(res.data ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createManual = async () => {
    try {
      setCreating(true);
      const res = await api.post("/purchase-orders", {
        vendor_no: "",
        posting_date: todayDateInput(),
      });
      toast.success(`Purchase Order ${res.data.document_no} created`);
      navigate(`/purchase-orders/${res.data.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to create PO");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        subtitle="Created from Mandi Purchases or manually"
        actions={
          <Button onClick={createManual} disabled={creating}>
            <Plus className="h-4 w-4 mr-1" />
            Create Purchase Order Manually
          </Button>
        }
      />

      <div className="p-6">
        <div className="rounded border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO No.</TableHead>
                <TableHead>Vendor No.</TableHead>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Posting Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No Purchase Orders yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/purchase-orders/${row.id}`)}
                  >
                    <TableCell className="font-medium text-primary">{row.document_no}</TableCell>
                    <TableCell>{row.vendor_no}</TableCell>
                    <TableCell>{row.vendor_name}</TableCell>
                    <TableCell>{formatDateDisplay(row.posting_date)}</TableCell>
                    <TableCell>
                      <Badge>{row.status ?? "Open"}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export function PurchaseOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [po, setPo] = useState<PO | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState("");

  const load = async () => {
    if (!id) return;

    try {
      setLoadError("");
      const [headerRes, linesRes] = await Promise.all([
        api.get(`/purchase-orders/${id}`),
        api.get(`/purchase-orders/${id}/lines`),
      ]);
      setPo(headerRes.data ?? null);
      setLines((linesRes.data ?? []).map(calculatePurchaseLine));
    } catch (err: any) {
      const message = err?.response?.data?.error || "Failed to fetch Purchase Order";
      setLoadError(message);
      toast.error(message);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const setH = (key: string, value: any) => {
    setPo((current) => (current ? { ...current, [key]: value } : current));
  };

  const saveHeader = async () => {
    if (!po) return null;

    if (!String(po.broker_name ?? "").trim()) {
      toast.error("Broker Name is required");
      return null;
    }

    if (!String(po.challan_no ?? "").trim()) {
      toast.error("Challan No. is required");
      return null;
    }

    if (!String(po.location_code ?? "").trim()) {
      toast.error("Location Code is required");
      return null;
    }

    try {
      setSaving(true);
      const { id: _id, created_at, updated_at, is_deleted, ...payload } = po;
      const res = await api.put(
        `/purchase-orders/${po.id}`,
        normalizePurchasePayload(payload)
      );
      setPo({ ...po, ...res.data });
      toast.success("Saved");
      return res.data;
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save Purchase Order");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateLine = async (lineId: string, patch: Partial<Line>) => {
    setLines((prev) =>
      prev.map((line) => (line.id === lineId ? calculatePurchaseLine({ ...line, ...patch }) : line))
    );

    try {
      const res = await api.put(`/purchase-orders/lines/${lineId}`, patch);
      setLines((prev) =>
        prev.map((line) => (line.id === lineId ? calculatePurchaseLine(res.data) : line))
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update Purchase Order line");
      load();
    }
  };

  const createInwardGateEntry = async () => {
    if (!po) return;

    try {
      setCreating(true);
      const savedPo = await saveHeader();
      if (!savedPo) return;

      const res = await api.post("/inward-gate-entries", {
        source_purchase_order_id: po.id,
        vendor_no: savedPo.vendor_no,
        vendor_name: savedPo.vendor_name,
        challan_no: savedPo.challan_no,
        location_code: savedPo.location_code ?? null,
        document_date: todayDateInput(),
        posting_date: todayDateInput(),
        lines: lines.map((line) => {
          const calculated = calculatePurchaseLine(line);
          return {
            po_line_id: line.id,
            item_no: line.item_no,
            item_description: line.item_description,
            variant_code: line.variant_code ?? null,
            po_quantity: Number(calculated.quantity ?? 0),
            po_pending_quantity: Number(calculated.qty_to_receive ?? 0),
            received_quantity: Number(calculated.received_quantity ?? 0),
            rejected_quantity: Number(calculated.rejected_qty ?? 0),
          };
        }),
      });

      toast.success("Inward Gate Entry created");
      navigate(`/inward-gate-entries/${res.data.data.id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to create IGE");
    } finally {
      setCreating(false);
    }
  };

  if (loadError) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-destructive">{loadError}</div>
        <Button variant="outline" onClick={() => navigate("/purchase-orders")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>
    );
  }

  if (!po) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  const total = lines.reduce(
    (sum, line) => sum + Number(calculatePurchaseLine(line).line_amount ?? 0),
    0
  );

  return (
    <div>
      <PageHeader
        title={po.document_no}
        subtitle="Purchase Order"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/purchase-orders")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button variant="outline" onClick={saveHeader} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button onClick={createInwardGateEntry} disabled={creating}>
              <Truck className="h-4 w-4 mr-1" />
              Create Inward Gate Entry
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Header <Badge>{po.status ?? "Open"}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="general">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="buy-from">Buy-from</TabsTrigger>
                <TabsTrigger value="dates">Dates</TabsTrigger>
                <TabsTrigger value="invoice">Invoice Details</TabsTrigger>
                <TabsTrigger value="other">Other</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                <F label="Narration" value={po.narration} onChange={(v) => setH("narration", v)} />
                <F label="Vendor No." value={po.vendor_no} onChange={(v) => setH("vendor_no", v)} />
                <F label="Vendor Name" value={po.vendor_name} onChange={(v) => setH("vendor_name", v)} />
                <F label="Vendor GST Reg. No." value={po.vendor_gst_reg_no} onChange={(v) => setH("vendor_gst_reg_no", v)} />
                <F label="Broker Name *" value={po.broker_name} onChange={(v) => setH("broker_name", v)} />
                <F label="Brokerage" type="number" value={po.brokerage} onChange={(v) => setH("brokerage", Number(v))} />
                <F label="Delivery Terms" value={po.delivery_terms} onChange={(v) => setH("delivery_terms", v)} />
                <F label="Deduction" type="number" value={po.deduction} onChange={(v) => setH("deduction", Number(v))} />
                <F label="Cash Discount" type="number" value={po.cash_discount} onChange={(v) => setH("cash_discount", Number(v))} />
                <F label="Receiving No." value={po.receiving_no} onChange={(v) => setH("receiving_no", v)} />
                <F label="Challan No. *" value={po.challan_no} onChange={(v) => setH("challan_no", v)} />
                <F label="Discount" type="number" value={po.discount} onChange={(v) => setH("discount", Number(v))} />
                <div>
                  <Label className="text-xs text-muted-foreground">Location Code *</Label>
                  <LocationSelect value={po.location_code} onChange={(v) => setH("location_code", v)} />
                </div>
              </TabsContent>

              <TabsContent value="buy-from" className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                <F label="Address" value={po.address} onChange={(v) => setH("address", v)} />
                <F label="Address 2" value={po.address_2} onChange={(v) => setH("address_2", v)} />
                <F label="City" value={po.city} onChange={(v) => setH("city", v)} />
                <F label="Post Code" value={po.post_code} onChange={(v) => setH("post_code", v)} />
                <F label="Country/Region" value={po.country_region_code} onChange={(v) => setH("country_region_code", v)} />
                <F label="Phone No." value={po.phone_no} onChange={(v) => setH("phone_no", v)} />
                <F label="Mobile Phone No." value={po.mobile_phone_no} onChange={(v) => setH("mobile_phone_no", v)} />
                <F label="Email" value={po.email} onChange={(v) => setH("email", v)} />
                <F label="Contact" value={po.contact} onChange={(v) => setH("contact", v)} />
              </TabsContent>

              <TabsContent value="dates" className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                <F label="Document Date" type="date" value={dateInputOrToday(po.document_date)} onChange={(v) => setH("document_date", v)} />
                <F label="Posting Date" type="date" value={dateInputOrToday(po.posting_date)} onChange={(v) => setH("posting_date", v)} />
                <F label="Order Date" type="date" value={dateInputOrToday(po.order_date)} onChange={(v) => setH("order_date", v)} />
                <F label="Invoice Received Date" type="date" value={dateInputOrToday(po.invoice_received_date)} onChange={(v) => setH("invoice_received_date", v)} />
                <F label="VAT Date" type="date" value={dateInputOrToday(po.vat_date)} onChange={(v) => setH("vat_date", v)} />
                <F label="Due Date" type="date" value={dateInputOrToday(po.due_date)} onChange={(v) => setH("due_date", v)} />
                <F label="Vendor Invoice No." value={po.vendor_invoice_no} onChange={(v) => setH("vendor_invoice_no", v)} />
                <F label="Vendor Invoice Date" type="date" value={dateInputOrToday(po.vendor_invoice_date)} onChange={(v) => setH("vendor_invoice_date", v)} />
                <F label="Expected Receipt Date" type="date" value={dateInputOrToday(po.expected_receipt_date)} onChange={(v) => setH("expected_receipt_date", v)} />
                <F label="Promised Receipt Date" type="date" value={dateInputOrToday(po.promised_receipt_date)} onChange={(v) => setH("promised_receipt_date", v)} />
                <F label="Requested Receipt Date" type="date" value={dateInputOrToday(po.requested_receipt_date)} onChange={(v) => setH("requested_receipt_date", v)} />
              </TabsContent>

              <TabsContent value="invoice" className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                <div>
                  <Label className="text-xs">Currency Code</Label>
                  <CurrencySelect value={po.currency_code} onChange={(value) => setH("currency_code", value || "INR")} />
                </div>
                <F label="Payment Terms Code" value={po.payment_terms_code} onChange={(v) => setH("payment_terms_code", v)} />
                <F label="Payment Method Code" value={po.payment_method_code} onChange={(v) => setH("payment_method_code", v)} />
                <F label="Payment Discount %" type="number" value={po.payment_discount_pct} onChange={(v) => setH("payment_discount_pct", Number(v))} />
                <F label="Shipment Method Code" value={po.shipment_method_code} onChange={(v) => setH("shipment_method_code", v)} />
                <F label="Payment Reference" value={po.payment_reference} onChange={(v) => setH("payment_reference", v)} />
                <F label="Creditor No." value={po.creditor_no} onChange={(v) => setH("creditor_no", v)} />
                <F label="On Hold" value={po.on_hold} onChange={(v) => setH("on_hold", v)} />
                <F label="Department Code" value={po.department_code} onChange={(v) => setH("department_code", v)} />
              </TabsContent>

              <TabsContent value="other" className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                <F label="Receiving No. Series" value={po.receiving_no_series} onChange={(v) => setH("receiving_no_series", v)} />
                <F label="Your Reference" value={po.your_reference} onChange={(v) => setH("your_reference", v)} />
                <F label="Prepared by" value={po.prepared_by} onChange={(v) => setH("prepared_by", v)} />
                <F label="Referred by" value={po.referred_by} onChange={(v) => setH("referred_by", v)} />
                <F label="Referred by Phone No." value={po.referred_by_phone_no} onChange={(v) => setH("referred_by_phone_no", v)} />
                <F label="Purchaser Code" value={po.purchaser_code} onChange={(v) => setH("purchaser_code", v)} />
                <F label="Quote No." value={po.quote_no} onChange={(v) => setH("quote_no", v)} />
                <F label="Vendor Order No." value={po.vendor_order_no} onChange={(v) => setH("vendor_order_no", v)} />
                <F label="Alt. Vendor Address Code" value={po.alternate_vendor_address_code} onChange={(v) => setH("alternate_vendor_address_code", v)} />
                <F label="Charge Group Code" value={po.charge_group_code} onChange={(v) => setH("charge_group_code", v)} />
                <F label="Order Type" value={po.order_type} onChange={(v) => setH("order_type", v)} />
                <F label="Broker Code" value={po.broker_code} onChange={(v) => setH("broker_code", v)} />
              </TabsContent>
            </Tabs>

            {po.source_mandi_purchase_id && (
              <div className="mt-3">
                <Button variant="link" className="px-0" onClick={() => navigate(`/mandi-purchase/${po.source_mandi_purchase_id}`)}>
                  &larr; View source Mandi Purchase
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lines</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Item No.</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Direct Unit Cost</TableHead>
                  <TableHead className="text-right">Line Disc %</TableHead>
                  <TableHead className="text-right">Line Amount</TableHead>
                  <TableHead className="text-right">Qty to Receive</TableHead>
                  <TableHead className="text-right">Qty Received</TableHead>
                  <TableHead className="text-right">Qty to Invoice</TableHead>
                  <TableHead className="text-right">Qty Invoiced</TableHead>
                  <TableHead className="text-right">Rejected</TableHead>
                  <TableHead className="text-right">Gross Wt.</TableHead>
                  <TableHead className="text-right">Net Wt.</TableHead>
                  <TableHead>HSN/SAC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={19} className="text-center py-8 text-muted-foreground">
                      No lines.
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line) => {
                    const calculated = calculatePurchaseLine(line);

                    return (
                      <TableRow key={line.id}>
                        <TableCell className="text-muted-foreground">{line.line_no}</TableCell>
                        <TableCell>{line.type ?? "Item"}</TableCell>
                        <TableCell className="font-medium">{line.item_no}</TableCell>
                        <TableCell>
                          <VariantSelect itemNo={line.item_no} value={line.variant_code} onChange={(v) => updateLine(line.id, { variant_code: v })} className="h-8 min-w-[140px]" />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{line.item_description}</TableCell>
                        <TableCell>
                          <LocationSelect value={line.location_code} onChange={(v) => updateLine(line.id, { location_code: v })} className="h-8 min-w-[160px]" />
                        </TableCell>
                        <TableCell>
                          <UomSelect value={line.unit_of_measure_code} onChange={(v) => updateLine(line.id, { unit_of_measure_code: v })} className="h-8 min-w-[120px]" />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{money(calculated.quantity)}</TableCell>
                        <TableCell>
                          <InlineNum value={calculated.direct_unit_cost_excl_vat} onSave={(v) => updateLine(line.id, { direct_unit_cost_excl_vat: v })} />
                        </TableCell>
                        <TableCell>
                          <InlineNum percentage value={calculated.line_discount_pct} onSave={(v) => updateLine(line.id, { line_discount_pct: v })} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{money(calculated.line_amount)}</TableCell>
                        <TableCell>
                          <InlineNum value={calculated.qty_to_receive} onSave={(v) => updateLine(line.id, { qty_to_receive: v })} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{money(calculated.received_quantity)}</TableCell>
                        <TableCell>
                          <InlineNum value={calculated.qty_to_invoice} onSave={(v) => updateLine(line.id, { qty_to_invoice: v })} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{money(calculated.qty_invoiced)}</TableCell>
                        <TableCell>
                          <InlineNum value={line.rejected_qty ?? 0} onSave={(v) => updateLine(line.id, { rejected_qty: v })} />
                        </TableCell>
                        <TableCell>
                          <InlineNum value={line.gross_weight ?? 0} onSave={(v) => updateLine(line.id, { gross_weight: v })} />
                        </TableCell>
                        <TableCell>
                          <InlineNum value={line.net_weight ?? 0} onSave={(v) => updateLine(line.id, { net_weight: v })} />
                        </TableCell>
                        <TableCell>
                          <Inline value={line.hsn_sac_code} onSave={(v) => updateLine(line.id, { hsn_sac_code: v })} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            <div className="flex justify-end px-4 py-3 border-t bg-muted/30">
              <div className="text-sm">
                <span className="text-muted-foreground mr-2">Total:</span>
                <span className="font-semibold tabular-nums">{money(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function F({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: any;
  onChange: (value: string) => void;
  type?: string;
}) {
  const isPercentField =
    label.includes("%") ||
    label.toLowerCase().includes("percent") ||
    label.toLowerCase().includes("percentage");

  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {isPercentField ? (
        <NumericInput
          decimalScale={3}
          min={0}
          max={100}
          value={value ?? ""}
          onChange={onChange}
        />
      ) : (
        <Input type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
      )}
    </div>
  );
}

function Inline({ value, onSave }: { value: any; onSave: (value: string) => void }) {
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  return (
    <Input
      className="h-8 min-w-[100px]"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => draft !== (value ?? "") && onSave(draft)}
    />
  );
}

function InlineNum({
  value,
  onSave,
  percentage = false,
}: {
  value: any;
  onSave: (value: number) => void;
  percentage?: boolean;
}) {
  const [draft, setDraft] = useState(String(Number(value ?? 0)));

  useEffect(() => {
    setDraft(String(Number(value ?? 0)));
  }, [value]);

  const commit = () => {
    const next = Number(draft || 0);
    if (next !== Number(value ?? 0)) {
      onSave(next);
    }
  };

  return (
    <NumericInput
      className="h-8 text-right min-w-[90px]"
      value={draft}
      decimalScale={percentage ? 3 : undefined}
      min={percentage ? 0 : undefined}
      max={percentage ? 100 : undefined}
      onChange={setDraft}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
    />
  );
}
