// import { useEffect, useState } from "react";
// import { supabase } from "@/integrations/supabase/client";
// import { PageHeader } from "@/components/PageHeader";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Switch } from "@/components/ui/switch";
// import { Separator } from "@/components/ui/separator";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { toast } from "sonner";
// import { Save } from "lucide-react";

// // ─── Types ────────────────────────────────────────────────────────────────────

// type PurchaseSetup = {
//   id: string;
//   // No. Series
//   vendor_nos: string | null;
//   purchase_order_nos: string | null;
//   purchase_receipt_nos: string | null;
//   posted_receipt_nos: string | null;
//   mandi_purchase_nos: string | null;
//   mandi_vendor_nos: string | null;
//   inward_gate_entry_nos: string | null;
//   goods_receipt_note_nos: string | null;
//   // General
//   default_location_code: string | null;
//   receipt_on_invoice: boolean;
//   copy_comments_order_to_receipt: boolean;
//   copy_comments_order_to_invoice: boolean;
//   // Defaults
//   default_payment_terms_code: string | null;
//   default_payment_method_code: string | null;
//   // Order settings
//   allow_purchase_order_archiving: boolean;
//   calc_inv_discount: boolean;
//   default_qty_to_receive: string | null;
// };

// const defaultSetup: Omit<PurchaseSetup, "id"> = {
//   vendor_nos: null,
//   purchase_order_nos: null,
//   purchase_receipt_nos: null,
//   posted_receipt_nos: null,
//   mandi_purchase_nos: null,
//   mandi_vendor_nos: null,
//   inward_gate_entry_nos: null,
//   goods_receipt_note_nos: null,
//   default_location_code: null,
//   receipt_on_invoice: true,
//   copy_comments_order_to_receipt: true,
//   copy_comments_order_to_invoice: true,
//   default_payment_terms_code: null,
//   default_payment_method_code: null,
//   allow_purchase_order_archiving: false,
//   calc_inv_discount: false,
//   default_qty_to_receive: "Remainder",
// };

// // ─── Component ────────────────────────────────────────────────────────────────

// export default function PurchaseSetupPage() {
//   const [setup, setSetup] = useState<PurchaseSetup | null>(null);
//   const [form, setForm] = useState({ ...defaultSetup });
//   const [noSeriesList, setNoSeriesList] = useState<{ code: string; description: string | null }[]>([]);
//   const [locations, setLocations] = useState<{ code: string; name: string }[]>([]);
//   const [saving, setSaving] = useState(false);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     (async () => {
//       const { data } = await supabase
//         .from("purchase_payables_setup" as any)
//         .select("*")
//         .maybeSingle();

//       if (data) {
//         setSetup(data as unknown as PurchaseSetup);
//         setForm(data as unknown as PurchaseSetup);
//       }

//       const { data: ns } = await supabase
//         .from("number_series" as any)
//         .select("code, description")
//         .order("code");
//       setNoSeriesList((ns as any[]) ?? []);

//       const { data: locs } = await supabase
//         .from("locations")
//         .select("code, name")
//         .order("code");
//       setLocations((locs as any[]) ?? []);

//       setLoading(false);
//     })();
//   }, []);

//   const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

//   const save = async () => {
//     setSaving(true);
//     try {
//       const { error } = setup
//         ? await supabase.from("purchase_payables_setup" as any).update(form).eq("id", (setup as any).id)
//         : await supabase.from("purchase_payables_setup" as any).insert(form);

//       if (error) throw error;
//       toast.success("Purchase & Payables Setup saved");

//       const { data } = await supabase.from("purchase_payables_setup" as any).select("*").maybeSingle();
//       if (data) { setSetup(data as any); setForm(data as any); }
//     } catch (e: any) {
//       toast.error(e.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (loading) return <div className="p-6 text-muted-foreground text-sm">Loading setup…</div>;

//   return (
//     <div>
//       <PageHeader
//         title="Purchase & Payables Setup"
//         subtitle="Configure defaults and number series for purchase documents and vendor master"
//         actions={
//           <Button onClick={save} disabled={saving}>
//             <Save className="h-4 w-4 mr-1" />
//             {saving ? "Saving…" : "Save"}
//           </Button>
//         }
//       />

//       <div className="p-6">
//         <Tabs defaultValue="numbering">
//           <TabsList>
//             <TabsTrigger value="numbering">No. Series</TabsTrigger>
//             <TabsTrigger value="general">General</TabsTrigger>
//             <TabsTrigger value="defaults">Defaults</TabsTrigger>
//             <TabsTrigger value="ordering">Order Settings</TabsTrigger>
//           </TabsList>

//           {/* ── No. Series ── */}
//           <TabsContent value="numbering" className="mt-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle>No. Series</CardTitle>
//                 <CardDescription>
//                   Assign which number series each purchase document and master record should use. Series are defined in the <strong>No. Series</strong> page.
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-2 gap-x-8 gap-y-5">
//                   <NoSeriesField label="Vendor Nos." description="Used when creating new vendor records." value={form.vendor_nos} options={noSeriesList} onChange={(v) => set({ vendor_nos: v })} />
//                   <NoSeriesField label="Purchase Order Nos." description="Assigned when a new Purchase Order is created." value={form.purchase_order_nos} options={noSeriesList} onChange={(v) => set({ purchase_order_nos: v })} />
//                   <NoSeriesField label="Purchase Receipt Nos." description="Assigned on receipt creation." value={form.purchase_receipt_nos} options={noSeriesList} onChange={(v) => set({ purchase_receipt_nos: v })} />
//                   <NoSeriesField label="Posted Receipt Nos." description="Used for the final posted purchase receipt." value={form.posted_receipt_nos} options={noSeriesList} onChange={(v) => set({ posted_receipt_nos: v })} />

//                   <div className="col-span-2">
//                     <Separator className="my-1" />
//                     <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-3 mb-4">Mandi-Specific Documents</p>
//                   </div>

//                   <NoSeriesField label="Mandi Purchase Nos." description="Used for Mandi Purchase documents." value={form.mandi_purchase_nos} options={noSeriesList} onChange={(v) => set({ mandi_purchase_nos: v })} />
//                   <NoSeriesField label="Mandi Vendor Nos." description="Used when creating Mandi Vendor records." value={form.mandi_vendor_nos} options={noSeriesList} onChange={(v) => set({ mandi_vendor_nos: v })} />
//                   <NoSeriesField label="Inward Gate Entry Nos." description="Used for Inward Gate Entry documents." value={form.inward_gate_entry_nos} options={noSeriesList} onChange={(v) => set({ inward_gate_entry_nos: v })} />
//                   <NoSeriesField label="Goods Receipt Note Nos." description="Used for Goods Receipt Note documents." value={form.goods_receipt_note_nos} options={noSeriesList} onChange={(v) => set({ goods_receipt_note_nos: v })} />
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* ── General ── */}
//           <TabsContent value="general" className="mt-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle>General</CardTitle>
//                 <CardDescription>Operational defaults for the purchase process.</CardDescription>
//               </CardHeader>
//               <CardContent className="space-y-5">
//                 <div className="grid grid-cols-2 gap-x-8 gap-y-5">
//                   <div>
//                     <Label className="text-sm mb-1.5 block">Default Location Code</Label>
//                     <p className="text-xs text-muted-foreground mb-2">Location prefilled on new purchase documents.</p>
//                     <Select value={form.default_location_code ?? "__none__"} onValueChange={(v) => set({ default_location_code: v === "__none__" ? null : v })}>
//                       <SelectTrigger>
//                         <SelectValue placeholder="— None —" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="__none__">— None —</SelectItem>
//                         {locations.map((l) => (
//                           <SelectItem key={l.code} value={l.code}>{l.code} – {l.name}</SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                   </div>
//                 </div>

//                 <Separator />

//                 <div className="space-y-4">
//                   <ToggleRow
//                     label="Receipt on Invoice"
//                     description="Automatically post a receipt when posting a purchase invoice."
//                     checked={form.receipt_on_invoice}
//                     onCheckedChange={(v) => set({ receipt_on_invoice: v })}
//                   />
//                   <ToggleRow
//                     label="Copy Comments (Order → Receipt)"
//                     description="Copy internal comments from Purchase Order to Purchase Receipt."
//                     checked={form.copy_comments_order_to_receipt}
//                     onCheckedChange={(v) => set({ copy_comments_order_to_receipt: v })}
//                   />
//                   <ToggleRow
//                     label="Copy Comments (Order → Invoice)"
//                     description="Copy internal comments from Purchase Order to Purchase Invoice."
//                     checked={form.copy_comments_order_to_invoice}
//                     onCheckedChange={(v) => set({ copy_comments_order_to_invoice: v })}
//                   />
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* ── Defaults ── */}
//           <TabsContent value="defaults" className="mt-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Default Codes</CardTitle>
//                 <CardDescription>Default codes prefilled on new vendor records and purchase documents.</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-2 gap-x-8 gap-y-5">
//                   <div>
//                     <Label className="text-sm mb-1.5 block">Default Payment Terms Code</Label>
//                     <p className="text-xs text-muted-foreground mb-2">Prefilled on new vendor cards.</p>
//                     <Input
//                       value={form.default_payment_terms_code ?? ""}
//                       placeholder="e.g. NET30"
//                       onChange={(e) => set({ default_payment_terms_code: e.target.value || null })}
//                     />
//                   </div>
//                   <div>
//                     <Label className="text-sm mb-1.5 block">Default Payment Method Code</Label>
//                     <p className="text-xs text-muted-foreground mb-2">Prefilled on new vendor cards.</p>
//                     <Input
//                       value={form.default_payment_method_code ?? ""}
//                       placeholder="e.g. CASH"
//                       onChange={(e) => set({ default_payment_method_code: e.target.value || null })}
//                     />
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* ── Order Settings ── */}
//           <TabsContent value="ordering" className="mt-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Order Settings</CardTitle>
//                 <CardDescription>Configure behaviour around purchase order processing.</CardDescription>
//               </CardHeader>
//               <CardContent className="space-y-5">
//                 <div>
//                   <Label className="text-sm mb-1.5 block">Default Qty. to Receive</Label>
//                   <p className="text-xs text-muted-foreground mb-2">
//                     Controls what is prefilled in the "Qty. to Receive" field when opening a purchase order.
//                   </p>
//                   <Select value={form.default_qty_to_receive ?? "Remainder"} onValueChange={(v) => set({ default_qty_to_receive: v })}>
//                     <SelectTrigger className="w-64">
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="Remainder">Remainder</SelectItem>
//                       <SelectItem value="Blank">Blank</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 <Separator />

//                 <div className="space-y-4">
//                   <ToggleRow
//                     label="Allow Purchase Order Archiving"
//                     description="Enable archiving of released or completed purchase orders."
//                     checked={form.allow_purchase_order_archiving}
//                     onCheckedChange={(v) => set({ allow_purchase_order_archiving: v })}
//                   />
//                   <ToggleRow
//                     label="Calculate Invoice Discount"
//                     description="Automatically calculate invoice-level discounts on purchase documents."
//                     checked={form.calc_inv_discount}
//                     onCheckedChange={(v) => set({ calc_inv_discount: v })}
//                   />
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </div>
//     </div>
//   );
// }

// // ─── Helpers ───────────────────────────────────────────────────────────────────

// function NoSeriesField({ label, description, value, options, onChange }: {
//   label: string;
//   description: string;
//   value: string | null;
//   options: { code: string; description: string | null }[];
//   onChange: (v: string | null) => void;
// }) {
//   return (
//     <div>
//       <Label className="text-sm mb-1.5 block font-medium">{label}</Label>
//       <p className="text-xs text-muted-foreground mb-2">{description}</p>
//       <Select value={value ?? "__none__"} onValueChange={(v) => onChange(v === "__none__" ? null : v)}>
//         <SelectTrigger>
//           <SelectValue placeholder="— Not set —" />
//         </SelectTrigger>
//         <SelectContent>
//           <SelectItem value="__none__">— Not set —</SelectItem>
//           {options.map((o) => (
//             <SelectItem key={o.code} value={o.code}>
//               {o.code}
//               {o.description && <span className="text-muted-foreground ml-2 text-xs">— {o.description}</span>}
//             </SelectItem>
//           ))}
//         </SelectContent>
//       </Select>
//     </div>
//   );
// }

// function ToggleRow({ label, description, checked, onCheckedChange }: {
//   label: string;
//   description: string;
//   checked: boolean;
//   onCheckedChange: (v: boolean) => void;
// }) {
//   return (
//     <div className="flex items-start justify-between gap-6">
//       <div className="flex-1">
//         <p className="text-sm font-medium">{label}</p>
//         <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
//       </div>
//       <Switch checked={checked} onCheckedChange={onCheckedChange} />
//     </div>
//   );
// }

// import { useEffect, useState } from "react";
// import { PageHeader } from "@/components/PageHeader";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Switch } from "@/components/ui/switch";
// import { Separator } from "@/components/ui/separator";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { toast } from "sonner";
// import { Save } from "lucide-react";

// // ─── Types ────────────────────────────────────────────────────────────────────

// type PurchaseSetup = {
//   id: string;

//   // No. Series
//   vendor_nos: string | null;
//   purchase_order_nos: string | null;
//   purchase_receipt_nos: string | null;
//   posted_receipt_nos: string | null;
//   mandi_purchase_nos: string | null;
//   mandi_vendor_nos: string | null;
//   inward_gate_entry_nos: string | null;
//   goods_receipt_note_nos: string | null;
//   quote_nos: string | null;
// blanket_order_nos: string | null;
// order_nos: string | null;
// return_order_nos: string | null;

// invoice_nos: string | null;
// posted_invoice_nos: string | null;

// credit_memo_nos: string | null;
// posted_credit_memo_nos: string | null;

// posted_return_shipment_nos: string | null;

// posted_prepmt_inv_nos: string | null;
// posted_prepmt_cr_memo_nos: string | null;

// gst_liability_adj_jnl_nos: string | null;

// delivery_challan_nos: string | null;
// posted_delivery_challan_nos: string | null;

// multiple_subcon_order_det_nos: string | null;
// subcontracting_order_nos: string | null;

// posted_sc_comp_rcpt_nos: string | null;

//   // General
//   default_location_code: string | null;
//   receipt_on_invoice: boolean;
//   copy_comments_order_to_receipt: boolean;
//   copy_comments_order_to_invoice: boolean;

//   // Defaults
//   default_payment_terms_code: string | null;
//   default_payment_method_code: string | null;

//   // Order settings
//   allow_purchase_order_archiving: boolean;
//   calc_inv_discount: boolean;
//   default_qty_to_receive: string | null;

//   discount_posting?: string | null;
// return_shipment_on_credit_memo?: boolean;
// invoice_rounding?: boolean;
// default_gl_account_quantity?: boolean;
// copy_vendor_name_to_entries?: boolean;
// ext_doc_no_mandatory?: boolean;
// allow_vat_difference?: boolean;
// appln_between_currencies?: string | null;
// copy_comments_blanket_to_order?: boolean;

// prepmt_auto_update_frequency?: string | null;
// default_posting_date?: string | null;
// posting_date_check_on_posting?: boolean;
// allow_multiple_posting_groups?: boolean;
// check_multiple_posting_groups?: string | null;
// ignore_updated_addresses?: boolean;
// copy_line_descr_to_gl_entry?: boolean;
// };

// const defaultSetup: Omit<PurchaseSetup, "id"> = {
//   vendor_nos: null,
//   purchase_order_nos: null,
//   purchase_receipt_nos: null,
//   posted_receipt_nos: null,
//   mandi_purchase_nos: null,
//   mandi_vendor_nos: null,
//   inward_gate_entry_nos: null,
//   goods_receipt_note_nos: null,

//   default_location_code: null,

//   receipt_on_invoice: true,
//   copy_comments_order_to_receipt: true,
//   copy_comments_order_to_invoice: true,

//   default_payment_terms_code: null,
//   default_payment_method_code: null,

//   allow_purchase_order_archiving: false,
//   calc_inv_discount: false,
//   default_qty_to_receive: "Remainder",
//   discount_posting: "All Discounts",
// return_shipment_on_credit_memo: false,
// invoice_rounding: true,
// default_gl_account_quantity: false,
// copy_vendor_name_to_entries: true,
// ext_doc_no_mandatory: false,
// allow_vat_difference: false,
// appln_between_currencies: "All",
// copy_comments_blanket_to_order: true,

// prepmt_auto_update_frequency: "Never",
// default_posting_date: "Work Date",
// posting_date_check_on_posting: false,
// allow_multiple_posting_groups: false,
// check_multiple_posting_groups: "Alternative Groups",
// ignore_updated_addresses: false,
// copy_line_descr_to_gl_entry: false,
// quote_nos: null,
// blanket_order_nos: null,
// order_nos: null,
// return_order_nos: null,

// invoice_nos: null,
// posted_invoice_nos: null,

// credit_memo_nos: null,
// posted_credit_memo_nos: null,

// posted_return_shipment_nos: null,

// posted_prepmt_inv_nos: null,
// posted_prepmt_cr_memo_nos: null,

// gst_liability_adj_jnl_nos: null,

// delivery_challan_nos: null,
// posted_delivery_challan_nos: null,

// multiple_subcon_order_det_nos: null,
// subcontracting_order_nos: null,

// posted_sc_comp_rcpt_nos: null,
// };

// // ─── Component ────────────────────────────────────────────────────────────────

// export default function PurchaseSetupPage() {
//   const [setup, setSetup] = useState<PurchaseSetup | null>(null);

//   const [form, setForm] =
//     useState({ ...defaultSetup });

//   const [noSeriesList, setNoSeriesList] =
//     useState<
//       {
//         code: string;
//         description: string | null;
//       }[]
//     >([]);

//   const [locations, setLocations] =
//     useState<
//       {
//         code: string;
//         name: string;
//       }[]
//     >([]);

//   const [saving, setSaving] =
//     useState(false);

//   const [loading, setLoading] =
//     useState(true);

//   // ──────────────────────────────────────────────────────────
//   // LOAD DATA
//   // ──────────────────────────────────────────────────────────

//   useEffect(() => {
//     (async () => {
//       try {

//         // LOAD SETUP

//         const setupRes = await fetch(
//           "http://localhost:5000/api/setup/purchase-payables"
//         );

//         const setupResult =
//           await setupRes.json();

//         if (
//           setupResult.success &&
//           setupResult.data
//         ) {
//           setSetup(setupResult.data);
//           setForm(setupResult.data);
//         }

//         // LOAD NUMBER SERIES

//         const nsRes = await fetch(
//           "http://localhost:5000/api/no-series/options"
//         );

//         const nsResult =
//           await nsRes.json();

//         if (nsResult.success) {
//           setNoSeriesList(
//             nsResult.data
//           );
//         }

//         // LOAD LOCATIONS

//         const locRes = await fetch(
//           "http://localhost:5000/api/locations"
//         );

//         const locResult =
//           await locRes.json();

//         if (locResult.success) {
//           setLocations(
//             locResult.data
//           );
//         }

//       } catch (err) {

//         console.error(err);

//         toast.error(
//           "Failed to load Purchase Setup"
//         );

//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, []);

//   // ──────────────────────────────────────────────────────────
//   // HELPERS
//   // ──────────────────────────────────────────────────────────

//   const set = (
//     patch: Partial<typeof form>
//   ) =>
//     setForm((f) => ({
//       ...f,
//       ...patch,
//     }));

//   // ──────────────────────────────────────────────────────────
//   // SAVE
//   // ──────────────────────────────────────────────────────────

//   const save = async () => {
//     setSaving(true);

//     try {

//       const response = await fetch(
//         "http://localhost:5000/api/setup/purchase-payables",
//         {
//           method: "PUT",

//           headers: {
//             "Content-Type":
//               "application/json",
//           },

//           body: JSON.stringify(form),
//         }
//       );

//       const result =
//         await response.json();

//       if (!result.success) {
//         throw new Error(
//           result.message ||
//             "Save failed"
//         );
//       }

//       setSetup(result.data);
//       setForm(result.data);

//       toast.success(
//         "Purchase & Payables Setup saved"
//       );

//     } catch (e: any) {

//       console.error(e);

//       toast.error(
//         e.message ||
//           "Save failed"
//       );

//     } finally {
//       setSaving(false);
//     }
//   };

//   // ──────────────────────────────────────────────────────────
//   // LOADING
//   // ──────────────────────────────────────────────────────────

//   if (loading) {
//     return (
//       <div className="p-6 text-muted-foreground text-sm">
//         Loading setup…
//       </div>
//     );
//   }

//   // ──────────────────────────────────────────────────────────
//   // UI
//   // ──────────────────────────────────────────────────────────

//   return (
//     <div>
//       <PageHeader
//         title="Purchase & Payables Setup"
//         subtitle="Configure defaults and number series for purchase documents and vendor master"
//         actions={
//           <Button
//             onClick={save}
//             disabled={saving}
//           >
//             <Save className="h-4 w-4 mr-1" />

//             {saving
//               ? "Saving…"
//               : "Save"}
//           </Button>
//         }
//       />

//       <div className="p-6">
//         <Tabs defaultValue="numbering">

//           <TabsList>
//             <TabsTrigger value="numbering">
//               No. Series
//             </TabsTrigger>

//             <TabsTrigger value="general">
//               General
//             </TabsTrigger>

//             <TabsTrigger value="defaults">
//               Background Posting
//             </TabsTrigger>

//             <TabsTrigger value="ordering">
//               Archives
//             </TabsTrigger>
//           </TabsList>

//           {/* NUMBER SERIES */}

//           <TabsContent
//             value="numbering"
//             className="mt-4"
//           >
//             <Card>
//               <CardHeader>
//                 <CardTitle>
//                   No. Series
//                 </CardTitle>

//                 <CardDescription>
//                   Assign number series
//                   for purchase documents
//                   and vendor records.
//                 </CardDescription>
//               </CardHeader>

//               <CardContent>
//                 <div className="grid grid-cols-2 gap-x-8 gap-y-5">

//   {/* LEFT COLUMN */}

//   <NoSeriesField
//     label="Vendor Nos."
//     description="Vendor numbering"
//     value={form.vendor_nos}
//     options={noSeriesList}
//     onChange={(v) =>
//       set({
//         vendor_nos: v,
//       })
//     }
//   />

//   <NoSeriesField
//     label="Posted Prepmt. Inv. Nos."
//     description="Posted prepayment invoice numbering"
//     value={form.posted_prepmt_inv_nos}
//     options={noSeriesList}
//     onChange={(v) =>
//       set({
//         posted_prepmt_inv_nos: v,
//       })
//     }
//   />

//   <NoSeriesField
//     label="Quote Nos."
//     description="Purchase quote numbering"
//     value={form.quote_nos}
//     options={noSeriesList}
//     onChange={(v) =>
//       set({
//         quote_nos: v,
//       })
//     }
//   />

//   <NoSeriesField
//     label="Posted Prepmt. Cr. Memo Nos."
//     description="Posted prepayment credit memo numbering"
//     value={form.posted_prepmt_cr_memo_nos}
//     options={noSeriesList}
//     onChange={(v) =>
//       set({
//         posted_prepmt_cr_memo_nos: v,
//       })
//     }
//   />

//   <NoSeriesField
//     label="Blanket Order Nos."
//     description="Blanket order numbering"
//     value={form.blanket_order_nos}
//     options={noSeriesList}
//     onChange={(v) =>
//       set({
//         blanket_order_nos: v,
//       })
//     }
//   />

//   <NoSeriesField
//     label="GST Liability Adj. Jnl Nos."
//     description="GST adjustment journal numbering"
//     value={form.gst_liability_adj_jnl_nos}
//     options={noSeriesList}
//     onChange={(v) =>
//       set({
//         gst_liability_adj_jnl_nos: v,
//       })
//     }
//   />

//   <NoSeriesField
//     label="Order Nos."
//     description="Purchase order numbering"
//     value={form.order_nos}
//     options={noSeriesList}
//     onChange={(v) =>
//       set({
//         order_nos: v,
//       })
//     }
//   />

//   <NoSeriesField
//     label="Delivery Challan Nos."
//     description="Delivery challan numbering"
//     value={form.delivery_challan_nos}
//     options={noSeriesList}
//     onChange={(v) =>
//       set({
//         delivery_challan_nos: v,
//       })
//     }
//   />

//   <NoSeriesField
//     label="Return Order Nos."
//     description="Return order numbering"
//     value={form.return_order_nos}
//     options={noSeriesList}
//     onChange={(v) =>
//       set({
//         return_order_nos: v,
//       })
//     }
//   />

//   <NoSeriesField
//     label="Posted Delivery Challan Nos."
//     description="Posted delivery challan numbering"
//     value={form.posted_delivery_challan_nos}
//     options={noSeriesList}
//     onChange={(v) =>
//       set({
//         posted_delivery_challan_nos: v,
//       })
//     }
//   />

//   <NoSeriesField
//     label="Invoice Nos."
//     description="Invoice numbering"
//     value={form.invoice_nos}
//     options={noSeriesList}
//     onChange={(v) =>
//       set({
//         invoice_nos: v,
//       })
//     }
//   />

//   <NoSeriesField
//     label="Multiple Subcon. Order Det Nos."
//     description="Multiple subcontract order detail numbering"
//     value={form.multiple_subcon_order_det_nos}
//     options={noSeriesList}
//     onChange={(v) =>
//       set({
//         multiple_subcon_order_det_nos: v,
//       })
//     }
//   />

//   <NoSeriesField
//     label="Posted Invoice Nos."
//     description="Posted invoice numbering"
//     value={form.posted_invoice_nos}
//     options={noSeriesList}
//     onChange={(v) =>
//       set({
//         posted_invoice_nos: v,
//       })
//     }
//   />

//   <NoSeriesField
//     label="Subcontracting Order Nos."
//     description="Subcontracting order numbering"
//     value={form.subcontracting_order_nos}
//     options={noSeriesList}
//     onChange={(v) =>
//       set({
//         subcontracting_order_nos: v,
//       })
//     }
//   />

//   <NoSeriesField
//     label="Credit Memo Nos."
//     description="Credit memo numbering"
//     value={form.credit_memo_nos}
//     options={noSeriesList}
//     onChange={(v) =>
//       set({
//         credit_memo_nos: v,
//       })
//     }
//   />

//   <NoSeriesField
//     label="Posted SC Comp. Rcpt. Nos."
//     description="Posted subcontracting component receipt numbering"
//     value={form.posted_sc_comp_rcpt_nos}
//     options={noSeriesList}
//     onChange={(v) =>
//       set({
//         posted_sc_comp_rcpt_nos: v,
//       })
//     }
//   />

//   <NoSeriesField
//     label="Posted Credit Memo Nos."
//     description="Posted credit memo numbering"
//     value={form.posted_credit_memo_nos}
//     options={noSeriesList}
//     onChange={(v) =>
//       set({
//         posted_credit_memo_nos: v,
//       })
//     }
//   />

//   <NoSeriesField
//     label="Purchase Receipt Nos."
//     description="Purchase receipt numbering"
//     value={form.purchase_receipt_nos}
//     options={noSeriesList}
//     onChange={(v) =>
//       set({
//         purchase_receipt_nos: v,
//       })
//     }
//   />

//   <NoSeriesField
//     label="Posted Receipt Nos."
//     description="Posted receipt numbering"
//     value={form.posted_receipt_nos}
//     options={noSeriesList}
//     onChange={(v) =>
//       set({
//         posted_receipt_nos: v,
//       })
//     }
//   />

//   <NoSeriesField
//     label="Posted Return Shpt. Nos."
//     description="Posted return shipment numbering"
//     value={form.posted_return_shipment_nos}
//     options={noSeriesList}
//     onChange={(v) =>
//       set({
//         posted_return_shipment_nos: v,
//       })
//     }
//   />

// </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* GENERAL */}
//           {/* GENERAL */}

// <TabsContent
//   value="general"
//   className="mt-4"
// >
//   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

//     {/* LEFT CARD */}

//     <Card>
//       <CardHeader>
//         <CardTitle>
//           General
//         </CardTitle>

//         <CardDescription>
//           Purchase process behaviour settings.
//         </CardDescription>
//       </CardHeader>

//       <CardContent className="space-y-5">

//         {/* Discount Posting */}

//         <div>
//           <Label className="text-sm mb-1.5 block">
//             Discount Posting
//           </Label>

//           <Select
//             value={
//               form.discount_posting ??
//               "All Discounts"
//             }
//             onValueChange={(v) =>
//               set({
//                 discount_posting: v,
//               })
//             }
//           >
//             <SelectTrigger>
//               <SelectValue />
//             </SelectTrigger>

//             <SelectContent>
//               <SelectItem value="All Discounts">
//                 All Discounts
//               </SelectItem>

//               <SelectItem value="Invoice Discounts">
//                 Invoice Discounts
//               </SelectItem>

//               <SelectItem value="Line Discounts">
//                 Line Discounts
//               </SelectItem>

//               <SelectItem value="None">
//                 None
//               </SelectItem>
//             </SelectContent>
//           </Select>
//         </div>

//         <ToggleRow
//           label="Receipt on Invoice"
//           description="Automatically create receipt on invoice posting"
//           checked={
//             form.receipt_on_invoice
//           }
//           onCheckedChange={(v) =>
//             set({
//               receipt_on_invoice: v,
//             })
//           }
//         />

//         <ToggleRow
//           label="Return Shipment on Credit Memo"
//           description="Create return shipment automatically"
//           checked={
//             form.return_shipment_on_credit_memo ??
//             false
//           }
//           onCheckedChange={(v) =>
//             set({
//               return_shipment_on_credit_memo:
//                 v,
//             })
//           }
//         />

//         <ToggleRow
//           label="Invoice Rounding"
//           description="Enable invoice rounding"
//           checked={
//             form.invoice_rounding ??
//             false
//           }
//           onCheckedChange={(v) =>
//             set({
//               invoice_rounding: v,
//             })
//           }
//         />

//         <ToggleRow
//           label="Default G/L Account Quantity"
//           description="Use default quantity for G/L accounts"
//           checked={
//             form.default_gl_account_quantity ??
//             false
//           }
//           onCheckedChange={(v) =>
//             set({
//               default_gl_account_quantity:
//                 v,
//             })
//           }
//         />

//         <ToggleRow
//           label="Copy Vendor Name to Entries"
//           description="Copy vendor name to ledger entries"
//           checked={
//             form.copy_vendor_name_to_entries ??
//             false
//           }
//           onCheckedChange={(v) =>
//             set({
//               copy_vendor_name_to_entries:
//                 v,
//             })
//           }
//         />

//         <ToggleRow
//           label="Ext. Doc. No. Mandatory"
//           description="Require external document number"
//           checked={
//             form.ext_doc_no_mandatory ??
//             false
//           }
//           onCheckedChange={(v) =>
//             set({
//               ext_doc_no_mandatory:
//                 v,
//             })
//           }
//         />

//         <ToggleRow
//           label="Allow VAT Difference"
//           description="Allow VAT difference during posting"
//           checked={
//             form.allow_vat_difference ??
//             false
//           }
//           onCheckedChange={(v) =>
//             set({
//               allow_vat_difference:
//                 v,
//             })
//           }
//         />

//         <ToggleRow
//           label="Calc. Inv. Discount"
//           description="Calculate invoice discount automatically"
//           checked={
//             form.calc_inv_discount
//           }
//           onCheckedChange={(v) =>
//             set({
//               calc_inv_discount: v,
//             })
//           }
//         />

//         {/* Application Between Currencies */}

//         <div>
//           <Label className="text-sm mb-1.5 block">
//             Appln. between Currencies
//           </Label>

//           <Select
//             value={
//               form.appln_between_currencies ??
//               "All"
//             }
//             onValueChange={(v) =>
//               set({
//                 appln_between_currencies:
//                   v,
//               })
//             }
//           >
//             <SelectTrigger>
//               <SelectValue />
//             </SelectTrigger>

//             <SelectContent>
//               <SelectItem value="All">
//                 All
//               </SelectItem>

//               <SelectItem value="EMU Only">
//                 EMU Only
//               </SelectItem>

//               <SelectItem value="None">
//                 None
//               </SelectItem>
//             </SelectContent>
//           </Select>
//         </div>

//         <ToggleRow
//           label="Copy Comments Blanket to Order"
//           description="Copy blanket order comments"
//           checked={
//             form.copy_comments_blanket_to_order ??
//             false
//           }
//           onCheckedChange={(v) =>
//             set({
//               copy_comments_blanket_to_order:
//                 v,
//             })
//           }
//         />

//         <ToggleRow
//           label="Copy Comments Order to Invoice"
//           description="Copy order comments to invoice"
//           checked={
//             form.copy_comments_order_to_invoice
//           }
//           onCheckedChange={(v) =>
//             set({
//               copy_comments_order_to_invoice:
//                 v,
//             })
//           }
//         />

//         <ToggleRow
//           label="Copy Comments Order to Receipt"
//           description="Copy order comments to receipt"
//           checked={
//             form.copy_comments_order_to_receipt
//           }
//           onCheckedChange={(v) =>
//             set({
//               copy_comments_order_to_receipt:
//                 v,
//             })
//           }
//         />

//       </CardContent>
//     </Card>

//     {/* RIGHT CARD */}

//     <Card>
//       <CardHeader>
//         <CardTitle>
//           Posting & Validation
//         </CardTitle>

//         <CardDescription>
//           Posting date and validation settings.
//         </CardDescription>
//       </CardHeader>

//       <CardContent className="space-y-5">

//         {/* Prepayment Frequency */}

//         <div>
//           <Label className="text-sm mb-1.5 block">
//             Prepmt. Auto Update Frequency
//           </Label>

//           <Select
//             value={
//               form.prepmt_auto_update_frequency ??
//               "Never"
//             }
//             onValueChange={(v) =>
//               set({
//                 prepmt_auto_update_frequency:
//                   v,
//               })
//             }
//           >
//             <SelectTrigger>
//               <SelectValue />
//             </SelectTrigger>

//             <SelectContent>
//               <SelectItem value="Never">
//                 Never
//               </SelectItem>

//               <SelectItem value="Daily">
//                 Daily
//               </SelectItem>

//               <SelectItem value="Weekly">
//                 Weekly
//               </SelectItem>

//               <SelectItem value="Monthly">
//                 Monthly
//               </SelectItem>
//             </SelectContent>
//           </Select>
//         </div>

//         {/* Default Posting Date */}

//         <div>
//           <Label className="text-sm mb-1.5 block">
//             Default Posting Date
//           </Label>

//           <Select
//             value={
//               form.default_posting_date ??
//               "Work Date"
//             }
//             onValueChange={(v) =>
//               set({
//                 default_posting_date: v,
//               })
//             }
//           >
//             <SelectTrigger>
//               <SelectValue />
//             </SelectTrigger>

//             <SelectContent>
//               <SelectItem value="Work Date">
//                 Work Date
//               </SelectItem>

//               <SelectItem value="No Date">
//                 No Date
//               </SelectItem>

//               <SelectItem value="Posting Date">
//                 Posting Date
//               </SelectItem>
//             </SelectContent>
//           </Select>
//         </div>

//         {/* Default Qty */}

//         <div>
//           <Label className="text-sm mb-1.5 block">
//             Default Qty. to Receive
//           </Label>

//           <Select
//             value={
//               form.default_qty_to_receive ??
//               "Remainder"
//             }
//             onValueChange={(v) =>
//               set({
//                 default_qty_to_receive:
//                   v,
//               })
//             }
//           >
//             <SelectTrigger>
//               <SelectValue />
//             </SelectTrigger>

//             <SelectContent>
//               <SelectItem value="Remainder">
//                 Remainder
//               </SelectItem>

//               <SelectItem value="Blank">
//                 Blank
//               </SelectItem>

//               <SelectItem value="Full">
//                 Full
//               </SelectItem>
//             </SelectContent>
//           </Select>
//         </div>

//         <ToggleRow
//           label="Posting Date Check on Posting"
//           description="Validate posting date during posting"
//           checked={
//             form.posting_date_check_on_posting ??
//             false
//           }
//           onCheckedChange={(v) =>
//             set({
//               posting_date_check_on_posting:
//                 v,
//             })
//           }
//         />

//         {/* Allow Multiple Posting Groups */}

//         <ToggleRow
//           label="Allow Multiple Posting Groups"
//           description="Allow multiple posting groups"
//           checked={
//             form.allow_multiple_posting_groups ??
//             false
//           }
//           onCheckedChange={(v) =>
//             set({
//               allow_multiple_posting_groups:
//                 v,
//             })
//           }
//         />

//         {/* Check Multiple Posting Groups */}

//         <div>
//           <Label className="text-sm mb-1.5 block">
//             Check Multiple Posting Groups
//           </Label>

//           <Select
//             value={
//               form.check_multiple_posting_groups ??
//               "Alternative Groups"
//             }
//             onValueChange={(v) =>
//               set({
//                 check_multiple_posting_groups:
//                   v,
//               })
//             }
//           >
//             <SelectTrigger>
//               <SelectValue />
//             </SelectTrigger>

//             <SelectContent>
//               <SelectItem value="Alternative Groups">
//                 Alternative Groups
//               </SelectItem>

//               <SelectItem value="All Groups">
//                 All Groups
//               </SelectItem>

//               <SelectItem value="None">
//                 None
//               </SelectItem>
//             </SelectContent>
//           </Select>
//         </div>

//         <ToggleRow
//           label="Ignore Updated Addresses"
//           description="Ignore vendor address updates"
//           checked={
//             form.ignore_updated_addresses ??
//             false
//           }
//           onCheckedChange={(v) =>
//             set({
//               ignore_updated_addresses:
//                 v,
//             })
//           }
//         />

//         <ToggleRow
//           label="Copy Line Descr. to G/L Entry"
//           description="Copy line descriptions to G/L entries"
//           checked={
//             form.copy_line_descr_to_gl_entry ??
//             false
//           }
//           onCheckedChange={(v) =>
//             set({
//               copy_line_descr_to_gl_entry:
//                 v,
//             })
//           }
//         />

//       </CardContent>
//     </Card>

//   </div>
// </TabsContent>

         

//         </Tabs>
//       </div>
//     </div>
//   );
// }

// // ────────────────────────────────────────────────────────────
// // HELPERS
// // ────────────────────────────────────────────────────────────

// function NoSeriesField({
//   label,
//   description,
//   value,
//   options,
//   onChange,
// }: {
//   label: string;
//   description: string;
//   value: string | null;
//   options: {
//     code: string;
//     description: string | null;
//   }[];
//   onChange: (
//     v: string | null
//   ) => void;
// }) {
//   return (
//     <div>
//       <Label className="text-sm mb-1.5 block font-medium">
//         {label}
//       </Label>

//       <p className="text-xs text-muted-foreground mb-2">
//         {description}
//       </p>

//       <Select
//         value={value ?? "__none__"}
//         onValueChange={(v) =>
//           onChange(
//             v === "__none__"
//               ? null
//               : v
//           )
//         }
//       >
//         <SelectTrigger>
//           <SelectValue placeholder="Not set" />
//         </SelectTrigger>

//         <SelectContent>

//           <SelectItem value="__none__">
//             Not set
//           </SelectItem>

//           {options.map((o) => (
//             <SelectItem
//               key={o.code}
//               value={o.code}
//             >
//               {o.code}
//             </SelectItem>
//           ))}
//         </SelectContent>
//       </Select>
//     </div>
//   );
// }

// function ToggleRow({
//   label,
//   description,
//   checked,
//   onCheckedChange,
// }: {
//   label: string;
//   description: string;
//   checked: boolean;
//   onCheckedChange: (
//     v: boolean
//   ) => void;
// }) {
//   return (
//     <div className="flex items-start justify-between gap-6">

//       <div className="flex-1">
//         <p className="text-sm font-medium">
//           {label}
//         </p>

//         <p className="text-xs text-muted-foreground mt-0.5">
//           {description}
//         </p>
//       </div>

//       <Switch
//         checked={checked}
//         onCheckedChange={
//           onCheckedChange
//         }
//       />
//     </div>
//   );
// }

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { NoSeriesSelect } from "@/components/NoSeriesSelect";
import { useNoSeries } from "@/hooks/useNoSeries";
import { SetupPageSkeleton } from "@/components/skeletons/ErpSkeletons";
import { API_BASE_URL } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type PurchaseSetup = {
  id?: string;

  // No. Series — standard BC
  vendor_nos: string | null;
  quote_nos: string | null;
  blanket_order_nos: string | null;
  order_nos: string | null;
  return_order_nos: string | null;
  invoice_nos: string | null;
  posted_invoice_nos: string | null;
  credit_memo_nos: string | null;
  posted_credit_memo_nos: string | null;
  purchase_receipt_nos: string | null;
  posted_receipt_nos: string | null;
  posted_return_shipment_nos: string | null;

  // No. Series — domain-specific
  mandi_purchase_nos: string | null;
  mandi_vendor_nos: string | null;
  inward_gate_entry_nos: string | null;
  goods_receipt_note_nos: string | null;

  // General
  default_location_code: string | null;
  receipt_on_invoice: boolean;
  return_shipment_on_credit_memo: boolean;
  invoice_rounding: boolean;
  copy_comments_order_to_receipt: boolean;
  copy_comments_order_to_invoice: boolean;
  copy_comments_blanket_to_order: boolean;
  copy_vendor_name_to_entries: boolean;
  copy_line_descr_to_gl_entry: boolean;
  ext_doc_no_mandatory: boolean;
  allow_vat_difference: boolean;
  calc_inv_discount: boolean;
  default_gl_account_quantity: boolean;
  discount_posting: string | null;
  appln_between_currencies: string | null;

  // Posting & validation
  default_posting_date: string | null;
  default_qty_to_receive: string | null;
  prepmt_auto_update_frequency: string | null;
  posting_date_check_on_posting: boolean;
  allow_multiple_posting_groups: boolean;
  check_multiple_posting_groups: string | null;
  ignore_updated_addresses: boolean;

  // Defaults
  default_payment_terms_code: string | null;
  default_payment_method_code: string | null;

  // Order settings
  allow_purchase_order_archiving: boolean;
};

const DEFAULT: PurchaseSetup = {
  vendor_nos: null,
  quote_nos: null,
  blanket_order_nos: null,
  order_nos: null,
  return_order_nos: null,
  invoice_nos: null,
  posted_invoice_nos: null,
  credit_memo_nos: null,
  posted_credit_memo_nos: null,
  purchase_receipt_nos: null,
  posted_receipt_nos: null,
  posted_return_shipment_nos: null,
  mandi_purchase_nos: null,
  mandi_vendor_nos: null,
  inward_gate_entry_nos: null,
  goods_receipt_note_nos: null,
  default_location_code: null,
  receipt_on_invoice: true,
  return_shipment_on_credit_memo: false,
  invoice_rounding: true,
  copy_comments_order_to_receipt: true,
  copy_comments_order_to_invoice: true,
  copy_comments_blanket_to_order: true,
  copy_vendor_name_to_entries: true,
  copy_line_descr_to_gl_entry: false,
  ext_doc_no_mandatory: false,
  allow_vat_difference: false,
  calc_inv_discount: false,
  default_gl_account_quantity: false,
  discount_posting: "All Discounts",
  appln_between_currencies: "All",
  default_posting_date: "Work Date",
  default_qty_to_receive: "Remainder",
  prepmt_auto_update_frequency: "Never",
  posting_date_check_on_posting: false,
  allow_multiple_posting_groups: false,
  check_multiple_posting_groups: "Alternative Groups",
  ignore_updated_addresses: false,
  default_payment_terms_code: null,
  default_payment_method_code: null,
  allow_purchase_order_archiving: false,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PurchaseSetupPage() {
  const [form, setForm] = useState<PurchaseSetup>(DEFAULT);
  const { noSeries, loading: noSeriesLoading } = useNoSeries();
  const [locations, setLocations] = useState<{ code: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [setupRes, locRes] = await Promise.all([
        fetch(`${API_BASE_URL}/setup/purchase-payables`),
        fetch(`${API_BASE_URL}/locations`),
      ]);
      const [setupJson, locJson] = await Promise.all([
        setupRes.json(), locRes.json(),
      ]);
      if (setupJson.success && setupJson.data) setForm({ ...DEFAULT, ...setupJson.data });
      if (locJson.success) setLocations(locJson.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load Purchase Setup");
    } finally {
      setLoading(false);
    }
  };

  const set = (patch: Partial<PurchaseSetup>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/setup/purchase-payables`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || "Save failed");
      toast.success("Purchase & Payables Setup saved");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading || noSeriesLoading) {
    return (
      <SetupPageSkeleton
        tabs={4}
        numberFields={16}
        secondarySections={2}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Purchase & Payables Setup"
        subtitle="Configure defaults and number series for purchase documents and vendor master"
        actions={
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </Button>
        }
      />

      <div className="p-6">
        <Tabs defaultValue="numbering">
          <TabsList>
            <TabsTrigger value="numbering">No. Series</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="defaults">Defaults</TabsTrigger>
            <TabsTrigger value="ordering">Order Settings</TabsTrigger>
          </TabsList>

          {/* ── No. Series ── */}
          <TabsContent value="numbering" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>No. Series</CardTitle>
                <CardDescription>
                  Map which number series each purchase document type and vendor master should use.
                  Series are defined and configured on the <strong>No. Series</strong> page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <NSField label="Vendor Nos." value={form.vendor_nos} options={noSeries} onChange={(v) => set({ vendor_nos: v })} />
                  <NSField label="Quote Nos." value={form.quote_nos} options={noSeries} onChange={(v) => set({ quote_nos: v })} />
                  <NSField label="Blanket Order Nos." value={form.blanket_order_nos} options={noSeries} onChange={(v) => set({ blanket_order_nos: v })} />
                  <NSField label="Order Nos." value={form.order_nos} options={noSeries} onChange={(v) => set({ order_nos: v })} />
                  <NSField label="Return Order Nos." value={form.return_order_nos} options={noSeries} onChange={(v) => set({ return_order_nos: v })} />
                  <NSField label="Invoice Nos." value={form.invoice_nos} options={noSeries} onChange={(v) => set({ invoice_nos: v })} />
                  <NSField label="Posted Invoice Nos." value={form.posted_invoice_nos} options={noSeries} onChange={(v) => set({ posted_invoice_nos: v })} />
                  <NSField label="Credit Memo Nos." value={form.credit_memo_nos} options={noSeries} onChange={(v) => set({ credit_memo_nos: v })} />
                  <NSField label="Posted Credit Memo Nos." value={form.posted_credit_memo_nos} options={noSeries} onChange={(v) => set({ posted_credit_memo_nos: v })} />
                  <NSField label="Purchase Receipt Nos." value={form.purchase_receipt_nos} options={noSeries} onChange={(v) => set({ purchase_receipt_nos: v })} />
                  <NSField label="Posted Receipt Nos." value={form.posted_receipt_nos} options={noSeries} onChange={(v) => set({ posted_receipt_nos: v })} />
                  <NSField label="Posted Return Shipment Nos." value={form.posted_return_shipment_nos} options={noSeries} onChange={(v) => set({ posted_return_shipment_nos: v })} />

                  <div className="col-span-2">
                    <Separator className="my-1" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-3 mb-4">Domain-Specific Documents</p>
                  </div>

                  <NSField label="Mandi Purchase Nos." value={form.mandi_purchase_nos} options={noSeries} onChange={(v) => set({ mandi_purchase_nos: v })} />
                  <NSField label="Mandi Vendor Nos." value={form.mandi_vendor_nos} options={noSeries} onChange={(v) => set({ mandi_vendor_nos: v })} />
                  <NSField label="Inward Gate Entry Nos." value={form.inward_gate_entry_nos} options={noSeries} onChange={(v) => set({ inward_gate_entry_nos: v })} />
                  <NSField label="Goods Receipt Note Nos." value={form.goods_receipt_note_nos} options={noSeries} onChange={(v) => set({ goods_receipt_note_nos: v })} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── General ── */}
          <TabsContent value="general" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>General</CardTitle>
                  <CardDescription>Purchase process behaviour settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <Label className="text-sm mb-1.5 block">Default Location Code</Label>
                    <Select value={form.default_location_code ?? "__none__"} onValueChange={(v) => set({ default_location_code: v === "__none__" ? null : v })}>
                      <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— None —</SelectItem>
                        {locations.map((l) => <SelectItem key={l.code} value={l.code}>{l.code} – {l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Discount Posting</Label>
                    <Select value={form.discount_posting ?? "All Discounts"} onValueChange={(v) => set({ discount_posting: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All Discounts">All Discounts</SelectItem>
                        <SelectItem value="Invoice Discounts">Invoice Discounts</SelectItem>
                        <SelectItem value="Line Discounts">Line Discounts</SelectItem>
                        <SelectItem value="None">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <ToggleRow label="Receipt on Invoice" description="Auto-post a receipt when posting a purchase invoice." checked={form.receipt_on_invoice} onCheckedChange={(v) => set({ receipt_on_invoice: v })} />
                  <ToggleRow label="Return Shipment on Credit Memo" description="Auto-post return shipment when posting a credit memo." checked={form.return_shipment_on_credit_memo} onCheckedChange={(v) => set({ return_shipment_on_credit_memo: v })} />
                  <ToggleRow label="Invoice Rounding" description="Apply rounding to invoice totals." checked={form.invoice_rounding} onCheckedChange={(v) => set({ invoice_rounding: v })} />
                  <ToggleRow label="Copy Comments (Order → Receipt)" description="Copy comments from Purchase Order to Receipt." checked={form.copy_comments_order_to_receipt} onCheckedChange={(v) => set({ copy_comments_order_to_receipt: v })} />
                  <ToggleRow label="Copy Comments (Order → Invoice)" description="Copy comments from Purchase Order to Invoice." checked={form.copy_comments_order_to_invoice} onCheckedChange={(v) => set({ copy_comments_order_to_invoice: v })} />
                  <ToggleRow label="Copy Comments (Blanket → Order)" description="Copy blanket order comments to purchase order." checked={form.copy_comments_blanket_to_order} onCheckedChange={(v) => set({ copy_comments_blanket_to_order: v })} />
                  <ToggleRow label="Copy Vendor Name to Entries" description="Copy vendor name to ledger entries." checked={form.copy_vendor_name_to_entries} onCheckedChange={(v) => set({ copy_vendor_name_to_entries: v })} />
                  <ToggleRow label="Copy Line Descr. to G/L Entry" description="Copy line descriptions to G/L entries." checked={form.copy_line_descr_to_gl_entry} onCheckedChange={(v) => set({ copy_line_descr_to_gl_entry: v })} />
                  <ToggleRow label="Ext. Doc. No. Mandatory" description="Require external document number on purchase docs." checked={form.ext_doc_no_mandatory} onCheckedChange={(v) => set({ ext_doc_no_mandatory: v })} />
                  <ToggleRow label="Calc. Inv. Discount" description="Automatically calculate invoice-level discounts." checked={form.calc_inv_discount} onCheckedChange={(v) => set({ calc_inv_discount: v })} />
                  <ToggleRow label="Default G/L Account Quantity" description="Use default quantity for G/L account lines." checked={form.default_gl_account_quantity} onCheckedChange={(v) => set({ default_gl_account_quantity: v })} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Posting & Validation</CardTitle>
                  <CardDescription>Posting date and validation settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <Label className="text-sm mb-1.5 block">Default Posting Date</Label>
                    <Select value={form.default_posting_date ?? "Work Date"} onValueChange={(v) => set({ default_posting_date: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Work Date">Work Date</SelectItem>
                        <SelectItem value="No Date">No Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Default Qty. to Receive</Label>
                    <Select value={form.default_qty_to_receive ?? "Remainder"} onValueChange={(v) => set({ default_qty_to_receive: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Remainder">Remainder</SelectItem>
                        <SelectItem value="Blank">Blank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Prepmt. Auto Update Frequency</Label>
                    <Select value={form.prepmt_auto_update_frequency ?? "Never"} onValueChange={(v) => set({ prepmt_auto_update_frequency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Never">Never</SelectItem>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Appln. between Currencies</Label>
                    <Select value={form.appln_between_currencies ?? "All"} onValueChange={(v) => set({ appln_between_currencies: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All</SelectItem>
                        <SelectItem value="EMU Only">EMU Only</SelectItem>
                        <SelectItem value="None">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <ToggleRow label="Posting Date Check on Posting" description="Validate posting date during posting." checked={form.posting_date_check_on_posting} onCheckedChange={(v) => set({ posting_date_check_on_posting: v })} />
                  <ToggleRow label="Allow Multiple Posting Groups" description="Allow alternate vendor posting groups on documents." checked={form.allow_multiple_posting_groups} onCheckedChange={(v) => set({ allow_multiple_posting_groups: v })} />
                  <ToggleRow label="Ignore Updated Addresses" description="Do not prompt when vendor address changes." checked={form.ignore_updated_addresses} onCheckedChange={(v) => set({ ignore_updated_addresses: v })} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Defaults ── */}
          <TabsContent value="defaults" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Default Codes</CardTitle>
                <CardDescription>Codes prefilled on new vendor records and purchase documents.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <div>
                    <Label className="text-sm mb-1.5 block">Default Payment Terms Code</Label>
                    <p className="text-xs text-muted-foreground mb-2">Prefilled on new vendor cards.</p>
                    <Input value={form.default_payment_terms_code ?? ""} placeholder="e.g. NET30" onChange={(e) => set({ default_payment_terms_code: e.target.value || null })} />
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Default Payment Method Code</Label>
                    <p className="text-xs text-muted-foreground mb-2">Prefilled on new vendor cards.</p>
                    <Input value={form.default_payment_method_code ?? ""} placeholder="e.g. CASH" onChange={(e) => set({ default_payment_method_code: e.target.value || null })} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Order Settings ── */}
          <TabsContent value="ordering" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Order Settings</CardTitle>
                <CardDescription>Configure behaviour around purchase order processing and archiving.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <ToggleRow label="Allow Purchase Order Archiving" description="Enable archiving of released or completed purchase orders." checked={form.allow_purchase_order_archiving} onCheckedChange={(v) => set({ allow_purchase_order_archiving: v })} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function NSField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: { code: string; description: string | null; is_active?: boolean | null }[];
  onChange: (v: string | null) => void;
}) {
  return (
    <div>
      <Label className="text-sm mb-1.5 block font-medium">{label}</Label>
      <NoSeriesSelect value={value} options={options} onChange={onChange} />
    </div>
  );
}
function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

