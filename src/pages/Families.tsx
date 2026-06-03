import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { NumericInput } from "@/components/ui/NumericInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Family = {
  family_no: string;
  description: string;
  description_2?: string | null;
  search_name?: string | null;
  item_category_code?: string | null;
  item_category_description?: string | null;
  routing_no?: string | null;
  blocked?: boolean;
  last_date_modified?: string | null;
  item_count?: number;
};

type ItemOption = {
  item_no: string;
  description?: string | null;
  base_unit_of_measure?: string | null;
  item_category_code?: string | null;
  family_no?: string | null;
};

type FamilyLine = {
  id?: number;
  line_no?: number;
  item_no: string;
  description?: string | null;
  unit_of_measure_code?: string | null;
  quantity: string | number;
};

type FamilyDetail = Family & {
  lines: FamilyLine[];
};

const emptyFamily: Family = {
  family_no: "",
  description: "",
  description_2: "",
  search_name: "",
  item_category_code: "",
  routing_no: "",
  blocked: false,
  last_date_modified: "",
};

const blankLine = (): FamilyLine => ({
  item_no: "",
  description: "",
  unit_of_measure_code: "",
  quantity: "",
});

const dateOnly = (value: any) => (value ? String(value).slice(0, 10) : "");

const localDateOnly = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function FamilyList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Family[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/families");
      setRows(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load families");
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
        row.family_no,
        row.description,
        row.routing_no,
      ].some((value) => String(value || "").toLowerCase().includes(term))
    );
  }, [query, rows]);

  const remove = async (row: Family) => {
    if (!confirm(`Delete or block family ${row.family_no}?`)) return;

    try {
      const { data } = await api.delete(`/families/${encodeURIComponent(row.family_no)}`);
      toast.success(data?.deactivated ? "Family blocked because it is used by items" : "Family deleted");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete family");
    }
  };

  return (
    <div>
      <PageHeader
        title="Families"
        subtitle="Item family classification linked to item categories"
        actions={
          <Button onClick={() => navigate("/families/new")}>
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
            placeholder="Filter by no., description, routing no..."
            className="max-w-md"
          />
          <span className="text-xs text-muted-foreground">{filtered.length} families</span>
        </div>

        <div className="overflow-x-auto rounded border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No.</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Routing No.</TableHead>
                <TableHead>Blocked</TableHead>
                <TableHead>Last Date Modified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                    No families.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.family_no}>
                    <TableCell>
                      <Link
                        to={`/families/${encodeURIComponent(row.family_no)}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.family_no}
                      </Link>
                    </TableCell>
                    <TableCell>{row.description || "-"}</TableCell>
                    <TableCell>{row.routing_no || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={row.blocked ? "secondary" : "default"}>
                        {row.blocked ? "Blocked" : "Open"}
                      </Badge>
                    </TableCell>
                    <TableCell>{dateOnly(row.last_date_modified) || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/families/${encodeURIComponent(row.family_no)}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/families/${encodeURIComponent(row.family_no)}`)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(row)}>
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

export function FamilyCard() {
  const navigate = useNavigate();
  const { familyNo } = useParams();
  const isNew = !familyNo || familyNo === "new";

  const [form, setForm] = useState<Family>(emptyFamily);
  const [lines, setLines] = useState<FamilyLine[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [draft, setDraft] = useState<FamilyLine>(blankLine());
  const [loading, setLoading] = useState(!isNew);

  const itemByNo = useMemo(
    () => new Map(items.map((item) => [item.item_no, item])),
    [items]
  );

  const visibleItems = useMemo(() => {
    const category = String(form.item_category_code || "").toUpperCase();
    return items.filter((item) => !category || !item.item_category_code || item.item_category_code === category);
  }, [form.item_category_code, items]);

  const loadLookups = async () => {
    try {
      const { data } = await api.get("/families/lookups/options");
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load family lookups");
    }
  };

  const load = async () => {
    if (isNew || !familyNo) return;

    try {
      setLoading(true);
      const { data } = await api.get<FamilyDetail>(`/families/${encodeURIComponent(familyNo)}`);
      setForm({
        ...emptyFamily,
        ...data,
        item_category_code: data.item_category_code || "",
        last_date_modified: dateOnly(data.last_date_modified),
      });
      setLines(Array.isArray(data.lines) ? data.lines : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load family");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    load();
  }, [familyNo]);

  const set = (key: keyof Family, value: any) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (!form.family_no.trim()) return toast.error("Family No. is required.");
    if (!form.description.trim()) return toast.error("Description is required.");

    const payload = {
      ...form,
      family_no: form.family_no.trim().toUpperCase(),
      item_category_code: form.item_category_code || null,
      last_date_modified: localDateOnly(),
    };

    try {
      if (isNew) {
        const { data } = await api.post("/families", payload);
        toast.success("Family created");
        navigate(`/families/${encodeURIComponent(data.family_no)}`);
      } else {
        await api.put(`/families/${encodeURIComponent(form.family_no)}`, payload);
        toast.success("Family saved");
        load();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save family");
    }
  };

  const selectDraftItem = (itemNo: string) => {
    const item = itemByNo.get(itemNo);
    if (item && form.item_category_code && item.item_category_code && item.item_category_code !== form.item_category_code) {
      toast.warning("Selected item belongs to a different Item Category.");
    }

    setDraft((current) => ({
      ...current,
      item_no: itemNo,
      description: item?.description || "",
      unit_of_measure_code: item?.base_unit_of_measure || "",
    }));
  };

  const addLine = async () => {
    if (isNew) return toast.error("Save the Family before adding lines.");
    if (!draft.item_no) return toast.error("Item No. is required.");
    if (Number(draft.quantity || 0) < 0) return toast.error("Quantity cannot be negative.");

    try {
      await api.post(`/families/${encodeURIComponent(form.family_no)}/lines`, draft);
      setDraft(blankLine());
      toast.success("Family line added");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to add family line");
    }
  };

  const updateLine = async (row: FamilyLine, patch: Partial<FamilyLine>) => {
    if (!row.id) return;
    const next = { ...row, ...patch };
    setLines((current) => current.map((line) => (line.id === row.id ? next : line)));

    try {
      await api.put(`/families/lines/${row.id}`, next);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update family line");
      load();
    }
  };

  const deleteLine = async (row: FamilyLine) => {
    if (!row.id) return;
    if (!confirm(`Delete line ${row.item_no}?`)) return;

    try {
      await api.delete(`/families/lines/${row.id}`);
      toast.success("Family line deleted");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete family line");
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading family...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Family"
        subtitle={isNew ? "New Family" : `${form.family_no} · ${form.description}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/families")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={save}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
        }
      />

      <div className="space-y-5 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              General
              <Badge variant={form.blocked ? "secondary" : "outline"}>
                {form.blocked ? "Blocked" : "Open"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-10 gap-y-4 md:grid-cols-2">
            <Field label="No. *">
              <Input
                value={form.family_no}
                disabled={!isNew}
                maxLength={50}
                onChange={(event) =>
                  set("family_no", event.target.value.toUpperCase().replace(/\s/g, ""))
                }
              />
            </Field>
            <Field label="Description *">
              <Input value={form.description || ""} onChange={(event) => set("description", event.target.value)} />
            </Field>
            <Field label="Routing No.">
              <Input value={form.routing_no || ""} onChange={(event) => set("routing_no", event.target.value)} />
            </Field>
            <Field label="Description 2">
              <Input value={form.description_2 || ""} onChange={(event) => set("description_2", event.target.value)} />
            </Field>
            <Field label="Blocked">
              <Switch checked={Boolean(form.blocked)} onCheckedChange={(value) => set("blocked", value)} />
            </Field>
            <Field label="Search Name">
              <Input value={form.search_name || ""} onChange={(event) => set("search_name", event.target.value)} />
            </Field>
            <Field label="Last Date Modified">
              <Input value={dateOnly(form.last_date_modified)} readOnly />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Lines</CardTitle>
            <Button size="sm" onClick={addLine}>
              <Plus className="mr-2 h-4 w-4" />
              Add Line
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Line No.</TableHead>
                    <TableHead className="min-w-56">Item No.</TableHead>
                    <TableHead className="min-w-72">Description</TableHead>
                    <TableHead className="min-w-40">Unit of Measure Code</TableHead>
                    <TableHead className="min-w-36 text-right">Quantity</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-muted-foreground">New</TableCell>
                    <TableCell>
                      <Select
                        value={draft.item_no || "__none__"}
                        onValueChange={(value) => selectDraftItem(value === "__none__" ? "" : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Item" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Select Item</SelectItem>
                          {visibleItems.map((item) => (
                            <SelectItem key={item.item_no} value={item.item_no}>
                              {item.item_no} - {item.description || ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input value={draft.description || ""} readOnly />
                    </TableCell>
                    <TableCell>
                      <Input value={draft.unit_of_measure_code || ""} readOnly />
                    </TableCell>
                    <TableCell>
                      <NumericInput
                        className="text-right"
                        value={draft.quantity}
                        min={0}
                        decimalScale={2}
                        onChange={(value) => setDraft((current) => ({ ...current, quantity: value }))}
                      />
                    </TableCell>
                    <TableCell />
                  </TableRow>

                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No family lines.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>{line.line_no || "-"}</TableCell>
                        <TableCell className="font-medium text-primary">{line.item_no}</TableCell>
                        <TableCell>{line.description || "-"}</TableCell>
                        <TableCell>{line.unit_of_measure_code || "-"}</TableCell>
                        <TableCell>
                          <NumericInput
                            className="text-right"
                            value={line.quantity}
                            min={0}
                            decimalScale={2}
                            onChange={(value) => updateLine(line, { quantity: value })}
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteLine(line)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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
  return (
    <div className="grid grid-cols-[180px_1fr] items-center gap-3">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
