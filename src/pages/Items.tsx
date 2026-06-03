import { useEffect, useState } from "react";

import { api } from "@/lib/api";

import { PageHeader } from "@/components/PageHeader";
import { MasterNoSeriesSelect } from "@/components/MasterNoSeriesSelect";
import { ListPageSkeleton } from "@/components/skeletons/ErpSkeletons";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/NumericInput";

import { Switch } from "@/components/ui/switch";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { toast } from "sonner";

import {
  ClipboardCheck,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { QualitySpecDialog } from "@/components/QualitySpecDialog";

import { UomSelect } from "@/components/UomSelect";
import { ItemCategorySelect } from "@/components/ItemCategorySelect";
import { FamilySelect, type FamilyOption } from "@/components/FamilySelect";
import { VendorSelect, type VendorOption } from "@/components/VendorSelect";

type Row = Record<string, any>;

type ProductionBomOption = {
  bom_no: string;
  description?: string | null;
  status?: string | null;
};

type AssemblyBomOption = {
  item_no: string;
  description?: string | null;
  assembly_bom?: boolean | null;
  assembly_bom_no?: string | null;
};

type Variant = {
  id: string;

  item_id: string;

  item_no: string;

  code: string;

  description: string | null;

  description_2: string | null;

  blocked: boolean;

  weight: number;

  unit_of_measure_code: string | null;
};

const empty: Row = {
  item_no: "",

  description: "",

  description_2: "",

  blocked: false,

  type: "Inventory",

  base_unit_of_measure: "",

  report_unit_of_measure: "",

  is_by_product: false,

  by_product_cost: 0,

  last_date_modified: null,

  gtin: "",

  item_category_code: "",

  family_no: "",

  sub_category_code: "",

  quality_to_be_done: false,

  automatic_ext_texts: false,

  common_item_no: "",

  purchasing_code: "",

  purchase_tolerance_pct: 0,

  sales_tolerance_pct: 0,

  brand_name: "",

  variant_mandatory_if_exists: "",

  shelf_no: "",

  created_from_catalog_item: false,

  search_description: "",

  inventory: 0,

  qty_on_purch_order: 0,

  qty_on_prod_order: 0,

  qty_on_component_lines: 0,

  qty_on_sales_order: 0,

  qty_on_service_order: 0,

  qty_on_project_order: 0,

  qty_on_assembly_order: 0,

  qty_on_asm_component: 0,

  stockout_warning: "",

  prevent_negative_inventory: "",

  net_weight: 0,

  gross_weight: 0,

  unit_volume: 0,

  over_receipt_code: "",

  costing_method: "FIFO",

  standard_cost: 0,

  unit_cost: 0,

  indirect_cost_pct: 0,

  last_direct_cost: 0,

  net_invoiced_qty: 0,

  cost_is_adjusted: false,

  cost_is_posted_to_gl: false,

  default_deferral_template: "",

  hsn_sac_code: "",

  exempted: false,

  subcontracting: false,

  sub_comp_location: "",

  unit_price: 0,

  profit_pct: 0,

  sales_unit_of_measure: "",

  subscription_option: "",

  sales_blocked: false,

  service_blocked: false,

  replenishment_system: "Purchase",

  lead_time_calculation: "",

  vendor_no: "",
  vendor_name: "",

  vendor_item_no: "",

  purch_unit_of_measure: "",

  purchasing_blocked: false,

  manufacturing_policy: "",

  production_bom_no: "",

  routing_no: "",

  rounding_precision: 1,

  flushing_method: "",

  scrap_pct: 0,

  lot_size: 0,

  allow_whse_overpick: false,

  production_blocked: "",

  assembly_policy: "",

  assembly_bom: "",

  assembly_bom_no: "",

  reordering_policy: "",

  order_tracking_policy: "None",

  stockkeeping_unit_exists: false,

  critical: false,

  safety_lead_time: "",

  safety_stock_quantity: 0,

  include_inventory: false,

  lot_accumulation_period: "",

  rescheduling_period: "",

  reorder_point: 0,

  reorder_quantity: 0,

  maximum_inventory: 0,

  minimum_order_quantity: 0,

  maximum_order_quantity: 0,

  order_multiple: 0,

  item_tracking_code: "",

  serial_nos: "",

  lot_nos: "",

  expiration_calculation: "",

  warehouse_class_code: "",

  put_away_template_code: "",

  put_away_unit_of_measure_code: "",

  phys_invt_counting_period_code: "",

  last_phys_invt_date: null,

  last_counting_period_update: null,

  next_counting_start_date: null,

  next_counting_end_date: null,
};

const NUMERIC = new Set([
  "by_product_cost",
  "purchase_tolerance_pct",
  "sales_tolerance_pct",
  "inventory",
  "qty_on_purch_order",
  "qty_on_prod_order",
  "qty_on_component_lines",
  "qty_on_sales_order",
  "qty_on_service_order",
  "qty_on_project_order",
  "qty_on_assembly_order",
  "qty_on_asm_component",
  "net_weight",
  "gross_weight",
  "unit_volume",
  "standard_cost",
  "unit_cost",
  "indirect_cost_pct",
  "last_direct_cost",
  "net_invoiced_qty",
  "unit_price",
  "profit_pct",
  "rounding_precision",
  "scrap_pct",
  "lot_size",
  "safety_stock_quantity",
  "reorder_point",
  "reorder_quantity",
  "maximum_inventory",
  "minimum_order_quantity",
  "maximum_order_quantity",
  "order_multiple",
]);

export default function Items() {

  const [rows, setRows] =
    useState<Row[]>([]);

  const [open, setOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<Row | null>(null);

  const [form, setForm] =
    useState<Row>({ ...empty });

  const [loading, setLoading] =
    useState(true);

  const [noSeriesLineId, setNoSeriesLineId] =
    useState("");

  const [qualityOpen, setQualityOpen] =
    useState(false);

  const [qualityItem, setQualityItem] =
    useState<Row | null>(null);

  const [variants, setVariants] =
    useState<Variant[]>([]);

  const [productionBoms, setProductionBoms] =
    useState<ProductionBomOption[]>([]);

  const [assemblyBoms, setAssemblyBoms] =
    useState<AssemblyBomOption[]>([]);

  const [newVariant, setNewVariant] =
    useState({
      code: "",
      description: "",
      description_2: "",
      blocked: false,
      weight: 0,
      unit_of_measure_code: "",
    });

  /**
   * LOAD ITEMS
   */
  const load = async () => {
    try {

      setLoading(true);

      const res =
        await api.get("/items");

      setRows(res.data ?? []);

    } catch (err: any) {

      toast.error(
        err?.response?.data?.error ||
        "Failed to load items"
      );

    } finally {

      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setAssemblyBoms(
      rows
        .filter((row) => Boolean(row.assembly_bom) || Boolean(row.assembly_bom_no))
        .map((row) => ({
          item_no: row.item_no,
          description: row.description,
          assembly_bom: row.assembly_bom,
          assembly_bom_no: row.assembly_bom_no,
        }))
    );
  }, [rows]);

  useEffect(() => {
    let cancelled = false;

    async function loadProductionBoms() {
      try {
        const res = await api.get("/production-boms");
        if (!cancelled) {
          setProductionBoms(Array.isArray(res.data) ? res.data : []);
        }
      } catch (err) {
        if (!cancelled) setProductionBoms([]);
      }
    }

    loadProductionBoms();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * LOAD VARIANTS
   */
  const loadVariants = async (
    itemId: string
  ) => {
    try {

      const res =
        await api.get(
          `/items/${itemId}/variants?include_blocked=true`
        );

      setVariants(
        res.data ?? []
      );

    } catch (err: any) {

      toast.error(
        err?.response?.data?.error ||
        "Failed to load variants"
      );
    }
  };

  /**
   * NEW ITEM
   */
  const startNew = async () => {

    setEditing(null);

    setForm({
      ...empty,
      item_no: "AUTO",
    });

    setNoSeriesLineId("");

    setVariants([]);

    setOpen(true);
  };

  /**
   * EDIT ITEM
   */
  const startEdit = (r: Row) => {

    setEditing(r);

    setForm({
      ...empty,
      ...r,
    });

    loadVariants(r.id);

    setOpen(true);
  };

  /**
   * SAVE ITEM
   */
  const save = async () => {
    try {

      const payload: Row = {
        ...form,
        no_series_line_id:
          noSeriesLineId || undefined,
      };

      NUMERIC.forEach((k) => {
        payload[k] =
          Number(payload[k] ?? 0);
      });

      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") {
          payload[k] = null;
        }
      });

      if (
        payload.replenishment_system === "Purchase" &&
        !payload.vendor_no
      ) {
        toast.warning("Vendor No. is recommended for purchased items.");
      }

      if (editing) {

        await api.put(
          `/items/${editing.id}`,
          payload
        );

        toast.success("Updated");

      } else {

        await api.post(
          "/items",
          payload
        );

        toast.success("Created");
      }

      setOpen(false);

      load();

    } catch (err: any) {

      toast.error(
        err?.response?.data?.error ||
        "Failed to save item"
      );
    }
  };

  /**
   * DELETE ITEM
   */
  const remove = async (
    id: string
  ) => {
    try {

      if (
        !confirm(
          "Delete this item?"
        )
      ) return;

      await api.delete(
        `/items/${id}`
      );

      toast.success("Deleted");

      load();

    } catch (err: any) {

      toast.error(
        err?.response?.data?.error ||
        "Failed to delete item"
      );
    }
  };

  /**
   * ADD VARIANT
   */
  const addVariant = async () => {

    try {

      if (
        !editing ||
        !newVariant.code
      ) {
        return toast.error(
          "Code is required"
        );
      }

      await api.post(
        "/items/variants",
        {
          item_id: editing.id,
          item_no: editing.item_no,
          ...newVariant,
        }
      );

      toast.success(
        "Variant added"
      );

      setNewVariant({
        code: "",
        description: "",
        description_2: "",
        blocked: false,
        weight: 0,
        unit_of_measure_code: "",
      });

      loadVariants(editing.id);

    } catch (err: any) {

      toast.error(
        err?.response?.data?.error ||
        "Failed to add variant"
      );
    }
  };

  /**
   * UPDATE VARIANT
   */
  const updateVariant = async (
    id: string,
    patch: Partial<Variant>
  ) => {

    try {

      await api.put(
        `/items/variants/${id}`,
        patch
      );

      if (editing) {
        loadVariants(editing.id);
      }

    } catch (err: any) {

      toast.error(
        err?.response?.data?.error ||
        "Failed to update variant"
      );
    }
  };

  /**
   * DELETE VARIANT
   */
  const removeVariant = async (
    id: string
  ) => {

    try {

      if (
        !confirm(
          "Delete this variant?"
        )
      ) return;

      await api.delete(
        `/items/variants/${id}`
      );

      toast.success(
        "Variant deleted"
      );

      if (editing) {
        loadVariants(editing.id);
      }

    } catch (err: any) {

      toast.error(
        err?.response?.data?.error ||
        "Failed to delete variant"
      );
    }
  };

  /**
   * QUALITY DIALOG
   */
  const openQuality = (
    r: Row
  ) => {

    setQualityItem(r);

    setQualityOpen(true);
  };

  const set = (
    k: string,
    v: any
  ) =>
    setForm((f) => ({
      ...f,
      [k]: v,
    }));

  const selectFamily = (family: FamilyOption | null) => {
    if (!family) {
      set("family_no", "");
      return;
    }

    setForm((current) => {
      const familyCategory = family.item_category_code || "";
      if (
        familyCategory &&
        current.item_category_code &&
        current.item_category_code !== familyCategory
      ) {
        toast.warning("Selected Family belongs to a different Item Category.");
      }

      return {
        ...current,
        family_no: family.family_no,
        item_category_code: familyCategory || current.item_category_code,
      };
    });
  };

  const selectVendor = (vendor: VendorOption | null) => {
    if (!vendor) {
      setForm((current) => ({
        ...current,
        vendor_no: "",
        vendor_name: "",
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      vendor_no: vendor.vendor_no || vendor.no || "",
      vendor_name: vendor.name || "",
    }));
  };

  if (loading) return <ListPageSkeleton columns={7} rows={7} />;

  return (
    <div>
      <PageHeader
        title="Items"
        subtitle="Item master list"
        actions={
          <Dialog
            open={open}
            onOpenChange={setOpen}
          >
            <DialogTrigger asChild>
              <Button onClick={startNew}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-6xl max-h-[88vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editing ? "Edit Item" : "New Item"}
                </DialogTitle>
                <DialogDescription>
                  Maintain item master details, classification, replenishment, and related setup.
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="item">
                <TabsList className="h-auto flex-wrap">
                  <TabsTrigger value="item">Item</TabsTrigger>
                  <TabsTrigger value="inventory">Inventory</TabsTrigger>
                  <TabsTrigger value="costs">Costs & Posting</TabsTrigger>
                  <TabsTrigger value="prices">Prices & Sales</TabsTrigger>
                  <TabsTrigger value="replenishment">Replenishment</TabsTrigger>
                  <TabsTrigger value="planning">Planning</TabsTrigger>
                  <TabsTrigger value="tracking">Item Tracking</TabsTrigger>
                  <TabsTrigger value="warehouse">Warehouse</TabsTrigger>
                  <TabsTrigger value="variants">Variants</TabsTrigger>
                </TabsList>

                <TabsContent value="item" className="grid grid-cols-3 gap-x-3 gap-y-4 pt-4">
                  <F label="No." value={form.item_no} onChange={(v) => set("item_no", v)} />
                  {!editing && (
                    <MasterNoSeriesSelect
                      value={noSeriesLineId}
                      codes={["ITEM"]}
                      keywords={["ITEM"]}
                      onChange={setNoSeriesLineId}
                    />
                  )}
                  <F label="Description" value={form.description} onChange={(v) => set("description", v)} />
                  <F label="Description 2" value={form.description_2} onChange={(v) => set("description_2", v)} />
                  <Sw label="Blocked" checked={form.blocked} onChange={(v) => set("blocked", v)} />
                  <F label="Type" value={form.type} onChange={(v) => set("type", v)} />
                  <div>
                    <Label className="text-xs">Base Unit of Measure</Label>
                    <UomSelect value={form.base_unit_of_measure} onChange={(v) => set("base_unit_of_measure", v)} />
                  </div>
                  <div>
                    <Label className="text-xs">Report Unit of Measure</Label>
                    <UomSelect value={form.report_unit_of_measure} onChange={(v) => set("report_unit_of_measure", v)} />
                  </div>
                  <Sw label="Is-By Product" checked={form.is_by_product} onChange={(v) => set("is_by_product", v)} />
                  <F label="By-Product Cost" type="number" value={form.by_product_cost} onChange={(v) => set("by_product_cost", Number(v))} />
                  <F label="Last Date Modified" type="date" value={form.last_date_modified} onChange={(v) => set("last_date_modified", v)} />
                  <F label="GTIN" value={form.gtin} onChange={(v) => set("gtin", v)} />
                  <div>
                    <Label className="text-xs">Item Category Code</Label>
                    <ItemCategorySelect
                      value={form.item_category_code}
                      onChange={(value) => {
                        setForm((current) => ({
                          ...current,
                          item_category_code: value,
                          family_no: current.item_category_code === value ? current.family_no : "",
                        }));
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Family No.</Label>
                    <FamilySelect
                      value={form.family_no}
                      itemCategoryCode={form.item_category_code}
                      onChange={(value) => set("family_no", value)}
                      onSelectFamily={selectFamily}
                    />
                  </div>
                  <F label="Sub Category Code" value={form.sub_category_code} onChange={(v) => set("sub_category_code", v)} />
                  <Sw label="Quality To Be Done" checked={form.quality_to_be_done} onChange={(v) => set("quality_to_be_done", v)} />
                  <Sw label="Automatic Ext. Texts" checked={form.automatic_ext_texts} onChange={(v) => set("automatic_ext_texts", v)} />
                  <F label="Common Item No." value={form.common_item_no} onChange={(v) => set("common_item_no", v)} />
                  <F label="Purchasing Code" value={form.purchasing_code} onChange={(v) => set("purchasing_code", v)} />
                  <F label="Purchase Tolerance %" type="number" value={form.purchase_tolerance_pct} onChange={(v) => set("purchase_tolerance_pct", Number(v))} />
                  <F label="Sales Tolerance %" type="number" value={form.sales_tolerance_pct} onChange={(v) => set("sales_tolerance_pct", Number(v))} />
                  <F label="Brand Name" value={form.brand_name} onChange={(v) => set("brand_name", v)} />
                  <F label="Variant Mandatory if Exists" value={form.variant_mandatory_if_exists} onChange={(v) => set("variant_mandatory_if_exists", v)} />
                </TabsContent>

                <TabsContent value="inventory" className="grid grid-cols-3 gap-x-3 gap-y-4 pt-4">
                  <F label="Shelf No." value={form.shelf_no} onChange={(v) => set("shelf_no", v)} />
                  <Sw label="Created From Catalog Item" checked={form.created_from_catalog_item} onChange={(v) => set("created_from_catalog_item", v)} />
                  <F label="Search Description" value={form.search_description} onChange={(v) => set("search_description", v)} />
                  <F label="Inventory" type="number" value={form.inventory} onChange={(v) => set("inventory", Number(v))} />
                  <F label="Qty. on Purch. Order" type="number" value={form.qty_on_purch_order} onChange={(v) => set("qty_on_purch_order", Number(v))} />
                  <F label="Qty. on Prod. Order" type="number" value={form.qty_on_prod_order} onChange={(v) => set("qty_on_prod_order", Number(v))} />
                  <F label="Qty. on Component Lines" type="number" value={form.qty_on_component_lines} onChange={(v) => set("qty_on_component_lines", Number(v))} />
                  <F label="Qty. on Sales Order" type="number" value={form.qty_on_sales_order} onChange={(v) => set("qty_on_sales_order", Number(v))} />
                  <F label="Qty. on Service Order" type="number" value={form.qty_on_service_order} onChange={(v) => set("qty_on_service_order", Number(v))} />
                  <F label="Qty. on Project Order" type="number" value={form.qty_on_project_order} onChange={(v) => set("qty_on_project_order", Number(v))} />
                  <F label="Qty. on Assembly Order" type="number" value={form.qty_on_assembly_order} onChange={(v) => set("qty_on_assembly_order", Number(v))} />
                  <F label="Qty. on Asm. Component" type="number" value={form.qty_on_asm_component} onChange={(v) => set("qty_on_asm_component", Number(v))} />
                  <F label="Stockout Warning" value={form.stockout_warning} onChange={(v) => set("stockout_warning", v)} />
                  <F label="Prevent Negative Inventory" value={form.prevent_negative_inventory} onChange={(v) => set("prevent_negative_inventory", v)} />
                  <F label="Net Weight" type="number" value={form.net_weight} onChange={(v) => set("net_weight", Number(v))} />
                  <F label="Gross Weight" type="number" value={form.gross_weight} onChange={(v) => set("gross_weight", Number(v))} />
                  <F label="Unit Volume" type="number" value={form.unit_volume} onChange={(v) => set("unit_volume", Number(v))} />
                  <F label="Over-Receipt Code" value={form.over_receipt_code} onChange={(v) => set("over_receipt_code", v)} />
                </TabsContent>

                <TabsContent value="costs" className="grid grid-cols-3 gap-x-3 gap-y-4 pt-4">
                  <F label="Costing Method" value={form.costing_method} onChange={(v) => set("costing_method", v)} />
                  <F label="Standard Cost" type="number" value={form.standard_cost} onChange={(v) => set("standard_cost", Number(v))} />
                  <F label="Unit Cost" type="number" value={form.unit_cost} onChange={(v) => set("unit_cost", Number(v))} />
                  <F label="Indirect Cost %" type="number" value={form.indirect_cost_pct} onChange={(v) => set("indirect_cost_pct", Number(v))} />
                  <F label="Last Direct Cost" type="number" value={form.last_direct_cost} onChange={(v) => set("last_direct_cost", Number(v))} />
                  <F label="Net Invoiced Qty." type="number" value={form.net_invoiced_qty} onChange={(v) => set("net_invoiced_qty", Number(v))} />
                  <Sw label="Cost is Adjusted" checked={form.cost_is_adjusted} onChange={(v) => set("cost_is_adjusted", v)} />
                  <Sw label="Cost is Posted to G/L" checked={form.cost_is_posted_to_gl} onChange={(v) => set("cost_is_posted_to_gl", v)} />
                  <F label="Default Deferral Template" value={form.default_deferral_template} onChange={(v) => set("default_deferral_template", v)} />
                  <F label="HSN/SAC Code" value={form.hsn_sac_code} onChange={(v) => set("hsn_sac_code", v)} />
                  <Sw label="Exempted" checked={form.exempted} onChange={(v) => set("exempted", v)} />
                  <Sw label="Subcontracting" checked={form.subcontracting} onChange={(v) => set("subcontracting", v)} />
                  <F label="Sub. Comp. Location" value={form.sub_comp_location} onChange={(v) => set("sub_comp_location", v)} />
                </TabsContent>

                <TabsContent value="prices" className="grid grid-cols-3 gap-x-3 gap-y-4 pt-4">
                  <F label="Unit Price" type="number" value={form.unit_price} onChange={(v) => set("unit_price", Number(v))} />
                  <F label="Profit %" type="number" value={form.profit_pct} onChange={(v) => set("profit_pct", Number(v))} />
                  <div>
                    <Label className="text-xs">Sales Unit of Measure</Label>
                    <UomSelect value={form.sales_unit_of_measure} onChange={(v) => set("sales_unit_of_measure", v)} />
                  </div>
                  <F label="Subscription Option" value={form.subscription_option} onChange={(v) => set("subscription_option", v)} />
                  <Sw label="Sales Blocked" checked={form.sales_blocked} onChange={(v) => set("sales_blocked", v)} />
                  <Sw label="Service Blocked" checked={form.service_blocked} onChange={(v) => set("service_blocked", v)} />
                </TabsContent>

                <TabsContent value="replenishment" className="grid grid-cols-3 gap-x-3 gap-y-4 pt-4">
                  <F label="Replenishment System" value={form.replenishment_system} onChange={(v) => set("replenishment_system", v)} />
                  <F label="Lead Time Calculation" value={form.lead_time_calculation} onChange={(v) => set("lead_time_calculation", v)} />
                  <div>
                    <Label className="text-xs">Vendor No.</Label>
                    <VendorSelect
                      value={form.vendor_no}
                      onChange={(value) => set("vendor_no", value)}
                      onSelectVendor={selectVendor}
                    />
                  </div>
                  <F label="Vendor Item No." value={form.vendor_item_no} onChange={(v) => set("vendor_item_no", v)} />
                  <div>
                    <Label className="text-xs">Purch. Unit of Measure</Label>
                    <UomSelect value={form.purch_unit_of_measure} onChange={(v) => set("purch_unit_of_measure", v)} />
                  </div>
                  <Sw label="Purchasing Blocked" checked={form.purchasing_blocked} onChange={(v) => set("purchasing_blocked", v)} />
                  <F label="Manufacturing Policy" value={form.manufacturing_policy} onChange={(v) => set("manufacturing_policy", v)} />
                  <F label="Routing No." value={form.routing_no} onChange={(v) => set("routing_no", v)} />
                  <ProductionBomSelect
                    value={form.production_bom_no}
                    options={productionBoms}
                    onChange={(value) => set("production_bom_no", value)}
                  />
                  <F label="Rounding Precision" type="number" value={form.rounding_precision} onChange={(v) => set("rounding_precision", Number(v))} />
                  <F label="Flushing Method" value={form.flushing_method} onChange={(v) => set("flushing_method", v)} />
                  <F label="Scrap %" type="number" value={form.scrap_pct} onChange={(v) => set("scrap_pct", Number(v))} />
                  <F label="Lot Size" type="number" value={form.lot_size} onChange={(v) => set("lot_size", Number(v))} />
                  <Sw label="Allow Whse. Overpick" checked={form.allow_whse_overpick} onChange={(v) => set("allow_whse_overpick", v)} />
                  <F label="Production Blocked" value={form.production_blocked} onChange={(v) => set("production_blocked", v)} />
                  <F label="Assembly Policy" value={form.assembly_policy} onChange={(v) => set("assembly_policy", v)} />
                  <AssemblyBomSelect
                    value={form.assembly_bom_no}
                    options={assemblyBoms}
                    onChange={(value) => {
                      set("assembly_bom_no", value);
                      set("assembly_bom", Boolean(value));
                    }}
                  />
                </TabsContent>

                <TabsContent value="planning" className="grid grid-cols-3 gap-x-3 gap-y-4 pt-4">
                  <F label="Reordering Policy" value={form.reordering_policy} onChange={(v) => set("reordering_policy", v)} />
                  <F label="Order Tracking Policy" value={form.order_tracking_policy} onChange={(v) => set("order_tracking_policy", v)} />
                  <Sw label="Stockkeeping Unit Exists" checked={form.stockkeeping_unit_exists} onChange={(v) => set("stockkeeping_unit_exists", v)} />
                  <Sw label="Critical" checked={form.critical} onChange={(v) => set("critical", v)} />
                  <F label="Safety Lead Time" value={form.safety_lead_time} onChange={(v) => set("safety_lead_time", v)} />
                  <F label="Safety Stock Quantity" type="number" value={form.safety_stock_quantity} onChange={(v) => set("safety_stock_quantity", Number(v))} />
                  <Sw label="Include Inventory" checked={form.include_inventory} onChange={(v) => set("include_inventory", v)} />
                  <F label="Lot Accumulation Period" value={form.lot_accumulation_period} onChange={(v) => set("lot_accumulation_period", v)} />
                  <F label="Rescheduling Period" value={form.rescheduling_period} onChange={(v) => set("rescheduling_period", v)} />
                  <F label="Reorder Point" type="number" value={form.reorder_point} onChange={(v) => set("reorder_point", Number(v))} />
                  <F label="Reorder Quantity" type="number" value={form.reorder_quantity} onChange={(v) => set("reorder_quantity", Number(v))} />
                  <F label="Maximum Inventory" type="number" value={form.maximum_inventory} onChange={(v) => set("maximum_inventory", Number(v))} />
                  <F label="Minimum Order Quantity" type="number" value={form.minimum_order_quantity} onChange={(v) => set("minimum_order_quantity", Number(v))} />
                  <F label="Maximum Order Quantity" type="number" value={form.maximum_order_quantity} onChange={(v) => set("maximum_order_quantity", Number(v))} />
                  <F label="Order Multiple" type="number" value={form.order_multiple} onChange={(v) => set("order_multiple", Number(v))} />
                </TabsContent>

                <TabsContent value="tracking" className="grid grid-cols-3 gap-x-3 gap-y-4 pt-4">
                  <F label="Item Tracking Code" value={form.item_tracking_code} onChange={(v) => set("item_tracking_code", v)} />
                  <F label="Serial Nos." value={form.serial_nos} onChange={(v) => set("serial_nos", v)} />
                  <F label="Lot Nos." value={form.lot_nos} onChange={(v) => set("lot_nos", v)} />
                  <F label="Expiration Calculation" value={form.expiration_calculation} onChange={(v) => set("expiration_calculation", v)} />
                </TabsContent>

                <TabsContent value="warehouse" className="grid grid-cols-3 gap-x-3 gap-y-4 pt-4">
                  <F label="Warehouse Class Code" value={form.warehouse_class_code} onChange={(v) => set("warehouse_class_code", v)} />
                  <F label="Put-away Template Code" value={form.put_away_template_code} onChange={(v) => set("put_away_template_code", v)} />
                  <div>
                    <Label className="text-xs">Put-away Unit of Measure Code</Label>
                    <UomSelect value={form.put_away_unit_of_measure_code} onChange={(v) => set("put_away_unit_of_measure_code", v)} />
                  </div>
                  <F label="Phys. Invt. Counting Period Code" value={form.phys_invt_counting_period_code} onChange={(v) => set("phys_invt_counting_period_code", v)} />
                  <F label="Last Phys. Invt. Date" type="date" value={form.last_phys_invt_date} onChange={(v) => set("last_phys_invt_date", v)} />
                  <F label="Last Counting Period Update" type="date" value={form.last_counting_period_update} onChange={(v) => set("last_counting_period_update", v)} />
                  <F label="Next Counting Start Date" type="date" value={form.next_counting_start_date} onChange={(v) => set("next_counting_start_date", v)} />
                  <F label="Next Counting End Date" type="date" value={form.next_counting_end_date} onChange={(v) => set("next_counting_end_date", v)} />
                </TabsContent>

                <TabsContent value="variants" className="pt-3">
                  {!editing ? (
                    <div className="rounded border p-4 text-sm text-muted-foreground">
                      Save the item before adding variants.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-[1fr_2fr_2fr_1fr_1fr_auto] gap-2 items-end">
                        <F label="Code" value={newVariant.code} onChange={(v) => setNewVariant((current) => ({ ...current, code: v }))} />
                        <F label="Description" value={newVariant.description} onChange={(v) => setNewVariant((current) => ({ ...current, description: v }))} />
                        <F label="Description 2" value={newVariant.description_2} onChange={(v) => setNewVariant((current) => ({ ...current, description_2: v }))} />
                        <F label="Weight" type="number" value={newVariant.weight} onChange={(v) => setNewVariant((current) => ({ ...current, weight: Number(v) }))} />
                        <div>
                          <Label className="text-xs">UOM</Label>
                          <UomSelect value={newVariant.unit_of_measure_code} onChange={(v) => setNewVariant((current) => ({ ...current, unit_of_measure_code: v }))} />
                        </div>
                        <Button onClick={addVariant}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>

                      <div className="rounded border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Code</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Description 2</TableHead>
                              <TableHead>Weight</TableHead>
                              <TableHead>UOM</TableHead>
                              <TableHead className="w-24" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {variants.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                  No variants yet.
                                </TableCell>
                              </TableRow>
                            ) : (
                              variants.map((variant) => (
                                <TableRow key={variant.id}>
                                  <TableCell>{variant.code}</TableCell>
                                  <TableCell>{variant.description}</TableCell>
                                  <TableCell>{variant.description_2}</TableCell>
                                  <TableCell>{Number(variant.weight ?? 0).toFixed(2)}</TableCell>
                                  <TableCell>{variant.unit_of_measure_code}</TableCell>
                                  <TableCell className="text-right">
                                    <Button size="icon" variant="ghost" onClick={() => updateVariant(variant.id, { ...variant, blocked: !variant.blocked })}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => removeVariant(variant.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={save}>
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6">
        <div className="rounded border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Base UOM</TableHead>
                <TableHead className="text-right">Inventory</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No items yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-primary">{r.item_no}</TableCell>
                    <TableCell>{r.description}</TableCell>
                    <TableCell>{r.base_unit_of_measure}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.inventory ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.unit_cost ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.unit_price ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => openQuality(r)}>
                        <ClipboardCheck className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <QualitySpecDialog
        open={qualityOpen}
        onOpenChange={
          setQualityOpen
        }
        itemId={
          qualityItem?.id ??
          null
        }
        itemNo={
          qualityItem?.item_no
        }
        itemDescription={
          qualityItem?.description
        }
      />
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
  onChange: (v: string) => void;
  type?: string;
}) {
  const isPercentField =
    label.includes("%") ||
    label.toLowerCase().includes("percent") ||
    label.toLowerCase().includes("percentage");

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {isPercentField ? (
        <NumericInput
          value={value ?? ""}
          decimalScale={3}
          min={0}
          max={100}
          onChange={onChange}
        />
      ) : (
        <Input
          type={type}
          value={value ?? ""}
          onChange={(event) =>
            onChange(event.target.value)
          }
        />
      )}
    </div>
  );
}

function ProductionBomSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: ProductionBomOption[];
  onChange: (value: string) => void;
}) {
  const visibleOptions = options.filter(
    (bom) =>
      bom.status === "Certified" ||
      (value && bom.bom_no === value)
  );

  return (
    <div>
      <Label className="text-xs">Production BOM No.</Label>
      <Select
        value={value || "__none__"}
        onValueChange={(nextValue) =>
          onChange(nextValue === "__none__" ? "" : nextValue)
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Select certified Production BOM..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Select certified Production BOM...</SelectItem>
          {visibleOptions.map((bom) => (
            <SelectItem key={bom.bom_no} value={bom.bom_no}>
              {bom.bom_no}
              {bom.description ? ` - ${bom.description}` : ""}
              {bom.status && bom.status !== "Certified" ? ` (${bom.status})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function AssemblyBomSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: AssemblyBomOption[];
  onChange: (value: string) => void;
}) {
  const visibleOptions = options.filter(
    (bom) =>
      bom.item_no &&
      (bom.assembly_bom || bom.assembly_bom_no || bom.item_no === value)
  );

  return (
    <div>
      <Label className="text-xs">Assembly BOM</Label>
      <Select
        value={value || "__none__"}
        onValueChange={(nextValue) =>
          onChange(nextValue === "__none__" ? "" : nextValue)
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Select Assembly BOM..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Select Assembly BOM...</SelectItem>
          {visibleOptions.map((bom) => (
            <SelectItem key={bom.item_no} value={bom.item_no}>
              {bom.item_no}
              {bom.description ? ` - ${bom.description}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Sw({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded border px-3 py-2">
      <Label className="text-xs">{label}</Label>
      <Switch checked={!!checked} onCheckedChange={onChange} />
    </div>
  );
}
