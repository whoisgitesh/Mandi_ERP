// // import { useEffect, useState } from "react";
// // import { supabase } from "@/integrations/supabase/client";
// // import { PageHeader } from "@/components/PageHeader";
// // import { Button } from "@/components/ui/button";
// // import { Input } from "@/components/ui/input";
// // import { Label } from "@/components/ui/label";
// // import { Switch } from "@/components/ui/switch";
// // import { Separator } from "@/components/ui/separator";
// // import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// // import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// // import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// // import { toast } from "sonner";
// // import { Save } from "lucide-react";

// // // ─── Types ────────────────────────────────────────────────────────────────────

// // type InventorySetup = {
// //   id: string;
// //   // No. Series
// //   item_nos: string | null;
// //   location_nos: string | null;
// //   uom_nos: string | null;
// //   // General
// //   location_mandatory: boolean;
// //   prevent_negative_inventory: boolean;
// //   automatic_cost_posting: boolean;
// //   // Costing
// //   default_costing_method: string | null;
// //   average_cost_period: string | null;
// //   average_cost_calc_type: string | null;
// //   // Item tracking
// //   lot_nos: string | null;
// //   serial_nos: string | null;
// //   // Counting
// //   default_phys_invt_counting_period: string | null;
// //   // Variants
// //   variant_mandatory_if_exists: boolean;
// // };

// // const defaultSetup: Omit<InventorySetup, "id"> = {
// //   item_nos: null,
// //   location_nos: null,
// //   uom_nos: null,
// //   location_mandatory: false,
// //   prevent_negative_inventory: false,
// //   automatic_cost_posting: false,
// //   default_costing_method: "FIFO",
// //   average_cost_period: "Month",
// //   average_cost_calc_type: "Item",
// //   lot_nos: null,
// //   serial_nos: null,
// //   default_phys_invt_counting_period: null,
// //   variant_mandatory_if_exists: false,
// // };

// // // ─── Component ────────────────────────────────────────────────────────────────

// // export default function InventorySetupPage() {
// //   const [setup, setSetup] = useState<InventorySetup | null>(null);
// //   const [form, setForm] = useState({ ...defaultSetup });
// //   const [noSeriesList, setNoSeriesList] = useState<{ code: string; description: string | null }[]>([]);
// //   const [saving, setSaving] = useState(false);
// //   const [loading, setLoading] = useState(true);

// //   useEffect(() => {
// //     (async () => {
// //       const { data } = await supabase
// //         .from("inventory_setup" as any)
// //         .select("*")
// //         .maybeSingle();

// //       if (data) {
// //         setSetup(data as unknown as InventorySetup);
// //         setForm(data as unknown as InventorySetup);
// //       }

// //       const { data: ns } = await supabase
// //         .from("number_series" as any)
// //         .select("code, description")
// //         .order("code");
// //       setNoSeriesList((ns as any[]) ?? []);

// //       setLoading(false);
// //     })();
// //   }, []);

// //   const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

// //   const save = async () => {
// //     setSaving(true);
// //     try {
// //       const { error } = setup
// //         ? await supabase.from("inventory_setup" as any).update(form).eq("id", (setup as any).id)
// //         : await supabase.from("inventory_setup" as any).insert(form);

// //       if (error) throw error;
// //       toast.success("Inventory Setup saved");

// //       const { data } = await supabase.from("inventory_setup" as any).select("*").maybeSingle();
// //       if (data) { setSetup(data as any); setForm(data as any); }
// //     } catch (e: any) {
// //       toast.error(e.message);
// //     } finally {
// //       setSaving(false);
// //     }
// //   };

// //   if (loading) return <div className="p-6 text-muted-foreground text-sm">Loading setup…</div>;

// //   return (
// //     <div>
// //       <PageHeader
// //         title="Inventory Setup"
// //         subtitle="Configure defaults, number series, and costing for inventory management"
// //         actions={
// //           <Button onClick={save} disabled={saving}>
// //             <Save className="h-4 w-4 mr-1" />
// //             {saving ? "Saving…" : "Save"}
// //           </Button>
// //         }
// //       />

// //       <div className="p-6">
// //         <Tabs defaultValue="numbering">
// //           <TabsList>
// //             <TabsTrigger value="numbering">No. Series</TabsTrigger>
// //             <TabsTrigger value="general">General</TabsTrigger>
// //             <TabsTrigger value="costing">Costing</TabsTrigger>
// //             <TabsTrigger value="tracking">Item Tracking</TabsTrigger>
// //           </TabsList>

// //           {/* ── No. Series ── */}
// //           <TabsContent value="numbering" className="mt-4">
// //             <Card>
// //               <CardHeader>
// //                 <CardTitle>No. Series</CardTitle>
// //                 <CardDescription>
// //                   Assign which number series items, locations, and units of measure should use. Series are defined in the <strong>No. Series</strong> page.
// //                 </CardDescription>
// //               </CardHeader>
// //               <CardContent>
// //                 <div className="grid grid-cols-2 gap-x-8 gap-y-5">
// //                   <NoSeriesField
// //                     label="Item Nos."
// //                     description="Used when creating new item records."
// //                     value={form.item_nos}
// //                     options={noSeriesList}
// //                     onChange={(v) => set({ item_nos: v })}
// //                   />
// //                   <NoSeriesField
// //                     label="Location Nos."
// //                     description="Used when creating new location records."
// //                     value={form.location_nos}
// //                     options={noSeriesList}
// //                     onChange={(v) => set({ location_nos: v })}
// //                   />
// //                   <NoSeriesField
// //                     label="Unit of Measure Nos."
// //                     description="Used when creating new unit of measure records."
// //                     value={form.uom_nos}
// //                     options={noSeriesList}
// //                     onChange={(v) => set({ uom_nos: v })}
// //                   />
// //                 </div>
// //               </CardContent>
// //             </Card>
// //           </TabsContent>

// //           {/* ── General ── */}
// //           <TabsContent value="general" className="mt-4">
// //             <Card>
// //               <CardHeader>
// //                 <CardTitle>General</CardTitle>
// //                 <CardDescription>Core inventory behaviour settings.</CardDescription>
// //               </CardHeader>
// //               <CardContent className="space-y-4">
// //                 <ToggleRow
// //                   label="Location Mandatory"
// //                   description="Require a location code on all inventory transactions. Recommended when using multiple warehouses."
// //                   checked={form.location_mandatory}
// //                   onCheckedChange={(v) => set({ location_mandatory: v })}
// //                 />
// //                 <Separator />
// //                 <ToggleRow
// //                   label="Prevent Negative Inventory"
// //                   description="Block posting of transactions that would result in negative stock."
// //                   checked={form.prevent_negative_inventory}
// //                   onCheckedChange={(v) => set({ prevent_negative_inventory: v })}
// //                 />
// //                 <Separator />
// //                 <ToggleRow
// //                   label="Automatic Cost Posting"
// //                   description="Automatically post inventory cost adjustments to the ledger when inventory is adjusted."
// //                   checked={form.automatic_cost_posting}
// //                   onCheckedChange={(v) => set({ automatic_cost_posting: v })}
// //                 />
// //                 <Separator />
// //                 <ToggleRow
// //                   label="Variant Mandatory if Exists"
// //                   description="Require a variant code on transaction lines when an item has variants defined."
// //                   checked={form.variant_mandatory_if_exists}
// //                   onCheckedChange={(v) => set({ variant_mandatory_if_exists: v })}
// //                 />
// //               </CardContent>
// //             </Card>
// //           </TabsContent>

// //           {/* ── Costing ── */}
// //           <TabsContent value="costing" className="mt-4">
// //             <Card>
// //               <CardHeader>
// //                 <CardTitle>Costing</CardTitle>
// //                 <CardDescription>Configure how inventory costs are calculated and averaged.</CardDescription>
// //               </CardHeader>
// //               <CardContent>
// //                 <div className="grid grid-cols-2 gap-x-8 gap-y-5">
// //                   <div>
// //                     <Label className="text-sm mb-1.5 block">Default Costing Method</Label>
// //                     <p className="text-xs text-muted-foreground mb-2">
// //                       Applied to new items unless overridden on the item card.
// //                     </p>
// //                     <Select value={form.default_costing_method ?? "FIFO"} onValueChange={(v) => set({ default_costing_method: v })}>
// //                       <SelectTrigger>
// //                         <SelectValue />
// //                       </SelectTrigger>
// //                       <SelectContent>
// //                         <SelectItem value="FIFO">FIFO</SelectItem>
// //                         <SelectItem value="LIFO">LIFO</SelectItem>
// //                         <SelectItem value="Average">Average</SelectItem>
// //                         <SelectItem value="Standard">Standard</SelectItem>
// //                         <SelectItem value="Specific">Specific</SelectItem>
// //                       </SelectContent>
// //                     </Select>
// //                   </div>

// //                   <div>
// //                     <Label className="text-sm mb-1.5 block">Average Cost Period</Label>
// //                     <p className="text-xs text-muted-foreground mb-2">
// //                       Period over which average cost is calculated (used when costing method is Average).
// //                     </p>
// //                     <Select value={form.average_cost_period ?? "Month"} onValueChange={(v) => set({ average_cost_period: v })}>
// //                       <SelectTrigger>
// //                         <SelectValue />
// //                       </SelectTrigger>
// //                       <SelectContent>
// //                         <SelectItem value="Day">Day</SelectItem>
// //                         <SelectItem value="Week">Week</SelectItem>
// //                         <SelectItem value="Month">Month</SelectItem>
// //                         <SelectItem value="Quarter">Quarter</SelectItem>
// //                         <SelectItem value="Year">Year</SelectItem>
// //                         <SelectItem value="Accounting Period">Accounting Period</SelectItem>
// //                       </SelectContent>
// //                     </Select>
// //                   </div>

// //                   <div>
// //                     <Label className="text-sm mb-1.5 block">Average Cost Calculation Type</Label>
// //                     <p className="text-xs text-muted-foreground mb-2">
// //                       Defines whether average cost is computed per item or per item + location + variant.
// //                     </p>
// //                     <Select value={form.average_cost_calc_type ?? "Item"} onValueChange={(v) => set({ average_cost_calc_type: v })}>
// //                       <SelectTrigger>
// //                         <SelectValue />
// //                       </SelectTrigger>
// //                       <SelectContent>
// //                         <SelectItem value="Item">Item</SelectItem>
// //                         <SelectItem value="Item & Location & Variant">Item & Location & Variant</SelectItem>
// //                       </SelectContent>
// //                     </Select>
// //                   </div>

// //                   <div>
// //                     <Label className="text-sm mb-1.5 block">Default Phys. Inventory Counting Period</Label>
// //                     <p className="text-xs text-muted-foreground mb-2">
// //                       Default counting period code applied to new items.
// //                     </p>
// //                     <Input
// //                       value={form.default_phys_invt_counting_period ?? ""}
// //                       placeholder="e.g. MONTHLY"
// //                       onChange={(e) => set({ default_phys_invt_counting_period: e.target.value || null })}
// //                     />
// //                   </div>
// //                 </div>
// //               </CardContent>
// //             </Card>
// //           </TabsContent>

// //           {/* ── Item Tracking ── */}
// //           <TabsContent value="tracking" className="mt-4">
// //             <Card>
// //               <CardHeader>
// //                 <CardTitle>Item Tracking</CardTitle>
// //                 <CardDescription>Default number series for lot and serial number tracking.</CardDescription>
// //               </CardHeader>
// //               <CardContent>
// //                 <div className="grid grid-cols-2 gap-x-8 gap-y-5">
// //                   <NoSeriesField
// //                     label="Lot Nos."
// //                     description="Default number series used when generating lot numbers for items."
// //                     value={form.lot_nos}
// //                     options={noSeriesList}
// //                     onChange={(v) => set({ lot_nos: v })}
// //                   />
// //                   <NoSeriesField
// //                     label="Serial Nos."
// //                     description="Default number series used when generating serial numbers for items."
// //                     value={form.serial_nos}
// //                     options={noSeriesList}
// //                     onChange={(v) => set({ serial_nos: v })}
// //                   />
// //                 </div>
// //               </CardContent>
// //             </Card>
// //           </TabsContent>
// //         </Tabs>
// //       </div>
// //     </div>
// //   );
// // }

// // // ─── Helpers ───────────────────────────────────────────────────────────────────

// // function NoSeriesField({ label, description, value, options, onChange }: {
// //   label: string;
// //   description: string;
// //   value: string | null;
// //   options: { code: string; description: string | null }[];
// //   onChange: (v: string | null) => void;
// // }) {
// //   return (
// //     <div>
// //       <Label className="text-sm mb-1.5 block font-medium">{label}</Label>
// //       <p className="text-xs text-muted-foreground mb-2">{description}</p>
// //       <Select value={value ?? "__none__"} onValueChange={(v) => onChange(v === "__none__" ? null : v)}>
// //         <SelectTrigger>
// //           <SelectValue placeholder="— Not set —" />
// //         </SelectTrigger>
// //         <SelectContent>
// //           <SelectItem value="__none__">— Not set —</SelectItem>
// //           {options.map((o) => (
// //             <SelectItem key={o.code} value={o.code}>
// //               {o.code}
// //               {o.description && <span className="text-muted-foreground ml-2 text-xs">— {o.description}</span>}
// //             </SelectItem>
// //           ))}
// //         </SelectContent>
// //       </Select>
// //     </div>
// //   );
// // }

// // function ToggleRow({ label, description, checked, onCheckedChange }: {
// //   label: string;
// //   description: string;
// //   checked: boolean;
// //   onCheckedChange: (v: boolean) => void;
// // }) {
// //   return (
// //     <div className="flex items-start justify-between gap-6">
// //       <div className="flex-1">
// //         <p className="text-sm font-medium">{label}</p>
// //         <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
// //       </div>
// //       <Switch checked={checked} onCheckedChange={onCheckedChange} />
// //     </div>
// //   );
// // }


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

// // ─── Types ────────────────────────────────────────────────────────────────────

// type InventorySetup = {
//   id: string;

//   // No. Series
//   item_nos: string | null;
//   location_nos: string | null;
//   uom_nos: string | null;

//   // General
//   location_mandatory: boolean;
//   prevent_negative_inventory: boolean;
//   automatic_cost_posting: boolean;

//   // Costing
//   default_costing_method: string | null;
//   average_cost_period: string | null;
//   average_cost_calc_type: string | null;

//   // Item Tracking
//   lot_nos: string | null;
//   serial_nos: string | null;

//   // Counting
//   default_phys_invt_counting_period: string | null;

//   // Variants
//   variant_mandatory_if_exists: boolean;
// };

// const defaultSetup: Omit<InventorySetup, "id"> = {
//   item_nos: null,
//   location_nos: null,
//   uom_nos: null,

//   location_mandatory: false,
//   prevent_negative_inventory: false,
//   automatic_cost_posting: false,

//   default_costing_method: "FIFO",
//   average_cost_period: "Month",
//   average_cost_calc_type: "Item",

//   lot_nos: null,
//   serial_nos: null,

//   default_phys_invt_counting_period: null,

//   variant_mandatory_if_exists: false,
// };

// // ─── Component ────────────────────────────────────────────────────────────────

// export default function InventorySetupPage() {
//   const [setup, setSetup] =
//     useState<InventorySetup | null>(null);

//   const [form, setForm] = useState({
//     ...defaultSetup,
//   });

//   const [noSeriesList, setNoSeriesList] =
//     useState<
//       {
//         code: string;
//         description: string | null;
//       }[]
//     >([]);

//   const [saving, setSaving] = useState(false);
//   const [loading, setLoading] = useState(true);

//   // ─── Load Data ─────────────────────────────────────────────────────────────

//   useEffect(() => {
//     loadData();
//   }, []);

//   const loadData = async () => {
//     try {
//       setLoading(true);

//       const [setupRes, noSeriesRes] =
//         await Promise.all([
//           fetch(
//             "http://localhost:5000/api/setup/inventory"
//           ),

//           fetch(
//             "http://localhost:5000/api/no-series/options"
//           ),
//         ]);

//       if (!setupRes.ok) {
//         throw new Error(
//           "Failed to fetch inventory setup"
//         );
//       }

//       if (!noSeriesRes.ok) {
//         throw new Error(
//           "Failed to fetch number series"
//         );
//       }

//       const setupData = await setupRes.json();
//       const noSeriesData =
//         await noSeriesRes.json();

//       if (setupData?.data) {
//         setSetup(setupData.data);
//         setForm(setupData.data);
//       }

//       setNoSeriesList(noSeriesData?.data || []);
//     } catch (e: any) {
//       toast.error(
//         e.message ||
//           "Failed to load inventory setup"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ─── Form Helpers ──────────────────────────────────────────────────────────

//   const set = (
//     patch: Partial<typeof form>
//   ) => {
//     setForm((f) => ({
//       ...f,
//       ...patch,
//     }));
//   };

//   // ─── Save ──────────────────────────────────────────────────────────────────

//   const save = async () => {
//     try {
//       setSaving(true);

//       const response = await fetch(
//         "http://localhost:5000/api/setup/inventory",
//         {
//           method: "PUT",
//           headers: {
//             "Content-Type":
//               "application/json",
//           },
//           body: JSON.stringify(form),
//         }
//       );

//       if (!response.ok) {
//         throw new Error(
//           "Failed to save inventory setup"
//         );
//       }

//       const result = await response.json();

//       if (result?.data) {
//         setSetup(result.data);
//         setForm(result.data);
//       }

//       toast.success(
//         "Inventory Setup saved"
//       );
//     } catch (e: any) {
//       toast.error(
//         e.message ||
//           "Failed to save inventory setup"
//       );
//     } finally {
//       setSaving(false);
//     }
//   };

//   // ─── Loading ───────────────────────────────────────────────────────────────

//   if (loading) {
//     return (
//       <div className="p-6 text-sm text-muted-foreground">
//         Loading setup...
//       </div>
//     );
//   }

//   // ─── UI ────────────────────────────────────────────────────────────────────

//   return (
//     <div>
//       <PageHeader
//         title="Inventory Setup"
//         subtitle="Configure defaults, number series, and costing for inventory management"
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

//             <TabsTrigger value="costing">
//               Costing
//             </TabsTrigger>

//             <TabsTrigger value="tracking">
//               Item Tracking
//             </TabsTrigger>
//           </TabsList>

//           {/* ───────────────────────────────────────────── */}
//           {/* No. Series */}
//           {/* ───────────────────────────────────────────── */}

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
//                   Configure default number
//                   series mappings for inventory
//                   masters.
//                 </CardDescription>
//               </CardHeader>

//               <CardContent>
//                 <div className="grid grid-cols-2 gap-x-8 gap-y-5">
//                   <NoSeriesField
//                     label="Item Nos."
//                     description="Used for new item records."
//                     value={form.item_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({
//                         item_nos: v,
//                       })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Location Nos."
//                     description="Used for new location records."
//                     value={form.location_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({
//                         location_nos: v,
//                       })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Unit Of Measure Nos."
//                     description="Used for new unit of measure records."
//                     value={form.uom_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({
//                         uom_nos: v,
//                       })
//                     }
//                   />
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* ───────────────────────────────────────────── */}
//           {/* General */}
//           {/* ───────────────────────────────────────────── */}

//           <TabsContent
//             value="general"
//             className="mt-4"
//           >
//             <Card>
//               <CardHeader>
//                 <CardTitle>
//                   General
//                 </CardTitle>

//                 <CardDescription>
//                   General inventory behaviour
//                   configuration.
//                 </CardDescription>
//               </CardHeader>

//               <CardContent className="space-y-4">
//                 <ToggleRow
//                   label="Location Mandatory"
//                   description="Require location code on inventory transactions."
//                   checked={
//                     form.location_mandatory
//                   }
//                   onCheckedChange={(v) =>
//                     set({
//                       location_mandatory:
//                         v,
//                     })
//                   }
//                 />

//                 <Separator />

//                 <ToggleRow
//                   label="Prevent Negative Inventory"
//                   description="Prevent inventory from going negative."
//                   checked={
//                     form.prevent_negative_inventory
//                   }
//                   onCheckedChange={(v) =>
//                     set({
//                       prevent_negative_inventory:
//                         v,
//                     })
//                   }
//                 />

//                 <Separator />

//                 <ToggleRow
//                   label="Automatic Cost Posting"
//                   description="Automatically post inventory costs."
//                   checked={
//                     form.automatic_cost_posting
//                   }
//                   onCheckedChange={(v) =>
//                     set({
//                       automatic_cost_posting:
//                         v,
//                     })
//                   }
//                 />

//                 <Separator />

//                 <ToggleRow
//                   label="Variant Mandatory if Exists"
//                   description="Require variant codes when variants exist."
//                   checked={
//                     form.variant_mandatory_if_exists
//                   }
//                   onCheckedChange={(v) =>
//                     set({
//                       variant_mandatory_if_exists:
//                         v,
//                     })
//                   }
//                 />
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* ───────────────────────────────────────────── */}
//           {/* Costing */}
//           {/* ───────────────────────────────────────────── */}

//           <TabsContent
//             value="costing"
//             className="mt-4"
//           >
//             <Card>
//               <CardHeader>
//                 <CardTitle>
//                   Costing
//                 </CardTitle>

//                 <CardDescription>
//                   Inventory costing and
//                   averaging setup.
//                 </CardDescription>
//               </CardHeader>

//               <CardContent>
//                 <div className="grid grid-cols-2 gap-x-8 gap-y-5">
//                   <div>
//                     <Label className="text-sm mb-1.5 block">
//                       Default Costing Method
//                     </Label>

//                     <Select
//                       value={
//                         form.default_costing_method ??
//                         "FIFO"
//                       }
//                       onValueChange={(v) =>
//                         set({
//                           default_costing_method:
//                             v,
//                         })
//                       }
//                     >
//                       <SelectTrigger>
//                         <SelectValue />
//                       </SelectTrigger>

//                       <SelectContent>
//                         <SelectItem value="FIFO">
//                           FIFO
//                         </SelectItem>

//                         <SelectItem value="LIFO">
//                           LIFO
//                         </SelectItem>

//                         <SelectItem value="Average">
//                           Average
//                         </SelectItem>

//                         <SelectItem value="Standard">
//                           Standard
//                         </SelectItem>

//                         <SelectItem value="Specific">
//                           Specific
//                         </SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>

//                   <div>
//                     <Label className="text-sm mb-1.5 block">
//                       Average Cost Period
//                     </Label>

//                     <Select
//                       value={
//                         form.average_cost_period ??
//                         "Month"
//                       }
//                       onValueChange={(v) =>
//                         set({
//                           average_cost_period:
//                             v,
//                         })
//                       }
//                     >
//                       <SelectTrigger>
//                         <SelectValue />
//                       </SelectTrigger>

//                       <SelectContent>
//                         <SelectItem value="Day">
//                           Day
//                         </SelectItem>

//                         <SelectItem value="Week">
//                           Week
//                         </SelectItem>

//                         <SelectItem value="Month">
//                           Month
//                         </SelectItem>

//                         <SelectItem value="Quarter">
//                           Quarter
//                         </SelectItem>

//                         <SelectItem value="Year">
//                           Year
//                         </SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>

//                   <div>
//                     <Label className="text-sm mb-1.5 block">
//                       Average Cost Calculation
//                       Type
//                     </Label>

//                     <Select
//                       value={
//                         form.average_cost_calc_type ??
//                         "Item"
//                       }
//                       onValueChange={(v) =>
//                         set({
//                           average_cost_calc_type:
//                             v,
//                         })
//                       }
//                     >
//                       <SelectTrigger>
//                         <SelectValue />
//                       </SelectTrigger>

//                       <SelectContent>
//                         <SelectItem value="Item">
//                           Item
//                         </SelectItem>

//                         <SelectItem value="Item & Location & Variant">
//                           Item &
//                           Location &
//                           Variant
//                         </SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>

//                   <div>
//                     <Label className="text-sm mb-1.5 block">
//                       Default Phys.
//                       Inventory Counting
//                       Period
//                     </Label>

//                     <Input
//                       value={
//                         form.default_phys_invt_counting_period ??
//                         ""
//                       }
//                       placeholder="e.g. MONTHLY"
//                       onChange={(e) =>
//                         set({
//                           default_phys_invt_counting_period:
//                             e.target.value ||
//                             null,
//                         })
//                       }
//                     />
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* ───────────────────────────────────────────── */}
//           {/* Tracking */}
//           {/* ───────────────────────────────────────────── */}

//           <TabsContent
//             value="tracking"
//             className="mt-4"
//           >
//             <Card>
//               <CardHeader>
//                 <CardTitle>
//                   Item Tracking
//                 </CardTitle>

//                 <CardDescription>
//                   Default number series for
//                   lot and serial tracking.
//                 </CardDescription>
//               </CardHeader>

//               <CardContent>
//                 <div className="grid grid-cols-2 gap-x-8 gap-y-5">
//                   <NoSeriesField
//                     label="Lot Nos."
//                     description="Default lot number series."
//                     value={form.lot_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({
//                         lot_nos: v,
//                       })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Serial Nos."
//                     description="Default serial number series."
//                     value={form.serial_nos}
//                     options={noSeriesList}
//                     onChange={(v) =>
//                       set({
//                         serial_nos: v,
//                       })
//                     }
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
//   onChange: (v: string | null) => void;
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
//             v === "__none__" ? null : v
//           )
//         }
//       >
//         <SelectTrigger>
//           <SelectValue placeholder="— Not set —" />
//         </SelectTrigger>

//         <SelectContent>
//           <SelectItem value="__none__">
//             — Not set —
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
//   onCheckedChange: (v: boolean) => void;
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
// import { useEffect, useState } from "react";
// import { PageHeader } from "@/components/PageHeader";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Switch } from "@/components/ui/switch";
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

// // ─────────────────────────────────────────────────────────────
// // TYPES
// // ─────────────────────────────────────────────────────────────

// type InventorySetup = {
//   id: string;

//   // No. Series
//   item_nos: string | null;
//   location_nos: string | null;
//   uom_nos: string | null;

//   // General
//   automatic_cost_posting: boolean;
//   automatic_cost_adjustment: string | null;
//   cost_adjustment_logging: string | null;
//   default_costing_method: string | null;
//   prevent_negative_inventory: boolean;

//   variant_mandatory_if_exists: boolean;
//   skip_prompt_to_create_item: boolean;
//   copy_item_descr_to_entries: boolean;
//   allow_inventory_adjustment: boolean;

//   // Location
//   location_mandatory: boolean;

//   // Planning
//   current_demand_forecast: string | null;
//   use_forecast_on_locations: boolean;
//   use_forecast_on_variants: boolean;
//   default_safety_lead_time: string | null;

//   blank_overflow_level: string | null;
//   combined_mps_mrp_calculation: boolean;
//   default_dampener_period: string | null;
//   default_dampener_percent: string | null;
// };

// // ─────────────────────────────────────────────────────────────
// // DEFAULT SETUP
// // ─────────────────────────────────────────────────────────────

// const defaultSetup: Omit<
//   InventorySetup,
//   "id"
// > = {
//   // No. Series
//   item_nos: null,
//   location_nos: null,
//   uom_nos: null,

//   // General
//   automatic_cost_posting: false,

//   automatic_cost_adjustment:
//     "Always",

//   cost_adjustment_logging:
//     "Disabled",

//   default_costing_method:
//     "FIFO",

//   prevent_negative_inventory:
//     false,

//   variant_mandatory_if_exists:
//     false,

//   skip_prompt_to_create_item:
//     false,

//   copy_item_descr_to_entries:
//     false,

//   allow_inventory_adjustment:
//     true,

//   // Location
//   location_mandatory: false,

//   // Planning
//   current_demand_forecast:
//     null,

//   use_forecast_on_locations:
//     false,

//   use_forecast_on_variants:
//     false,

//   default_safety_lead_time:
//     null,

//   blank_overflow_level:
//     "Allow Default Calculation",

//   combined_mps_mrp_calculation:
//     true,

//   default_dampener_period:
//     null,

//   default_dampener_percent:
//     null,
// };

// // ─────────────────────────────────────────────────────────────
// // COMPONENT
// // ─────────────────────────────────────────────────────────────

// export default function InventorySetupPage() {
//   const [setup, setSetup] =
//     useState<InventorySetup | null>(
//       null
//     );

//   const [form, setForm] = useState({
//     ...defaultSetup,
//   });

//   const [noSeriesList, setNoSeriesList] =
//     useState<
//       {
//         code: string;
//         description: string | null;
//       }[]
//     >([]);

//   const [saving, setSaving] =
//     useState(false);

//   const [loading, setLoading] =
//     useState(true);

//   // ──────────────────────────────────────────
//   // LOAD DATA
//   // ──────────────────────────────────────────

//   useEffect(() => {
//     loadData();
//   }, []);

//   const loadData = async () => {
//     try {
//       setLoading(true);

//       const [
//         setupRes,
//         noSeriesRes,
//       ] = await Promise.all([
//         fetch(
//           "http://localhost:5000/api/setup/inventory"
//         ),

//         fetch(
//           "http://localhost:5000/api/no-series/options"
//         ),
//       ]);

//       if (!setupRes.ok) {
//         throw new Error(
//           "Failed to fetch inventory setup"
//         );
//       }

//       if (!noSeriesRes.ok) {
//         throw new Error(
//           "Failed to fetch number series"
//         );
//       }

//       const setupData =
//         await setupRes.json();

//       const noSeriesData =
//         await noSeriesRes.json();

//       if (setupData?.data) {
//         setSetup(setupData.data);
//         setForm(setupData.data);
//       }

//       setNoSeriesList(
//         noSeriesData?.data || []
//       );
//     } catch (e: any) {
//       toast.error(
//         e.message ||
//           "Failed to load inventory setup"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ──────────────────────────────────────────
//   // HELPERS
//   // ──────────────────────────────────────────

//   const set = (
//     patch: Partial<typeof form>
//   ) => {
//     setForm((f) => ({
//       ...f,
//       ...patch,
//     }));
//   };

//   // ──────────────────────────────────────────
//   // SAVE
//   // ──────────────────────────────────────────

//   const save = async () => {
//     try {
//       setSaving(true);

//       const response = await fetch(
//         "http://localhost:5000/api/setup/inventory",
//         {
//           method: "PUT",

//           headers: {
//             "Content-Type":
//               "application/json",
//           },

//           body: JSON.stringify(
//             form
//           ),
//         }
//       );

//       if (!response.ok) {
//         throw new Error(
//           "Failed to save inventory setup"
//         );
//       }

//       const result =
//         await response.json();

//       if (result?.data) {
//         setSetup(result.data);
//         setForm(result.data);
//       }

//       toast.success(
//         "Inventory Setup saved"
//       );
//     } catch (e: any) {
//       toast.error(
//         e.message ||
//           "Failed to save inventory setup"
//       );
//     } finally {
//       setSaving(false);
//     }
//   };

//   // ──────────────────────────────────────────
//   // LOADING
//   // ──────────────────────────────────────────

//   if (loading) {
//     return (
//       <div className="p-6 text-sm text-muted-foreground">
//         Loading setup...
//       </div>
//     );
//   }

//   // ──────────────────────────────────────────
//   // UI
//   // ──────────────────────────────────────────

//   return (
//     <div>
//       <PageHeader
//         title="Inventory Setup"
//         subtitle="Configure inventory defaults and planning settings"
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

//             <TabsTrigger value="location">
//               Location
//             </TabsTrigger>

//             <TabsTrigger value="planning">
//               Planning
//             </TabsTrigger>
//           </TabsList>

//           {/* ───────────────────────────────────────────── */}
//           {/* No. Series */}
//           {/* ───────────────────────────────────────────── */}

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
//                   Configure default
//                   number series mappings
//                   for inventory masters.
//                 </CardDescription>
//               </CardHeader>

//               <CardContent>
//                 <div className="grid grid-cols-2 gap-x-8 gap-y-5">
//                   <NoSeriesField
//                     label="Item Nos."
//                     description="Used for new item records."
//                     value={form.item_nos}
//                     options={
//                       noSeriesList
//                     }
//                     onChange={(v) =>
//                       set({
//                         item_nos:
//                           v,
//                       })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Location Nos."
//                     description="Used for new location records."
//                     value={
//                       form.location_nos
//                     }
//                     options={
//                       noSeriesList
//                     }
//                     onChange={(v) =>
//                       set({
//                         location_nos:
//                           v,
//                       })
//                     }
//                   />

//                   <NoSeriesField
//                     label="Unit Of Measure Nos."
//                     description="Used for new unit of measure records."
//                     value={form.uom_nos}
//                     options={
//                       noSeriesList
//                     }
//                     onChange={(v) =>
//                       set({
//                         uom_nos:
//                           v,
//                       })
//                     }
//                   />
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* ───────────────────────────────────────────── */}
//           {/* General */}
//           {/* ───────────────────────────────────────────── */}

//           <TabsContent
//             value="general"
//             className="mt-4"
//           >
//             <Card>
//               <CardHeader>
//                 <CardTitle>
//                   General
//                 </CardTitle>

//                 <CardDescription>
//                   Configure inventory
//                   behaviour and costing
//                   settings.
//                 </CardDescription>
//               </CardHeader>

//               <CardContent>
//                 <div className="grid grid-cols-2 gap-x-10 gap-y-5">
//                   <ToggleRow
//                     label="Automatic Cost Posting"
//                     description="Automatically post inventory costs."
//                     checked={
//                       form.automatic_cost_posting
//                     }
//                     onCheckedChange={(
//                       v
//                     ) =>
//                       set({
//                         automatic_cost_posting:
//                           v,
//                       })
//                     }
//                   />

//                   <ToggleRow
//                     label="Variant Mandatory if Exists"
//                     description="Require variants when item variants exist."
//                     checked={
//                       form.variant_mandatory_if_exists
//                     }
//                     onCheckedChange={(
//                       v
//                     ) =>
//                       set({
//                         variant_mandatory_if_exists:
//                           v,
//                       })
//                     }
//                   />

//                   <div>
//                     <Label className="text-sm mb-1.5 block">
//                       Automatic Cost
//                       Adjustment
//                     </Label>

//                     <Select
//                       value={
//                         form.automatic_cost_adjustment ??
//                         "Always"
//                       }
//                       onValueChange={(
//                         v
//                       ) =>
//                         set({
//                           automatic_cost_adjustment:
//                             v,
//                         })
//                       }
//                     >
//                       <SelectTrigger>
//                         <SelectValue />
//                       </SelectTrigger>

//                       <SelectContent>
//                         <SelectItem value="Never">
//                           Never
//                         </SelectItem>

//                         <SelectItem value="Day">
//                           Day
//                         </SelectItem>

//                         <SelectItem value="Week">
//                           Week
//                         </SelectItem>

//                         <SelectItem value="Month">
//                           Month
//                         </SelectItem>

//                         <SelectItem value="Always">
//                           Always
//                         </SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>

//                   <ToggleRow
//                     label="Skip Prompt to Create Item"
//                     description="Skip item creation prompt."
//                     checked={
//                       form.skip_prompt_to_create_item
//                     }
//                     onCheckedChange={(
//                       v
//                     ) =>
//                       set({
//                         skip_prompt_to_create_item:
//                           v,
//                       })
//                     }
//                   />

//                   <div>
//                     <Label className="text-sm mb-1.5 block">
//                       Cost Adjustment
//                       Logging
//                     </Label>

//                     <Select
//                       value={
//                         form.cost_adjustment_logging ??
//                         "Disabled"
//                       }
//                       onValueChange={(
//                         v
//                       ) =>
//                         set({
//                           cost_adjustment_logging:
//                             v,
//                         })
//                       }
//                     >
//                       <SelectTrigger>
//                         <SelectValue />
//                       </SelectTrigger>

//                       <SelectContent>
//                         <SelectItem value="Disabled">
//                           Disabled
//                         </SelectItem>

//                         <SelectItem value="Errors Only">
//                           Errors Only
//                         </SelectItem>

//                         <SelectItem value="Verbose">
//                           Verbose
//                         </SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>

//                   <ToggleRow
//                     label="Copy Item Descr. to Entries"
//                     description="Copy item descriptions to entries."
//                     checked={
//                       form.copy_item_descr_to_entries
//                     }
//                     onCheckedChange={(
//                       v
//                     ) =>
//                       set({
//                         copy_item_descr_to_entries:
//                           v,
//                       })
//                     }
//                   />

//                   <div>
//                     <Label className="text-sm mb-1.5 block">
//                       Default Costing
//                       Method
//                     </Label>

//                     <Select
//                       value={
//                         form.default_costing_method ??
//                         "FIFO"
//                       }
//                       onValueChange={(
//                         v
//                       ) =>
//                         set({
//                           default_costing_method:
//                             v,
//                         })
//                       }
//                     >
//                       <SelectTrigger>
//                         <SelectValue />
//                       </SelectTrigger>

//                       <SelectContent>
//                         <SelectItem value="FIFO">
//                           FIFO
//                         </SelectItem>

//                         <SelectItem value="LIFO">
//                           LIFO
//                         </SelectItem>

//                         <SelectItem value="Average">
//                           Average
//                         </SelectItem>

//                         <SelectItem value="Standard">
//                           Standard
//                         </SelectItem>

//                         <SelectItem value="Specific">
//                           Specific
//                         </SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>

//                   <ToggleRow
//                     label="Allow Inventory Adjustment"
//                     description="Allow inventory adjustments."
//                     checked={
//                       form.allow_inventory_adjustment
//                     }
//                     onCheckedChange={(
//                       v
//                     ) =>
//                       set({
//                         allow_inventory_adjustment:
//                           v,
//                       })
//                     }
//                   />

//                   <ToggleRow
//                     label="Prevent Negative Inventory"
//                     description="Prevent negative stock."
//                     checked={
//                       form.prevent_negative_inventory
//                     }
//                     onCheckedChange={(
//                       v
//                     ) =>
//                       set({
//                         prevent_negative_inventory:
//                           v,
//                       })
//                     }
//                   />
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* ───────────────────────────────────────────── */}
//           {/* Location */}
//           {/* ───────────────────────────────────────────── */}

//           <TabsContent
//             value="location"
//             className="mt-4"
//           >
//             <Card>
//               <CardHeader>
//                 <CardTitle>
//                   Location
//                 </CardTitle>

//                 <CardDescription>
//                   Configure location
//                   behaviour.
//                 </CardDescription>
//               </CardHeader>

//               <CardContent>
//                 <ToggleRow
//                   label="Location Mandatory"
//                   description="Require location code on inventory transactions."
//                   checked={
//                     form.location_mandatory
//                   }
//                   onCheckedChange={(
//                     v
//                   ) =>
//                     set({
//                       location_mandatory:
//                         v,
//                     })
//                   }
//                 />
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* ───────────────────────────────────────────── */}
//           {/* Planning */}
//           {/* ───────────────────────────────────────────── */}

//           <TabsContent
//             value="planning"
//             className="mt-4"
//           >
//             <Card>
//               <CardHeader>
//                 <CardTitle>
//                   Planning
//                 </CardTitle>

//                 <CardDescription>
//                   Configure forecasting
//                   and planning setup.
//                 </CardDescription>
//               </CardHeader>

//               <CardContent>
//                 <div className="grid grid-cols-2 gap-x-10 gap-y-5">
//                   <div>
//                     <Label className="text-sm mb-1.5 block">
//                       Current Demand
//                       Forecast
//                     </Label>

//                     <Input
//                       value={
//                         form.current_demand_forecast ??
//                         ""
//                       }
//                       onChange={(
//                         e
//                       ) =>
//                         set({
//                           current_demand_forecast:
//                             e
//                               .target
//                               .value ||
//                             null,
//                         })
//                       }
//                     />
//                   </div>

//                   <div>
//                     <Label className="text-sm mb-1.5 block">
//                       Blank Overflow
//                       Level
//                     </Label>

//                     <Select
//                       value={
//                         form.blank_overflow_level ??
//                         "Allow Default Calculation"
//                       }
//                       onValueChange={(
//                         v
//                       ) =>
//                         set({
//                           blank_overflow_level:
//                             v,
//                         })
//                       }
//                     >
//                       <SelectTrigger>
//                         <SelectValue />
//                       </SelectTrigger>

//                       <SelectContent>
//                         <SelectItem value="Allow Default Calculation">
//                           Allow
//                           Default
//                           Calculation
//                         </SelectItem>

//                         <SelectItem value="No Overflow">
//                           No
//                           Overflow
//                         </SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>

//                   <ToggleRow
//                     label="Use Forecast on Locations"
//                     description="Apply forecast on locations."
//                     checked={
//                       form.use_forecast_on_locations
//                     }
//                     onCheckedChange={(
//                       v
//                     ) =>
//                       set({
//                         use_forecast_on_locations:
//                           v,
//                       })
//                     }
//                   />

//                   <ToggleRow
//                     label="Combined MPS/MRP Calculation"
//                     description="Enable combined MPS/MRP."
//                     checked={
//                       form.combined_mps_mrp_calculation
//                     }
//                     onCheckedChange={(
//                       v
//                     ) =>
//                       set({
//                         combined_mps_mrp_calculation:
//                           v,
//                       })
//                     }
//                   />

//                   <ToggleRow
//                     label="Use Forecast on Variants"
//                     description="Apply forecast on variants."
//                     checked={
//                       form.use_forecast_on_variants
//                     }
//                     onCheckedChange={(
//                       v
//                     ) =>
//                       set({
//                         use_forecast_on_variants:
//                           v,
//                       })
//                     }
//                   />

//                   <div>
//                     <Label className="text-sm mb-1.5 block">
//                       Default Dampener
//                       Period
//                     </Label>

//                     <Input
//                       value={
//                         form.default_dampener_period ??
//                         ""
//                       }
//                       onChange={(
//                         e
//                       ) =>
//                         set({
//                           default_dampener_period:
//                             e
//                               .target
//                               .value ||
//                             null,
//                         })
//                       }
//                     />
//                   </div>

//                   <div>
//                     <Label className="text-sm mb-1.5 block">
//                       Default Safety
//                       Lead Time
//                     </Label>

//                     <Input
//                       value={
//                         form.default_safety_lead_time ??
//                         ""
//                       }
//                       onChange={(
//                         e
//                       ) =>
//                         set({
//                           default_safety_lead_time:
//                             e
//                               .target
//                               .value ||
//                             null,
//                         })
//                       }
//                     />
//                   </div>

//                   <div>
//                     <Label className="text-sm mb-1.5 block">
//                       Default Dampener
//                       %
//                     </Label>

//                     <Input
//                       type="number"
//                       value={
//                         form.default_dampener_percent ??
//                         ""
//                       }
//                       onChange={(
//                         e
//                       ) =>
//                         set({
//                           default_dampener_percent:
//                             e
//                               .target
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
//         </Tabs>
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────
// // HELPERS
// // ─────────────────────────────────────────────────────────────

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
//           <SelectValue placeholder="— Not set —" />
//         </SelectTrigger>

//         <SelectContent>
//           <SelectItem value="__none__">
//             — Not set —
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
import { NumericInput } from "@/components/ui/NumericInput";
import { Switch } from "@/components/ui/switch";
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

type InventorySetup = {
  id?: string;

  // No. Series
  item_nos: string | null;
  location_nos: string | null;
  uom_nos: string | null;
  lot_nos: string | null;
  serial_nos: string | null;
  production_bom_nos: string | null;
  production_bom_version_nos: string | null;
  released_prod_order_nos: string | null;
  consumption_journal_nos: string | null;
  output_journal_nos: string | null;
  assembly_order_nos: string | null;
  posted_assembly_order_nos: string | null;
  item_journal_nos: string | null;
  reversal_entry_nos: string | null;

  // General
  location_mandatory: boolean;
  prevent_negative_inventory: boolean;
  variant_mandatory_if_exists: boolean;
  automatic_cost_posting: boolean;
  automatic_cost_adjustment: string | null;
  cost_adjustment_logging: string | null;
  default_costing_method: string | null;
  average_cost_period: string | null;
  average_cost_calc_type: string | null;
  skip_prompt_to_create_item: boolean;
  copy_item_descr_to_entries: boolean;
  allow_inventory_adjustment: boolean;

  // Planning
  current_demand_forecast: string | null;
  use_forecast_on_locations: boolean;
  use_forecast_on_variants: boolean;
  default_safety_lead_time: string | null;
  blank_overflow_level: string | null;
  combined_mps_mrp_calculation: boolean;
  default_dampener_period: string | null;
  default_dampener_percent: string | null;
};

const DEFAULT: InventorySetup = {
  item_nos: null,
  location_nos: null,
  uom_nos: null,
  lot_nos: null,
  serial_nos: null,
  production_bom_nos: null,
  production_bom_version_nos: null,
  released_prod_order_nos: null,
  consumption_journal_nos: null,
  output_journal_nos: null,
  assembly_order_nos: null,
  posted_assembly_order_nos: null,
  item_journal_nos: null,
  reversal_entry_nos: null,
  location_mandatory: false,
  prevent_negative_inventory: false,
  variant_mandatory_if_exists: false,
  automatic_cost_posting: false,
  automatic_cost_adjustment: "Always",
  cost_adjustment_logging: "Disabled",
  default_costing_method: "FIFO",
  average_cost_period: "Month",
  average_cost_calc_type: "Item",
  skip_prompt_to_create_item: false,
  copy_item_descr_to_entries: false,
  allow_inventory_adjustment: true,
  current_demand_forecast: null,
  use_forecast_on_locations: false,
  use_forecast_on_variants: false,
  default_safety_lead_time: null,
  blank_overflow_level: "Allow Default Calculation",
  combined_mps_mrp_calculation: false,
  default_dampener_period: null,
  default_dampener_percent: null,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function InventorySetupPage() {
  const [form, setForm] = useState<InventorySetup>(DEFAULT);
  const { noSeries, loading: noSeriesLoading } = useNoSeries();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [setupRes] = await Promise.all([
        fetch(`${API_BASE_URL}/setup/inventory`),
      ]);
      const [setupJson] = await Promise.all([setupRes.json()]);
      if (setupJson?.data) setForm({ ...DEFAULT, ...setupJson.data });
    } catch (err: any) {
      toast.error(err.message || "Failed to load Inventory Setup");
    } finally {
      setLoading(false);
    }
  };

  const set = (patch: Partial<InventorySetup>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/setup/inventory`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || "Save failed");
      if (result.data) setForm({ ...DEFAULT, ...result.data });
      toast.success("Inventory Setup saved");
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
        numberFields={5}
        secondarySections={2}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Inventory Setup"
        subtitle="Configure defaults, number series, costing, and planning for inventory management"
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
            <TabsTrigger value="costing">Costing</TabsTrigger>
            <TabsTrigger value="planning">Planning</TabsTrigger>
          </TabsList>

          {/* ── No. Series ── */}
          <TabsContent value="numbering" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>No. Series</CardTitle>
                <CardDescription>
                  Map which number series items, locations, units of measure, lots, and serials should use.
                  Series are defined and configured on the <strong>No. Series</strong> page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  <section>
                    <h3 className="text-sm font-semibold mb-4">Inventory No. Series</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                      <NSField label="Item Nos." value={form.item_nos} options={noSeries} onChange={(v) => set({ item_nos: v })} />
                      <NSField label="Location Nos." value={form.location_nos} options={noSeries} onChange={(v) => set({ location_nos: v })} />
                      <NSField label="Unit of Measure Nos." value={form.uom_nos} options={noSeries} onChange={(v) => set({ uom_nos: v })} />
                      <NSField label="Lot Nos." value={form.lot_nos} options={noSeries} onChange={(v) => set({ lot_nos: v })} />
                      <NSField label="Serial Nos." value={form.serial_nos} options={noSeries} onChange={(v) => set({ serial_nos: v })} />
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold mb-4">Manufacturing / Assembly No. Series</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                      <NSField label="Production BOM Nos." value={form.production_bom_nos} options={noSeries} onChange={(v) => set({ production_bom_nos: v })} />
                      <NSField label="Production BOM Version Nos." value={form.production_bom_version_nos} options={noSeries} onChange={(v) => set({ production_bom_version_nos: v })} />
                      <NSField label="Released Production Order Nos." value={form.released_prod_order_nos} options={noSeries} onChange={(v) => set({ released_prod_order_nos: v })} />
                      <NSField label="Consumption Journal Nos." value={form.consumption_journal_nos} options={noSeries} onChange={(v) => set({ consumption_journal_nos: v })} />
                      <NSField label="Output Journal Nos." value={form.output_journal_nos} options={noSeries} onChange={(v) => set({ output_journal_nos: v })} />
                      <NSField label="Assembly Order Nos." value={form.assembly_order_nos} options={noSeries} onChange={(v) => set({ assembly_order_nos: v })} />
                      <NSField label="Posted Assembly Order Nos." value={form.posted_assembly_order_nos} options={noSeries} onChange={(v) => set({ posted_assembly_order_nos: v })} />
                      <NSField label="Item Journal Nos." value={form.item_journal_nos} options={noSeries} onChange={(v) => set({ item_journal_nos: v })} />
                      <NSField label="Reversal Entry Nos." value={form.reversal_entry_nos} options={noSeries} onChange={(v) => set({ reversal_entry_nos: v })} />
                    </div>
                  </section>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── General ── */}
          <TabsContent value="general" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Behaviour</CardTitle>
                  <CardDescription>Core operational settings for inventory management.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ToggleRow label="Location Mandatory" description="Require a location code on all inventory transactions." checked={form.location_mandatory} onCheckedChange={(v) => set({ location_mandatory: v })} />
                  <ToggleRow label="Prevent Negative Inventory" description="Block posting that would result in negative stock." checked={form.prevent_negative_inventory} onCheckedChange={(v) => set({ prevent_negative_inventory: v })} />
                  <ToggleRow label="Variant Mandatory if Exists" description="Require a variant code when item has variants defined." checked={form.variant_mandatory_if_exists} onCheckedChange={(v) => set({ variant_mandatory_if_exists: v })} />
                  <ToggleRow label="Allow Inventory Adjustment" description="Allow inventory adjustment postings." checked={form.allow_inventory_adjustment} onCheckedChange={(v) => set({ allow_inventory_adjustment: v })} />
                  <ToggleRow label="Skip Prompt to Create Item" description="Skip item creation prompt on order lines." checked={form.skip_prompt_to_create_item} onCheckedChange={(v) => set({ skip_prompt_to_create_item: v })} />
                  <ToggleRow label="Copy Item Descr. to Entries" description="Copy item description to value/item ledger entries." checked={form.copy_item_descr_to_entries} onCheckedChange={(v) => set({ copy_item_descr_to_entries: v })} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cost Adjustment</CardTitle>
                  <CardDescription>Automatic cost posting and adjustment settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ToggleRow label="Automatic Cost Posting" description="Automatically post inventory cost adjustments to G/L." checked={form.automatic_cost_posting} onCheckedChange={(v) => set({ automatic_cost_posting: v })} />
                  <div>
                    <Label className="text-sm mb-1.5 block">Automatic Cost Adjustment</Label>
                    <p className="text-xs text-muted-foreground mb-2">When to run automatic cost adjustment after posting.</p>
                    <Select value={form.automatic_cost_adjustment ?? "Always"} onValueChange={(v) => set({ automatic_cost_adjustment: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Never">Never</SelectItem>
                        <SelectItem value="Day">Day</SelectItem>
                        <SelectItem value="Week">Week</SelectItem>
                        <SelectItem value="Month">Month</SelectItem>
                        <SelectItem value="Always">Always</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Cost Adjustment Logging</Label>
                    <p className="text-xs text-muted-foreground mb-2">Level of detail logged during cost adjustment runs.</p>
                    <Select value={form.cost_adjustment_logging ?? "Disabled"} onValueChange={(v) => set({ cost_adjustment_logging: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Disabled">Disabled</SelectItem>
                        <SelectItem value="Errors Only">Errors Only</SelectItem>
                        <SelectItem value="Verbose">Verbose</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Costing ── */}
          <TabsContent value="costing" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Costing</CardTitle>
                <CardDescription>Configure how inventory costs are calculated and averaged.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <div>
                    <Label className="text-sm mb-1.5 block">Default Costing Method</Label>
                    <p className="text-xs text-muted-foreground mb-2">Applied to new items unless overridden on the item card.</p>
                    <Select value={form.default_costing_method ?? "FIFO"} onValueChange={(v) => set({ default_costing_method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIFO">FIFO</SelectItem>
                        <SelectItem value="LIFO">LIFO</SelectItem>
                        <SelectItem value="Average">Average</SelectItem>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Specific">Specific</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Average Cost Period</Label>
                    <p className="text-xs text-muted-foreground mb-2">Period over which average cost is calculated.</p>
                    <Select value={form.average_cost_period ?? "Month"} onValueChange={(v) => set({ average_cost_period: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Day">Day</SelectItem>
                        <SelectItem value="Week">Week</SelectItem>
                        <SelectItem value="Month">Month</SelectItem>
                        <SelectItem value="Quarter">Quarter</SelectItem>
                        <SelectItem value="Year">Year</SelectItem>
                        <SelectItem value="Accounting Period">Accounting Period</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Average Cost Calculation Type</Label>
                    <p className="text-xs text-muted-foreground mb-2">Whether average cost is per item or per item + location + variant.</p>
                    <Select value={form.average_cost_calc_type ?? "Item"} onValueChange={(v) => set({ average_cost_calc_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Item">Item</SelectItem>
                        <SelectItem value="Item & Location & Variant">Item & Location & Variant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Planning ── */}
          <TabsContent value="planning" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Planning</CardTitle>
                <CardDescription>Forecasting, MRP/MPS, lead time, and dampener settings.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <div>
                    <Label className="text-sm mb-1.5 block">Current Demand Forecast</Label>
                    <p className="text-xs text-muted-foreground mb-2">Demand forecast name used in planning.</p>
                    <Input value={form.current_demand_forecast ?? ""} placeholder="e.g. MAIN-FORECAST" onChange={(e) => set({ current_demand_forecast: e.target.value || null })} />
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Default Safety Lead Time</Label>
                    <p className="text-xs text-muted-foreground mb-2">Safety lead time formula applied to new items (e.g. 1D).</p>
                    <Input value={form.default_safety_lead_time ?? ""} placeholder="e.g. 1D" onChange={(e) => set({ default_safety_lead_time: e.target.value || null })} />
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Blank Overflow Level</Label>
                    <Select value={form.blank_overflow_level ?? "Allow Default Calculation"} onValueChange={(v) => set({ blank_overflow_level: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Allow Default Calculation">Allow Default Calculation</SelectItem>
                        <SelectItem value="No Overflow">No Overflow</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Default Dampener Period</Label>
                    <p className="text-xs text-muted-foreground mb-2">Dampener period formula for planning worksheet (e.g. 2D).</p>
                    <Input value={form.default_dampener_period ?? ""} placeholder="e.g. 2D" onChange={(e) => set({ default_dampener_period: e.target.value || null })} />
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Default Dampener %</Label>
                    <p className="text-xs text-muted-foreground mb-2">Dampener percentage for planning.</p>
                    <NumericInput decimalScale={3} min={0} max={100} value={form.default_dampener_percent ?? ""} placeholder="e.g. 5.25" onChange={(value) => set({ default_dampener_percent: value || null })} />
                  </div>
                  <div className="col-span-2 space-y-4 pt-2">
                    <ToggleRow label="Use Forecast on Locations" description="Break demand forecast down by location." checked={form.use_forecast_on_locations} onCheckedChange={(v) => set({ use_forecast_on_locations: v })} />
                    <ToggleRow label="Use Forecast on Variants" description="Break demand forecast down by item variant." checked={form.use_forecast_on_variants} onCheckedChange={(v) => set({ use_forecast_on_variants: v })} />
                    <ToggleRow label="Combined MPS/MRP Calculation" description="Run master production schedule and MRP in a single pass." checked={form.combined_mps_mrp_calculation} onCheckedChange={(v) => set({ combined_mps_mrp_calculation: v })} />
                  </div>
                </div>
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

