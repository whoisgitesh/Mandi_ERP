import { useEffect, useMemo, useState, type ReactNode } from "react";

import { api } from "@/lib/api";

import { PageHeader } from "@/components/PageHeader";

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
  id: number;
  code: string;
  description: string | null;
  gst_group_type: "Goods" | "Service";
  gst_rate: number;
  gst_place_of_supply: string | null;
  component_calc_type: string | null;
  cess_uom: string | null;
  cess_credit: boolean;
  hsn_sac_required: boolean;
  reverse_charge: boolean;
  is_active: boolean;
};

const empty: Partial<GSTGroup> = {
  code: "",
  description: "",
  gst_group_type: "Goods",
  gst_rate: 0,
  gst_place_of_supply: "Bill-to Address",
  component_calc_type: "General",
  cess_uom: "",
  cess_credit: false,
  hsn_sac_required: false,
  reverse_charge: false,
  is_active: true,
};

export default function GSTGroups() {
  const [rows, setRows] = useState<GSTGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GSTGroup | null>(null);
  const [form, setForm] = useState<Partial<GSTGroup>>(empty);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/gst-groups");
      setRows(res.data ?? []);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to load GST groups");
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
        row.code,
        row.description,
        row.gst_group_type,
        row.gst_rate,
        row.gst_place_of_supply,
        row.component_calc_type,
      ].some((value) =>
        String(value ?? "").toLowerCase().includes(term)
      )
    );
  }, [query, rows]);

  const set = (key: keyof GSTGroup, value: any) =>
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

  const startNew = () => {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  };

  const startEdit = (row: GSTGroup) => {
    setEditing(row);
    setForm({ ...row });
    setOpen(true);
  };

  const save = async () => {
    try {
      const payload = {
        ...form,
        code: String(form.code ?? "").trim().toUpperCase(),
      };

      if (!payload.code) {
        toast.error("GST Group Code is required");
        return;
      }

      if (editing) {
        await api.put(`/gst-groups/${editing.code}`, payload);
      } else {
        await api.post("/gst-groups", payload);
      }

      toast.success(editing ? "GST Group updated" : "GST Group created");
      setOpen(false);
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to save GST group");
    }
  };

  const deactivate = async (row: GSTGroup) => {
    if (!confirm(`Deactivate GST Group ${row.code}?`)) return;

    try {
      await api.delete(`/gst-groups/${row.code}`);
      toast.success("GST Group deactivated");
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to deactivate GST group");
    }
  };

  return (
    <div>
      <PageHeader
        title="GST Groups"
        subtitle="GST setup categories used by item and document tax calculation"
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
            placeholder="Filter by GST group, description, type..."
            className="max-w-md"
          />
          <span className="text-xs text-muted-foreground">
            {filtered.length} groups
          </span>
        </div>

        <div className="rounded border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">GST Rate</TableHead>
                <TableHead>GST Place Of Supply</TableHead>
                <TableHead>Component Calc. Type</TableHead>
                <TableHead>Cess UOM</TableHead>
                <TableHead>Cess Credit</TableHead>
                <TableHead>HSN/SAC Required</TableHead>
                <TableHead>Reverse Charge</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={12} className="py-8 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="py-8 text-center text-muted-foreground">
                    No GST Groups.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.code}>
                    <TableCell className="font-medium">{row.code}</TableCell>
                    <TableCell>{row.description || "-"}</TableCell>
                    <TableCell>{row.gst_group_type}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(row.gst_rate ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell>{row.gst_place_of_supply || "-"}</TableCell>
                    <TableCell>{row.component_calc_type || "General"}</TableCell>
                    <TableCell>{row.cess_uom || "-"}</TableCell>
                    <TableCell>{row.cess_credit ? "Yes" : "No"}</TableCell>
                    <TableCell>{row.hsn_sac_required ? "Yes" : "No"}</TableCell>
                    <TableCell>{row.reverse_charge ? "Yes" : "No"}</TableCell>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit GST Group" : "New GST Group"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Code">
              <Input
                value={form.code ?? ""}
                disabled={Boolean(editing)}
                onChange={(event) => set("code", event.target.value.toUpperCase())}
              />
            </Field>
            <Field label="GST Group Type">
              <Select
                value={form.gst_group_type ?? "Goods"}
                onValueChange={(value) => set("gst_group_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Goods">Goods</SelectItem>
                  <SelectItem value="Service">Service</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Description">
              <Input
                value={form.description ?? ""}
                onChange={(event) => set("description", event.target.value)}
              />
            </Field>
            <Field label="GST Rate">
              <NumericInput
                value={form.gst_rate ?? 0}
                onValueChange={(value) => set("gst_rate", value)}
              />
            </Field>
            <Field label="GST Place Of Supply">
              <Input
                value={form.gst_place_of_supply ?? ""}
                onChange={(event) => set("gst_place_of_supply", event.target.value)}
              />
            </Field>
            <Field label="Component Calc. Type">
              <Input
                value={form.component_calc_type ?? ""}
                onChange={(event) => set("component_calc_type", event.target.value)}
              />
            </Field>
            <Field label="Cess UOM">
              <Input
                value={form.cess_uom ?? ""}
                onChange={(event) => set("cess_uom", event.target.value)}
              />
            </Field>
            <SwitchField
              label="Active"
              checked={form.is_active !== false}
              onCheckedChange={(value) => set("is_active", value)}
            />
            <SwitchField
              label="Cess Credit"
              checked={Boolean(form.cess_credit)}
              onCheckedChange={(value) => set("cess_credit", value)}
            />
            <SwitchField
              label="HSN/SAC Required"
              checked={Boolean(form.hsn_sac_required)}
              onCheckedChange={(value) => set("hsn_sac_required", value)}
            />
            <SwitchField
              label="Reverse Charge"
              checked={Boolean(form.reverse_charge)}
              onCheckedChange={(value) => set("reverse_charge", value)}
            />
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

function SwitchField({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex h-10 items-center justify-between rounded-md border px-3">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
