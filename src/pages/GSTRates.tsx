import { useEffect, useMemo, useState, type ReactNode } from "react";

import { api } from "@/lib/api";
import { formatDateDisplay } from "@/lib/date";

import { PageHeader } from "@/components/PageHeader";
import { StateSelect } from "@/components/StateSelect";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/NumericInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";

type GSTGroup = {
  code: string;
  description: string | null;
  is_active: boolean;
};

type GSTRate = {
  id: number;
  gst_group_code: string;
  gst_group_description?: string | null;
  hsn_sac: string | null;
  from_state_code: string | null;
  to_state_code: string | null;
  effective_from: string;
  effective_to: string | null;
  gst_calculation_type: "Intra-State" | "Inter-State";
  cgst_pct: number;
  sgst_pct: number;
  igst_pct: number;
  total_gst_pct: number;
  is_active: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);

const empty: Partial<GSTRate> = {
  gst_group_code: "",
  hsn_sac: "",
  from_state_code: "",
  to_state_code: "",
  effective_from: today(),
  effective_to: "",
  gst_calculation_type: "Intra-State",
  cgst_pct: 0,
  sgst_pct: 0,
  igst_pct: 0,
  total_gst_pct: 0,
  is_active: true,
};

const pct = (value: any) =>
  Number(value ?? 0).toFixed(2);

const normalizedRate = (form: Partial<GSTRate>) => {
  const type = form.gst_calculation_type ?? "Intra-State";
  const cgst =
    type === "Intra-State" ? Number(form.cgst_pct ?? 0) : 0;
  const sgst =
    type === "Intra-State" ? Number(form.sgst_pct ?? 0) : 0;
  const igst =
    type === "Inter-State" ? Number(form.igst_pct ?? 0) : 0;
  const total =
    type === "Intra-State"
      ? Number((cgst + sgst).toFixed(2))
      : Number(igst.toFixed(2));

  return {
    ...form,
    gst_calculation_type: type,
    cgst_pct: cgst,
    sgst_pct: sgst,
    igst_pct: igst,
    total_gst_pct: total,
  };
};

export default function GSTRates() {
  const [rows, setRows] = useState<GSTRate[]>([]);
  const [groups, setGroups] = useState<GSTGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GSTRate | null>(null);
  const [form, setForm] = useState<Partial<GSTRate>>(empty);

  const load = async () => {
    try {
      setLoading(true);
      const [ratesRes, groupsRes] = await Promise.all([
        api.get("/gst-rates"),
        api.get("/gst-groups"),
      ]);
      setRows(ratesRes.data ?? []);
      setGroups((groupsRes.data ?? []).filter((group: GSTGroup) => group.is_active !== false));
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to load GST rates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((row) =>
      [
        row.gst_group_code,
        row.gst_group_description,
        row.hsn_sac,
        row.from_state_code,
        row.to_state_code,
        row.gst_calculation_type,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(term)
      )
    );
  }, [query, rows]);

  const set = (key: keyof GSTRate, value: any) =>
    setForm((current) =>
      normalizedRate({
        ...current,
        [key]: value,
      })
    );

  const startNew = () => {
    setEditing(null);
    setForm(normalizedRate({ ...empty }));
    setOpen(true);
  };

  const startEdit = (row: GSTRate) => {
    setEditing(row);
    setForm(normalizedRate({ ...row }));
    setOpen(true);
  };

  const save = async () => {
    try {
      const payload = normalizedRate(form);

      if (!payload.gst_group_code) {
        toast.error("GST Group Code is required");
        return;
      }

      if (!payload.effective_from) {
        toast.error("Effective From is required");
        return;
      }

      if (editing) {
        await api.put(`/gst-rates/${editing.id}`, payload);
      } else {
        await api.post("/gst-rates", payload);
      }

      toast.success(editing ? "GST Rate updated" : "GST Rate created");
      setOpen(false);
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to save GST rate");
    }
  };

  const deactivate = async (row: GSTRate) => {
    if (!confirm(`Deactivate GST Rate ${row.gst_group_code}?`)) return;

    try {
      await api.delete(`/gst-rates/${row.id}`);
      toast.success("GST Rate deactivated");
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to deactivate GST rate");
    }
  };

  const current = normalizedRate(form);

  return (
    <div>
      <PageHeader
        title="GST Rates"
        subtitle="GST percentage matrix by group, HSN/SAC, state, and effective date"
        actions={
          <Button onClick={startNew}>
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>
        }
      />

      <div className="p-6 space-y-3">
        <div className="flex items-center gap-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by GST group, HSN/SAC, state, tax type..."
            className="max-w-md"
          />
          <span className="text-xs text-muted-foreground">
            {filtered.length} rates
          </span>
        </div>

        <div className="rounded border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GST Group Code</TableHead>
                <TableHead>HSN/SAC</TableHead>
                <TableHead>From State</TableHead>
                <TableHead>Location State Code</TableHead>
                <TableHead>Date From</TableHead>
                <TableHead>Date To</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">SGST %</TableHead>
                <TableHead className="text-right">CGST %</TableHead>
                <TableHead className="text-right">IGST %</TableHead>
                <TableHead className="text-right">Total GST %</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={13} className="py-8 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="py-8 text-center text-muted-foreground">
                    No GST Rates.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.gst_group_code}</TableCell>
                    <TableCell>{row.hsn_sac || "-"}</TableCell>
                    <TableCell>{row.from_state_code || "-"}</TableCell>
                    <TableCell>{row.to_state_code || "-"}</TableCell>
                    <TableCell>{formatDateDisplay(row.effective_from)}</TableCell>
                    <TableCell>{row.effective_to ? formatDateDisplay(row.effective_to) : "-"}</TableCell>
                    <TableCell>{row.gst_calculation_type}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct(row.sgst_pct)}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct(row.cgst_pct)}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct(row.igst_pct)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{pct(row.total_gst_pct)}</TableCell>
                    <TableCell>
                      <Badge variant={row.is_active ? "default" : "secondary"}>
                        {row.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deactivate(row)}>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit GST Rate" : "New GST Rate"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="GST Group Code">
              <Select
                value={current.gst_group_code ?? ""}
                onValueChange={(value) => set("gst_group_code", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select GST Group..." />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.code} value={group.code}>
                      {group.code} - {group.description || "GST Group"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="HSN/SAC">
              <Input
                value={current.hsn_sac ?? ""}
                onChange={(event) => set("hsn_sac", event.target.value)}
              />
            </Field>
            <Field label="GST Calculation Type">
              <Select
                value={current.gst_calculation_type}
                onValueChange={(value) => set("gst_calculation_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Intra-State">Intra-State</SelectItem>
                  <SelectItem value="Inter-State">Inter-State</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="From State">
              <StateSelect
                value={current.from_state_code ?? ""}
                onChange={(value) => set("from_state_code", value || "")}
                placeholder="Select From State"
              />
            </Field>
            <Field label="Location State Code">
              <StateSelect
                value={current.to_state_code ?? ""}
                onChange={(value) => set("to_state_code", value || "")}
                placeholder="Select Location State"
              />
            </Field>
            <Field label="Date From">
              <Input
                type="date"
                value={String(current.effective_from ?? "")}
                onChange={(event) => set("effective_from", event.target.value)}
              />
            </Field>
            <Field label="Date To">
              <Input
                type="date"
                value={String(current.effective_to ?? "")}
                onChange={(event) => set("effective_to", event.target.value)}
              />
            </Field>
            <Field label="SGST %">
              <NumericInput
                value={current.sgst_pct ?? 0}
                decimalScale={3}
                min={0}
                max={100}
                disabled={current.gst_calculation_type === "Inter-State"}
                onValueChange={(value) => set("sgst_pct", value)}
              />
            </Field>
            <Field label="CGST %">
              <NumericInput
                value={current.cgst_pct ?? 0}
                decimalScale={3}
                min={0}
                max={100}
                disabled={current.gst_calculation_type === "Inter-State"}
                onValueChange={(value) => set("cgst_pct", value)}
              />
            </Field>
            <Field label="IGST %">
              <NumericInput
                value={current.igst_pct ?? 0}
                decimalScale={3}
                min={0}
                max={100}
                disabled={current.gst_calculation_type === "Intra-State"}
                onValueChange={(value) => set("igst_pct", value)}
              />
            </Field>
            <Field label="Total GST %">
              <NumericInput value={current.total_gst_pct ?? 0} decimalScale={3} readOnly />
            </Field>
            <div className="flex h-10 items-center justify-between rounded-md border px-3">
              <Label className="text-sm">Active</Label>
              <Switch
                checked={current.is_active !== false}
                onCheckedChange={(value) => set("is_active", value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
