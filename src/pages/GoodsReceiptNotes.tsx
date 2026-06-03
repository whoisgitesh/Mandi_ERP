// import { useEffect, useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import { supabase } from "@/integrations/supabase/client";
// import { PageHeader } from "@/components/PageHeader";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Badge } from "@/components/ui/badge";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { toast } from "sonner";
// import { ArrowLeft, Save } from "lucide-react";
// import { LocationSelect } from "@/components/LocationSelect";
// import { VariantSelect } from "@/components/VariantSelect";

// type GRN = Record<string, any>;

// export function GoodsReceiptNotesList() {
//   const [rows, setRows] = useState<GRN[]>([]);
//   const [loading, setLoading] = useState(true);
//   const navigate = useNavigate();

//   useEffect(() => {
//     (async () => {
//       const { data } = await supabase
//         .from("goods_receipt_note" as any)
//         .select("*")
//         .order("posting_date", { ascending: false });
//       setRows((data as any) ?? []);
//       setLoading(false);
//     })();
//   }, []);

//   return (
//     <div>
//       <PageHeader title="Goods Receipt Notes" subtitle="Posted receipts driving on-hand inventory" />
//       <div className="p-6">
//         <div className="rounded border bg-card">
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>GRN No.</TableHead>
//                 <TableHead>Vendor No.</TableHead>
//                 <TableHead>Vendor Name</TableHead>
//                 <TableHead>Location</TableHead>
//                 <TableHead>Posting Date</TableHead>
//                 <TableHead>Status</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {loading ? (
//                 <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
//               ) : rows.length === 0 ? (
//                 <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No GRNs yet. Post one from an Inward Gate Entry.</TableCell></TableRow>
//               ) : rows.map((r) => (
//                 <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/goods-receipt-notes/${r.id}`)}>
//                   <TableCell className="font-medium text-primary">{r.document_no}</TableCell>
//                   <TableCell>{r.vendor_no}</TableCell>
//                   <TableCell>{r.vendor_name}</TableCell>
//                   <TableCell>{r.location_code ?? "—"}</TableCell>
//                   <TableCell>{r.posting_date}</TableCell>
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

// export function GoodsReceiptNoteDetails() {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const [h, setH] = useState<GRN | null>(null);
//   const [lines, setLines] = useState<any[]>([]);
//   const [saving, setSaving] = useState(false);

//   useEffect(() => {
//     if (!id) return;
//     (async () => {
//       const [{ data: hd }, { data: ls }] = await Promise.all([
//         supabase.from("goods_receipt_note" as any).select("*").eq("id", id).maybeSingle(),
//         supabase.from("goods_receipt_note_line" as any).select("*").eq("goods_receipt_note_id", id).order("line_no"),
//       ]);
//       setH((hd as any) ?? null);
//       setLines((ls as any) ?? []);
//     })();
//   }, [id]);

//   const set = (k: string, v: any) => h && setH({ ...h, [k]: v });
//   const save = async () => {
//     if (!h) return;
//     setSaving(true);
//     const { id: _i, created_at, updated_at, ...rest } = h;
//     const { error } = await supabase.from("goods_receipt_note" as any).update(rest).eq("id", h.id);
//     setSaving(false);
//     if (error) toast.error(error.message); else toast.success("Saved");
//   };

//   if (!h) return <div className="p-6 text-muted-foreground">Loading…</div>;

//   return (
//     <div>
//       <PageHeader
//         title={h.document_no}
//         subtitle="Goods Receipt Note"
//         actions={
//           <div className="flex gap-2">
//             <Button variant="outline" onClick={() => navigate("/goods-receipt-notes")}>
//               <ArrowLeft className="h-4 w-4 mr-1" /> Back
//             </Button>
//             <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" /> Save</Button>
//           </div>
//         }
//       />
//       <div className="p-6 space-y-4">
//         <Card>
//           <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2">Header <Badge>{h.status}</Badge></CardTitle></CardHeader>
//           <CardContent>
//             <Tabs defaultValue="general">
//               <TabsList>
//                 <TabsTrigger value="general">General</TabsTrigger>
//                 <TabsTrigger value="buy-from">Buy-from</TabsTrigger>
//                 <TabsTrigger value="invoice">Invoice Details</TabsTrigger>
//               </TabsList>
//               <TabsContent value="general" className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
//                 <F label="Vendor No." value={h.vendor_no} onChange={(v) => set("vendor_no", v)} />
//                 <F label="Vendor Name" value={h.vendor_name} onChange={(v) => set("vendor_name", v)} />
//                 <F label="Vendor GST Reg. No." value={h.vendor_gst_reg_no} onChange={(v) => set("vendor_gst_reg_no", v)} />
//                 <F label="Document Date" type="date" value={h.document_date} onChange={(v) => set("document_date", v)} />
//                 <F label="Posting Date" type="date" value={h.posting_date} onChange={(v) => set("posting_date", v)} />
//                 <div>
//                   <Label className="text-xs text-muted-foreground">Location Code</Label>
//                   <LocationSelect value={h.location_code} onChange={(v) => set("location_code", v)} />
//                 </div>
//                 <F label="Vendor Invoice No." value={h.vendor_invoice_no} onChange={(v) => set("vendor_invoice_no", v)} />
//                 <F label="Vendor Invoice Date" type="date" value={h.vendor_invoice_date} onChange={(v) => set("vendor_invoice_date", v)} />
//                 <F label="Receiving No." value={h.receiving_no} onChange={(v) => set("receiving_no", v)} />
//                 <F label="Purchaser Code" value={h.purchaser_code} onChange={(v) => set("purchaser_code", v)} />
//                 <F label="Broker Name" value={h.broker_name} onChange={(v) => set("broker_name", v)} />
//                 <F label="Brokerage" type="number" value={h.brokerage} onChange={(v) => set("brokerage", Number(v))} />
//               </TabsContent>
//               <TabsContent value="buy-from" className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
//                 <F label="Address" value={h.address} onChange={(v) => set("address", v)} />
//                 <F label="Address 2" value={h.address_2} onChange={(v) => set("address_2", v)} />
//                 <F label="City" value={h.city} onChange={(v) => set("city", v)} />
//                 <F label="Post Code" value={h.post_code} onChange={(v) => set("post_code", v)} />
//                 <F label="Country/Region" value={h.country_region_code} onChange={(v) => set("country_region_code", v)} />
//                 <F label="Phone No." value={h.phone_no} onChange={(v) => set("phone_no", v)} />
//                 <F label="Mobile Phone No." value={h.mobile_phone_no} onChange={(v) => set("mobile_phone_no", v)} />
//                 <F label="Email" value={h.email} onChange={(v) => set("email", v)} />
//                 <F label="Contact" value={h.contact} onChange={(v) => set("contact", v)} />
//               </TabsContent>
//               <TabsContent value="invoice" className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
//                 <F label="Currency Code" value={h.currency_code} onChange={(v) => set("currency_code", v)} />
//                 <F label="Payment Terms Code" value={h.payment_terms_code} onChange={(v) => set("payment_terms_code", v)} />
//                 <F label="Payment Method Code" value={h.payment_method_code} onChange={(v) => set("payment_method_code", v)} />
//                 <F label="Due Date" type="date" value={h.due_date} onChange={(v) => set("due_date", v)} />
//                 <F label="VAT Date" type="date" value={h.vat_date} onChange={(v) => set("vat_date", v)} />
                
//                 <F label="Payment Discount %" type="number" value={h.payment_discount_pct} onChange={(v) => set("payment_discount_pct", Number(v))} />
//                 <F label="Shipment Method" value={h.shipment_method_code} onChange={(v) => set("shipment_method_code", v)} />
//                 <F label="Department Code" value={h.department_code} onChange={(v) => set("department_code", v)} />
//               </TabsContent>
//             </Tabs>
//           </CardContent>
//         </Card>

//         <Card>
//           <CardHeader className="pb-3"><CardTitle className="text-base">Lines</CardTitle></CardHeader>
//           <CardContent className="p-0 overflow-x-auto">
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead>#</TableHead>
//                   <TableHead>Item No.</TableHead>
//                   <TableHead>Variant</TableHead>
//                   <TableHead>Description</TableHead>
//                   <TableHead>Location</TableHead>
//                   <TableHead>UOM</TableHead>
//                   <TableHead className="text-right">Qty Received</TableHead>
//                   <TableHead className="text-right">Unit Cost</TableHead>
//                   <TableHead className="text-right">Line Amount</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {lines.length === 0 ? (
//                   <TableRow><TableCell colSpan={9} className="text-center py-6 text-muted-foreground">No lines</TableCell></TableRow>
//                 ) : lines.map((l) => (
//                   <TableRow key={l.id}>
//                     <TableCell className="text-muted-foreground">{l.line_no}</TableCell>
//                     <TableCell className="font-medium">{l.item_no}</TableCell>
//                     <TableCell><VariantSelect itemNo={l.item_no} value={l.variant_code} onChange={async (v) => { setLines((p) => p.map((x) => x.id === l.id ? { ...x, variant_code: v } : x)); await supabase.from("goods_receipt_note_line" as any).update({ variant_code: v }).eq("id", l.id); }} className="h-8 min-w-[140px]" /></TableCell>
//                     <TableCell className="text-muted-foreground">{l.item_description}</TableCell>
//                     <TableCell>{l.location_code ?? "—"}</TableCell>
//                     <TableCell>{l.unit_of_measure_code ?? "—"}</TableCell>
//                     <TableCell className="text-right tabular-nums">{Number(l.quantity_received ?? 0).toFixed(2)}</TableCell>
//                     <TableCell className="text-right tabular-nums">{Number(l.direct_unit_cost_excl_vat ?? 0).toFixed(2)}</TableCell>
//                     <TableCell className="text-right tabular-nums">{Number(l.line_amount ?? 0).toFixed(2)}</TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }

// function F({ label, value, onChange, type = "text" }: { label: string; value: any; onChange: (v: string) => void; type?: string }) {
//   return (
//     <div>
//       <Label className="text-xs text-muted-foreground">{label}</Label>
//       <Input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
//     </div>
//   );
// }


import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { api } from "@/lib/api";
import { formatDateDisplay } from "@/lib/date";

import { PageHeader } from "@/components/PageHeader";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Badge } from "@/components/ui/badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { toast } from "sonner";

import {
  ArrowLeft,
  Save,
} from "lucide-react";

import { LocationSelect } from "@/components/LocationSelect";

import { VariantSelect } from "@/components/VariantSelect";

type GRN =
  Record<string, any>;

export function GoodsReceiptNotesList() {

  const [rows, setRows] =
    useState<GRN[]>([]);

  const [loading, setLoading] =
    useState(true);

  const navigate =
    useNavigate();

  useEffect(() => {

    (async () => {

      try {

        const res =
          await api.get(
            "/grn"
          );

        setRows(
          res.data ?? []
        );

      } catch (err: any) {

        console.error(err);

        toast.error(
          err?.response?.data
            ?.error ||
            "Failed to load GRNs"
        );

      } finally {

        setLoading(false);
      }

    })();

  }, []);

  return (
    <div>

      <PageHeader
        title="Goods Receipt Notes"
        subtitle="Posted receipts driving on-hand inventory"
      />

      <div className="p-6">

        <div className="rounded border bg-card">

          <Table>

            <TableHeader>

              <TableRow>

                <TableHead>
                  GRN No.
                </TableHead>

                <TableHead>
                  Vendor No.
                </TableHead>

                <TableHead>
                  Vendor Name
                </TableHead>

                <TableHead>
                  Location
                </TableHead>

                <TableHead>
                  Posting Date
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
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Loading…
                  </TableCell>

                </TableRow>

              ) : rows.length === 0 ? (

                <TableRow>

                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No GRNs yet.
                  </TableCell>

                </TableRow>

              ) : (

                rows.map((r) => (

                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      navigate(
                        `/goods-receipt-notes/${r.id}`
                      )
                    }
                  >

                    <TableCell className="font-medium text-primary">
                      {r.grn_document_no ?? "-"}
                    </TableCell>

                    <TableCell>
                      {r.vendor_no}
                    </TableCell>

                    <TableCell>
                      {r.vendor_name}
                    </TableCell>

                    <TableCell>
                      {r.location_code ?? "—"}
                    </TableCell>

                    <TableCell>
                      {formatDateDisplay(r.posting_date)}
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

    </div>
  );
}
