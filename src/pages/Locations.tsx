import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { MasterNoSeriesSelect } from "@/components/MasterNoSeriesSelect";
import { StateSelect } from "@/components/StateSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Boxes, Pencil, Plus, Trash2 } from "lucide-react";

type Loc = { id: string; code: string; name: string; state_code: string | null };
type Item = { id: string; item_no: string; description: string };
type Stock = {
  id: string;
  item_id: string;
  item_no: string;
  location_code: string;
  quantity: number;
  items?: { description: string | null } | null;
};

const empty = { code: "", name: "", state_code: "" };

export default function Locations() {
  const [rows, setRows] = useState<Loc[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Loc | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [loading, setLoading] = useState(true);
  const [noSeriesLineId, setNoSeriesLineId] = useState("");

  // Inventory drawer
  const [invOpen, setInvOpen] = useState(false);
  const [invLoc, setInvLoc] = useState<Loc | null>(null);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [newItemId, setNewItemId] = useState("");
  const [newQty, setNewQty] = useState<number>(0);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/locations");
      const data = res.data?.data ?? res.data ?? [];
      setRows(data.map((r: any) => ({
        ...r,
        state_code: r.state_code ?? r.state ?? "",
      })) as Loc[]);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load locations");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const startNew = async () => {
    setEditing(null);
    setForm({ ...empty, code: "AUTO" });
    setNoSeriesLineId("");
    setOpen(true);
  };
  const startEdit = (r: Loc) => {
    setEditing(r);
    setForm({ code: r.code, name: r.name, state_code: r.state_code ?? "" });
    setOpen(true);
  };
  const save = async () => {
    try {
      const payload = {
        ...form,
        state: form.state_code || null,
        no_series_line_id: noSeriesLineId || undefined,
      };

      if (editing) {
        await api.put(`/locations/${editing.id}`, payload);
      } else {
        await api.post("/locations", payload);
      }

      toast.success(editing ? "Updated" : "Created");
      setOpen(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save location");
    }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this location?")) return;
    try {
      await api.delete(`/locations/${id}`);
      toast.success("Deleted");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete location");
    }
  };

  const openInventory = async (loc: Loc) => {
    setInvLoc(loc);
    setInvOpen(true);
    setNewItemId(""); setNewQty(0);
    const itemRes = await api.get("/items");
    setStocks([]);
    setItems((itemRes.data ?? []) as Item[]);
  };

  const updateStockQty = async (row: Stock, qty: number) => {
    setStocks((p) => p.map((x) => (x.id === row.id ? { ...x, quantity: qty } : x)));
    toast.info("Inventory quantity API is not connected yet");
  };
  const removeStock = async (row: Stock) => {
    if (!confirm(`Remove ${row.item_no} from ${row.location_code}?`)) return;
    setStocks((p) => p.filter((x) => x.id !== row.id));
  };
  const addStock = async () => {
    if (!invLoc || !newItemId) return toast.error("Pick an item");
    const item = items.find((i) => i.id === newItemId);
    if (!item) return;
    setStocks((p) => [...p, {
      id: `${item.id}-${invLoc.code}`,
      item_id: item.id,
      item_no: item.item_no,
      location_code: invLoc.code,
      quantity: newQty,
      items: { description: item.description },
    }]);
    setNewItemId(""); setNewQty(0);
  };

  return (
    <div>
      <PageHeader
        title="Locations"
        subtitle="Location master & on-hand inventory"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" /> New</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>{editing ? "Edit Location" : "New Location"}</DialogTitle></DialogHeader>
              <div className="grid grid-cols-1 gap-3">
                <Field label="Code" value={form.code} onChange={(v) => setForm({ ...form, code: v })} />
                {!editing && (
                  <MasterNoSeriesSelect
                    value={noSeriesLineId}
                    keywords={["LOCATION", "LOC"]}
                    onChange={setNoSeriesLineId}
                  />
                )}
                <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                <div>
                  <Label className="text-xs">State Code</Label>
                  <StateSelect
                    value={form.state_code}
                    onChange={(value) => setForm({ ...form, state_code: value || "" })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="p-6">
        <div className="rounded border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>State Code</TableHead>
                <TableHead className="w-40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No locations yet.</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-primary">{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.state_code}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => openInventory(r)}>
                      <Boxes className="h-4 w-4 mr-1" /> Inventory
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={invOpen} onOpenChange={setInvOpen}>
        <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Inventory at {invLoc?.code} — {invLoc?.name}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="rounded border p-3 grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
              <div className="md:col-span-2">
                <Label className="text-xs">Add Item</Label>
                <Select value={newItemId} onValueChange={setNewItemId}>
                  <SelectTrigger><SelectValue placeholder="Select item…" /></SelectTrigger>
                  <SelectContent>
                    {items.map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.item_no} — {i.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Quantity</Label>
                  <Input type="number" value={newQty} onChange={(e) => setNewQty(Number(e.target.value))} />
                </div>
                <Button className="self-end" onClick={addStock}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="rounded border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item No.</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right w-32">Quantity</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocks.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No stock at this location yet.</TableCell></TableRow>
                  ) : stocks.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.item_no}</TableCell>
                      <TableCell className="text-muted-foreground">{s.items?.description ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          className="h-8 text-right"
                          value={s.quantity}
                          onChange={(e) => setStocks((p) => p.map((x) => x.id === s.id ? { ...x, quantity: Number(e.target.value) } : x))}
                          onBlur={(e) => updateStockQty(s, Number(e.target.value))}
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => removeStock(s)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground">Editing a quantity here updates the per-location stock. The item's total inventory is recomputed automatically.</p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
