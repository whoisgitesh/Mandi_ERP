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

type AssesseeCode = {
  code: string;
  description: string;
  is_resident: boolean;
  is_active: boolean;
};

const empty: Partial<AssesseeCode> = {
  code: "",
  description: "",
  is_resident: true,
  is_active: true,
};

export default function TDSAssesseeCodes() {
  const [rows, setRows] = useState<AssesseeCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AssesseeCode | null>(null);
  const [form, setForm] = useState<Partial<AssesseeCode>>(empty);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tds-assessee-codes");
      setRows(res.data ?? []);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to load TDS assessee codes");
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
      [row.code, row.description].some((value) =>
        String(value ?? "").toLowerCase().includes(term)
      )
    );
  }, [query, rows]);

  const set = (key: keyof AssesseeCode, value: any) =>
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

  const startNew = () => {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  };

  const startEdit = (row: AssesseeCode) => {
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
        toast.error("Assessee Code is required");
        return;
      }

      if (!payload.description) {
        toast.error("Description is required");
        return;
      }

      if (editing) {
        await api.put(`/tds-assessee-codes/${editing.code}`, payload);
      } else {
        await api.post("/tds-assessee-codes", payload);
      }

      toast.success(editing ? "Assessee Code updated" : "Assessee Code created");
      setOpen(false);
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to save assessee code");
    }
  };

  const deactivate = async (row: AssesseeCode) => {
    if (!confirm(`Deactivate Assessee Code ${row.code}?`)) return;

    try {
      await api.delete(`/tds-assessee-codes/${row.code}`);
      toast.success("Assessee Code deactivated");
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to deactivate assessee code");
    }
  };

  return (
    <div>
      <PageHeader
        title="Assessee Codes"
        subtitle="Vendor assessee classifications used for TDS rate resolution"
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
            placeholder="Filter by assessee code or description..."
            className="max-w-md"
          />
          <span className="text-xs text-muted-foreground">
            {filtered.length} assessee codes
          </span>
        </div>

        <div className="rounded border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Resident</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No TDS Assessee Codes.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.code}>
                    <TableCell className="font-medium">{row.code}</TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell>{row.is_resident ? "Yes" : "No"}</TableCell>
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Assessee Code" : "New Assessee Code"}</DialogTitle>
            <DialogDescription>
              Maintain the assessee classification used when resolving TDS rates for vendors.
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
            <Field label="Description">
              <Input
                value={form.description ?? ""}
                onChange={(event) => set("description", event.target.value)}
              />
            </Field>
            <SwitchField
              label="Resident"
              checked={form.is_resident !== false}
              onCheckedChange={(value) => set("is_resident", value)}
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
