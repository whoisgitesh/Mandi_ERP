import { useEffect, useMemo, useState, type ReactNode } from "react";

import { api } from "@/lib/api";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type TDSSectionCode = {
  code: string;
  description: string;
  etds_code: string | null;
  parent_code: string | null;
  is_group: boolean;
  is_active: boolean;
};

const empty: Partial<TDSSectionCode> = {
  code: "",
  description: "",
  etds_code: "",
  parent_code: "",
  is_group: false,
  is_active: true,
};

function TDSSectionCodeList({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const [rows, setRows] = useState<TDSSectionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TDSSectionCode | null>(null);
  const [form, setForm] = useState<Partial<TDSSectionCode>>(empty);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tds-section-codes");
      setRows(res.data ?? []);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to load TDS section codes");
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
      [row.code, row.description, row.etds_code, row.parent_code].some((value) =>
        String(value ?? "").toLowerCase().includes(term)
      )
    );
  }, [query, rows]);

  const set = (key: keyof TDSSectionCode, value: any) =>
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

  const startNew = () => {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  };

  const startEdit = (row: TDSSectionCode) => {
    setEditing(row);
    setForm({ ...row });
    setOpen(true);
  };

  const save = async () => {
    try {
      const payload = {
        ...form,
        code: String(form.code ?? "").trim().toUpperCase(),
        parent_code: String(form.parent_code ?? "").trim().toUpperCase(),
      };

      if (!payload.code) {
        toast.error("Section Code is required");
        return;
      }

      if (!payload.description) {
        toast.error("Description is required");
        return;
      }

      if (editing) {
        await api.put(`/tds-section-codes/${editing.code}`, payload);
      } else {
        await api.post("/tds-section-codes", payload);
      }

      toast.success(editing ? "Section Code updated" : "Section Code created");
      setOpen(false);
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to save section code");
    }
  };

  const deactivate = async (row: TDSSectionCode) => {
    if (!confirm(`Deactivate Section Code ${row.code}?`)) return;

    try {
      await api.delete(`/tds-section-codes/${row.code}`);
      toast.success("Section Code deactivated");
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to deactivate section code");
    }
  };

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
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
            placeholder="Filter by section, description, eTDS..."
            className="max-w-md"
          />
          <span className="text-xs text-muted-foreground">
            {filtered.length} sections
          </span>
        </div>

        <div className="rounded border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>eTDS Code</TableHead>
                <TableHead>Parent Code</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No TDS Section Codes.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.code}>
                    <TableCell className="font-medium">{row.code}</TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell>{row.etds_code || "-"}</TableCell>
                    <TableCell>{row.parent_code || "-"}</TableCell>
                    <TableCell>{row.is_group ? "Yes" : "No"}</TableCell>
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
            <DialogTitle>{editing ? "Edit Section Code" : "New Section Code"}</DialogTitle>
            <DialogDescription>
              Maintain the TDS section code, eTDS mapping, hierarchy, and active status.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Code">
              <Input
                value={form.code ?? ""}
                disabled={Boolean(editing)}
                onChange={(event) => set("code", event.target.value.toUpperCase())}
              />
            </Field>
            <Field label="eTDS Code">
              <Input
                value={form.etds_code ?? ""}
                onChange={(event) => set("etds_code", event.target.value.toUpperCase())}
              />
            </Field>
            <Field label="Description">
              <Input
                value={form.description ?? ""}
                onChange={(event) => set("description", event.target.value)}
              />
            </Field>
            <Field label="Parent Code">
              <Input
                value={form.parent_code ?? ""}
                onChange={(event) => set("parent_code", event.target.value.toUpperCase())}
              />
            </Field>
            <SwitchField
              label="Group"
              checked={Boolean(form.is_group)}
              onCheckedChange={(value) => set("is_group", value)}
            />
            <SwitchField
              label="Active"
              checked={form.is_active !== false}
              onCheckedChange={(value) => set("is_active", value)}
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

export function TDSSections() {
  return (
    <TDSSectionCodeList
      title="TDS Sections"
      subtitle="BC-style TDS section hierarchy and eTDS mappings"
    />
  );
}

export default function TDSSectionCodes() {
  return (
    <TDSSectionCodeList
      title="Section Codes"
      subtitle="Section code master used by TDS rate setup"
    />
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
