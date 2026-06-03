import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NumericInput } from "@/components/ui/NumericInput";
import { api } from "@/lib/api";

type Item = { item_no: string; description?: string | null; base_unit_of_measure?: string | null };
type Location = { code: string; description?: string | null };
type BomLine = {
  id?: number;
  type: string;
  item_no: string;
  description?: string | null;
  variant_code?: string | null;
  location_code?: string | null;
  quantity_per: string | number;
  unit_of_measure_code?: string | null;
};

const blankLine = (): BomLine => ({
  type: "Item",
  item_no: "",
  description: "",
  variant_code: "",
  location_code: "",
  quantity_per: "",
  unit_of_measure_code: "",
});

export default function AssemblyBOM() {
  const { itemNo = "" } = useParams();
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [parentItemNo, setParentItemNo] = useState("");
  const [lines, setLines] = useState<BomLine[]>([]);
  const [draft, setDraft] = useState<BomLine>(blankLine());

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/assembly-bom/lookups/options");
        setItems(data.items ?? []);
        setLocations(data.locations ?? []);
      } catch (err: any) {
        toast.error(err?.response?.data?.error || "Failed to load Assembly BOM lookups");
      }
    })();
  }, []);

  useEffect(() => {
    if (itemNo) {
      setParentItemNo(itemNo);
      loadBom(itemNo);
    }
  }, [itemNo]);

  const itemByNo = useMemo(() => new Map(items.map((item) => [item.item_no, item])), [items]);
  const parentItem = itemByNo.get(parentItemNo);

  const loadBom = async (itemNo: string) => {
    if (!itemNo) {
      setLines([]);
      return;
    }
    try {
      const { data } = await api.get(`/assembly-bom/${encodeURIComponent(itemNo)}`);
      setLines(data.lines ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load Assembly BOM");
    }
  };

  const selectComponent = (itemNo: string) => {
    const item = itemByNo.get(itemNo);
    setDraft((current) => ({
      ...current,
      item_no: itemNo,
      description: item?.description ?? "",
      unit_of_measure_code: item?.base_unit_of_measure ?? "",
    }));
  };

  const addLine = async () => {
    if (!parentItemNo) return toast.error("Select parent Assembly Item first.");
    if (!draft.item_no) return toast.error("Component Item No. is required.");
    if (Number(draft.quantity_per || 0) <= 0) return toast.error("Quantity Per must be greater than 0.");
    try {
      await api.post(`/assembly-bom/${encodeURIComponent(parentItemNo)}/lines`, draft);
      setDraft(blankLine());
      loadBom(parentItemNo);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to add Assembly BOM line");
    }
  };

  const deleteLine = async (id?: number) => {
    if (!id) return;
    try {
      await api.delete(`/assembly-bom/lines/${id}`);
      loadBom(parentItemNo);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete Assembly BOM line");
    }
  };

  return (
    <div>
      <PageHeader title="Assembly BOM" subtitle="Component list for assembly items" />
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">General</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Assembly Item No.</Label>
              <Select value={parentItemNo || "__none__"} onValueChange={(value) => { const next = value === "__none__" ? "" : value; setParentItemNo(next); loadBom(next); }}>
                <SelectTrigger><SelectValue placeholder="Select Assembly Item" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select Assembly Item</SelectItem>
                  {items.map((item) => <SelectItem key={item.item_no} value={item.item_no}>{item.item_no} - {item.description || ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Description</Label><Input value={parentItem?.description || ""} readOnly /></div>
            <div className="space-y-2"><Label>UOM</Label><Input value={parentItem?.base_unit_of_measure || ""} readOnly /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Lines</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead><TableHead>No.</TableHead><TableHead>Description</TableHead><TableHead>Location</TableHead><TableHead>UOM</TableHead><TableHead className="text-right">Quantity Per</TableHead><TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>
                      <Select value={draft.item_no || "__none__"} onValueChange={(value) => selectComponent(value === "__none__" ? "" : value)}>
                        <SelectTrigger><SelectValue placeholder="Select Item" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Select Item</SelectItem>
                          {items.map((item) => <SelectItem key={item.item_no} value={item.item_no}>{item.item_no} - {item.description || ""}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input value={draft.description || ""} readOnly /></TableCell>
                    <TableCell>
                      <Select value={draft.location_code || "__none__"} onValueChange={(value) => setDraft({ ...draft, location_code: value === "__none__" ? "" : value })}>
                        <SelectTrigger><SelectValue placeholder="Location" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Location</SelectItem>
                          {locations.map((loc) => <SelectItem key={loc.code} value={loc.code}>{loc.code} - {loc.description || ""}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input value={draft.unit_of_measure_code || ""} readOnly /></TableCell>
                    <TableCell><NumericInput className="text-right" value={draft.quantity_per} min={0} decimalScale={4} onChange={(value) => setDraft({ ...draft, quantity_per: value })} /></TableCell>
                    <TableCell><Button onClick={addLine} size="sm"><Plus className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                  {lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.type}</TableCell>
                      <TableCell>{line.item_no}</TableCell>
                      <TableCell>{line.description || "-"}</TableCell>
                      <TableCell>{line.location_code || "-"}</TableCell>
                      <TableCell>{line.unit_of_measure_code || "-"}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(line.quantity_per || 0).toFixed(4)}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => deleteLine(line.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
