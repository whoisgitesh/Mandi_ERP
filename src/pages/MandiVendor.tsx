import { useEffect, useState } from "react";

import { api } from "@/lib/api";

import { PageHeader } from "@/components/PageHeader";
import { MasterNoSeriesSelect } from "@/components/MasterNoSeriesSelect";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { toast } from "sonner";

import {
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

type Row = Record<string, any>;

const empty: Row = {
  vendor_no: "",
  name: "",
  city: "",
  phone_no: "",
  email: "",
  gst_registration_no: "",
  address: "",
  balance_lcy: 0,
  balance_due_lcy: 0,
};

const NUMERIC = new Set([
  "balance_lcy",
  "balance_due_lcy",
]);

export default function MandiVendor() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({ ...empty });
  const [loading, setLoading] = useState(true);
  const [noSeriesLineId, setNoSeriesLineId] = useState("");

  const load = async () => {
    try {
      setLoading(true);

      const res = await api.get("/mandi-vendors");
      setRows(res.data ?? []);
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.error ||
          "Failed to load mandi vendors"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    setEditing(null);
    setNoSeriesLineId("");
    setForm({
      ...empty,
      vendor_no: "AUTO",
    });
    setOpen(true);
  };

  const startEdit = (row: Row) => {
    setEditing(row);
    setForm({
      ...empty,
      ...row,
    });
    setOpen(true);
  };

  const set = (key: string, value: any) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const save = async () => {
    if (!String(form.vendor_no ?? "").trim() || !String(form.name ?? "").trim()) {
      toast.error("Vendor No. and Name are required");
      return;
    }

    const payload: Row = {
      ...form,
      no_series_line_id: noSeriesLineId || undefined,
    };

    NUMERIC.forEach((key) => {
      payload[key] = Number(payload[key] ?? 0);
    });

    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") {
        payload[key] = null;
      }
    });

    try {
      if (editing) {
        await api.put(`/mandi-vendors/${editing.id}`, payload);
        toast.success("Updated");
      } else {
        await api.post("/mandi-vendors", payload);
        toast.success("Created");
      }

      setOpen(false);
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.error ||
          "Failed to save mandi vendor"
      );
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this Mandi Vendor?")) return;

    try {
      await api.delete(`/mandi-vendors/${id}`);
      toast.success("Deleted");
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.error ||
          "Failed to delete mandi vendor"
      );
    }
  };

  return (
    <div>
      <PageHeader
        title="Mandi Vendor Master"
        subtitle="Vendors used on Mandi Purchase lines"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={startNew}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editing ? "Edit Mandi Vendor" : "New Mandi Vendor"}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3">
                <F label="No." value={form.vendor_no} onChange={(v) => set("vendor_no", v)} />

                {!editing && (
                  <MasterNoSeriesSelect
                    value={noSeriesLineId}
                    codes={[
                      "MANDI_VENDOR",
                    ]}
                    keywords={[
                      "MANDI_VENDOR",
                      "MANDI VENDOR",
                    ]}
                    onChange={setNoSeriesLineId}
                  />
                )}

                <F label="Name" value={form.name} onChange={(v) => set("name", v)} />
                <F label="City" value={form.city} onChange={(v) => set("city", v)} />
                <F label="Phone No." value={form.phone_no} onChange={(v) => set("phone_no", v)} />
                <F label="Email" value={form.email} onChange={(v) => set("email", v)} />
                <F label="GST Registration No." value={form.gst_registration_no} onChange={(v) => set("gst_registration_no", v)} />
                <F label="Address" value={form.address} onChange={(v) => set("address", v)} />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
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
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Phone No.</TableHead>
                <TableHead>GST Reg. No.</TableHead>
                <TableHead className="text-right">Balance (LCY)</TableHead>
                <TableHead className="text-right">Balance Due (LCY)</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-8"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-8"
                  >
                    No Mandi Vendors yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-primary">
                      {row.vendor_no}
                    </TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.city}</TableCell>
                    <TableCell>{row.phone_no}</TableCell>
                    <TableCell>{row.gst_registration_no}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(row.balance_lcy ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(row.balance_due_lcy ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(row)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(row.id)}
                      >
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
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label className="text-xs">
        {label}
      </Label>
      <Input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
