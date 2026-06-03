// import { useEffect, useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import { supabase } from "@/integrations/supabase/client";
// import { PageHeader } from "@/components/PageHeader";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { Badge } from "@/components/ui/badge";
// import { Label } from "@/components/ui/label";
// import { toast } from "sonner";
// import { ArrowLeft, Save, Plus, Trash2, CheckCircle2 } from "lucide-react";
// import { getNextNumber, SERIES } from "@/lib/numberSeries";
// import { LocationSelect } from "@/components/LocationSelect";
// import { VariantSelect } from "@/components/VariantSelect";
// import { UomSelect } from "@/components/UomSelect";
// import { F, Inline, InlineNum } from "@/pages/SalesOrders";

// type Row = Record<string, any>;

// export function SalesInvoiceList() {
//   const [rows, setRows] = useState<Row[]>([]);
//   const [loading, setLoading] = useState(true);
//   const navigate = useNavigate();

//   const load = async () => {
//     setLoading(true);
//     const { data } = await (supabase.from("sales_invoice" as any) as any)
//       .select("*").order("posting_date", { ascending: false });
//     setRows((data as Row[]) ?? []);
//     setLoading(false);
//   };
//   useEffect(() => { load(); }, []);

//   const create = async () => {
//     const document_no = await getNextNumber(SERIES.SALES_INVOICE);
//     const { data, error } = await (supabase.from("sales_invoice" as any) as any)
//       .insert({ document_no, customer_no: "" }).select().single();
//     if (error) return toast.error(error.message);
//     navigate(`/sales-invoices/${data.id}`);
//   };

//   return (
//     <div>
//       <PageHeader
//         title="Sales Invoices"
//         subtitle="Create directly or from a Sales Order"
//         actions={<Button onClick={create}><Plus className="h-4 w-4 mr-1" />New</Button>}
//       />
//       <div className="p-6">
//         <div className="rounded border bg-card">
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>SI No.</TableHead>
//                 <TableHead>Customer No.</TableHead>
//                 <TableHead>Customer Name</TableHead>
//                 <TableHead>Posting Date</TableHead>
//                 <TableHead>Due Date</TableHead>
//                 <TableHead className="text-right">Total</TableHead>
//                 <TableHead>Status</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {loading ? (
//                 <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
//               ) : rows.length === 0 ? (
//                 <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No Sales Invoices yet.</TableCell></TableRow>
//               ) : rows.map((r) => (
//                 <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/sales-invoices/${r.id}`)}>
//                   <TableCell className="font-medium text-primary">{r.document_no}</TableCell>
//                   <TableCell>{r.customer_no}</TableCell>
//                   <TableCell>{r.customer_name}</TableCell>
//                   <TableCell>{r.posting_date}</TableCell>
//                   <TableCell>{r.due_date ?? "—"}</TableCell>
//                   <TableCell className="text-right tabular-nums">{Number(r.total_amount ?? 0).toFixed(2)}</TableCell>
//                   <TableCell><Badge>{r.status}</Badge></TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
//         </div>
//       </div>
//     </div>
//   );
// }

// export function SalesInvoiceDetails() {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const [si, setSi] = useState<Row | null>(null);
//   const [lines, setLines] = useState<Row[]>([]);
//   const [saving, setSaving] = useState(false);
//   const [busy, setBusy] = useState(false);

//   const load = async () => {
//     if (!id) return;
//     const { data: h } = await (supabase.from("sales_invoice" as any) as any).select("*").eq("id", id).maybeSingle();
//     const { data: l } = await (supabase.from("sales_invoice_line" as any) as any).select("*").eq("sales_invoice_id", id).order("line_no");
//     setSi(h as Row | null);
//     setLines((l as Row[]) ?? []);
//   };
//   useEffect(() => { load(); }, [id]);

//   const setH = (k: string, v: any) => si && setSi({ ...si, [k]: v });

//   const totals = () => {
//     const total_amount = lines.reduce((s, l) => s + Number(l.line_amount ?? 0), 0);
//     const total_tax = lines.reduce((s, l) => s + Number(l.tax_amount ?? 0), 0);
//     return { total_amount, total_tax };
//   };

//   const saveHeader = async () => {
//     if (!si) return;
//     setSaving(true);
//     const { id: _i, created_at, updated_at, ...rest } = si;
//     const t = totals();
//     rest.total_amount = t.total_amount;
//     rest.total_tax = t.total_tax;
//     const { error } = await (supabase.from("sales_invoice" as any) as any).update(rest).eq("id", si.id);
//     setSaving(false);
//     if (error) toast.error(error.message); else { toast.success("Saved"); load(); }
//   };

//   const updateLine = async (lineId: string, patch: Partial<Row>) => {
//     const next = lines.map((l) => {
//       if (l.id !== lineId) return l;
//       const m = { ...l, ...patch };
//       const q = Number(m.quantity || 0);
//       const p = Number(m.unit_price || 0);
//       const d = Number(m.line_discount_pct || 0);
//       const tax = Number(m.tax_pct || 0);
//       m.line_amount = +(q * p * (1 - d / 100)).toFixed(2);
//       m.tax_amount = +(m.line_amount * tax / 100).toFixed(2);
//       return m;
//     });
//     setLines(next);
//     const updated = next.find((l) => l.id === lineId);
//     const { error } = await (supabase.from("sales_invoice_line" as any) as any).update({
//       ...patch, line_amount: updated?.line_amount, tax_amount: updated?.tax_amount,
//     }).eq("id", lineId);
//     if (error) toast.error(error.message);
//   };

//   const addLine = async () => {
//     if (!si) return;
//     const next_no = (lines[lines.length - 1]?.line_no ?? 0) + 10;
//     const { data, error } = await (supabase.from("sales_invoice_line" as any) as any)
//       .insert({ sales_invoice_id: si.id, line_no: next_no, item_no: "" }).select().single();
//     if (error) return toast.error(error.message);
//     setLines([...lines, data as Row]);
//   };

//   const removeLine = async (lineId: string) => {
//     await (supabase.from("sales_invoice_line" as any) as any).delete().eq("id", lineId);
//     setLines(lines.filter((l) => l.id !== lineId));
//   };

//   const post = async () => {
//     if (!si) return;
//     if (!confirm("Mark this Sales Invoice as Closed?")) return;
//     setBusy(true);
//     try {
//       await (supabase.from("sales_invoice" as any) as any).update({ status: "Closed" }).eq("id", si.id);
//       toast.success("Invoice closed");
//       navigate("/sales-invoices");
//     } catch (e: any) {
//       toast.error(e.message ?? "Failed to close invoice");
//     } finally { setBusy(false); }
//   };

//   const remove = async () => {
//     if (!si) return;
//     if (!confirm("Delete this Sales Invoice?")) return;
//     await (supabase.from("sales_invoice" as any) as any).delete().eq("id", si.id);
//     navigate("/sales-invoices");
//   };

//   if (!si) return <div className="p-6 text-muted-foreground">Loading…</div>;
//   const t = totals();

//   return (
//     <div>
//       <PageHeader
//         title={si.document_no}
//         subtitle="Sales Invoice"
//         actions={
//           <div className="flex flex-wrap gap-2">
//             <Button variant="outline" onClick={() => navigate("/sales-invoices")}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
//             <Button variant="outline" onClick={saveHeader} disabled={saving}><Save className="h-4 w-4 mr-1" />Save</Button>
//             <Button onClick={post} disabled={busy}><CheckCircle2 className="h-4 w-4 mr-1" />Post</Button>
//             <Button variant="destructive" onClick={remove}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
//           </div>
//         }
//       />
//       <div className="p-6 space-y-4">
//         <Card>
//           <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2">Header <Badge>{si.status}</Badge></CardTitle></CardHeader>
//           <CardContent>
//             <Tabs defaultValue="general">
//               <TabsList className="flex-wrap h-auto">
//                 <TabsTrigger value="general">General</TabsTrigger>
//                 <TabsTrigger value="bill-to">Bill-to</TabsTrigger>
//                 <TabsTrigger value="dates">Dates</TabsTrigger>
//                 <TabsTrigger value="invoice">Invoice</TabsTrigger>
//               </TabsList>
//               <TabsContent value="general" className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
//                 <F label="Customer No." value={si.customer_no} onChange={(v) => setH("customer_no", v)} />
//                 <F label="Customer Name" value={si.customer_name} onChange={(v) => setH("customer_name", v)} />
//                 <F label="Customer GST Reg. No." value={si.customer_gst_reg_no} onChange={(v) => setH("customer_gst_reg_no", v)} />
//                 <F label="GST Customer Type" value={si.gst_customer_type} onChange={(v) => setH("gst_customer_type", v)} />
//                 <F label="Salesperson Code" value={si.salesperson_code} onChange={(v) => setH("salesperson_code", v)} />
//                 <div>
//                   <Label className="text-xs text-muted-foreground">Location Code</Label>
//                   <LocationSelect value={si.location_code} onChange={(v) => setH("location_code", v)} />
//                 </div>
//                 <F label="External Document No." value={si.external_document_no} onChange={(v) => setH("external_document_no", v)} />
//                 <F label="Discount" type="number" value={si.discount} onChange={(v) => setH("discount", Number(v))} />
//                 <F label="Narration" value={si.narration} onChange={(v) => setH("narration", v)} />
//               </TabsContent>
//               <TabsContent value="bill-to" className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
//                 <F label="Address" value={si.address} onChange={(v) => setH("address", v)} />
//                 <F label="Address 2" value={si.address_2} onChange={(v) => setH("address_2", v)} />
//                 <F label="City" value={si.city} onChange={(v) => setH("city", v)} />
//                 <F label="Post Code" value={si.post_code} onChange={(v) => setH("post_code", v)} />
//                 <F label="Country/Region" value={si.country_region_code} onChange={(v) => setH("country_region_code", v)} />
//                 <F label="Contact" value={si.contact} onChange={(v) => setH("contact", v)} />
//                 <F label="Email" value={si.email} onChange={(v) => setH("email", v)} />
//                 <F label="Phone No." value={si.phone_no} onChange={(v) => setH("phone_no", v)} />
//               </TabsContent>
//               <TabsContent value="dates" className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
//                 <F label="Document Date" type="date" value={si.document_date} onChange={(v) => setH("document_date", v)} />
//                 <F label="Posting Date" type="date" value={si.posting_date} onChange={(v) => setH("posting_date", v)} />
//                 <F label="Due Date" type="date" value={si.due_date} onChange={(v) => setH("due_date", v)} />
//               </TabsContent>
//               <TabsContent value="invoice" className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
//                 <F label="Currency Code" value={si.currency_code} onChange={(v) => setH("currency_code", v)} />
//                 <F label="Payment Terms Code" value={si.payment_terms_code} onChange={(v) => setH("payment_terms_code", v)} />
//                 <F label="Payment Method Code" value={si.payment_method_code} onChange={(v) => setH("payment_method_code", v)} />
//               </TabsContent>
//             </Tabs>
//             {si.source_sales_order_id && (
//               <div className="mt-3">
//                 <Button variant="link" className="px-0" onClick={() => navigate(`/sales-orders/${si.source_sales_order_id}`)}>
//                   ← View source Sales Order
//                 </Button>
//               </div>
//             )}
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="pb-3 flex-row items-center justify-between">
//             <CardTitle className="text-base">Lines</CardTitle>
//             <Button size="sm" onClick={addLine}><Plus className="h-4 w-4 mr-1" />Add Line</Button>
//           </CardHeader>
//           <CardContent className="p-0 overflow-x-auto">
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead className="w-12">#</TableHead>
//                   <TableHead>Item No.</TableHead>
//                   <TableHead>Variant</TableHead>
//                   <TableHead>Description</TableHead>
//                   <TableHead>Location</TableHead>
//                   <TableHead>UOM</TableHead>
//                   <TableHead className="text-right">Qty</TableHead>
//                   <TableHead className="text-right">Unit Price</TableHead>
//                   <TableHead className="text-right">Disc %</TableHead>
//                   <TableHead className="text-right">Line Amount</TableHead>
//                   <TableHead className="text-right">Tax %</TableHead>
//                   <TableHead className="text-right">Tax Amt</TableHead>
//                   <TableHead>HSN/SAC</TableHead>
//                   <TableHead></TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {lines.map((l) => (
//                   <TableRow key={l.id}>
//                     <TableCell className="text-muted-foreground">{l.line_no}</TableCell>
//                     <TableCell><Inline value={l.item_no} onSave={(v) => updateLine(l.id, { item_no: v })} /></TableCell>
//                     <TableCell><VariantSelect itemNo={l.item_no} value={l.variant_code} onChange={(v) => updateLine(l.id, { variant_code: v })} className="h-8 min-w-[140px]" /></TableCell>
//                     <TableCell><Inline value={l.item_description} onSave={(v) => updateLine(l.id, { item_description: v })} /></TableCell>
//                     <TableCell><LocationSelect value={l.location_code} onChange={(v) => updateLine(l.id, { location_code: v })} className="h-8 min-w-[140px]" /></TableCell>
//                     <TableCell><UomSelect value={l.unit_of_measure_code} onChange={(v) => updateLine(l.id, { unit_of_measure_code: v })} className="h-8 min-w-[120px]" /></TableCell>
//                     <TableCell><InlineNum value={l.quantity ?? 0} onSave={(v) => updateLine(l.id, { quantity: v })} /></TableCell>
//                     <TableCell><InlineNum value={l.unit_price ?? 0} onSave={(v) => updateLine(l.id, { unit_price: v })} /></TableCell>
//                     <TableCell><InlineNum value={l.line_discount_pct ?? 0} onSave={(v) => updateLine(l.id, { line_discount_pct: v })} /></TableCell>
//                     <TableCell className="text-right tabular-nums">{Number(l.line_amount ?? 0).toFixed(2)}</TableCell>
//                     <TableCell><InlineNum value={l.tax_pct ?? 0} onSave={(v) => updateLine(l.id, { tax_pct: v })} /></TableCell>
//                     <TableCell className="text-right tabular-nums">{Number(l.tax_amount ?? 0).toFixed(2)}</TableCell>
//                     <TableCell><Inline value={l.hsn_sac_code} onSave={(v) => updateLine(l.id, { hsn_sac_code: v })} /></TableCell>
//                     <TableCell><Button size="icon" variant="ghost" onClick={() => removeLine(l.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//             <div className="p-4 border-t flex justify-end gap-8 text-sm">
//               <div>Subtotal: <span className="font-semibold tabular-nums">{t.total_amount.toFixed(2)}</span></div>
//               <div>Tax: <span className="font-semibold tabular-nums">{t.total_tax.toFixed(2)}</span></div>
//               <div>Total: <span className="font-bold tabular-nums">{(t.total_amount + t.total_tax).toFixed(2)}</span></div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }


import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { api } from "@/lib/api";
import { formatDateDisplay, toDateInput } from "@/lib/date";
import { PageHeader } from "@/components/PageHeader";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";

import { Label } from "@/components/ui/label";

import { toast } from "sonner";

import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
} from "lucide-react";

import { LocationSelect } from "@/components/LocationSelect";

import { VariantSelect } from "@/components/VariantSelect";

import { UomSelect } from "@/components/UomSelect";
import { CurrencySelect } from "@/components/CurrencySelect";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/NumericInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


type Row =
  Record<string, any>;

const n = (value: any) =>
  Number(
    String(value ?? 0).replace(/,/g, "")
  );

const isPostedInvoice = (invoice: Row | null | undefined) =>
  String(invoice?.status ?? "").toLowerCase() === "posted";

const lineQtyToInvoice = (line: Row) => {
  if (
    line.qty_to_invoice !== undefined &&
    line.qty_to_invoice !== null &&
    line.qty_to_invoice !== ""
  ) {
    return n(line.qty_to_invoice);
  }

  return Math.max(
    n(line.quantity_shipped || line.quantity) -
      n(line.quantity_invoiced),
    0
  );
};

const calculateLine = (line: Row): Row => {
  const quantityShipped =
    n(line.quantity_shipped || line.quantity);
  const quantityInvoiced =
    n(line.quantity_invoiced);
  const qty =
    Math.min(
      Math.max(lineQtyToInvoice(line), 0),
      Math.max(quantityShipped - quantityInvoiced, 0)
    );
  const discountAmount =
    +(qty * n(line.unit_price) * n(line.line_discount_pct) / 100).toFixed(2);
  const amount =
    +(qty * n(line.unit_price) - discountAmount).toFixed(2);
  const taxAmount =
    +(amount * n(line.tax_pct) / 100).toFixed(2);
  const invoiceType =
    line.invoice_type || "Taxable";
  const taxable =
    String(invoiceType).toLowerCase() === "taxable";
  const cgstPct =
    taxable ? n(line.cgst_pct) : 0;
  const sgstPct =
    taxable ? n(line.sgst_pct) : 0;
  const igstPct =
    taxable ? n(line.igst_pct) : 0;
  const componentPct =
    cgstPct + sgstPct + igstPct;
  const totalGstPct =
    taxable
      ? n(line.total_gst_pct) || componentPct || n(line.tax_pct)
      : 0;
  const fallbackGstAmount =
    +(amount * totalGstPct / 100).toFixed(2);
  const cgstAmount =
    taxable ? +(amount * cgstPct / 100).toFixed(2) : 0;
  const sgstAmount =
    taxable ? +(amount * sgstPct / 100).toFixed(2) : 0;
  const igstAmount =
    taxable ? +(amount * igstPct / 100).toFixed(2) : 0;
  const componentGstAmount =
    +(cgstAmount + sgstAmount + igstAmount).toFixed(2);
  const totalGstAmount =
    componentGstAmount > 0
      ? componentGstAmount
      : fallbackGstAmount;
  const amountIncludingGst =
    +(amount + totalGstAmount).toFixed(2);

  return {
    ...line,
    quantity: quantityShipped,
    quantity_shipped: quantityShipped,
    quantity_invoiced: quantityInvoiced,
    qty_to_invoice: qty,
    balance_qty:
      +(quantityShipped - quantityInvoiced - qty).toFixed(2),
    line_discount_amount: discountAmount,
    line_amount: amount,
    taxable_amount: amount,
    invoice_type: invoiceType,
    gst_place_of_supply:
      line.gst_place_of_supply || "Bill-to Address",
    cgst_pct: cgstPct,
    sgst_pct: sgstPct,
    igst_pct: igstPct,
    total_gst_pct: totalGstPct,
    cgst_amount: cgstAmount,
    sgst_amount: sgstAmount,
    igst_amount: igstAmount,
    total_gst_amount: totalGstAmount,
    amount_including_gst: amountIncludingGst,
    tax_pct: totalGstPct || n(line.tax_pct),
    tax_amount: totalGstAmount || taxAmount,
    amount_including_tax:
      amountIncludingGst ||
      +(amount + taxAmount).toFixed(2),
  };
};

const validateLine = (line: Row) => {
  const quantityShipped =
    n(line.quantity_shipped || line.quantity);
  const quantityInvoiced =
    n(line.quantity_invoiced);
  const qtyToInvoice =
    lineQtyToInvoice(line);
  const remaining =
    Math.max(quantityShipped - quantityInvoiced, 0);

  if (quantityShipped < 0) return "Quantity Shipped cannot be negative";
  if (quantityInvoiced < 0) return "Quantity Invoiced cannot be negative";
  if (qtyToInvoice < 0) return "Qty. to Invoice cannot be negative";
  if (qtyToInvoice > remaining) {
    return "Qty. to Invoice cannot be greater than Quantity Shipped minus Quantity Invoiced";
  }
  if (n(line.unit_price) < 0) return "Unit Price cannot be negative";
  if (n(line.line_discount_pct) < 0 || n(line.line_discount_pct) > 100) {
    return "Line Discount % must be between 0 and 100";
  }
  if (n(line.tax_pct) < 0) return "Tax / VAT % cannot be negative";

  return null;
};

const normalizeDraftLine = (header: Row | null, line: Row): Row => {
  const isOpenInvoice =
    String(header?.status ?? "Open").toLowerCase() !== "posted" &&
    !header?.posted_sales_invoice_id;
  const quantityShipped =
    n(line.quantity_shipped || line.quantity);
  const quantityInvoiced =
    n(line.quantity_invoiced);
  const qtyToInvoiceValue =
    n(line.qty_to_invoice);
  const remaining =
    Math.max(quantityShipped - quantityInvoiced, 0);

  if (
    isOpenInvoice &&
    remaining > 0 &&
    qtyToInvoiceValue === 0
  ) {
    return calculateLine({
      ...line,
      qty_to_invoice: remaining,
    });
  }

  return calculateLine(line);
};

function F({
  label,
  children,
}: any) {

  return (
    <div className="space-y-1">

      <Label className="text-xs text-muted-foreground">
        {label}
      </Label>

      {children}

    </div>
  );
}

function Inline({
  value,
  onChange,
  disabled = false,
  className,
}: any) {

  return (
    <Input
      value={value ?? ""}
      readOnly={disabled}
      className={[
        "h-10 min-w-[120px] px-3 text-sm",
        className,
      ].filter(Boolean).join(" ")}
      onChange={(e) =>
        !disabled &&
        onChange(
          e.target.value
        )
      }
    />
  );
}

function InlineNum({
  value,
  onChange,
  percentage = false,
  disabled = false,
  className,
}: any) {
  const [draft, setDraft] =
    useState(value ?? 0);

  const draftRef =
    useRef(value ?? 0);

  useEffect(() => {
    const next =
      value ?? 0;

    setDraft(next);
    draftRef.current =
      next;
  }, [value]);

  const commit = () => {
    if (disabled) return;

    const parsed =
      n(draftRef.current);

    const next =
      percentage
        ? Math.min(Math.max(parsed, 0), 100)
        : parsed;

    setDraft(next);
    draftRef.current =
      next;
    onChange(next);
  };

  const updateDraft = (nextValue: string) => {
    draftRef.current =
      nextValue;
    setDraft(nextValue);

    const parsed =
      n(nextValue);

    onChange(
      percentage
        ? Math.min(Math.max(parsed, 0), 100)
        : parsed
    );
  };

  return (
    <NumericInput
      value={draft ?? 0}
      decimalScale={percentage ? 3 : undefined}
      min={percentage ? 0 : undefined}
      max={percentage ? 100 : undefined}
      readOnly={disabled}
      disabled={disabled}
      className={[
        "h-10 min-w-[100px] px-3 text-right text-sm tabular-nums",
        className,
      ].filter(Boolean).join(" ")}
      onChange={updateDraft}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

export function SalesInvoiceList() {

  const [rows, setRows] =
    useState<Row[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [newOpen, setNewOpen] =
    useState(false);

  const [shipments, setShipments] =
    useState<Row[]>([]);

  const [loadingShipments, setLoadingShipments] =
    useState(false);

  const [selectedShipment, setSelectedShipment] =
    useState<Row | null>(null);

  const [creatingFromShipment, setCreatingFromShipment] =
    useState(false);

  const navigate =
    useNavigate();

  /**
   * LOAD
   */
  const load =
    async () => {

      try {

        setLoading(true);

        const res =
          await api.get(
            "/sales-invoices"
          );

        setRows(
          res.data ?? []
        );

      } catch (err: any) {

        console.error(err);

        toast.error(
          err?.response?.data
            ?.error ||
            "Failed to load sales invoices"
        );

      } finally {

        setLoading(false);
      }
    };

  useEffect(() => {

    load();

  }, []);

  /**
   * CREATE
   */
  const create =
    async () => {

      try {
        setNewOpen(true);
        setLoadingShipments(true);
        setSelectedShipment(null);

        const res =
          await api.get(
            "/posted-sales-shipments/available-for-invoice"
          );

        setShipments(
          res.data ?? []
        );

      } catch (err: any) {

        console.error(err);

        toast.error(
          err?.response?.data
            ?.error ||
            "Failed to load posted shipments available for invoice"
        );
      } finally {
        setLoadingShipments(false);
      }
    };

  const createFromShipment =
    async () => {

      if (!selectedShipment) {
        toast.error("Select a Posted Sales Shipment first.");
        return;
      }

      try {
        setCreatingFromShipment(true);

        const shipmentNo =
          selectedShipment.document_no ??
          selectedShipment.id;

        const res =
          await api.post(
            `/sales-invoices/from-shipment/${shipmentNo}`
          );

        toast.success(
          `${res.data.sales_invoice_no ?? "Sales Invoice"} created`
        );

        setNewOpen(false);

        navigate(
          `/sales-invoices/${res.data.sales_invoice_id}`
        );
      } catch (err: any) {
        console.error(err);

        toast.error(
          err?.response?.data
            ?.error ||
            "Failed to create sales invoice"
        );
      } finally {
        setCreatingFromShipment(false);
      }
    };

  return (
    <div>

      <PageHeader
        title="Sales Invoices"
        subtitle="Create directly or from a Sales Order"
        actions={

          <Button
            onClick={
              create
            }
          >

            <Plus className="h-4 w-4 mr-1" />

            New

          </Button>
        }
      />

      <div className="p-6">

        <div className="rounded border bg-card">

          <Table>

            <TableHeader>

              <TableRow>

                <TableHead>
                  SI No.
                </TableHead>

                <TableHead>
                  Customer No.
                </TableHead>

                <TableHead>
                  Customer Name
                </TableHead>

                <TableHead>
                  Posting Date
                </TableHead>

                <TableHead>
                  Due Date
                </TableHead>

                <TableHead className="text-right">
                  Total
                </TableHead>

                <TableHead>
                  Status
                </TableHead>

              </TableRow>

            </TableHeader>

            <TableBody>

              {loading ? (

                <TableRow>

                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Loading…
                  </TableCell>

                </TableRow>

              ) : rows.length === 0 ? (

                <TableRow>

                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No Sales Invoices yet.
                  </TableCell>

                </TableRow>

              ) : (

                rows.map((r) => (

                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      navigate(
                        `/sales-invoices/${r.id}`
                      )
                    }
                  >

                    <TableCell className="font-medium text-primary">

                      {r.document_no}

                    </TableCell>

                    <TableCell>
                      {r.customer_no}
                    </TableCell>

                    <TableCell>
                      {r.customer_name}
                    </TableCell>

                    <TableCell>
                      {formatDateDisplay(r.posting_date)}
                    </TableCell>

                    <TableCell>

                      {r.due_date ? formatDateDisplay(r.due_date) :
                        "—"}

                    </TableCell>

                    <TableCell className="text-right tabular-nums">

                      {Number(
                        r.total_amount ?? 0
                      ).toFixed(2)}

                    </TableCell>

                    <TableCell>

                      <Badge>
                        {r.status}
                      </Badge>

                    </TableCell>

                  </TableRow>
                ))
              )}

            </TableBody>

          </Table>

        </div>

      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Select Posted Sales Shipment</DialogTitle>
            <DialogDescription>
              Create a Sales Invoice only for remaining uninvoiced shipment quantities.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment No.</TableHead>
                  <TableHead>Customer No.</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Posting Date</TableHead>
                  <TableHead className="text-right">Remaining Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingShipments ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : shipments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No posted shipments have remaining quantity to invoice.
                    </TableCell>
                  </TableRow>
                ) : (
                  shipments.map((shipment) => (
                    <TableRow
                      key={shipment.id}
                      className={
                        selectedShipment?.id === shipment.id
                          ? "bg-muted cursor-pointer ring-1 ring-primary/30"
                          : "cursor-pointer hover:bg-muted/50"
                      }
                      onClick={() =>
                        setSelectedShipment((current) =>
                          current?.id === shipment.id
                            ? null
                            : shipment
                        )
                      }
                    >
                      <TableCell className="font-medium text-primary">
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-primary/50 text-[10px]">
                            {selectedShipment?.id === shipment.id ? "✓" : ""}
                          </span>
                          {shipment.document_no}
                        </span>
                      </TableCell>
                      <TableCell>{shipment.customer_no ?? "-"}</TableCell>
                      <TableCell>{shipment.customer_name ?? "-"}</TableCell>
                      <TableCell>{formatDateDisplay(shipment.posting_date)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(shipment.remaining_qty_to_invoice ?? 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={createFromShipment}
              disabled={!selectedShipment || creatingFromShipment}
            >
              Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

export function SalesInvoiceDetails() {

  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const [si, setSi] =
    useState<Row | null>(
      null
    );

  const [lines, setLines] =
    useState<Row[]>([]);

  const [gstGroups, setGstGroups] =
    useState<Row[]>([]);

  const [saving, setSaving] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const pendingLineUpdatesRef =
    useRef<Map<string, Promise<unknown>>>(
      new Map()
    );

  const lineSaveTimersRef =
    useRef<Map<string, ReturnType<typeof setTimeout>>>(
      new Map()
    );

  const queuedLinePayloadsRef =
    useRef<Map<string, Row>>(
      new Map()
    );

  const waitForPendingLineUpdates =
    async () => {
      const pending =
        Array.from(
          pendingLineUpdatesRef.current.values()
        );

      if (pending.length > 0) {
        const results =
          await Promise.allSettled(pending);

        return results.every(
          (result) =>
            result.status === "fulfilled"
        );
      }

      return true;
    };

  const persistQueuedLineUpdate =
    async (lineId: string) => {
      const timer =
        lineSaveTimersRef.current.get(lineId);

      if (timer) {
        clearTimeout(timer);
        lineSaveTimersRef.current.delete(lineId);
      }

      const payload =
        queuedLinePayloadsRef.current.get(lineId);

      if (!payload) return true;

      try {
        const request =
          api.put(
            `/sales-invoices/line/${lineId}`,
            payload
          );

        pendingLineUpdatesRef.current.set(
          lineId,
          request
        );

        await request;
        queuedLinePayloadsRef.current.delete(lineId);

        return true;
      } catch (err: any) {
        console.error(err);

        toast.error(
          err?.response?.data
            ?.error ||
            "Failed to update line"
        );

        return false;
      } finally {
        pendingLineUpdatesRef.current.delete(
          lineId
        );
      }
    };

  const flushQueuedLineUpdates =
    async () => {
      const queuedIds =
        Array.from(
          queuedLinePayloadsRef.current.keys()
        );

      const results =
        await Promise.all(
          queuedIds.map((lineId) =>
            persistQueuedLineUpdate(lineId)
          )
        );

      const pendingSaved =
        await waitForPendingLineUpdates();

      return (
        results.every(Boolean) &&
        pendingSaved
      );
    };

  /**
   * LOAD
   */
  const load =
    async () => {

      if (!id) return;

      try {

        const res =
          await api.get(
            `/sales-invoices/${id}`
          );

        const headerData =
          res.data.header;

        setSi(
          headerData
        );

        setLines(
          (res.data.lines ?? []).map((line: Row) =>
            normalizeDraftLine(headerData, line)
          )
        );

      } catch (err: any) {

        console.error(err);

        toast.error(
          err?.response?.data
            ?.error ||
            "Failed to load sales invoice"
        );
      }
    };

  useEffect(() => {

    load();

  }, [id]);

  useEffect(() => {
    (async () => {
      try {
        const res =
          await api.get("/gst-groups");

        setGstGroups(
          Array.isArray(res.data)
            ? res.data
            : []
        );
      } catch {
        setGstGroups([]);
      }
    })();
  }, []);

  const setH = (
    k: string,
    v: any
  ) =>

    si &&
    setSi({
      ...si,
      [k]: v,
    });

  /**
   * TOTALS
   */
  const totals =
    () => {

      const total_amount =
        lines.reduce(
          (s, l) =>
            s +
            Number(
              l.line_amount ??
                0
            ),
          0
        );

      const total_tax =
        lines.reduce(
          (s, l) =>
            s +
            Number(
              l.tax_amount ??
                0
            ),
          0
        );

      const amount_including_tax =
        lines.reduce(
          (s, l) =>
            s +
            Number(
              l.amount_including_tax ??
                Number(l.line_amount ?? 0) +
                  Number(l.tax_amount ?? 0)
            ),
          0
        );

      return {
        total_amount,
        total_tax,
        amount_including_tax,
      };
    };

  /**
   * SAVE HEADER
   */
  const saveHeader =
    async () => {

      if (!si) return;

      if (isPostedInvoice(si)) {
        toast.error("Posted Sales Invoice cannot be edited.");
        return false;
      }

      if (!String(si.location_code ?? "").trim()) {
        toast.error("Location Code is required");
        return false;
      }

      try {

        setSaving(true);

        const activeElement =
          document.activeElement;

        if (
          activeElement instanceof HTMLElement &&
          activeElement.tagName === "INPUT"
        ) {
          activeElement.blur();
          await new Promise((resolve) =>
            setTimeout(resolve, 0)
          );
        }

        const lineUpdatesSaved =
          await flushQueuedLineUpdates();

        if (!lineUpdatesSaved) {
          toast.error("Please fix the line update before saving.");
          return false;
        }

        const t =
          totals();

        await api.put(
          `/sales-invoices/${si.id}`,
          {
            ...si,
            posting_date:
              toDateInput(si.posting_date) || null,
            document_date:
              toDateInput(si.document_date) || null,
            due_date:
              toDateInput(si.due_date) || null,
            total_amount:
              t.total_amount,
            total_tax:
              t.total_tax,
            amount_including_tax:
              t.amount_including_tax,
          }
        );

        toast.success(
          "Saved"
        );

        load();
        return true;

      } catch (err: any) {

        console.error(err);

        toast.error(
          err?.response?.data
            ?.error ||
            "Failed to save sales invoice"
        );

      } finally {

        setSaving(false);
      }
    };

  /**
   * UPDATE LINE
   */
  const updateLine =
    async (
      lineId: string,
      patch: Partial<Row>
    ) => {

      if (isPostedInvoice(si)) {
        toast.error("Posted Sales Invoice cannot be edited.");
        return;
      }

      const current =
        lines.find((l) => l.id === lineId);

      const candidate =
        current
          ? {
              ...current,
              ...patch,
            }
          : null;

      const validationError =
        candidate
          ? validateLine(candidate)
          : null;

      if (validationError) {
        toast.error(validationError);
        return;
      }

      const next =
        lines.map((l) => {

          if (
            l.id !== lineId
          )
            return l;

          const m = {
            ...l,
            ...patch,
          };

          return calculateLine(m);
        });

      const updated =
        next.find(
          (l) =>
            l.id === lineId
        );

      setLines(next);

      queuedLinePayloadsRef.current.set(
        lineId,
        {
          ...patch,
          quantity_shipped:
            updated?.quantity_shipped,
          quantity_invoiced:
            updated?.quantity_invoiced,
          qty_to_invoice:
            updated?.qty_to_invoice,
          balance_qty:
            updated?.balance_qty,
          line_discount_amount:
            updated?.line_discount_amount,
          line_amount:
            updated?.line_amount,
          tax_amount:
            updated?.tax_amount,
          amount_including_tax:
            updated?.amount_including_tax,
          taxable_amount:
            updated?.taxable_amount,
          amount_including_gst:
            updated?.amount_including_gst,
          gst_place_of_supply:
            updated?.gst_place_of_supply,
          gst_group_type:
            updated?.gst_group_type,
          gst_jurisdiction_type:
            updated?.gst_jurisdiction_type,
          invoice_type:
            updated?.invoice_type,
          cgst_pct:
            updated?.cgst_pct,
          sgst_pct:
            updated?.sgst_pct,
          igst_pct:
            updated?.igst_pct,
          total_gst_pct:
            updated?.total_gst_pct,
          cgst_amount:
            updated?.cgst_amount,
          sgst_amount:
            updated?.sgst_amount,
          igst_amount:
            updated?.igst_amount,
          total_gst_amount:
            updated?.total_gst_amount,
        }
      );

      const existingTimer =
        lineSaveTimersRef.current.get(lineId);

      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      lineSaveTimersRef.current.set(
        lineId,
        setTimeout(() => {
          persistQueuedLineUpdate(lineId);
        }, 400)
      );
    };

  const resolveLineGst =
    async (
      line: Row,
      patch: Partial<Row> = {}
    ) => {
      const merged =
        {
          ...line,
          ...patch,
        };

      const gstGroupCode =
        String(merged.gst_group_code ?? "").trim();

      const group =
        gstGroups.find(
          (item) =>
            item.code === gstGroupCode
        );

      const invoiceType =
        merged.invoice_type || "Taxable";

      const basePatch: Partial<Row> = {
        ...patch,
        gst_group_type:
          group?.gst_group_type ??
          merged.gst_group_type ??
          "",
        gst_place_of_supply:
          merged.gst_place_of_supply ||
          "Bill-to Address",
        invoice_type:
          invoiceType,
      };

      if (
        !gstGroupCode ||
        String(invoiceType).toLowerCase() !== "taxable"
      ) {
        return {
          ...basePatch,
          cgst_pct: 0,
          sgst_pct: 0,
          igst_pct: 0,
          total_gst_pct: 0,
          gst_jurisdiction_type: "",
        };
      }

      try {
        const fromState =
          si?.location_state_code ||
          si?.from_state_code ||
          si?.state_code ||
          "";
        const toState =
          si?.bill_to_state_code ||
          si?.customer_state_code ||
          si?.to_state_code ||
          si?.state_code ||
          "";

        const response =
          await api.get("/gst-rates/resolve", {
            params: {
              gst_group_code:
                gstGroupCode,
              from_state:
                fromState,
              to_state:
                toState,
              date:
                toDateInput(si?.posting_date) ||
                toDateInput(si?.document_date) ||
                undefined,
            },
          });

        const rate =
          response.data ?? {};
        const calculationType =
          rate.gst_calculation_type ||
          rate.gst_jurisdiction_type ||
          "";

        return {
          ...basePatch,
          gst_jurisdiction_type:
            String(calculationType)
              .toLowerCase()
              .includes("inter")
              ? "Interstate"
              : "Intrastate",
          cgst_pct:
            n(rate.cgst_pct),
          sgst_pct:
            n(rate.sgst_pct),
          igst_pct:
            n(rate.igst_pct),
          total_gst_pct:
            n(rate.total_gst_pct),
        };
      } catch (err: any) {
        toast.error(
          err?.response?.data?.error ||
          "GST Rate not found for selected GST Group and jurisdiction."
        );

        return basePatch;
      }
    };

  const updateLineGst =
    async (
      line: Row,
      patch: Partial<Row>
    ) => {
      const resolvedPatch =
        await resolveLineGst(
          line,
          patch
        );

      updateLine(
        line.id,
        resolvedPatch
      );
    };

  /**
   * ADD LINE
   */
  const addLine =
    async () => {

      if (!si) return;

      if (isPostedInvoice(si)) {
        toast.error("Posted Sales Invoice cannot be edited.");
        return;
      }

      if (!String(si.location_code ?? "").trim()) {
        toast.error("Location Code is required");
        return;
      }

      try {

        const next_no =
          (
            lines[
              lines.length -
                1
            ]?.line_no ?? 0
          ) + 10;

        const res =
          await api.post(
            `/sales-invoices/${si.id}/lines`,
            {
              line_no:
                next_no,
              item_no: "",
            }
          );

        setLines([
          ...lines,
          res.data,
        ]);

      } catch (err: any) {

        console.error(err);

        toast.error(
          err?.response?.data
            ?.error ||
            "Failed to add line"
        );
      }
    };

  /**
   * REMOVE LINE
   */
  const removeLine =
    async (
      lineId: string
    ) => {

      if (isPostedInvoice(si)) {
        toast.error("Posted Sales Invoice cannot be edited.");
        return;
      }

      try {

        await api.delete(
          `/sales-invoices/line/${lineId}`
        );

        setLines(
          lines.filter(
            (l) =>
              l.id !==
              lineId
          )
        );

      } catch (err: any) {

        console.error(err);

        toast.error(
          err?.response?.data
            ?.error ||
            "Failed to delete line"
        );
      }
    };

  /**
   * POST
   */
  const post =
    async () => {

      if (!si) return;

      if (isPostedInvoice(si)) {
        toast.error("Sales invoice is already posted.");
        return;
      }

      if (
        !confirm(
          "Post this Sales Invoice?"
        )
      ) return;

      try {

        setBusy(true);

        const saved =
          await saveHeader();

        if (!saved) return;

        const res = await api.post(
          `/sales-invoices/${si.id}/post`
        );

        toast.success(
          "Invoice posted"
        );

        navigate(
          `/posted-sales-invoices/${res.data.posted_invoice_id}`
        );

      } catch (err: any) {

        console.error(err);

        toast.error(
          err?.response?.data
            ?.error ||
            "Failed to post invoice"
        );

      } finally {

        setBusy(false);
      }
    };

  /**
   * DELETE
   */
  const remove =
    async () => {

      if (!si) return;

      if (isPostedInvoice(si)) {
        toast.error("Posted Sales Invoice cannot be edited.");
        return;
      }

      if (
        !confirm(
          "Delete this Sales Invoice?"
        )
      ) return;

      try {

        await api.delete(
          `/sales-invoices/${si.id}`
        );

        navigate(
          "/sales-invoices"
        );

      } catch (err: any) {

        console.error(err);

        toast.error(
          err?.response?.data
            ?.error ||
            "Failed to delete sales invoice"
        );
      }
    };

  if (!si) {

    return (
      <div className="p-6 text-muted-foreground">
        Loading…
      </div>
    );
  }

  const t =
    totals();

  const isPosted =
    isPostedInvoice(si);

  return (
    <div>

      <PageHeader
        title={
          si.document_no
        }
        subtitle="Sales Invoice"
        actions={
          <div className="flex flex-wrap gap-2">

            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  "/sales-invoices"
                )
              }
            >

              <ArrowLeft className="h-4 w-4 mr-1" />

              Back

            </Button>

            {!isPosted && (
              <>
                <Button
                  variant="outline"
                  onClick={
                    saveHeader
                  }
                  disabled={
                    saving
                  }
                >

                  <Save className="h-4 w-4 mr-1" />

                  Save

                </Button>

                <Button
                  onClick={post}
                  disabled={busy}
                >

                  <CheckCircle2 className="h-4 w-4 mr-1" />

                  Post

                </Button>

                <Button
                  variant="destructive"
                  onClick={remove}
                >

                  <Trash2 className="h-4 w-4 mr-1" />

                  Delete

                </Button>
              </>
            )}

          </div>
        }
      />

      <div className="p-6 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Header
              <Badge>{si.status}</Badge>
              {isPosted && (
                <span className="text-xs font-normal text-muted-foreground">
                  Posted documents are read-only.
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="general">
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="bill-to">Bill-to</TabsTrigger>
                <TabsTrigger value="dates">Dates</TabsTrigger>
                <TabsTrigger value="invoice">Invoice</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                <F label="Customer No.">
                  <Inline disabled={isPosted} value={si.customer_no} onChange={(v: string) => setH("customer_no", v)} />
                </F>
                <F label="Customer Name">
                  <Inline disabled={isPosted} value={si.customer_name} onChange={(v: string) => setH("customer_name", v)} />
                </F>
                <F label="Bill-to Customer No.">
                  <Inline disabled={isPosted} value={si.bill_to_customer_no} onChange={(v: string) => setH("bill_to_customer_no", v)} />
                </F>
                <F label="Bill-to Name">
                  <Inline disabled={isPosted} value={si.bill_to_name} onChange={(v: string) => setH("bill_to_name", v)} />
                </F>
                <F label="Customer GST Reg. No.">
                  <Inline disabled={isPosted} value={si.customer_gst_reg_no} onChange={(v: string) => setH("customer_gst_reg_no", v)} />
                </F>
                <F label="GST Customer Type">
                  <Inline disabled={isPosted} value={si.gst_customer_type} onChange={(v: string) => setH("gst_customer_type", v)} />
                </F>
                <F label="Salesperson Code">
                  <Inline disabled={isPosted} value={si.salesperson_code} onChange={(v: string) => setH("salesperson_code", v)} />
                </F>
                <F label="Location Code *">
                  <LocationSelect disabled={isPosted} value={si.location_code} onChange={(v) => setH("location_code", v)} />
                </F>
                <F label="External Document No.">
                  <Inline disabled={isPosted} value={si.external_document_no} onChange={(v: string) => setH("external_document_no", v)} />
                </F>
                <F label="Source Shipment No.">
                  <Input value={si.source_shipment_no ?? ""} readOnly />
                </F>
                <F label="Remarks">
                  <Inline disabled={isPosted} value={si.remarks ?? si.narration} onChange={(v: string) => setH("remarks", v)} />
                </F>
              </TabsContent>

              <TabsContent value="bill-to" className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                <F label="Address">
                  <Inline disabled={isPosted} value={si.address} onChange={(v: string) => setH("address", v)} />
                </F>
                <F label="Address 2">
                  <Inline disabled={isPosted} value={si.address_2} onChange={(v: string) => setH("address_2", v)} />
                </F>
                <F label="City">
                  <Inline disabled={isPosted} value={si.city} onChange={(v: string) => setH("city", v)} />
                </F>
                <F label="Post Code">
                  <Inline disabled={isPosted} value={si.post_code} onChange={(v: string) => setH("post_code", v)} />
                </F>
                <F label="Country/Region Code">
                  <Inline disabled={isPosted} value={si.country_region_code} onChange={(v: string) => setH("country_region_code", v)} />
                </F>
                <F label="Contact">
                  <Inline disabled={isPosted} value={si.contact} onChange={(v: string) => setH("contact", v)} />
                </F>
                <F label="Email">
                  <Inline disabled={isPosted} value={si.email} onChange={(v: string) => setH("email", v)} />
                </F>
                <F label="Phone No.">
                  <Inline disabled={isPosted} value={si.phone_no} onChange={(v: string) => setH("phone_no", v)} />
                </F>
              </TabsContent>

              <TabsContent value="dates" className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                <F label="Document Date">
                  <Input type="date" value={toDateInput(si.document_date)} disabled={isPosted} onChange={(e) => setH("document_date", e.target.value)} />
                </F>
                <F label="Posting Date">
                  <Input type="date" value={toDateInput(si.posting_date)} disabled={isPosted} onChange={(e) => setH("posting_date", e.target.value)} />
                </F>
                <F label="Due Date">
                  <Input type="date" value={toDateInput(si.due_date)} disabled={isPosted} onChange={(e) => setH("due_date", e.target.value)} />
                </F>
              </TabsContent>

              <TabsContent value="invoice" className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                <F label="Currency Code">
                  <CurrencySelect value={si.currency_code} onChange={(value) => setH("currency_code", value || "INR")} disabled={isPosted} />
                </F>
                <F label="Payment Terms Code">
                  <Inline disabled={isPosted} value={si.payment_terms_code} onChange={(v: string) => setH("payment_terms_code", v)} />
                </F>
                <F label="Payment Method Code">
                  <Inline disabled={isPosted} value={si.payment_method_code} onChange={(v: string) => setH("payment_method_code", v)} />
                </F>
                <F label="Total Amount">
                  <Input value={t.total_amount.toFixed(2)} readOnly />
                </F>
                <F label="Total Tax / VAT">
                  <Input value={t.total_tax.toFixed(2)} readOnly />
                </F>
                <F label="Amount Including Tax">
                  <Input value={t.amount_including_tax.toFixed(2)} readOnly />
                </F>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-base">Lines</CardTitle>
            {!isPosted && (
              <Button size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" />
                Add Line
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Shipment No.</TableHead>
                  <TableHead>Shipment Line No.</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Item No.</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>GST Place Of Supply</TableHead>
                  <TableHead>GST Group Code</TableHead>
                  <TableHead>GST Group Type</TableHead>
                  <TableHead>GST Jurisdiction Type</TableHead>
                  <TableHead>Invoice Type</TableHead>
                  <TableHead className="text-right">Quantity Shipped</TableHead>
                  <TableHead className="text-right">Quantity Invoiced</TableHead>
                  <TableHead className="text-right">Qty. to Invoice</TableHead>
                  <TableHead className="text-right">Balance Qty</TableHead>
                  <TableHead className="text-right">Unit Price / Rate</TableHead>
                  <TableHead className="text-right">Line Discount %</TableHead>
                  <TableHead className="text-right">Line Discount Amount</TableHead>
                  <TableHead className="text-right">Tax / VAT %</TableHead>
                  <TableHead className="text-right">CGST Amount</TableHead>
                  <TableHead className="text-right">SGST Amount</TableHead>
                  <TableHead className="text-right">IGST Amount</TableHead>
                  <TableHead className="text-right">Total GST</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Amount Including Tax</TableHead>
                  <TableHead>HSN/SAC</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={30} className="text-center py-8 text-muted-foreground">
                      No lines. Click Add Line.
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line) => {
                    const isShipmentBasedLine =
                      Boolean(
                        si.source_posted_sales_shipment_id ||
                        line.source_shipment_no ||
                        line.shipment_no ||
                        line.source_shipment_line_no ||
                        line.shipment_line_no
                      );

                    return (
                    <TableRow key={line.id} className="[&>td]:px-4 [&>td]:py-3 align-middle">
                      <TableCell className="min-w-[52px]">{line.line_no}</TableCell>
                      <TableCell>
                        <Input value={line.shipment_no ?? ""} readOnly className="h-10 min-w-[145px] px-3 text-sm" />
                      </TableCell>
                      <TableCell>
                        <Input value={line.shipment_line_no ?? ""} readOnly className="h-10 min-w-[110px] px-3 text-sm text-right tabular-nums" />
                      </TableCell>
                      <TableCell>
                        <Inline disabled={isPosted} value={line.type ?? "Item"} onChange={(v: string) => updateLine(line.id, { type: v })} className="min-w-[92px]" />
                      </TableCell>
                      <TableCell>
                        <Inline disabled={isPosted} value={line.item_no} onChange={(v: string) => updateLine(line.id, { item_no: v })} className="min-w-[120px]" />
                      </TableCell>
                      <TableCell>
                        <VariantSelect disabled={isPosted} itemNo={line.item_no} value={line.variant_code} onChange={(v) => updateLine(line.id, { variant_code: v })} className="h-10 min-w-[155px]" />
                      </TableCell>
                      <TableCell>
                        <Inline disabled={isPosted} value={line.item_description} onChange={(v: string) => updateLine(line.id, { item_description: v })} className="min-w-[160px]" />
                      </TableCell>
                      <TableCell>
                        <LocationSelect disabled={isPosted} value={line.location_code ?? si.location_code} onChange={(v) => updateLine(line.id, { location_code: v })} className="h-10 min-w-[210px]" />
                      </TableCell>
                      <TableCell>
                        <UomSelect disabled={isPosted} value={line.unit_of_measure_code} onChange={(v) => updateLine(line.id, { unit_of_measure_code: v })} className="h-10 min-w-[135px]" />
                      </TableCell>
                      <TableCell>
                        <Select
                          disabled={isPosted}
                          value={line.gst_place_of_supply || "Bill-to Address"}
                          onValueChange={(value) => updateLineGst(line, { gst_place_of_supply: value })}
                        >
                          <SelectTrigger className="h-10 min-w-[165px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Bill-to Address">Bill-to Address</SelectItem>
                            <SelectItem value="Ship-to Address">Ship-to Address</SelectItem>
                            <SelectItem value="Location Address">Location Address</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          disabled={isPosted}
                          value={line.gst_group_code || "__none__"}
                          onValueChange={(value) =>
                            updateLineGst(line, {
                              gst_group_code: value === "__none__" ? "" : value,
                            })
                          }
                        >
                          <SelectTrigger className="h-10 min-w-[170px]">
                            <SelectValue placeholder="Select GST Group" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Select GST Group</SelectItem>
                            {gstGroups.map((group) => (
                              <SelectItem key={group.code} value={group.code}>
                                {group.code}
                                {group.description ? ` - ${group.description}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.gst_group_type ?? ""}
                          readOnly
                          className="h-10 min-w-[120px] px-3 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.gst_jurisdiction_type ?? ""}
                          readOnly
                          className="h-10 min-w-[150px] px-3 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          disabled={isPosted}
                          value={line.invoice_type || "Taxable"}
                          onValueChange={(value) => updateLineGst(line, { invoice_type: value })}
                        >
                          <SelectTrigger className="h-10 min-w-[125px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Taxable">Taxable</SelectItem>
                            <SelectItem value="Exempt">Exempt</SelectItem>
                            <SelectItem value="Nil Rated">Nil Rated</SelectItem>
                            <SelectItem value="Export">Export</SelectItem>
                            <SelectItem value="Non-GST">Non-GST</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={Number(line.quantity_shipped ?? line.quantity ?? 0).toFixed(2)}
                          readOnly
                          className="h-10 min-w-[110px] px-3 text-right text-sm tabular-nums"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={Number(line.quantity_invoiced ?? 0).toFixed(2)}
                          readOnly
                          className="h-10 min-w-[110px] px-3 text-right text-sm tabular-nums"
                        />
                      </TableCell>
                      <TableCell>
                        <InlineNum disabled={isPosted} value={line.qty_to_invoice ?? 0} onChange={(v: number) => updateLine(line.id, { qty_to_invoice: v })} className="min-w-[110px]" />
                      </TableCell>
                      <TableCell className="min-w-[100px] text-right tabular-nums">
                        {Number(line.balance_qty ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <InlineNum disabled={isPosted || isShipmentBasedLine} value={line.unit_price ?? 0} onChange={(v: number) => updateLine(line.id, { unit_price: v })} className="min-w-[110px]" />
                      </TableCell>
                      <TableCell>
                        <InlineNum disabled={isPosted || isShipmentBasedLine} percentage value={line.line_discount_pct ?? 0} onChange={(v: number) => updateLine(line.id, { line_discount_pct: v })} className="min-w-[115px]" />
                      </TableCell>
                      <TableCell className="min-w-[140px] text-right tabular-nums">
                        {Number(line.line_discount_amount ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <InlineNum
                          disabled={isPosted}
                          percentage
                          value={line.tax_pct ?? line.total_gst_pct ?? 0}
                          onChange={(v: number) =>
                            updateLine(line.id, {
                              tax_pct: v,
                              total_gst_pct: v,
                              cgst_pct: 0,
                              sgst_pct: 0,
                              igst_pct: 0,
                            })
                          }
                          className="min-w-[115px]"
                        />
                      </TableCell>
                      <TableCell className="min-w-[120px] text-right tabular-nums">
                        {Number(line.cgst_amount ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="min-w-[120px] text-right tabular-nums">
                        {Number(line.sgst_amount ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="min-w-[120px] text-right tabular-nums">
                        {Number(line.igst_amount ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="min-w-[120px] text-right tabular-nums">
                        {Number(line.total_gst_amount ?? line.tax_amount ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="min-w-[110px] text-right tabular-nums">
                        {Number(line.line_amount ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="min-w-[150px] text-right tabular-nums">
                        {Number(line.amount_including_tax ?? Number(line.line_amount ?? 0) + Number(line.tax_amount ?? 0)).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Inline disabled={isPosted} value={line.hsn_sac_code} onChange={(v: string) => updateLine(line.id, { hsn_sac_code: v })} className="min-w-[120px]" />
                      </TableCell>
                      <TableCell className="min-w-[56px]">
                        {!isPosted && (
                          <Button size="icon" variant="ghost" onClick={() => removeLine(line.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <div className="p-4 border-t flex justify-end gap-8 text-sm">
              <div>Subtotal: <span className="font-semibold tabular-nums">{t.total_amount.toFixed(2)}</span></div>
              <div>Tax: <span className="font-semibold tabular-nums">{t.total_tax.toFixed(2)}</span></div>
              <div>Amount Including Tax: <span className="font-bold tabular-nums">{t.amount_including_tax.toFixed(2)}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
