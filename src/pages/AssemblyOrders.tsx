import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Plus, Save } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { toDateInput, todayDateInput } from "@/lib/date";

type Row = {
  document_no: string;
  item_no: string;
  description?: string | null;
  quantity: number;
  quantity_to_assemble: number;
  remaining_quantity: number;
  posting_date?: string | null;
  due_date?: string | null;
  status: string;
};
type Item = { item_no: string; description?: string | null; base_unit_of_measure?: string | null };
type Location = { code: string; description?: string | null };
type Line = {
  id: number;
  available_warning?: boolean;
  type: string;
  item_no: string;
  description?: string | null;
  variant_code?: string | null;
  location_code?: string | null;
  unit_of_measure_code?: string | null;
  quantity_per: number;
  quantity_to_consume: number;
  consumed_quantity: number;
  remaining_quantity: number;
};
type Order = Row & {
  unit_of_measure_code?: string | null;
  location_code?: string | null;
  assembled_quantity?: number;
  starting_date?: string | null;
  ending_date?: string | null;
  assemble_to_order?: boolean;
  lines?: Line[];
};

const amount = (value: any, digits = 2) => Number(value ?? 0).toFixed(digits);

export function AssemblyOrderList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/assembly-orders");
      setRows(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load Assembly Orders");
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return term ? rows.filter((r) => [r.document_no, r.item_no, r.description, r.status].some((v) => String(v ?? "").toLowerCase().includes(term))) : rows;
  }, [rows, filter]);

  const createOrder = async () => {
    navigate("/assembly-orders/new");
  };

  return (
    <div>
      <PageHeader title="Assembly Orders" subtitle="Open assembly documents" actions={<Button onClick={createOrder}><Plus className="h-4 w-4" /> New</Button>} />
      <div className="p-6 space-y-3">
        <Input className="max-w-md" placeholder="Filter assembly orders..." value={filter} onChange={(e) => setFilter(e.target.value)} />
        <div className="overflow-x-auto rounded border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>No.</TableHead><TableHead>Item No.</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead className="text-right">Qty to Assemble</TableHead><TableHead className="text-right">Remaining</TableHead><TableHead>Posting Date</TableHead><TableHead>Due Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.document_no}>
                  <TableCell><Link className="font-medium text-primary" to={`/assembly-orders/${encodeURIComponent(row.document_no)}`}>{row.document_no}</Link></TableCell>
                  <TableCell>{row.item_no}</TableCell><TableCell>{row.description || "-"}</TableCell>
                  <TableCell className="text-right">{amount(row.quantity)}</TableCell><TableCell className="text-right">{amount(row.quantity_to_assemble)}</TableCell><TableCell className="text-right">{amount(row.remaining_quantity)}</TableCell>
                  <TableCell>{toDateInput(row.posting_date || "") || "-"}</TableCell><TableCell>{toDateInput(row.due_date || "") || "-"}</TableCell><TableCell>{row.status}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 ? <TableRow><TableCell colSpan={9} className="py-8 text-center text-muted-foreground">No Assembly Orders.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export function AssemblyOrderDetails() {
  const navigate = useNavigate();
  const { documentNo = "" } = useParams();
  const isNew = documentNo === "new";
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [order, setOrder] = useState<Order>({
    document_no: "AUTO",
    item_no: "",
    description: "",
    quantity: 0,
    quantity_to_assemble: 0,
    remaining_quantity: 0,
    assembled_quantity: 0,
    posting_date: todayDateInput(),
    due_date: "",
    starting_date: "",
    ending_date: "",
    status: "Open",
    location_code: "",
    unit_of_measure_code: "",
    assemble_to_order: false,
    lines: [],
  });
  const readOnly = order.status === "Posted";

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/assembly-orders/lookups/options");
      setItems(data.items ?? []);
      setLocations(data.locations ?? []);
    })().catch((err) => toast.error(err?.response?.data?.error || "Failed to load lookups"));
  }, []);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data } = await api.get(`/assembly-orders/${encodeURIComponent(documentNo)}`);
      setOrder(data);
    })().catch((err) => toast.error(err?.response?.data?.error || "Failed to load Assembly Order"));
  }, [documentNo, isNew]);

  const setField = (field: keyof Order, value: any) => setOrder((cur) => ({ ...cur, [field]: value }));
  const selectItem = (itemNo: string) => {
    const item = items.find((i) => i.item_no === itemNo);
    setOrder((cur) => ({
      ...cur,
      item_no: itemNo,
      description: item?.description ?? "",
      unit_of_measure_code: item?.base_unit_of_measure ?? "",
    }));
  };

  const save = async () => {
    try {
      const payload = { ...order, posting_date: toDateInput(order.posting_date || ""), due_date: toDateInput(order.due_date || ""), starting_date: toDateInput(order.starting_date || ""), ending_date: toDateInput(order.ending_date || "") };
      const { data } = isNew ? await api.post("/assembly-orders", payload) : await api.put(`/assembly-orders/${encodeURIComponent(order.document_no)}`, payload);
      setOrder(data);
      toast.success("Assembly Order saved");
      if (isNew) navigate(`/assembly-orders/${encodeURIComponent(data.document_no)}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save Assembly Order");
    }
  };
  const release = async () => {
    const { data } = await api.post(`/assembly-orders/${encodeURIComponent(order.document_no)}/release`);
    setOrder(data);
    toast.success("Assembly Order released");
  };
  const post = async () => {
    try {
      const { data } = await api.post(`/assembly-orders/${encodeURIComponent(order.document_no)}/post`, { posting_date: order.posting_date });
      toast.success(`Posted Assembly Order ${data.document_no} created`);
      navigate(`/posted-assembly-orders/${encodeURIComponent(data.document_no)}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to post Assembly Order");
    }
  };

  return (
    <div>
      <PageHeader title="Assembly Order" subtitle={order.document_no} actions={<div className="flex gap-2"><Button variant="outline" onClick={() => navigate("/assembly-orders")}><ArrowLeft className="h-4 w-4" /> Back</Button>{!readOnly && <Button onClick={save}><Save className="h-4 w-4" /> Save</Button>}{!readOnly && !isNew && <Button variant="outline" onClick={release}>Release</Button>}{!readOnly && !isNew && <Button onClick={post}>Post</Button>}</div>} />
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">General</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="No."><Input value={order.document_no} readOnly /></Field>
            <Field label="Item No."><Select value={order.item_no || "__none__"} disabled={readOnly} onValueChange={(v) => selectItem(v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select Item" /></SelectTrigger><SelectContent><SelectItem value="__none__">Select Item</SelectItem>{items.map((item) => <SelectItem key={item.item_no} value={item.item_no}>{item.item_no} - {item.description || ""}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Description"><Input value={order.description || ""} readOnly={readOnly} onChange={(e) => setField("description", e.target.value)} /></Field>
            <Field label="Quantity"><Input inputMode="decimal" value={order.quantity ?? ""} readOnly={readOnly} onChange={(e) => { setField("quantity", e.target.value); setField("quantity_to_assemble", e.target.value); }} /></Field>
            <Field label="Quantity to Assemble"><Input inputMode="decimal" value={order.quantity_to_assemble ?? ""} readOnly={readOnly} onChange={(e) => setField("quantity_to_assemble", e.target.value)} /></Field>
            <Field label="Unit of Measure Code"><Input value={order.unit_of_measure_code || ""} readOnly /></Field>
            <Field label="Posting Date"><Input type="date" value={toDateInput(order.posting_date || "")} readOnly={readOnly} onChange={(e) => setField("posting_date", e.target.value)} /></Field>
            <Field label="Due Date"><Input type="date" value={toDateInput(order.due_date || "")} readOnly={readOnly} onChange={(e) => setField("due_date", e.target.value)} /></Field>
            <Field label="Starting Date"><Input type="date" value={toDateInput(order.starting_date || "")} readOnly={readOnly} onChange={(e) => setField("starting_date", e.target.value)} /></Field>
            <Field label="Ending Date"><Input type="date" value={toDateInput(order.ending_date || "")} readOnly={readOnly} onChange={(e) => setField("ending_date", e.target.value)} /></Field>
            <Field label="Location Code"><Select value={order.location_code || "__none__"} disabled={readOnly} onValueChange={(v) => setField("location_code", v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select Location" /></SelectTrigger><SelectContent><SelectItem value="__none__">Select Location</SelectItem>{locations.map((loc) => <SelectItem key={loc.code} value={loc.code}>{loc.code} - {loc.description || ""}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Remaining Quantity"><Input value={amount(order.remaining_quantity)} readOnly /></Field>
            <Field label="Assembled Quantity"><Input value={amount(order.assembled_quantity)} readOnly /></Field>
            <div className="flex items-center justify-between rounded border px-3 py-2"><Label>Assemble to Order</Label><Switch checked={Boolean(order.assemble_to_order)} disabled={readOnly} onCheckedChange={(v) => setField("assemble_to_order", v)} /></div>
            <Field label="Status"><Input value={order.status} readOnly /></Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Lines</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded border">
              <Table>
                <TableHeader><TableRow><TableHead>Avail. Warning</TableHead><TableHead>Type</TableHead><TableHead>No.</TableHead><TableHead>Description</TableHead><TableHead>Variant</TableHead><TableHead>Location</TableHead><TableHead>UOM</TableHead><TableHead className="text-right">Qty Per</TableHead><TableHead className="text-right">Qty to Consume</TableHead><TableHead className="text-right">Consumed</TableHead><TableHead className="text-right">Remaining</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(order.lines ?? []).map((line) => <TableRow key={line.id}><TableCell>{line.available_warning ? "Yes" : "No"}</TableCell><TableCell>{line.type}</TableCell><TableCell>{line.item_no}</TableCell><TableCell>{line.description || "-"}</TableCell><TableCell>{line.variant_code || "-"}</TableCell><TableCell>{line.location_code || "-"}</TableCell><TableCell>{line.unit_of_measure_code || "-"}</TableCell><TableCell className="text-right">{amount(line.quantity_per, 4)}</TableCell><TableCell className="text-right">{amount(line.quantity_to_consume)}</TableCell><TableCell className="text-right">{amount(line.consumed_quantity)}</TableCell><TableCell className="text-right">{amount(line.remaining_quantity)}</TableCell></TableRow>)}
                  {(order.lines ?? []).length === 0 ? <TableRow><TableCell colSpan={11} className="py-8 text-center text-muted-foreground">Save order to load Assembly BOM lines.</TableCell></TableRow> : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
