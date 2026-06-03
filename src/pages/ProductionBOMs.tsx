import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Check, CheckCircle, ChevronsUpDown, Copy, Lock, Plus, RotateCcw, Save, XCircle } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { NoSeriesSelect } from "@/components/NoSeriesSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { NumericInput } from "@/components/ui/NumericInput";
import { api } from "@/lib/api";
import { useNoSeries } from "@/hooks/useNoSeries";
import { cn } from "@/lib/utils";
import {
  calculateProductionBomLine,
  productionBomCalculatedSourceFields,
  validateProductionBomLineQuantities,
} from "@/lib/productionBomCalculations";

type BomLine = {
  id?: number;
  line_no: number;
  type: string;
  item_no: string;
  variant_code?: string | null;
  description?: string | null;
  unit_of_measure_code?: string | null;
  quantity_per: number | string;
  scrap_pct: number | string;
  gross_qty?: number | string;
  shorting_loss_qty?: number | string;
  cutting_loss_qty?: number | string;
  peeling_loss_qty?: number | string;
  any_other_loss_qty?: number | string;
  net_qty?: number | string;
  shortage_pct?: number | string;
};

type Bom = {
  id: number;
  bom_no: string;
  description?: string | null;
  status: string;
  unit_of_measure_code?: string | null;
  version_nos?: string | null;
  active_version?: string | null;
  last_date_modified?: string | null;
  lines?: BomLine[];
};

type ItemRow = {
  item_no: string;
  description?: string | null;
  base_unit_of_measure?: string | null;
  unit_price?: number | string | null;
};

type UomRow = {
  code: string;
  description?: string | null;
};

type InventorySetup = {
  production_bom_version_nos?: string | null;
};

const editableStatuses = new Set(["New", "Under Development"]);
const calculationSourceFields = new Set<string>(productionBomCalculatedSourceFields);
const LINE_GRID =
  "grid-cols-[120px_180px_280px_repeat(6,140px)_150px_120px_110px]";
const lineCellClass =
  "h-9 px-2 text-sm";
const lineInputClass =
  "h-9 w-full rounded-none border-0 bg-transparent px-2 shadow-none ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0";
const numericInputClass =
  cn(lineInputClass, "text-right tabular-nums");

export function ProductionBOMList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Bom[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/production-boms");
      setRows(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load Production BOMs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createBom = async () => {
    try {
      const { data } = await api.post("/production-boms", {
        bom_no: "AUTO",
        description: "",
        unit_of_measure_code: "",
        status: "New",
      });
      navigate(`/production-boms/${encodeURIComponent(data.bom_no)}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to create Production BOM");
    }
  };

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.bom_no, row.description, row.status, row.unit_of_measure_code].some((value) =>
        String(value ?? "").toLowerCase().includes(term)
      )
    );
  }, [filter, rows]);

  return (
    <div>
      <PageHeader
        title="Production BOMs"
        subtitle="Certified component formulas for finished goods"
        actions={<Button onClick={createBom}><Plus className="h-4 w-4" /> New</Button>}
      />

      <div className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Input
            className="max-w-md"
            placeholder="Filter by BOM, description, status..."
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          <span className="text-xs text-muted-foreground">{filtered.length} BOMs</span>
        </div>

        <div className="overflow-x-auto rounded border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>BOM No.</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>UOM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No Production BOMs.</TableCell></TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.bom_no}>
                    <TableCell>
                      <Link className="font-medium text-primary" to={`/production-boms/${encodeURIComponent(row.bom_no)}`}>
                        {row.bom_no}
                      </Link>
                    </TableCell>
                    <TableCell>{row.description || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "Certified" ? "default" : "outline"}>{row.status}</Badge>
                    </TableCell>
                    <TableCell>{row.unit_of_measure_code || "-"}</TableCell>
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

export function ProductionBOMDetails() {
  const navigate = useNavigate();
  const { bomNo = "" } = useParams();
  const { noSeries } = useNoSeries();
  const [bom, setBom] = useState<Bom | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [uoms, setUoms] = useState<UomRow[]>([]);
  const [inventorySetup, setInventorySetup] = useState<InventorySetup | null>(null);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneForm, setCloneForm] = useState({
    new_bom_no: "AUTO",
    description: "",
    copy_lines: true,
    status: "New",
    copy_version_info: false,
  });
  const [lineDraft, setLineDraft] = useState<BomLine>({
    line_no: 0,
    type: "Item",
    item_no: "",
    variant_code: "",
    description: "",
    unit_of_measure_code: "",
    quantity_per: 0,
    scrap_pct: 0,
    gross_qty: 0,
    shorting_loss_qty: 0,
    cutting_loss_qty: 0,
    peeling_loss_qty: 0,
    any_other_loss_qty: 0,
    net_qty: 0,
    shortage_pct: 0,
  });

  const resetLineDraft = () => {
    setLineDraft(calculateProductionBomLine({
      line_no: 0,
      type: "Item",
      item_no: "",
      variant_code: "",
      description: "",
      unit_of_measure_code: "",
      quantity_per: 0,
      scrap_pct: 0,
      gross_qty: 0,
      shorting_loss_qty: 0,
      cutting_loss_qty: 0,
      peeling_loss_qty: 0,
      any_other_loss_qty: 0,
      net_qty: 0,
      shortage_pct: 0,
    }));
  };

  const readOnly = !bom || !editableStatuses.has(bom.status);
  const effectiveVersionNos =
    bom?.version_nos || inventorySetup?.production_bom_version_nos || null;
  const versionNoSeriesOptions = useMemo(() => {
    const allowedCodes = new Set(
      [inventorySetup?.production_bom_version_nos, bom?.version_nos].filter(Boolean)
    );

    return noSeries.filter((option) => allowedCodes.has(option.code));
  }, [bom?.version_nos, inventorySetup?.production_bom_version_nos, noSeries]);

  const load = async () => {
    try {
      const { data } = await api.get(`/production-boms/${encodeURIComponent(bomNo)}`);
      setBom({
        ...data,
        lines: (data.lines ?? []).map((line: BomLine) => calculateProductionBomLine(line)),
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load Production BOM");
    }
  };

  useEffect(() => {
    load();
  }, [bomNo]);

  useEffect(() => {
    let cancelled = false;

    async function loadInventorySetup() {
      try {
        const { data } = await api.get("/setup/inventory");
        if (!cancelled) setInventorySetup(data?.data ?? null);
      } catch (err) {
        if (!cancelled) setInventorySetup(null);
      }
    }

    loadInventorySetup();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadItems() {
      try {
        const { data } = await api.get("/items");
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) setItems([]);
      }
    }

    loadItems();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUoms() {
      try {
        const { data } = await api.get("/uom");
        if (!cancelled) {
          setUoms(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) setUoms([]);
      }
    }

    loadUoms();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectDraftItem = (item: ItemRow) => {
    setLineDraft((current) => ({
      ...current,
      item_no: item.item_no,
      description: item.description ?? "",
      unit_of_measure_code: item.base_unit_of_measure ?? "",
    }));
  };

  const selectLineItem = (index: number, item: ItemRow) => {
    setBom((current) => {
      if (!current) return current;
      const lines = [...(current.lines ?? [])];
      lines[index] = {
        ...lines[index],
        item_no: item.item_no,
        description: item.description ?? "",
        unit_of_measure_code: item.base_unit_of_measure ?? "",
      };
      return { ...current, lines };
    });
  };

  const saveHeader = async () => {
    if (!bom) return;
    try {
      const { data } = await api.put(`/production-boms/${encodeURIComponent(bom.bom_no)}`, {
        description: bom.description,
        unit_of_measure_code: bom.unit_of_measure_code,
        version_nos: effectiveVersionNos,
        active_version: bom.active_version,
      });
      setBom((current) => current ? { ...current, ...data } : data);
      toast.success("Production BOM saved");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save Production BOM");
    }
  };

  const updateLine = (index: number, field: keyof BomLine, value: any) => {
    setBom((current) => {
      if (!current) return current;
      const lines = [...(current.lines ?? [])];
      const updated = { ...lines[index], [field]: value };
      lines[index] = calculationSourceFields.has(String(field))
        ? calculateProductionBomLine(updated)
        : updated;
      return { ...current, lines };
    });
  };

  const updateDraftLine = (field: keyof BomLine, value: any) => {
    setLineDraft((current) => {
      const updated = { ...current, [field]: value };
      return calculationSourceFields.has(String(field))
        ? calculateProductionBomLine(updated)
        : updated;
    });
  };

  const saveLine = async (line: BomLine) => {
    if (!line.id) return;
    const calculatedLine = calculateProductionBomLine(line);
    const validationError = validateProductionBomLineQuantities(calculatedLine);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      await api.put(`/production-boms/lines/${line.id}`, calculatedLine);
      toast.success("BOM line saved");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save BOM line");
    }
  };

  const addLine = async () => {
    if (!bom) return;
    if (!lineDraft.item_no.trim()) {
      toast.error("Item No. is required");
      return;
    }
    const calculatedDraft = calculateProductionBomLine(lineDraft);
    const validationError = validateProductionBomLineQuantities(calculatedDraft);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      await api.post(`/production-boms/${encodeURIComponent(bom.bom_no)}/lines`, calculatedDraft);
      resetLineDraft();
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to add BOM line");
    }
  };

  const openCloneDialog = () => {
    if (!bom) return;
    setCloneForm({
      new_bom_no: "AUTO",
      description: `Copy of ${bom.description || bom.bom_no}`,
      copy_lines: true,
      status: "New",
      copy_version_info: false,
    });
    setCloneOpen(true);
  };

  const cloneBom = async () => {
    if (!bom) return;
    if (!cloneForm.description.trim()) {
      toast.error("Description is required.");
      return;
    }
    if (!cloneForm.new_bom_no.trim()) {
      toast.error("New BOM No. is required.");
      return;
    }

    try {
      const { data } = await api.post(`/production-boms/${encodeURIComponent(bom.bom_no)}/clone`, cloneForm);
      toast.success("Production BOM cloned");
      setCloneOpen(false);
      navigate(`/production-boms/${encodeURIComponent(data.bom_no)}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to clone Production BOM");
    }
  };

  const action = async (name: "certify" | "reopen" | "close") => {
    if (!bom) return;
    try {
      await api.post(`/production-boms/${encodeURIComponent(bom.bom_no)}/${name}`);
      toast.success(`Production BOM ${name === "certify" ? "certified" : name === "reopen" ? "reopened" : "closed"}`);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Action failed");
    }
  };

  if (!bom) {
    return (
      <div>
        <PageHeader title="Production BOM" subtitle="Loading..." />
        <div className="p-6 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={bom.bom_no}
        subtitle="Production BOM Card"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/production-boms")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {!readOnly && <Button onClick={saveHeader}><Save className="h-4 w-4" /> Save</Button>}
            <Button variant="outline" onClick={openCloneDialog}><Copy className="h-4 w-4" /> Clone BOM</Button>
            {bom.status !== "Certified" && <Button variant="outline" onClick={() => action("certify")}><CheckCircle className="h-4 w-4" /> Certify</Button>}
            {bom.status === "Certified" && <Button variant="outline" onClick={() => action("reopen")}><RotateCcw className="h-4 w-4" /> Reopen</Button>}
            {bom.status !== "Closed" && <Button variant="outline" onClick={() => action("close")}><XCircle className="h-4 w-4" /> Close</Button>}
          </div>
        }
      />

      <div className="p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Header
              <Badge variant={bom.status === "Certified" ? "default" : "outline"}>
                {bom.status}
              </Badge>
              {readOnly ? <Lock className="h-4 w-4 text-muted-foreground" /> : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>BOM No.</Label>
              <Input value={bom.bom_no} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={bom.description ?? ""}
                readOnly={readOnly}
                onChange={(event) => setBom({ ...bom, description: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>UOM</Label>
              <Select
                value={bom.unit_of_measure_code || "__none__"}
                disabled={readOnly}
                onValueChange={(value) =>
                  setBom({ ...bom, unit_of_measure_code: value === "__none__" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select UOM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select UOM</SelectItem>
                  {uoms.map((uom) => (
                    <SelectItem key={uom.code} value={uom.code}>
                      {uom.code}
                      {uom.description ? ` - ${uom.description}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Version Nos.</Label>
              <NoSeriesSelect
                value={effectiveVersionNos}
                options={versionNoSeriesOptions}
                disabled={readOnly}
                placeholder="Select Version Nos."
                onChange={(value) => setBom({ ...bom, version_nos: value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Active Version</Label>
              <Input value={bom.active_version ?? ""} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Last Date Modified</Label>
              <Input value={bom.last_date_modified ? String(bom.last_date_modified).slice(0, 10) : ""} readOnly />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto rounded border">
              <div className="min-w-[1720px]">
                <div className={cn("grid", LINE_GRID, "sticky top-0 z-10 border-b bg-card")}>
                  <LineHead>Type</LineHead>
                  <LineHead>No.</LineHead>
                  <LineHead>Description</LineHead>
                  <LineHead align="right">Gross Qty</LineHead>
                  <LineHead align="right">Shorting Loss Qty</LineHead>
                  <LineHead align="right">Cutting Loss Qty</LineHead>
                  <LineHead align="right">Peeling Loss Qty</LineHead>
                  <LineHead align="right">Any Other Loss Qty</LineHead>
                  <LineHead align="right">Net Qty</LineHead>
                  <LineHead>Unit of Measure Code</LineHead>
                  <LineHead align="right">Shortage %</LineHead>
                  <LineHead align="right">Actions</LineHead>
                </div>

                {!readOnly && (
                  <div className={cn("grid border-b bg-muted/20", LINE_GRID)}>
                    <LineCell>
                      <Select
                        value={lineDraft.type || "Item"}
                        onValueChange={(value) => setLineDraft({ ...lineDraft, type: value, item_no: value === "Item" ? lineDraft.item_no : "" })}
                      >
                        <SelectTrigger className={lineInputClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Item">Item</SelectItem>
                        </SelectContent>
                      </Select>
                    </LineCell>
                    <LineCell>
                      <ItemLookup
                        value={lineDraft.item_no}
                        items={items}
                        disabled={lineDraft.type !== "Item"}
                        onSelect={selectDraftItem}
                      />
                    </LineCell>
                    <LineCell><Input className={lineInputClass} value={lineDraft.description ?? ""} readOnly /></LineCell>
                    <LineCell><NumericInput className={numericInputClass} value={lineDraft.gross_qty ?? 0} min={0} decimalScale={4} onChange={(value) => updateDraftLine("gross_qty", value)} /></LineCell>
                    <LineCell><NumericInput className={numericInputClass} value={lineDraft.shorting_loss_qty ?? 0} min={0} decimalScale={4} onChange={(value) => updateDraftLine("shorting_loss_qty", value)} /></LineCell>
                    <LineCell><NumericInput className={numericInputClass} value={lineDraft.cutting_loss_qty ?? 0} min={0} decimalScale={4} onChange={(value) => updateDraftLine("cutting_loss_qty", value)} /></LineCell>
                    <LineCell><NumericInput className={numericInputClass} value={lineDraft.peeling_loss_qty ?? 0} min={0} decimalScale={4} onChange={(value) => updateDraftLine("peeling_loss_qty", value)} /></LineCell>
                    <LineCell><NumericInput className={numericInputClass} value={lineDraft.any_other_loss_qty ?? 0} min={0} decimalScale={4} onChange={(value) => updateDraftLine("any_other_loss_qty", value)} /></LineCell>
                    <LineCell><Input className={cn(numericInputClass, "bg-muted/40")} value={lineDraft.net_qty ?? 0} readOnly /></LineCell>
                    <LineCell><Input className={lineInputClass} value={lineDraft.unit_of_measure_code ?? ""} readOnly /></LineCell>
                    <LineCell><Input className={cn(numericInputClass, "bg-muted/40")} value={lineDraft.shortage_pct ?? 0} readOnly /></LineCell>
                    <LineCell>
                      <Button className="h-8 w-full" onClick={addLine}><Plus className="h-4 w-4" /> Add</Button>
                    </LineCell>
                  </div>
                )}

                {(bom.lines ?? []).length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No BOM lines.
                  </div>
                ) : (
                  (bom.lines ?? []).map((line, index) => (
                    <div key={line.id ?? index} className={cn("grid border-b last:border-b-0", LINE_GRID)}>
                      <LineCell>
                        <Select
                          value={line.type || "Item"}
                          disabled={readOnly}
                          onValueChange={(value) => updateLine(index, "type", value)}
                        >
                          <SelectTrigger className={lineInputClass}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Item">Item</SelectItem>
                          </SelectContent>
                        </Select>
                      </LineCell>
                      <LineCell>
                        <ItemLookup
                          value={line.item_no}
                          items={items}
                          disabled={readOnly || line.type !== "Item"}
                          onSelect={(item) => selectLineItem(index, item)}
                        />
                      </LineCell>
                      <LineCell><Input className={lineInputClass} value={line.description ?? ""} readOnly={readOnly} onChange={(event) => updateLine(index, "description", event.target.value)} /></LineCell>
                      <LineCell><NumericInput className={numericInputClass} value={line.gross_qty ?? 0} readOnly={readOnly} min={0} decimalScale={4} onChange={(value) => updateLine(index, "gross_qty", value)} /></LineCell>
                      <LineCell><NumericInput className={numericInputClass} value={line.shorting_loss_qty ?? 0} readOnly={readOnly} min={0} decimalScale={4} onChange={(value) => updateLine(index, "shorting_loss_qty", value)} /></LineCell>
                      <LineCell><NumericInput className={numericInputClass} value={line.cutting_loss_qty ?? 0} readOnly={readOnly} min={0} decimalScale={4} onChange={(value) => updateLine(index, "cutting_loss_qty", value)} /></LineCell>
                      <LineCell><NumericInput className={numericInputClass} value={line.peeling_loss_qty ?? 0} readOnly={readOnly} min={0} decimalScale={4} onChange={(value) => updateLine(index, "peeling_loss_qty", value)} /></LineCell>
                      <LineCell><NumericInput className={numericInputClass} value={line.any_other_loss_qty ?? 0} readOnly={readOnly} min={0} decimalScale={4} onChange={(value) => updateLine(index, "any_other_loss_qty", value)} /></LineCell>
                      <LineCell><Input className={cn(numericInputClass, "bg-muted/40")} value={line.net_qty ?? 0} readOnly /></LineCell>
                      <LineCell><Input className={lineInputClass} value={line.unit_of_measure_code ?? ""} readOnly={readOnly} onChange={(event) => updateLine(index, "unit_of_measure_code", event.target.value)} /></LineCell>
                      <LineCell><Input className={cn(numericInputClass, "bg-muted/40")} value={line.shortage_pct ?? 0} readOnly /></LineCell>
                      <LineCell>
                        {!readOnly ? (
                          <Button className="h-8 w-full" size="sm" variant="outline" onClick={() => saveLine(line)}>Save</Button>
                        ) : null}
                      </LineCell>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Clone Production BOM</DialogTitle>
            <DialogDescription>
              Create a new editable Production BOM from this BOM header and optionally copy all component lines.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Source BOM No.</Label>
              <Input value={bom.bom_no} readOnly />
            </div>
            <div className="space-y-2">
              <Label>New BOM No.</Label>
              <Input
                value={cloneForm.new_bom_no}
                onChange={(event) => setCloneForm({ ...cloneForm, new_bom_no: event.target.value.toUpperCase() })}
                placeholder="AUTO"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>New Description</Label>
              <Input
                value={cloneForm.description}
                onChange={(event) => setCloneForm({ ...cloneForm, description: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>New Status</Label>
              <Select value={cloneForm.status} onValueChange={(value) => setCloneForm({ ...cloneForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Under Development">Under Development</SelectItem>
                  <SelectItem value="Certified">Certified</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded border px-3 py-2">
              <Label>Copy Lines</Label>
              <Switch
                checked={cloneForm.copy_lines}
                onCheckedChange={(checked) => setCloneForm({ ...cloneForm, copy_lines: checked })}
              />
            </div>
            <div className="flex items-center justify-between rounded border px-3 py-2 md:col-span-2">
              <Label>Copy Version Info</Label>
              <Switch
                checked={cloneForm.copy_version_info}
                onCheckedChange={(checked) => setCloneForm({ ...cloneForm, copy_version_info: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneOpen(false)}>Cancel</Button>
            <Button onClick={cloneBom}>Create Copy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LineHead({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex min-h-12 items-center border-r px-2 text-sm font-medium text-muted-foreground last:border-r-0",
        align === "right" ? "justify-end text-right" : "justify-start"
      )}
    >
      {children}
    </div>
  );
}

function LineCell({ children }: { children: ReactNode }) {
  return (
    <div className={cn(lineCellClass, "flex items-center border-r last:border-r-0")}>
      {children}
    </div>
  );
}

function ItemLookup({
  value,
  items,
  disabled,
  onSelect,
}: {
  value: string;
  items: ItemRow[];
  disabled?: boolean;
  onSelect: (item: ItemRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = items.find((item) => item.item_no === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          role="combobox"
          disabled={disabled}
          className={cn(lineInputClass, "justify-between font-normal")}
        >
          <span className="truncate">
            {current?.item_no || value || (
              <span className="text-muted-foreground">Select item</span>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-50 w-[640px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search item no. or description..." />
          <div className="grid grid-cols-[130px_1fr_130px_110px] border-b bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
            <span>No.</span>
            <span>Description</span>
            <span>Base UOM</span>
            <span className="text-right">Unit Price</span>
          </div>
          <CommandList>
            <CommandEmpty>No items found.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.item_no}
                  value={`${item.item_no} ${item.description ?? ""}`}
                  onSelect={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                >
                  <div className="grid w-full grid-cols-[24px_130px_1fr_130px_110px] items-center gap-0">
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
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default ProductionBOMList;
