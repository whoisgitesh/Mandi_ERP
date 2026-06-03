import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Check, CheckCircle, ChevronsUpDown, Factory, Plus, RefreshCw, Save } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDateDisplay, toDateInput, todayDateInput } from "@/lib/date";

type ComponentLine = {
  id: number;
  line_no: number;
  item_no: string;
  due_date?: string | null;
  variant_code?: string | null;
  description?: string | null;
  location_code?: string | null;
  unit_of_measure_code?: string | null;
  starting_datetime?: string | null;
  ending_datetime?: string | null;
  quantity?: number;
  quantity_per: number;
  expected_quantity: number;
  consumed_quantity: number;
  finished_quantity?: number;
  remaining_quantity: number;
  scrap_pct: number;
  unit_cost?: number;
  cost_amount?: number;
  subcontracting_order_no?: string | null;
  subcontractor_code?: string | null;
};

type Order = {
  id: number;
  document_no: string;
  source_type: string;
  source_no: string;
  description?: string | null;
  description_2?: string | null;
  refresh_no?: string | null;
  total_cost_rm?: number;
  search_description?: string | null;
  status: string;
  quantity: number;
  finished_quantity: number;
  remaining_quantity: number;
  location_code: string;
  unit_of_measure_code?: string | null;
  posting_date?: string | null;
  starting_date?: string | null;
  ending_date?: string | null;
  due_date?: string | null;
  production_bom_no?: string | null;
  referred_production_order_no?: string | null;
  assigned_user_id?: string | null;
  blocked?: boolean;
  last_date_modified?: string | null;
  starting_datetime?: string | null;
  ending_datetime?: string | null;
  inventory_posting_group?: string | null;
  gen_prod_posting_group?: string | null;
  gen_bus_posting_group?: string | null;
  department_code?: string | null;
  customer_group_code?: string | null;
  bin_code?: string | null;
  needs_refresh?: boolean | null;
  components?: ComponentLine[];
};

type LookupRow = {
  code?: string;
  item_no?: string;
  description?: string | null;
  base_unit_of_measure?: string | null;
  production_bom_no?: string | null;
  unit_price?: number | string | null;
};

type Lookups = {
  items: LookupRow[];
  locations: LookupRow[];
  inventory_posting_groups: LookupRow[];
  gen_product_posting_groups: LookupRow[];
  gen_business_posting_groups: LookupRow[];
  departments: LookupRow[];
  customer_groups: LookupRow[];
  bins: LookupRow[];
};

const amount = (value: any, digits = 2) => Number(value ?? 0).toFixed(digits);
const readOnlyStatuses = new Set(["Finished", "Completed", "Closed"]);
const dtInput = (value: any) => (value ? String(value).slice(0, 16) : "");

export function ReleasedProductionOrderList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Order[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/released-production-orders");
      setRows(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load Released Production Orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createOrder = async () => {
    try {
      const { data } = await api.post("/released-production-orders", {
        draft: true,
        source_no: "",
        quantity: 0,
        location_code: "",
        posting_date: todayDateInput(),
      });
      navigate(`/released-production-orders/${encodeURIComponent(data.document_no)}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to create Released Production Order");
    }
  };

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.document_no, row.source_no, row.description, row.location_code, row.status, row.production_bom_no].some((value) =>
        String(value ?? "").toLowerCase().includes(term)
      )
    );
  }, [filter, rows]);

  return (
    <div>
      <PageHeader
        title="Released Production Orders"
        subtitle="Released manufacturing orders for certified BOM output"
        actions={<Button onClick={createOrder}><Plus className="h-4 w-4" /> New</Button>}
      />

      <div className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Input
            className="max-w-md"
            placeholder="Filter by order, item, status, location..."
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          <span className="text-xs text-muted-foreground">{filtered.length} orders</span>
        </div>

        <div className="overflow-x-auto rounded border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Source Type</TableHead>
                <TableHead>Source No.</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Finished Quantity</TableHead>
                <TableHead className="text-right">Remaining Quantity</TableHead>
                <TableHead>Location Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="py-8 text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="py-8 text-center text-muted-foreground">No Released Production Orders.</TableCell></TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.document_no}>
                    <TableCell>
                      <Link className="font-medium text-primary" to={`/released-production-orders/${encodeURIComponent(row.document_no)}`}>
                        {row.document_no}
                      </Link>
                    </TableCell>
                    <TableCell>{row.source_type}</TableCell>
                    <TableCell>{row.source_no}</TableCell>
                    <TableCell>{row.description || "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{amount(row.quantity)}</TableCell>
                    <TableCell className="text-right tabular-nums">{amount(row.finished_quantity)}</TableCell>
                    <TableCell className="text-right tabular-nums">{amount(row.remaining_quantity)}</TableCell>
                    <TableCell>{row.location_code}</TableCell>
                    <TableCell><Badge variant={row.status === "Finished" ? "default" : "outline"}>{row.status}</Badge></TableCell>
                    <TableCell>{row.due_date ? formatDateDisplay(row.due_date) : "-"}</TableCell>
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

export function ReleasedProductionOrderDetails() {
  const navigate = useNavigate();
  const { documentNo = "" } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [lookups, setLookups] = useState<Lookups>({
    items: [],
    locations: [],
    inventory_posting_groups: [],
    gen_product_posting_groups: [],
    gen_business_posting_groups: [],
    departments: [],
    customer_groups: [],
    bins: [],
  });
  const [outputDialogOpen, setOutputDialogOpen] = useState(false);
  const [outputQuantity, setOutputQuantity] = useState("");

  const readOnly = !order || readOnlyStatuses.has(order.status);
  const quantityIsValid = Number(order?.quantity ?? 0) > 0;
  const sourceIsValid = Boolean(String(order?.source_no ?? "").trim());
  const locationIsValid = Boolean(String(order?.location_code ?? "").trim());
  const refreshBlocked = !quantityIsValid || !sourceIsValid || !locationIsValid;

  const load = async () => {
    try {
      const { data } = await api.get(`/released-production-orders/${encodeURIComponent(documentNo)}`);
      setOrder(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load Released Production Order");
    }
  };

  useEffect(() => {
    load();
  }, [documentNo]);

  useEffect(() => {
    let cancelled = false;

    async function loadLookups() {
      try {
        const { data } = await api.get("/released-production-orders/lookups/options");
        if (!cancelled) {
          setLookups({
            items: data.items ?? [],
            locations: data.locations ?? [],
            inventory_posting_groups: data.inventory_posting_groups ?? [],
            gen_product_posting_groups: data.gen_product_posting_groups ?? [],
            gen_business_posting_groups: data.gen_business_posting_groups ?? [],
            departments: data.departments ?? [],
            customer_groups: data.customer_groups ?? [],
            bins: data.bins ?? [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          setLookups((current) => current);
        }
      }
    }

    loadLookups();
    return () => {
      cancelled = true;
    };
  }, []);

  const setField = (field: keyof Order, value: any) => {
    let shouldWarn = false;
    setOrder((current) => {
      if (!current) return current;
      const refreshSensitiveFields: Array<keyof Order> = [
        "quantity",
        "source_no",
        "production_bom_no",
        "location_code",
      ];
      const hasComponents = (current.components ?? []).length > 0;
      const changed = String(current[field] ?? "") !== String(value ?? "");
      const needsRefresh =
        Boolean(current.needs_refresh) ||
        (hasComponents && changed && refreshSensitiveFields.includes(field));

      shouldWarn = !current.needs_refresh && needsRefresh;

      return { ...current, [field]: value, needs_refresh: needsRefresh };
    });

    if (shouldWarn) {
      toast.warning(
        field === "quantity"
          ? "Quantity changed. Refresh Production Order again to update component lines."
          : "Production order values changed. Refresh Production Order again to update component lines."
      );
    }
  };

  const selectSourceItem = (itemNo: string) => {
    const item = lookups.items.find((row) => row.item_no === itemNo);
    let shouldWarn = false;
    setOrder((current) => {
      if (!current) return current;
      const hasComponents = (current.components ?? []).length > 0;
      const sourceChanged = String(current.source_no || "") !== String(itemNo || "");
      const bomChanged = String(current.production_bom_no || "") !== String(item?.production_bom_no || current.production_bom_no || "");
      const needsRefresh = Boolean(current.needs_refresh) || (hasComponents && (sourceChanged || bomChanged));
      shouldWarn = !current.needs_refresh && needsRefresh;

      return {
        ...current,
        source_no: itemNo,
        description: item?.description ?? current.description,
        search_description: item?.description ?? current.search_description,
        production_bom_no: item?.production_bom_no ?? current.production_bom_no,
        unit_of_measure_code: item?.base_unit_of_measure ?? current.unit_of_measure_code,
        needs_refresh: needsRefresh,
      };
    });

    if (shouldWarn) {
      toast.warning("Production order values changed. Refresh Production Order again to update component lines.");
    }
  };

  const buildOrderPayload = (row: Order) => ({
    ...row,
    posting_date: toDateInput(row.posting_date || ""),
    starting_date: toDateInput(row.starting_date || ""),
    ending_date: toDateInput(row.ending_date || ""),
    due_date: toDateInput(row.due_date || ""),
  });

  const save = async () => {
    if (!order) return;
    try {
      const { data } = await api.put(`/released-production-orders/${encodeURIComponent(order.document_no)}`, buildOrderPayload(order));
      setOrder((current) => current ? { ...current, ...data } : data);
      toast.success("Released Production Order saved");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save Released Production Order");
    }
  };

  const refresh = async () => {
    if (!order) return;
    if (Number(order.quantity ?? 0) <= 0) {
      toast.error("Enter Quantity before refreshing Production Order.");
      return;
    }
    if (!String(order.source_no || "").trim()) {
      toast.error("Select Source No. before refreshing Production Order.");
      return;
    }
    if (!String(order.location_code || "").trim()) {
      toast.error("Select Location Code before refreshing Production Order.");
      return;
    }

    try {
      const saved = await api.put(`/released-production-orders/${encodeURIComponent(order.document_no)}`, buildOrderPayload(order));
      const { data } = await api.post(`/released-production-orders/${encodeURIComponent(saved.data.document_no)}/refresh`);
      setOrder(data);
      toast.success("Production components refreshed");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to refresh components");
    }
  };

  const postConsumption = async () => {
    if (!order) return;
    try {
      const { data } = await api.post(`/released-production-orders/${encodeURIComponent(order.document_no)}/post-consumption`, {
        posting_date: toDateInput(order.posting_date || "") || todayDateInput(),
      });
      setOrder(data);
      toast.success("Consumption posted");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to post consumption");
    }
  };

  const openOutputDialog = () => {
    if (!order) return;
    setOutputQuantity(String(order.remaining_quantity ?? 0));
    setOutputDialogOpen(true);
  };

  const postOutput = async () => {
    if (!order) return;

    try {
      const { data } = await api.post(`/released-production-orders/${encodeURIComponent(order.document_no)}/post-output`, {
        quantity: Number(outputQuantity || 0),
        posting_date: toDateInput(order.posting_date || "") || todayDateInput(),
      });
      setOrder(data);
      toast.success("Output posted");
      setOutputDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to post output");
    }
  };

  const finish = async () => {
    if (!order) return;
    try {
      const { data } = await api.post(`/released-production-orders/${encodeURIComponent(order.document_no)}/finish`);
      setOrder((current) => current ? { ...current, ...data } : data);
      toast.success("Production order finished");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to finish Production Order");
    }
  };

  const changeStatus = async () => {
    if (!order) return;
    try {
      const { data } = await api.post(`/released-production-orders/${encodeURIComponent(order.document_no)}/change-status`, {
        status: order.status === "Released" ? "Finished" : "Released",
      });
      setOrder((current) => current ? { ...current, ...data } : data);
      toast.success("Production order status changed");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to change status");
    }
  };

  if (!order) {
    return (
      <div>
        <PageHeader title="Released Production Order" subtitle="Loading..." />
        <div className="p-6 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Released Production Order"
        subtitle={order.document_no}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate("/released-production-orders")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {!readOnly && <Button onClick={save}><Save className="h-4 w-4" /> Save</Button>}
            {!readOnly && <Button variant="outline" onClick={changeStatus}>Change Status</Button>}
            {!readOnly && (
              <Button
                variant="outline"
                onClick={refresh}
                aria-disabled={refreshBlocked}
                className={refreshBlocked ? "cursor-not-allowed opacity-60" : ""}
              >
                <RefreshCw className="h-4 w-4" /> Refresh Production Order
              </Button>
            )}
            {!readOnly && <Button variant="outline" onClick={postConsumption}><Factory className="h-4 w-4" /> Post Consumption</Button>}
            {!readOnly && <Button variant="outline" onClick={openOutputDialog}><Factory className="h-4 w-4" /> Post Output</Button>}
            {!readOnly && <Button variant="outline" onClick={finish}><CheckCircle className="h-4 w-4" /> Finish Order</Button>}
            <Button variant="outline" disabled>Print</Button>
          </div>
        }
      />

      <Dialog open={outputDialogOpen} onOpenChange={setOutputDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post Output</DialogTitle>
            <DialogDescription>
              Enter the finished goods output quantity for {order.document_no}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Output Quantity</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={outputQuantity}
              onChange={(event) => setOutputQuantity(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutputDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={postOutput}>
              Post Output
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              General
              <Badge variant={order.status === "Finished" ? "default" : "outline"}>{order.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-10 gap-y-4 lg:grid-cols-2">
            <div className="space-y-3">
              <Field label="No."><Input value={order.document_no} readOnly /></Field>
              <Field label="Description"><Input value={order.description || ""} readOnly={readOnly} onChange={(e) => setField("description", e.target.value)} /></Field>
              <Field label="Description 2"><Input value={order.description_2 || ""} readOnly={readOnly} onChange={(e) => setField("description_2", e.target.value)} /></Field>
              <Field label="Source Type">
                <Select value={order.source_type || "Item"} disabled={readOnly} onValueChange={(v) => setField("source_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Item">Item</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Source No.">
                <SourceItemLookup
                  value={order.source_no || ""}
                  items={lookups.items}
                  disabled={readOnly}
                  onSelect={(item) => selectSourceItem(item.item_no || "")}
                />
              </Field>
              <Field label="Refresh No."><Input value={order.refresh_no || ""} readOnly /></Field>
              <Field label="Total Cost RM"><Input className="text-right" value={amount(order.total_cost_rm)} readOnly /></Field>
            </div>

            <div className="space-y-3">
              <Field label="Search Description"><Input value={order.search_description || ""} readOnly={readOnly} onChange={(e) => setField("search_description", e.target.value)} /></Field>
              <Field label="Quantity">
                <div className="space-y-1">
                  <Input
                    className="text-right"
                    inputMode="decimal"
                    value={order.quantity ?? ""}
                    readOnly={readOnly}
                    aria-invalid={!quantityIsValid}
                    onChange={(e) => setField("quantity", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Quantity is required to calculate component lines.
                  </p>
                  {order.needs_refresh ? (
                    <p className="text-xs text-amber-600">
                      Quantity changed. Refresh Production Order again to update component lines.
                    </p>
                  ) : null}
                </div>
              </Field>
              <Field label="Due Date"><Input type="date" value={toDateInput(order.due_date || "")} readOnly={readOnly} onChange={(e) => setField("due_date", e.target.value)} /></Field>
              <Field label="Assigned User ID"><Input value={order.assigned_user_id || ""} readOnly={readOnly} onChange={(e) => setField("assigned_user_id", e.target.value)} /></Field>
              <div className="grid grid-cols-[180px_1fr] items-center gap-4">
                <Label>Blocked</Label>
                <Switch checked={Boolean(order.blocked)} disabled={readOnly} onCheckedChange={(v) => setField("blocked", v)} />
              </div>
              <Field label="Last Date Modified"><Input value={toDateInput(order.last_date_modified || "")} readOnly /></Field>
              <Field label="Production BOM No."><Input value={order.production_bom_no || ""} readOnly /></Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Component Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded border">
              <div className="min-w-[1780px]">
                <div className="grid grid-cols-[140px_120px_130px_240px_180px_180px_110px_130px_130px_130px_110px_120px_170px_150px] border-b bg-card text-sm font-medium text-muted-foreground">
                  {["Item No.", "Due Date", "Variant Code", "Description", "Starting Date-Time", "Ending Date-Time", "Quantity", "Unit of Measure Code", "Finished Quantity", "Remaining Quantity", "Unit Cost", "Cost Amount", "Subcontracting Order No.", "Subcontractor Code"].map((heading) => (
                    <div key={heading} className="flex min-h-12 items-center border-r px-2 last:border-r-0">
                      {heading}
                    </div>
                  ))}
                </div>
                {(order.components ?? []).length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No components. Use Refresh Production Order to pull certified BOM lines.
                  </div>
                ) : (
                  (order.components ?? []).map((line) => (
                    <div key={line.id} className="grid grid-cols-[140px_120px_130px_240px_180px_180px_110px_130px_130px_130px_110px_120px_170px_150px] border-b text-sm last:border-b-0">
                      <LineCell>{line.item_no}</LineCell>
                      <LineCell>{toDateInput(line.due_date || "") || "-"}</LineCell>
                      <LineCell>{line.variant_code || "-"}</LineCell>
                      <LineCell>{line.description || "-"}</LineCell>
                      <LineCell>{dtInput(line.starting_datetime) || "-"}</LineCell>
                      <LineCell>{dtInput(line.ending_datetime) || "-"}</LineCell>
                      <LineCell right>{amount(line.quantity ?? line.expected_quantity)}</LineCell>
                      <LineCell>{line.unit_of_measure_code || "-"}</LineCell>
                      <LineCell right>{amount(line.finished_quantity ?? line.consumed_quantity)}</LineCell>
                      <LineCell right>{amount(line.remaining_quantity)}</LineCell>
                      <LineCell right>{amount(line.unit_cost)}</LineCell>
                      <LineCell right>{amount(line.cost_amount)}</LineCell>
                      <LineCell>{line.subcontracting_order_no || "-"}</LineCell>
                      <LineCell>{line.subcontractor_code || "-"}</LineCell>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Schedule</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Starting Date-Time"><Input type="datetime-local" value={dtInput(order.starting_datetime)} readOnly={readOnly} onChange={(e) => setField("starting_datetime", e.target.value)} /></Field>
            <Field label="Ending Date-Time"><Input type="datetime-local" value={dtInput(order.ending_datetime)} readOnly={readOnly} onChange={(e) => setField("ending_datetime", e.target.value)} /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Posting</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <LookupSelect label="Inventory Posting Group" value={order.inventory_posting_group || ""} disabled={readOnly} rows={lookups.inventory_posting_groups} onChange={(v) => setField("inventory_posting_group", v)} />
            <LookupSelect label="Customergroup Code" value={order.customer_group_code || ""} disabled={readOnly} rows={lookups.customer_groups} onChange={(v) => setField("customer_group_code", v)} />
            <LookupSelect label="Gen. Prod. Posting Group" value={order.gen_prod_posting_group || ""} disabled={readOnly} rows={lookups.gen_product_posting_groups} onChange={(v) => setField("gen_prod_posting_group", v)} />
            <LookupSelect label="Location Code" value={order.location_code || ""} disabled={readOnly} rows={lookups.locations} onChange={(v) => setField("location_code", v)} />
            <LookupSelect label="Gen. Bus. Posting Group" value={order.gen_bus_posting_group || ""} disabled={readOnly} rows={lookups.gen_business_posting_groups} onChange={(v) => setField("gen_bus_posting_group", v)} />
            <LookupSelect label="Bin Code" value={order.bin_code || ""} disabled={readOnly} rows={lookups.bins} onChange={(v) => setField("bin_code", v)} />
            <LookupSelect label="Department Code" value={order.department_code || ""} disabled={readOnly} rows={lookups.departments} onChange={(v) => setField("department_code", v)} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-center gap-4">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function LineCell({
  children,
  right = false,
}: {
  children: ReactNode;
  right?: boolean;
}) {
  return (
    <div className={`flex min-h-9 items-center border-r px-2 last:border-r-0 ${right ? "justify-end text-right tabular-nums" : ""}`}>
      {children}
    </div>
  );
}

function LookupSelect({
  label,
  value,
  rows,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  rows: LookupRow[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Select value={value || "__none__"} disabled={disabled} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
        <SelectTrigger>
          <SelectValue placeholder={`Select ${label}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Select {label}</SelectItem>
          {rows.map((row) => {
            const code = row.code || row.item_no || "";
            return (
              <SelectItem key={code} value={code}>
                {code}{row.description ? ` - ${row.description}` : ""}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </Field>
  );
}

function SourceItemLookup({
  value,
  items,
  disabled,
  onSelect,
}: {
  value: string;
  items: LookupRow[];
  disabled?: boolean;
  onSelect: (item: LookupRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = items.find((item) => item.item_no === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="h-10 w-full justify-between rounded-md border-input bg-background px-3 font-normal"
        >
          <span className="truncate">
            {current
              ? `${current.item_no} - ${current.description || ""}`
              : value || <span className="text-muted-foreground">Select Item</span>}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-50 w-[640px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search item no. or description..." />
          <div className="grid grid-cols-[120px_1fr_150px_110px] border-b bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
            <span>No.</span>
            <span>Description</span>
            <span>Base Unit of Measure</span>
            <span className="text-right">Unit Price</span>
          </div>
          <CommandList>
            <CommandEmpty>No items found.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.item_no}
                  value={`${item.item_no ?? ""} ${item.description ?? ""}`}
                  onSelect={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                >
                  <div className="grid w-full grid-cols-[24px_120px_1fr_150px_110px] items-center">
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value === item.item_no ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-medium">{item.item_no}</span>
                    <span className="truncate">{item.description || "-"}</span>
                    <span className="text-muted-foreground">{item.base_unit_of_measure || "-"}</span>
                    <span className="text-right tabular-nums">
                      {Number(item.unit_price ?? 0).toFixed(2)}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs">
            <Button variant="ghost" size="sm" type="button">
              + New
            </Button>
            <span className="text-muted-foreground">Select from full list</span>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default ReleasedProductionOrderList;
