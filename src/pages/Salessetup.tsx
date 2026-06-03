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

// type SalesSetup = {
//   id: string;
//   // No. Series
//   customer_nos: string | null;
//   sales_order_nos: string | null;
//   sales_invoice_nos: string | null;
//   sales_shipment_nos: string | null;
//   posted_sales_shipment_nos: string | null;
//   // General
//   default_location_code: string | null;
//   shipment_on_invoice: boolean;
//   invoice_rounding: boolean;
//   copy_comments_order_to_invoice: boolean;
//   copy_comments_order_to_shipment: boolean;
//   // Defaults
//   default_payment_terms_code: string | null;
//   default_payment_method_code: string | null;
//   // Warnings
//   credit_warnings: string | null;
//   stockout_warning: boolean;
//   // Shipping
//   default_ship_to_code: string | null;
// };

// const defaultSetup: Omit<SalesSetup, "id"> = {
//   customer_nos: null,
//   sales_order_nos: null,
//   sales_invoice_nos: null,
//   sales_shipment_nos: null,
//   posted_sales_shipment_nos: null,
//   default_location_code: null,
//   shipment_on_invoice: true,
//   invoice_rounding: false,
//   copy_comments_order_to_invoice: true,
//   copy_comments_order_to_shipment: true,
//   default_payment_terms_code: null,
//   default_payment_method_code: null,
//   credit_warnings: "Both Warnings",
//   stockout_warning: true,
//   default_ship_to_code: null,
// };

// // ─── Component ────────────────────────────────────────────────────────────────

// export default function SalesSetupPage() {
//   const [setup, setSetup] = useState<SalesSetup | null>(null);
//   const [form, setForm] = useState({ ...defaultSetup });
//   const [noSeriesList, setNoSeriesList] = useState<{ code: string; description: string | null }[]>([]);
//   const [locations, setLocations] = useState<{ code: string; name: string }[]>([]);
//   const [saving, setSaving] = useState(false);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     (async () => {
//       // Load setup row
//       const { data } = await supabase
//         .from("sales_receivables_setup" as any)
//         .select("*")
//         .maybeSingle();

//       if (data) {
//         setSetup(data as unknown as SalesSetup);
//         setForm(data as unknown as SalesSetup);
//       }

//       // Load No. Series options
//       const { data: ns } = await supabase
//         .from("number_series" as any)
//         .select("code, description")
//         .order("code");
//       setNoSeriesList((ns as any[]) ?? []);

//       // Load locations
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
//       const payload = { ...form };
//       const { error } = setup
//         ? await supabase.from("sales_receivables_setup" as any).update(payload).eq("id", (setup as any).id)
//         : await supabase.from("sales_receivables_setup" as any).insert(payload);

//       if (error) throw error;
//       toast.success("Sales & Receivables Setup saved");

//       // Reload
//       const { data } = await supabase.from("sales_receivables_setup" as any).select("*").maybeSingle();
//       if (data) { setSetup(data as any); setForm(data as any); }
//     } catch (e: any) {
//       toast.error(e.message);
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="p-6 text-muted-foreground text-sm">Loading setup…</div>
//     );
//   }

//   return (
//     <div>
//       <PageHeader
//         title="Sales & Receivables Setup"
//         subtitle="Configure defaults and number series for sales documents and customer master"
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
//             <TabsTrigger value="warnings">Warnings</TabsTrigger>
//           </TabsList>

//           {/* ── No. Series Tab ── */}
//           <TabsContent value="numbering" className="mt-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle>No. Series</CardTitle>
//                 <CardDescription>
//                   Assign which number series each sales document and master record should use. Series are defined in the <strong>No. Series</strong> page.
//                 </CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-2 gap-x-8 gap-y-5">
//                   <NoSeriesField
//                     label="Customer Nos."
//                     description="Used when creating new customer records."
//                     value={form.customer_nos}
//                     options={noSeriesList}
//                     onChange={(v) => set({ customer_nos: v })}
//                   />
//                   <NoSeriesField
//                     label="Sales Order Nos."
//                     description="Assigned when a new Sales Order is created."
//                     value={form.sales_order_nos}
//                     options={noSeriesList}
//                     onChange={(v) => set({ sales_order_nos: v })}
//                   />
//                   <NoSeriesField
//                     label="Sales Invoice Nos."
//                     description="Assigned when a new Sales Invoice is created."
//                     value={form.sales_invoice_nos}
//                     options={noSeriesList}
//                     onChange={(v) => set({ sales_invoice_nos: v })}
//                   />
//                   <NoSeriesField
//                     label="Sales Shipment Nos."
//                     description="Assigned at time of shipment creation."
//                     value={form.sales_shipment_nos}
//                     options={noSeriesList}
//                     onChange={(v) => set({ sales_shipment_nos: v })}
//                   />
//                   <NoSeriesField
//                     label="Posted Sales Shipment Nos."
//                     description="Used for the final posted shipment document."
//                     value={form.posted_sales_shipment_nos}
//                     options={noSeriesList}
//                     onChange={(v) => set({ posted_sales_shipment_nos: v })}
//                   />
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* ── General Tab ── */}
//           <TabsContent value="general" className="mt-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle>General</CardTitle>
//                 <CardDescription>Operational defaults for the sales process.</CardDescription>
//               </CardHeader>
//               <CardContent className="space-y-5">
//                 <div className="grid grid-cols-2 gap-x-8 gap-y-5">
//                   <div>
//                     <Label className="text-sm mb-1.5 block">Default Location Code</Label>
//                     <p className="text-xs text-muted-foreground mb-2">Location used as default on new sales documents.</p>
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
//                     label="Shipment on Invoice"
//                     description="Automatically post a shipment when posting a sales invoice."
//                     checked={form.shipment_on_invoice}
//                     onCheckedChange={(v) => set({ shipment_on_invoice: v })}
//                   />
//                   <ToggleRow
//                     label="Invoice Rounding"
//                     description="Apply rounding to invoice totals."
//                     checked={form.invoice_rounding}
//                     onCheckedChange={(v) => set({ invoice_rounding: v })}
//                   />
//                   <ToggleRow
//                     label="Copy Comments (Order → Invoice)"
//                     description="Copy internal comments from Sales Order to Sales Invoice."
//                     checked={form.copy_comments_order_to_invoice}
//                     onCheckedChange={(v) => set({ copy_comments_order_to_invoice: v })}
//                   />
//                   <ToggleRow
//                     label="Copy Comments (Order → Shipment)"
//                     description="Copy internal comments from Sales Order to Shipment."
//                     checked={form.copy_comments_order_to_shipment}
//                     onCheckedChange={(v) => set({ copy_comments_order_to_shipment: v })}
//                   />
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* ── Defaults Tab ── */}
//           <TabsContent value="defaults" className="mt-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Default Codes</CardTitle>
//                 <CardDescription>Default codes prefilled on new customer records and sales documents.</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-2 gap-x-8 gap-y-5">
//                   <div>
//                     <Label className="text-sm mb-1.5 block">Default Payment Terms Code</Label>
//                     <p className="text-xs text-muted-foreground mb-2">Prefilled on new customer cards.</p>
//                     <Input
//                       value={form.default_payment_terms_code ?? ""}
//                       placeholder="e.g. NET30"
//                       onChange={(e) => set({ default_payment_terms_code: e.target.value || null })}
//                     />
//                   </div>
//                   <div>
//                     <Label className="text-sm mb-1.5 block">Default Payment Method Code</Label>
//                     <p className="text-xs text-muted-foreground mb-2">Prefilled on new customer cards.</p>
//                     <Input
//                       value={form.default_payment_method_code ?? ""}
//                       placeholder="e.g. CASH"
//                       onChange={(e) => set({ default_payment_method_code: e.target.value || null })}
//                     />
//                   </div>
//                   <div>
//                     <Label className="text-sm mb-1.5 block">Default Ship-to Code</Label>
//                     <p className="text-xs text-muted-foreground mb-2">Default shipping address code on sales documents.</p>
//                     <Input
//                       value={form.default_ship_to_code ?? ""}
//                       placeholder="e.g. MAIN-WH"
//                       onChange={(e) => set({ default_ship_to_code: e.target.value || null })}
//                     />
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* ── Warnings Tab ── */}
//           <TabsContent value="warnings" className="mt-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Warnings</CardTitle>
//                 <CardDescription>Control warning behaviour during sales order entry.</CardDescription>
//               </CardHeader>
//               <CardContent className="space-y-5">
//                 <div>
//                   <Label className="text-sm mb-1.5 block">Credit Warnings</Label>
//                   <p className="text-xs text-muted-foreground mb-2">
//                     When to warn users about customer credit limits or overdue balances.
//                   </p>
//                   <Select value={form.credit_warnings ?? "Both Warnings"} onValueChange={(v) => set({ credit_warnings: v })}>
//                     <SelectTrigger className="w-64">
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="Both Warnings">Both Warnings</SelectItem>
//                       <SelectItem value="Credit Limit">Credit Limit Only</SelectItem>
//                       <SelectItem value="Overdue Balance">Overdue Balance Only</SelectItem>
//                       <SelectItem value="No Warning">No Warning</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>
//                 <Separator />
//                 <ToggleRow
//                   label="Stockout Warning"
//                   description="Warn the user when the sales quantity exceeds available stock."
//                   checked={form.stockout_warning}
//                   onCheckedChange={(v) => set({ stockout_warning: v })}
//                 />
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </div>
//     </div>
//   );
// }

// // ─── Reusable field components ─────────────────────────────────────────────────

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
//   options: { code: string; description: string | null }[];
//   onChange: (v: string | null) => void;
// }) {
//   return (
//     <div>
//       <Label className="text-sm mb-1.5 block font-medium">{label}</Label>
//       <p className="text-xs text-muted-foreground mb-2">{description}</p>
//       <Select
//         value={value ?? "__none__"}
//         onValueChange={(v) => onChange(v === "__none__" ? null : v)}
//       >
//         <SelectTrigger>
//           <SelectValue placeholder="— Not set —" />
//         </SelectTrigger>
//         <SelectContent>
//           <SelectItem value="__none__">— Not set —</SelectItem>
//           {options.map((o) => (
//             <SelectItem key={o.code} value={o.code}>
//               {o.code}
//               {o.description && (
//                 <span className="text-muted-foreground ml-2 text-xs">— {o.description}</span>
//               )}
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

// import {
//   Tabs,
//   TabsContent,
//   TabsList,
//   TabsTrigger,
// } from "@/components/ui/tabs";

// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";

// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";

// import { toast } from "sonner";
// import { Save } from "lucide-react";

// // ───────────────── TYPES ─────────────────

// type SalesSetup = {
// customer_nos: string | null;

// // ADD THESE
// quote_nos: string | null;
// blanket_order_nos: string | null;
// order_nos: string | null;
// return_order_nos: string | null;

// posted_invoice_nos: string | null;

// credit_memo_nos: string | null;
// posted_credit_memo_nos: string | null;

// posted_return_receipt_nos: string | null;

// reminder_nos: string | null;
// issued_reminder_nos: string | null;
// canceled_issued_reminder_nos: string | null;

// finance_charge_memo_nos: string | null;
// issued_fin_charge_memo_nos: string | null;
// canceled_fin_charge_memo_nos: string | null;

// posted_prepayment_invoice_nos: string | null;
// posted_prepayment_credit_memo_nos: string | null;

// direct_debit_mandate_nos: string | null;
  
// };

// const defaultSetup: SalesSetup = {
// customer_nos: null,
// quote_nos: null,
// blanket_order_nos: null,
// order_nos: null,
// return_order_nos: null,

// posted_invoice_nos: null,

// credit_memo_nos: null,
// posted_credit_memo_nos: null,

// posted_return_receipt_nos: null,

// reminder_nos: null,
// issued_reminder_nos: null,
// canceled_issued_reminder_nos: null,

// finance_charge_memo_nos: null,
// issued_fin_charge_memo_nos: null,
// canceled_fin_charge_memo_nos: null,

// posted_prepayment_invoice_nos: null,
// posted_prepayment_credit_memo_nos: null,

// direct_debit_mandate_nos: null,
// };

// // ───────────────── COMPONENT ─────────────────

// export default function SalesSetupPage() {
//   const [setup, setSetup] = useState<SalesSetup | null>(null);

//   const [form, setForm] =
//     useState<SalesSetup>(defaultSetup);

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

//   const [saving, setSaving] = useState(false);
//   const [loading, setLoading] = useState(true);

//   // ───────────────── LOAD DATA ─────────────────

//   useEffect(() => {
//     fetchData();
//   }, []);

//   const fetchData = async () => {
//     try {
//       setLoading(true);

//       // SALES SETUP
//       const setupRes = await fetch(
//         "http://localhost:5000/api/setup/sales-receivables"
//       );

//       if (!setupRes.ok) {
//         throw new Error(
//           "Failed to load Sales Setup"
//         );
//       }

//       const setupJson = await setupRes.json();

//       if (setupJson.success) {
//         if (setupJson.data) {
//           setSetup(setupJson.data);

//           setForm({
//             ...defaultSetup,
//             ...setupJson.data,
//           });
//         } else {
//           setForm(defaultSetup);
//         }
//       }

//       // NO SERIES
//       const nsRes = await fetch(
//         "http://localhost:5000/api/no-series/options"
//       );

//       if (!nsRes.ok) {
//         throw new Error(
//           "Failed to load No. Series"
//         );
//       }

//       const nsJson = await nsRes.json();

//       if (nsJson.success) {
//         setNoSeriesList(nsJson.data || []);
//       }

//       // LOCATIONS
//       const locRes = await fetch(
//         "http://localhost:5000/api/locations"
//       );

//       if (!locRes.ok) {
//         throw new Error(
//           "Failed to load Locations"
//         );
//       }

//       const locJson = await locRes.json();

//       if (locJson.success) {
//         setLocations(locJson.data || []);
//       }
//     } catch (err: any) {
//       console.error(
//         "SALES SETUP FETCH ERROR:",
//         err
//       );

//       toast.error(
//         err.message || "Failed to fetch setup"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ───────────────── HELPERS ─────────────────

//   const set = (
//     patch: Partial<SalesSetup>
//   ) => {
//     setForm((prev) => ({
//       ...prev,
//       ...patch,
//     }));
//   };

//   // ───────────────── SAVE ─────────────────

//   const save = async () => {
//     try {
//       setSaving(true);

//       const response = await fetch(
//         "http://localhost:5000/api/setup/sales-receivables",
//         {
//           method: "PUT",
//           headers: {
//             "Content-Type":
//               "application/json",
//           },
//           body: JSON.stringify(form),
//         }
//       );

//       const result = await response.json();

//       if (!response.ok || !result.success) {
//         throw new Error(
//           result.error ||
//             result.message ||
//             "Save failed"
//         );
//       }

//       toast.success(
//         "Sales Setup saved successfully"
//       );

//       await fetchData();
//     } catch (err: any) {
//       console.error(
//         "SAVE SALES SETUP ERROR:",
//         err
//       );

//       toast.error(
//         err.message || "Failed to save"
//       );
//     } finally {
//       setSaving(false);
//     }
//   };

//   // ───────────────── LOADING ─────────────────

//   if (loading) {
//     return (
//       <div className="p-6 text-sm text-muted-foreground">
//         Loading setup...
//       </div>
//     );
//   }

//   // ───────────────── UI ─────────────────

//   return (
//     <div>
//       <PageHeader
//         title="Sales & Receivables Setup"
//         subtitle="Configure defaults and number series for sales documents"
//         actions={
//           <Button
//             onClick={save}
//             disabled={saving}
//           >
//             <Save className="h-4 w-4 mr-1" />

//             {saving
//               ? "Saving..."
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
//               Defaults
//             </TabsTrigger>

//             <TabsTrigger value="warnings">
//               Warnings
//             </TabsTrigger>
//           </TabsList>

//           {/* ───────────────── NUMBER SERIES ───────────────── */}

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
//                   Configure numbering
//                   mappings for sales
//                   documents and customer
//                   masters.
//                 </CardDescription>
//               </CardHeader>

//               <CardContent>
//                 <div className="grid grid-cols-2 gap-6">
//                   <NoSeriesField
//                     label="Customer Nos."
//                     value={
//                       form.customer_nos
//                     }
//                     options={
//                       noSeriesList
//                     }
//                     onChange={(v) =>
//                       set({
//                         customer_nos: v,
//                       })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Sales Order Nos."
//                     value={
//                       form.sales_order_nos
//                     }
//                     options={
//                       noSeriesList
//                     }
//                     onChange={(v) =>
//                       set({
//                         sales_order_nos:
//                           v,
//                       })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Sales Invoice Nos."
//                     value={
//                       form.sales_invoice_nos
//                     }
//                     options={
//                       noSeriesList
//                     }
//                     onChange={(v) =>
//                       set({
//                         sales_invoice_nos:
//                           v,
//                       })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Sales Shipment Nos."
//                     value={
//                       form.sales_shipment_nos
//                     }
//                     options={
//                       noSeriesList
//                     }
//                     onChange={(v) =>
//                       set({
//                         sales_shipment_nos:
//                           v,
//                       })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Posted Shipment Nos."
//                     value={
//                       form.posted_sales_shipment_nos
//                     }
//                     options={
//                       noSeriesList
//                     }
//                     onChange={(v) =>
//                       set({
//                         posted_sales_shipment_nos:
//                           v,
//                       })
//                     }
//                   />
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* ───────────────── GENERAL ───────────────── */}

//           <TabsContent
//             value="general"
//             className="mt-4"
//           >
//             <Card>
//               <CardHeader>
//                 <CardTitle>
//                   General
//                 </CardTitle>
//               </CardHeader>

//               <CardContent className="space-y-5">
//                 <div>
//                   <Label className="mb-2 block">
//                     Default Location Code
//                   </Label>

//                   <Select
//                     value={
//                       form.default_location_code ??
//                       "__none__"
//                     }
//                     onValueChange={(v) =>
//                       set({
//                         default_location_code:
//                           v ===
//                           "__none__"
//                             ? null
//                             : v,
//                       })
//                     }
//                   >
//                     <SelectTrigger>
//                       <SelectValue placeholder="Select Location" />
//                     </SelectTrigger>

//                     <SelectContent>
//                       <SelectItem value="__none__">
//                         None
//                       </SelectItem>

//                       {locations.map(
//                         (loc) => (
//                           <SelectItem
//                             key={
//                               loc.code
//                             }
//                             value={
//                               loc.code
//                             }
//                           >
//                             {
//                               loc.code
//                             }{" "}
//                             -{" "}
//                             {
//                               loc.name
//                             }
//                           </SelectItem>
//                         )
//                       )}
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 <Separator />

//                 <div className="space-y-4">
//                   <ToggleRow
//                     label="Shipment on Invoice"
//                     checked={
//                       form.shipment_on_invoice
//                     }
//                     onCheckedChange={(
//                       v
//                     ) =>
//                       set({
//                         shipment_on_invoice:
//                           v,
//                       })
//                     }
//                   />

//                   <ToggleRow
//                     label="Invoice Rounding"
//                     checked={
//                       form.invoice_rounding
//                     }
//                     onCheckedChange={(
//                       v
//                     ) =>
//                       set({
//                         invoice_rounding:
//                           v,
//                       })
//                     }
//                   />

//                   <ToggleRow
//                     label="Copy Comments Order → Invoice"
//                     checked={
//                       form.copy_comments_order_to_invoice
//                     }
//                     onCheckedChange={(
//                       v
//                     ) =>
//                       set({
//                         copy_comments_order_to_invoice:
//                           v,
//                       })
//                     }
//                   />

//                   <ToggleRow
//                     label="Copy Comments Order → Shipment"
//                     checked={
//                       form.copy_comments_order_to_shipment
//                     }
//                     onCheckedChange={(
//                       v
//                     ) =>
//                       set({
//                         copy_comments_order_to_shipment:
//                           v,
//                       })
//                     }
//                   />
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* ───────────────── DEFAULTS ───────────────── */}

//           <TabsContent
//             value="defaults"
//             className="mt-4"
//           >
//             <Card>
//               <CardHeader>
//                 <CardTitle>
//                   Defaults
//                 </CardTitle>
//               </CardHeader>

//               <CardContent>
//                 <div className="grid grid-cols-2 gap-6">
//                   <div>
//                     <Label className="mb-2 block">
//                       Payment Terms Code
//                     </Label>

//                     <Input
//                       value={
//                         form.default_payment_terms_code ??
//                         ""
//                       }
//                       placeholder="NET30"
//                       onChange={(e) =>
//                         set({
//                           default_payment_terms_code:
//                             e.target
//                               .value ||
//                             null,
//                         })
//                       }
//                     />
//                   </div>

//                   <div>
//                     <Label className="mb-2 block">
//                       Payment Method Code
//                     </Label>

//                     <Input
//                       value={
//                         form.default_payment_method_code ??
//                         ""
//                       }
//                       placeholder="CASH"
//                       onChange={(e) =>
//                         set({
//                           default_payment_method_code:
//                             e.target
//                               .value ||
//                             null,
//                         })
//                       }
//                     />
//                   </div>

//                   <div>
//                     <Label className="mb-2 block">
//                       Default Ship-To
//                       Code
//                     </Label>

//                     <Input
//                       value={
//                         form.default_ship_to_code ??
//                         ""
//                       }
//                       placeholder="MAIN-WH"
//                       onChange={(e) =>
//                         set({
//                           default_ship_to_code:
//                             e.target
//                               .value ||
//                             null,
//                         })
//                       }
//                     />
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* ───────────────── WARNINGS ───────────────── */}

//           <TabsContent
//             value="warnings"
//             className="mt-4"
//           >
//             <Card>
//               <CardHeader>
//                 <CardTitle>
//                   Warnings
//                 </CardTitle>
//               </CardHeader>

//               <CardContent className="space-y-5">
//                 <div>
//                   <Label className="mb-2 block">
//                     Credit Warnings
//                   </Label>

//                   <Select
//                     value={
//                       form.credit_warnings ??
//                       "Both Warnings"
//                     }
//                     onValueChange={(v) =>
//                       set({
//                         credit_warnings:
//                           v,
//                       })
//                     }
//                   >
//                     <SelectTrigger className="w-72">
//                       <SelectValue />
//                     </SelectTrigger>

//                     <SelectContent>
//                       <SelectItem value="Both Warnings">
//                         Both Warnings
//                       </SelectItem>

//                       <SelectItem value="Credit Limit">
//                         Credit Limit
//                       </SelectItem>

//                       <SelectItem value="Overdue Balance">
//                         Overdue Balance
//                       </SelectItem>

//                       <SelectItem value="No Warning">
//                         No Warning
//                       </SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>

//                 <Separator />

//                 <ToggleRow
//                   label="Stockout Warning"
//                   checked={
//                     form.stockout_warning
//                   }
//                   onCheckedChange={(v) =>
//                     set({
//                       stockout_warning:
//                         v,
//                     })
//                   }
//                 />
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </div>
//     </div>
//   );
// }

// // ───────────────── HELPERS ─────────────────

// function NoSeriesField({
//   label,
//   value,
//   options,
//   onChange,
// }: {
//   label: string;
//   value: string | null;
//   options: {
//     code: string;
//     description: string | null;
//   }[];
//   onChange: (
//     value: string | null
//   ) => void;
// }) {
//   return (
//     <div>
//       <Label className="mb-2 block">
//         {label}
//       </Label>

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
//           <SelectValue placeholder="Select No. Series" />
//         </SelectTrigger>

//         <SelectContent>
//           <SelectItem value="__none__">
//             None
//           </SelectItem>

//           {options.map((o) => (
//             <SelectItem
//               key={o.code}
//               value={o.code}
//             >
//               {o.code}
//               {o.description
//                 ? ` - ${o.description}`
//                 : ""}
//             </SelectItem>
//           ))}
//         </SelectContent>
//       </Select>
//     </div>
//   );
// }

// function ToggleRow({
//   label,
//   checked,
//   onCheckedChange,
// }: {
//   label: string;
//   checked: boolean;
//   onCheckedChange: (
//     value: boolean
//   ) => void;
// }) {
//   return (
//     <div className="flex items-center justify-between">
//       <Label>{label}</Label>

//       <Switch
//         checked={checked}
//         onCheckedChange={
//           onCheckedChange
//         }
//       />
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

// import {
//   Tabs,
//   TabsContent,
//   TabsList,
//   TabsTrigger,
// } from "@/components/ui/tabs";

// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";

// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";

// import { toast } from "sonner";
// import { Save } from "lucide-react";

// // ───────────────── TYPES ─────────────────

// type SalesSetup = {
//   id?: string;

//   // No. Series
//   customer_nos: string | null;
//   quote_nos: string | null;
//   blanket_order_nos: string | null;
//   order_nos: string | null;
//   return_order_nos: string | null;

//   invoice_nos: string | null;
//   posted_invoice_nos: string | null;

//   credit_memo_nos: string | null;
//   posted_credit_memo_nos: string | null;

//   shipment_nos: string | null;
//   posted_shipment_nos: string | null;

//   posted_return_receipt_nos: string | null;

//   reminder_nos: string | null;
//   issued_reminder_nos: string | null;
//   canceled_issued_reminder_nos: string | null;

//   finance_charge_memo_nos: string | null;
//   issued_fin_charge_memo_nos: string | null;
//   canceled_fin_charge_memo_nos: string | null;

//   posted_prepayment_invoice_nos: string | null;
//   posted_prepayment_credit_memo_nos: string | null;

//   direct_debit_mandate_nos: string | null;

//   // General
//   default_location_code: string | null;

//   shipment_on_invoice: boolean;
//   invoice_rounding: boolean;
//   copy_comments_order_to_invoice: boolean;
//   copy_comments_order_to_shipment: boolean;
//   // General
// discount_posting: string | null;
// allow_vat_difference: boolean;
// calc_inv_discount: boolean;

// vat_bus_posting_group_price: string | null;

// exact_cost_reversing_mandatory: boolean;

// check_prepmt_when_posting: boolean;

// prepayment_auto_update_frequency: string | null;

// posting_date_check_on_posting: boolean;

// allow_multiple_posting_groups: boolean;

// check_multiple_posting_groups: string | null;

// ignore_updated_addresses: boolean;

// skip_manual_reservation: boolean;

// quote_validity_calculation: string | null;

// copy_line_descr_to_gl_entry: boolean;

// return_receipt_on_credit_memo: boolean;

// default_item_quantity: boolean;

// default_gl_account_quantity: boolean;

// create_item_from_description: boolean;

// copy_customer_name_to_entries: boolean;

// ext_doc_no_mandatory: boolean;

// appl_between_currencies: string | null;

// logo_position_on_documents: string | null;

// default_posting_date: string | null;

// default_quantity_to_ship: string | null;

//   // Defaults
//   default_payment_terms_code: string | null;
//   default_payment_method_code: string | null;
//   default_ship_to_code: string | null;

//   // Warnings
//   credit_warnings: string | null;
//   stockout_warning: boolean;
// };

// const defaultSetup: SalesSetup = {
//   customer_nos: null,
//   quote_nos: null,
//   blanket_order_nos: null,
//   order_nos: null,
//   return_order_nos: null,

//   invoice_nos: null,
//   posted_invoice_nos: null,

//   credit_memo_nos: null,
//   posted_credit_memo_nos: null,

//   shipment_nos: null,
//   posted_shipment_nos: null,

//   posted_return_receipt_nos: null,

//   reminder_nos: null,
//   issued_reminder_nos: null,
//   canceled_issued_reminder_nos: null,

//   finance_charge_memo_nos: null,
//   issued_fin_charge_memo_nos: null,
//   canceled_fin_charge_memo_nos: null,

//   posted_prepayment_invoice_nos: null,
//   posted_prepayment_credit_memo_nos: null,

//   direct_debit_mandate_nos: null,

//   default_location_code: null,

//   shipment_on_invoice: true,
//   invoice_rounding: false,
//   copy_comments_order_to_invoice: true,
//   copy_comments_order_to_shipment: true,

//   default_payment_terms_code: null,
//   default_payment_method_code: null,
//   default_ship_to_code: null,

//   credit_warnings: "Both Warnings",
//   stockout_warning: true,

//   discount_posting: "All Discounts",

// allow_vat_difference: false,
// calc_inv_discount: false,

// vat_bus_posting_group_price: "DOMESTIC",

// exact_cost_reversing_mandatory: false,

// check_prepmt_when_posting: false,

// prepayment_auto_update_frequency: "Never",

// posting_date_check_on_posting: false,

// allow_multiple_posting_groups: false,

// check_multiple_posting_groups: "Alternative Groups",

// ignore_updated_addresses: false,

// skip_manual_reservation: false,

// quote_validity_calculation: null,

// copy_line_descr_to_gl_entry: false,

// return_receipt_on_credit_memo: false,

// default_item_quantity: false,

// default_gl_account_quantity: false,

// create_item_from_description: false,

// copy_customer_name_to_entries: true,

// ext_doc_no_mandatory: false,

// appl_between_currencies: "All",

// logo_position_on_documents: "No Logo",

// default_posting_date: "Work Date",

// default_quantity_to_ship: "Remainder",
// };

// export default function SalesSetupPage() {
//   const [setup, setSetup] = useState<SalesSetup | null>(null);

//   const [form, setForm] =
//     useState<SalesSetup>(defaultSetup);

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

//   const [saving, setSaving] = useState(false);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     fetchData();
//   }, []);

//   const fetchData = async () => {
//     try {
//       setLoading(true);

//       const setupRes = await fetch(
//         "http://localhost:5000/api/setup/sales-receivables"
//       );

//       const setupJson = await setupRes.json();

//       if (setupJson.success) {
//         setSetup(setupJson.data);

//         setForm({
//           ...defaultSetup,
//           ...setupJson.data,
//         });
//       }

//       const nsRes = await fetch(
//         "http://localhost:5000/api/no-series/options"
//       );

//       const nsJson = await nsRes.json();

//       if (nsJson.success) {
//         setNoSeriesList(nsJson.data || []);
//       }

//       const locRes = await fetch(
//         "http://localhost:5000/api/locations"
//       );

//       const locJson = await locRes.json();

//       if (locJson.success) {
//         setLocations(locJson.data || []);
//       }
//     } catch (err: any) {
//       console.error(err);
//       toast.error(err.message || "Failed to load Sales Setup");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const set = (patch: Partial<SalesSetup>) => {
//     setForm((prev) => ({
//       ...prev,
//       ...patch,
//     }));
//   };

//   const save = async () => {
//     try {
//       setSaving(true);

//       const response = await fetch(
//         "http://localhost:5000/api/setup/sales-receivables",
//         {
//           method: "PUT",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify(form),
//         }
//       );

//       const result = await response.json();

//       if (!result.success) {
//         throw new Error(result.message || "Save failed");
//       }

//       toast.success("Sales Setup saved successfully");

//       await fetchData();
//     } catch (err: any) {
//       console.error(err);
//       toast.error(err.message || "Save failed");
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="p-6 text-sm text-muted-foreground">
//         Loading setup...
//       </div>
//     );
//   }

//   return (
//     <div>
//       <PageHeader
//         title="Sales & Receivables Setup"
//         subtitle="Configure defaults and number series for sales documents"
//         actions={
//           <Button onClick={save} disabled={saving}>
//             <Save className="h-4 w-4 mr-1" />
//             {saving ? "Saving..." : "Save"}
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

//             <TabsTrigger value="warnings">
//               Archives
//             </TabsTrigger>
//           </TabsList>

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
//                   Configure numbering mappings.
//                 </CardDescription>
//               </CardHeader>

//               <CardContent>
//                 <div className="grid grid-cols-2 gap-6">

//                   <NoSeriesField
//                     label="Customer Nos."
//                     value={form.customer_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ customer_nos: v })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Quote Nos."
//                     value={form.quote_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ quote_nos: v })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Blanket Order Nos."
//                     value={form.blanket_order_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ blanket_order_nos: v })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Order Nos."
//                     value={form.order_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ order_nos: v })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Return Order Nos."
//                     value={form.return_order_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ return_order_nos: v })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Invoice Nos."
//                     value={form.invoice_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ invoice_nos: v })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Posted Invoice Nos."
//                     value={form.posted_invoice_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ posted_invoice_nos: v })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Credit Memo Nos."
//                     value={form.credit_memo_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ credit_memo_nos: v })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Posted Credit Memo Nos."
//                     value={form.posted_credit_memo_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ posted_credit_memo_nos: v })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Shipment Nos."
//                     value={form.shipment_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ shipment_nos: v })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Posted Shipment Nos."
//                     value={form.posted_shipment_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ posted_shipment_nos: v })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Posted Return Receipt Nos."
//                     value={form.posted_return_receipt_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ posted_return_receipt_nos: v })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Reminder Nos."
//                     value={form.reminder_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ reminder_nos: v })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Issued Reminder Nos."
//                     value={form.issued_reminder_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ issued_reminder_nos: v })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Canceled Issued Reminder Nos."
//                     value={form.canceled_issued_reminder_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ canceled_issued_reminder_nos: v })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Finance Charge Memo Nos."
//                     value={form.finance_charge_memo_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ finance_charge_memo_nos: v })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Issued Fin. Charge Memo Nos."
//                     value={form.issued_fin_charge_memo_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ issued_fin_charge_memo_nos: v })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Canceled Fin. Charge Memo Nos."
//                     value={form.canceled_fin_charge_memo_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ canceled_fin_charge_memo_nos: v })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Posted Prepmt. Invoice Nos."
//                     value={form.posted_prepayment_invoice_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ posted_prepayment_invoice_nos: v })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Posted Prepmt. Credit Memo Nos."
//                     value={form.posted_prepayment_credit_memo_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ posted_prepayment_credit_memo_nos: v })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Direct Debit Mandate Nos."
//                     value={form.direct_debit_mandate_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({ direct_debit_mandate_nos: v })
//                     }
//                   />
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>
//           {/* ───────────────── GENERAL ───────────────── */}

// <TabsContent
//   value="general"
//   className="mt-4"
// >
//   <Card>
//     <CardHeader>
//       <CardTitle>
//         General
//       </CardTitle>

//       <CardDescription>
//         Configure general sales &
//         receivables behaviour.
//       </CardDescription>
//     </CardHeader>

//     <CardContent>
//       <div className="grid grid-cols-2 gap-x-10 gap-y-5">

//         {/* LEFT SIDE */}

//         <div className="space-y-5">

//           <div>
//             <Label className="mb-2 block">
//               Credit Warnings
//             </Label>

//             <Select
//               value={
//                 form.credit_warnings ??
//                 "Both Warnings"
//               }
//               onValueChange={(v) =>
//                 set({
//                   credit_warnings: v,
//                 })
//               }
//             >
//               <SelectTrigger>
//                 <SelectValue />
//               </SelectTrigger>

//               <SelectContent>
//                 <SelectItem value="Both Warnings">
//                   Both Warnings
//                 </SelectItem>

//                 <SelectItem value="Credit Limit">
//                   Credit Limit
//                 </SelectItem>

//                 <SelectItem value="Overdue Balance">
//                   Overdue Balance
//                 </SelectItem>

//                 <SelectItem value="No Warning">
//                   No Warning
//                 </SelectItem>
//               </SelectContent>
//             </Select>
//           </div>

//           <ToggleRow
//             label="Stockout Warning"
//             checked={
//               form.stockout_warning
//             }
//             onCheckedChange={(v) =>
//               set({
//                 stockout_warning: v,
//               })
//             }
//           />

//           <ToggleRow
//             label="Shipment on Invoice"
//             checked={
//               form.shipment_on_invoice
//             }
//             onCheckedChange={(v) =>
//               set({
//                 shipment_on_invoice: v,
//               })
//             }
//           />

//           <ToggleRow
//             label="Return Receipt on Credit Memo"
//             checked={
//               form.return_receipt_on_credit_memo
//             }
//             onCheckedChange={(v) =>
//               set({
//                 return_receipt_on_credit_memo:
//                   v,
//               })
//             }
//           />

//           <ToggleRow
//             label="Invoice Rounding"
//             checked={
//               form.invoice_rounding
//             }
//             onCheckedChange={(v) =>
//               set({
//                 invoice_rounding: v,
//               })
//             }
//           />

//           <ToggleRow
//             label="Copy Customer Name to Entries"
//             checked={
//               form.copy_customer_name_to_entries
//             }
//             onCheckedChange={(v) =>
//               set({
//                 copy_customer_name_to_entries:
//                   v,
//               })
//             }
//           />

//           <ToggleRow
//             label="Ext. Doc. No. Mandatory"
//             checked={
//               form.ext_doc_no_mandatory
//             }
//             onCheckedChange={(v) =>
//               set({
//                 ext_doc_no_mandatory:
//                   v,
//               })
//             }
//           />

//           <div>
//             <Label className="mb-2 block">
//               Default Posting Date
//             </Label>

//             <Select
//               value={
//                 form.default_posting_date ??
//                 "Work Date"
//               }
//               onValueChange={(v) =>
//                 set({
//                   default_posting_date:
//                     v,
//                 })
//               }
//             >
//               <SelectTrigger>
//                 <SelectValue />
//               </SelectTrigger>

//               <SelectContent>
//                 <SelectItem value="Work Date">
//                   Work Date
//                 </SelectItem>

//                 <SelectItem value="No Date">
//                   No Date
//                 </SelectItem>
//               </SelectContent>
//             </Select>
//           </div>

//           <div>
//             <Label className="mb-2 block">
//               Default Quantity to Ship
//             </Label>

//             <Select
//               value={
//                 form.default_quantity_to_ship ??
//                 "Remainder"
//               }
//               onValueChange={(v) =>
//                 set({
//                   default_quantity_to_ship:
//                     v,
//                 })
//               }
//             >
//               <SelectTrigger>
//                 <SelectValue />
//               </SelectTrigger>

//               <SelectContent>
//                 <SelectItem value="Remainder">
//                   Remainder
//                 </SelectItem>

//                 <SelectItem value="Blank">
//                   Blank
//                 </SelectItem>
//               </SelectContent>
//             </Select>
//           </div>
//         </div>

//         {/* RIGHT SIDE */}

//         <div className="space-y-5">

//           <ToggleRow
//             label="Allow VAT Difference"
//             checked={
//               form.allow_vat_difference
//             }
//             onCheckedChange={(v) =>
//               set({
//                 allow_vat_difference:
//                   v,
//               })
//             }
//           />

//           <ToggleRow
//             label="Calc. Inv. Discount"
//             checked={
//               form.calc_inv_discount
//             }
//             onCheckedChange={(v) =>
//               set({
//                 calc_inv_discount: v,
//               })
//             }
//           />

//           <ToggleRow
//             label="Exact Cost Reversing Mandatory"
//             checked={
//               form.exact_cost_reversing_mandatory
//             }
//             onCheckedChange={(v) =>
//               set({
//                 exact_cost_reversing_mandatory:
//                   v,
//               })
//             }
//           />

//           <ToggleRow
//             label="Check Prepmt. when Posting"
//             checked={
//               form.check_prepmt_when_posting
//             }
//             onCheckedChange={(v) =>
//               set({
//                 check_prepmt_when_posting:
//                   v,
//               })
//             }
//           />

//           <ToggleRow
//             label="Posting Date Check on Posting"
//             checked={
//               form.posting_date_check_on_posting
//             }
//             onCheckedChange={(v) =>
//               set({
//                 posting_date_check_on_posting:
//                   v,
//               })
//             }
//           />

//           <ToggleRow
//             label="Allow Multiple Posting Groups"
//             checked={
//               form.allow_multiple_posting_groups
//             }
//             onCheckedChange={(v) =>
//               set({
//                 allow_multiple_posting_groups:
//                   v,
//               })
//             }
//           />

//           <ToggleRow
//             label="Ignore Updated Addresses"
//             checked={
//               form.ignore_updated_addresses
//             }
//             onCheckedChange={(v) =>
//               set({
//                 ignore_updated_addresses:
//                   v,
//               })
//             }
//           />

//           <ToggleRow
//             label="Skip Manual Reservation"
//             checked={
//               form.skip_manual_reservation
//             }
//             onCheckedChange={(v) =>
//               set({
//                 skip_manual_reservation:
//                   v,
//               })
//             }
//           />

//           <ToggleRow
//             label="Copy Line Descr. to G/L Entry"
//             checked={
//               form.copy_line_descr_to_gl_entry
//             }
//             onCheckedChange={(v) =>
//               set({
//                 copy_line_descr_to_gl_entry:
//                   v,
//               })
//             }
//           />
//         </div>
//       </div>
//     </CardContent>
//   </Card>
// </TabsContent>

//         </Tabs>
//       </div>
//     </div>
//   );
// }

// function NoSeriesField({
//   label,
//   value,
//   options,
//   onChange,
// }: {
//   label: string;
//   value: string | null;
//   options: {
//     code: string;
//     description: string | null;
//   }[];
//   onChange: (
//     value: string | null
//   ) => void;
// }) {
//   return (
//     <div>
//       <Label className="mb-2 block">
//         {label}
//       </Label>

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
//           <SelectValue placeholder="Select No. Series" />
//         </SelectTrigger>

//         <SelectContent>
//           <SelectItem value="__none__">
//             None
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
//   checked,
//   onCheckedChange,
// }: {
//   label: string;
//   checked: boolean;
//   onCheckedChange: (
//     value: boolean
//   ) => void;
// }) {
//   return (
//     <div className="flex items-center justify-between border rounded-md px-4 py-3">
//       <Label>{label}</Label>

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

type SalesSetup = {
  id?: string;

  // No. Series
  customer_nos: string | null;
  salesperson_purchaser_nos: string | null;
  quote_nos: string | null;
  blanket_order_nos: string | null;
  order_nos: string | null;
  return_order_nos: string | null;
  invoice_nos: string | null;
  posted_invoice_nos: string | null;
  credit_memo_nos: string | null;
  posted_credit_memo_nos: string | null;
  shipment_nos: string | null;
  posted_shipment_nos: string | null;
  posted_return_receipt_nos: string | null;

  // General
  default_location_code: string | null;
  shipment_on_invoice: boolean;
  invoice_rounding: boolean;
  return_receipt_on_credit_memo: boolean;
  copy_comments_order_to_invoice: boolean;
  copy_comments_order_to_shipment: boolean;
  copy_customer_name_to_entries: boolean;
  ext_doc_no_mandatory: boolean;
  calc_inv_discount: boolean;
  allow_vat_difference: boolean;
  exact_cost_reversing_mandatory: boolean;
  check_prepmt_when_posting: boolean;
  posting_date_check_on_posting: boolean;
  allow_multiple_posting_groups: boolean;
  ignore_updated_addresses: boolean;
  skip_manual_reservation: boolean;
  copy_line_descr_to_gl_entry: boolean;
  default_item_quantity: boolean;
  create_item_from_description: boolean;
  discount_posting: string | null;
  default_posting_date: string | null;
  default_quantity_to_ship: string | null;
  prepayment_auto_update_frequency: string | null;
  check_multiple_posting_groups: string | null;
  appl_between_currencies: string | null;
  logo_position_on_documents: string | null;
  quote_validity_calculation: string | null;

  // Defaults
  default_payment_terms_code: string | null;
  default_payment_method_code: string | null;
  default_ship_to_code: string | null;

  // Warnings
  credit_warnings: string | null;
  stockout_warning: boolean;
};

const DEFAULT: SalesSetup = {
  customer_nos: null,
  salesperson_purchaser_nos: null,
  quote_nos: null,
  blanket_order_nos: null,
  order_nos: null,
  return_order_nos: null,
  invoice_nos: null,
  posted_invoice_nos: null,
  credit_memo_nos: null,
  posted_credit_memo_nos: null,
  shipment_nos: null,
  posted_shipment_nos: null,
  posted_return_receipt_nos: null,
  default_location_code: null,
  shipment_on_invoice: true,
  invoice_rounding: false,
  return_receipt_on_credit_memo: false,
  copy_comments_order_to_invoice: true,
  copy_comments_order_to_shipment: true,
  copy_customer_name_to_entries: true,
  ext_doc_no_mandatory: false,
  calc_inv_discount: false,
  allow_vat_difference: false,
  exact_cost_reversing_mandatory: false,
  check_prepmt_when_posting: false,
  posting_date_check_on_posting: false,
  allow_multiple_posting_groups: false,
  ignore_updated_addresses: false,
  skip_manual_reservation: false,
  copy_line_descr_to_gl_entry: false,
  default_item_quantity: false,
  create_item_from_description: false,
  discount_posting: "All Discounts",
  default_posting_date: "Work Date",
  default_quantity_to_ship: "Remainder",
  prepayment_auto_update_frequency: "Never",
  check_multiple_posting_groups: "Alternative Groups",
  appl_between_currencies: "All",
  logo_position_on_documents: "No Logo",
  quote_validity_calculation: null,
  default_payment_terms_code: null,
  default_payment_method_code: null,
  default_ship_to_code: null,
  credit_warnings: "Both Warnings",
  stockout_warning: true,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SalesSetupPage() {
  const [form, setForm] = useState<SalesSetup>(DEFAULT);
  const { noSeries, loading: noSeriesLoading } = useNoSeries();
  const [locations, setLocations] = useState<{ code: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [setupRes, locRes] = await Promise.all([
        fetch(`${API_BASE_URL}/setup/sales-receivables`),
        fetch(`${API_BASE_URL}/locations`),
      ]);
      const [setupJson, locJson] = await Promise.all([
        setupRes.json(), locRes.json(),
      ]);
      if (setupJson.success && setupJson.data) setForm({ ...DEFAULT, ...setupJson.data });
      if (locJson.success) setLocations(locJson.data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load Sales Setup");
    } finally {
      setLoading(false);
    }
  };

  const set = (patch: Partial<SalesSetup>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/setup/sales-receivables`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || "Save failed");
      toast.success("Sales Setup saved successfully");
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
        numberFields={12}
        secondarySections={2}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Sales & Receivables Setup"
        subtitle="Configure defaults and number series for sales documents and customer master"
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
            <TabsTrigger value="warnings">Warnings</TabsTrigger>
          </TabsList>

          {/* ── No. Series ── */}
          <TabsContent value="numbering" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>No. Series</CardTitle>
                <CardDescription>
                  Map which number series each sales document type and customer master should use.
                  Series are defined and configured on the <strong>No. Series</strong> page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <NSField label="Customer Nos." value={form.customer_nos} options={noSeries} onChange={(v) => set({ customer_nos: v })} />
                  <NSField label="Salesperson/Purchaser Nos." value={form.salesperson_purchaser_nos} options={noSeries} onChange={(v) => set({ salesperson_purchaser_nos: v })} />
                  <NSField label="Quote Nos." value={form.quote_nos} options={noSeries} onChange={(v) => set({ quote_nos: v })} />
                  <NSField label="Blanket Order Nos." value={form.blanket_order_nos} options={noSeries} onChange={(v) => set({ blanket_order_nos: v })} />
                  <NSField label="Order Nos." value={form.order_nos} options={noSeries} onChange={(v) => set({ order_nos: v })} />
                  <NSField label="Return Order Nos." value={form.return_order_nos} options={noSeries} onChange={(v) => set({ return_order_nos: v })} />
                  <NSField label="Invoice Nos." value={form.invoice_nos} options={noSeries} onChange={(v) => set({ invoice_nos: v })} />
                  <NSField label="Posted Invoice Nos." value={form.posted_invoice_nos} options={noSeries} onChange={(v) => set({ posted_invoice_nos: v })} />
                  <NSField label="Credit Memo Nos." value={form.credit_memo_nos} options={noSeries} onChange={(v) => set({ credit_memo_nos: v })} />
                  <NSField label="Posted Credit Memo Nos." value={form.posted_credit_memo_nos} options={noSeries} onChange={(v) => set({ posted_credit_memo_nos: v })} />
                  <NSField label="Shipment Nos." value={form.shipment_nos} options={noSeries} onChange={(v) => set({ shipment_nos: v })} />
                  <NSField label="Posted Shipment Nos." value={form.posted_shipment_nos} options={noSeries} onChange={(v) => set({ posted_shipment_nos: v })} />
                  <NSField label="Posted Return Receipt Nos." value={form.posted_return_receipt_nos} options={noSeries} onChange={(v) => set({ posted_return_receipt_nos: v })} />
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
                  <CardDescription>Operational defaults and document behaviour.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <Label className="text-sm mb-1.5 block">Default Location Code</Label>
                    <p className="text-xs text-muted-foreground mb-2">Prefilled on new sales documents.</p>
                    <Select value={form.default_location_code ?? "__none__"} onValueChange={(v) => set({ default_location_code: v === "__none__" ? null : v })}>
                      <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— None —</SelectItem>
                        {locations.map((l) => <SelectItem key={l.code} value={l.code}>{l.code} – {l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <ToggleRow label="Shipment on Invoice" description="Auto-post shipment when posting an invoice." checked={form.shipment_on_invoice} onCheckedChange={(v) => set({ shipment_on_invoice: v })} />
                  <ToggleRow label="Return Receipt on Credit Memo" description="Auto-post return receipt when posting a credit memo." checked={form.return_receipt_on_credit_memo} onCheckedChange={(v) => set({ return_receipt_on_credit_memo: v })} />
                  <ToggleRow label="Invoice Rounding" description="Apply rounding to invoice totals." checked={form.invoice_rounding} onCheckedChange={(v) => set({ invoice_rounding: v })} />
                  <ToggleRow label="Copy Comments (Order → Invoice)" description="Copy internal comments from Sales Order to Invoice." checked={form.copy_comments_order_to_invoice} onCheckedChange={(v) => set({ copy_comments_order_to_invoice: v })} />
                  <ToggleRow label="Copy Comments (Order → Shipment)" description="Copy internal comments from Sales Order to Shipment." checked={form.copy_comments_order_to_shipment} onCheckedChange={(v) => set({ copy_comments_order_to_shipment: v })} />
                  <ToggleRow label="Copy Customer Name to Entries" description="Copy customer name to ledger entries." checked={form.copy_customer_name_to_entries} onCheckedChange={(v) => set({ copy_customer_name_to_entries: v })} />
                  <ToggleRow label="Ext. Doc. No. Mandatory" description="Require an external document number on all sales docs." checked={form.ext_doc_no_mandatory} onCheckedChange={(v) => set({ ext_doc_no_mandatory: v })} />
                  <ToggleRow label="Calc. Inv. Discount" description="Automatically calculate invoice-level discounts." checked={form.calc_inv_discount} onCheckedChange={(v) => set({ calc_inv_discount: v })} />
                  <ToggleRow label="Exact Cost Reversing Mandatory" description="Require exact-cost reversing on return orders." checked={form.exact_cost_reversing_mandatory} onCheckedChange={(v) => set({ exact_cost_reversing_mandatory: v })} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Posting & Validation</CardTitle>
                  <CardDescription>Posting date, prepayment, and validation settings.</CardDescription>
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
                    <Label className="text-sm mb-1.5 block">Default Quantity to Ship</Label>
                    <Select value={form.default_quantity_to_ship ?? "Remainder"} onValueChange={(v) => set({ default_quantity_to_ship: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Remainder">Remainder</SelectItem>
                        <SelectItem value="Blank">Blank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Prepmt. Auto Update Frequency</Label>
                    <Select value={form.prepayment_auto_update_frequency ?? "Never"} onValueChange={(v) => set({ prepayment_auto_update_frequency: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Never">Never</SelectItem>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <ToggleRow label="Check Prepmt. when Posting" description="Validate prepayment before posting." checked={form.check_prepmt_when_posting} onCheckedChange={(v) => set({ check_prepmt_when_posting: v })} />
                  <ToggleRow label="Posting Date Check on Posting" description="Validate posting date during posting." checked={form.posting_date_check_on_posting} onCheckedChange={(v) => set({ posting_date_check_on_posting: v })} />
                  <ToggleRow label="Allow Multiple Posting Groups" description="Allow alternate customer posting groups on documents." checked={form.allow_multiple_posting_groups} onCheckedChange={(v) => set({ allow_multiple_posting_groups: v })} />
                  <ToggleRow label="Ignore Updated Addresses" description="Do not prompt when customer address changes." checked={form.ignore_updated_addresses} onCheckedChange={(v) => set({ ignore_updated_addresses: v })} />
                  <ToggleRow label="Skip Manual Reservation" description="Skip manual reservation prompts." checked={form.skip_manual_reservation} onCheckedChange={(v) => set({ skip_manual_reservation: v })} />
                  <ToggleRow label="Copy Line Descr. to G/L Entry" description="Copy line descriptions to general ledger entries." checked={form.copy_line_descr_to_gl_entry} onCheckedChange={(v) => set({ copy_line_descr_to_gl_entry: v })} />
                  <ToggleRow label="Create Item from Description" description="Allow item creation directly from description." checked={form.create_item_from_description} onCheckedChange={(v) => set({ create_item_from_description: v })} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Defaults ── */}
          <TabsContent value="defaults" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Default Codes</CardTitle>
                <CardDescription>Codes prefilled on new customer records and sales documents.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <div>
                    <Label className="text-sm mb-1.5 block">Default Payment Terms Code</Label>
                    <p className="text-xs text-muted-foreground mb-2">Prefilled on new customer cards.</p>
                    <Input value={form.default_payment_terms_code ?? ""} placeholder="e.g. NET30" onChange={(e) => set({ default_payment_terms_code: e.target.value || null })} />
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Default Payment Method Code</Label>
                    <p className="text-xs text-muted-foreground mb-2">Prefilled on new customer cards.</p>
                    <Input value={form.default_payment_method_code ?? ""} placeholder="e.g. CASH" onChange={(e) => set({ default_payment_method_code: e.target.value || null })} />
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Default Ship-To Code</Label>
                    <p className="text-xs text-muted-foreground mb-2">Default shipping address code on sales documents.</p>
                    <Input value={form.default_ship_to_code ?? ""} placeholder="e.g. MAIN-WH" onChange={(e) => set({ default_ship_to_code: e.target.value || null })} />
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Quote Validity Calculation</Label>
                    <p className="text-xs text-muted-foreground mb-2">Formula for quote expiry date (e.g. 30D).</p>
                    <Input value={form.quote_validity_calculation ?? ""} placeholder="e.g. 30D" onChange={(e) => set({ quote_validity_calculation: e.target.value || null })} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Warnings ── */}
          <TabsContent value="warnings" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Warnings</CardTitle>
                <CardDescription>Control warning behaviour during sales order entry.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label className="text-sm mb-1.5 block">Credit Warnings</Label>
                  <p className="text-xs text-muted-foreground mb-2">When to warn about customer credit limits or overdue balances.</p>
                  <Select value={form.credit_warnings ?? "Both Warnings"} onValueChange={(v) => set({ credit_warnings: v })}>
                    <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Both Warnings">Both Warnings</SelectItem>
                      <SelectItem value="Credit Limit">Credit Limit Only</SelectItem>
                      <SelectItem value="Overdue Balance">Overdue Balance Only</SelectItem>
                      <SelectItem value="No Warning">No Warning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <ToggleRow label="Stockout Warning" description="Warn when sales quantity exceeds available stock." checked={form.stockout_warning} onCheckedChange={(v) => set({ stockout_warning: v })} />
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

