import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type StateRow = {
  code: string;
  description: string;
  etds_tcs_state_code: string | null;
  gst_state_code: string | null;
  is_active: boolean;
};

const empty: StateRow = {
  code: "",
  description: "",
  etds_tcs_state_code: "",
  gst_state_code: "",
  is_active: true,
};

export default function States() {
  const [rows, setRows] = useState<StateRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StateRow | null>(null);
  const [form, setForm] = useState<StateRow>(empty);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/states");
      setRows(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load states");
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
        row.etds_tcs_state_code,
        row.gst_state_code,
      ].some((value) => String(value ?? "").toLowerCase().includes(term))
    );
  }, [query, rows]);

  const startNew = () => {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  };

  const startEdit = (row: StateRow) => {
    setEditing(row);
    setForm({ ...row });
    setOpen(true);
  };

  const save = async () => {
    if (!form.code.trim()) return toast.error("Code is required");
    if (!form.description.trim()) return toast.error("Description is required");

    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
      };
      if (editing) {
        await api.put(`/states/${editing.code}`, payload);
      } else {
        await api.post("/states", payload);
      }
      toast.success(editing ? "State updated" : "State created");
      setOpen(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save state");
    }
  };

  const deactivate = async (row: StateRow) => {
    if (!confirm(`Deactivate state ${row.code}?`)) return;
    try {
      await api.delete(`/states/${row.code}`);
      toast.success("State deactivated");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to deactivate state");
    }
  };

  return (
    <div>
      <PageHeader
        title="States"
        subtitle="Indian state and union territory codes for GST and eTDS/TCS reporting"
        actions={
          <Button onClick={startNew}>
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
        }
      />

      <div className="space-y-3 p-6">
        <div className="flex items-center gap-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by code, description, eTDS/TCS code, GST code..."
            className="max-w-md"
          />
          <span className="text-xs text-muted-foreground">{filtered.length} states</span>
        </div>

        <div className="overflow-x-auto rounded border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>State Code for eTDS/TCS</TableHead>
                <TableHead>State Code (GST Reg. No.)</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No states.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.code}>
                    <TableCell className="font-medium text-primary">{row.code}</TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell>{row.etds_tcs_state_code || "-"}</TableCell>
                    <TableCell>{row.gst_state_code || "-"}</TableCell>
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
            <DialogTitle>{editing ? "Edit State" : "New State"}</DialogTitle>
            <DialogDescription>
              Maintain the internal state code, eTDS/TCS code, and GST registration state code.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Code">
              <Input
                value={form.code}
                disabled={Boolean(editing)}
                maxLength={10}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    code: event.target.value.toUpperCase(),
                  }))
                }
              />
            </Field>
            <Field label="Description">
              <Input
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </Field>
            <Field label="State Code for eTDS/TCS">
              <Input
                value={form.etds_tcs_state_code ?? ""}
                maxLength={10}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    etds_tcs_state_code: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="State Code (GST Reg. No.)">
              <Input
                value={form.gst_state_code ?? ""}
                maxLength={10}
                onChange={(event) =>
                  setForm((current) => ({ ...current, gst_state_code: event.target.value }))
                }
              />
            </Field>
            <div className="flex h-10 items-center justify-between rounded-md border px-3 md:col-span-2">
              <Label className="text-sm">Active</Label>
              <Switch
                checked={form.is_active !== false}
                onCheckedChange={(value) =>
                  setForm((current) => ({ ...current, is_active: value }))
                }
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
