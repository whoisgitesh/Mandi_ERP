import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { ItemCategorySelect } from "@/components/ItemCategorySelect";
import { UomSelect } from "@/components/UomSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type ItemCategory = {
  code: string;
  description: string;
  parent_category_code?: string | null;
  parent_description?: string | null;
  is_active: boolean;
  item_count?: number;
};

type AttributeRow = {
  id?: number;
  category_code?: string | null;
  attribute_name: string;
  default_value?: string | null;
  unit_of_measure_code?: string | null;
  inherited_from?: string | null;
};

type CategoryDetail = ItemCategory & {
  attributes: AttributeRow[];
  inherited_attributes: AttributeRow[];
};

const emptyCategory: ItemCategory = {
  code: "",
  description: "",
  parent_category_code: "",
  is_active: true,
};

const emptyAttribute: AttributeRow = {
  attribute_name: "",
  default_value: "",
  unit_of_measure_code: "",
};

function flattenTree(rows: ItemCategory[]) {
  const byParent = new Map<string, ItemCategory[]>();
  rows.forEach((row) => {
    const parent = row.parent_category_code || "";
    byParent.set(parent, [...(byParent.get(parent) || []), row]);
  });

  byParent.forEach((children) =>
    children.sort((a, b) => a.code.localeCompare(b.code))
  );

  const output: Array<ItemCategory & { depth: number }> = [];
  const visited = new Set<string>();

  function walk(parent: string, depth: number) {
    for (const child of byParent.get(parent) || []) {
      if (visited.has(child.code)) continue;
      visited.add(child.code);
      output.push({ ...child, depth });
      walk(child.code, depth + 1);
    }
  }

  walk("", 0);
  rows
    .filter((row) => !visited.has(row.code))
    .sort((a, b) => a.code.localeCompare(b.code))
    .forEach((row) => output.push({ ...row, depth: 0 }));

  return output;
}

export function ItemCategoryList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ItemCategory[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/item-categories");
      setRows(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load item categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const tree = flattenTree(rows);
    if (!term) return tree;

    return tree.filter((row) =>
      [
        row.code,
        row.description,
        row.parent_category_code,
        row.parent_description,
      ].some((value) => String(value || "").toLowerCase().includes(term))
    );
  }, [query, rows]);

  const deactivate = async (row: ItemCategory) => {
    if (!confirm(`Delete or deactivate item category ${row.code}?`)) return;

    try {
      const { data } = await api.delete(`/item-categories/${encodeURIComponent(row.code)}`);
      toast.success(data?.deactivated ? "Item category deactivated" : "Item category deleted");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete item category");
    }
  };

  return (
    <div>
      <PageHeader
        title="Item Categories"
        subtitle="Manual item classification codes with parent-child hierarchy"
        actions={
          <Button onClick={() => navigate("/item-categories/new")}>
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
            placeholder="Filter by code, description, parent category..."
            className="max-w-md"
          />
          <span className="text-xs text-muted-foreground">
            {filtered.length} categories
          </span>
        </div>

        <div className="overflow-x-auto rounded border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Parent Category</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                    No item categories.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.code}>
                    <TableCell>
                      <div
                        className="flex items-center gap-2 font-medium text-primary"
                        style={{ paddingLeft: `${row.depth * 24}px` }}
                      >
                        {row.depth > 0 && <span className="text-muted-foreground">└</span>}
                        <Link to={`/item-categories/${encodeURIComponent(row.code)}`}>
                          {row.code}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>{row.description || "-"}</TableCell>
                    <TableCell>
                      {row.parent_category_code
                        ? `${row.parent_category_code}${row.parent_description ? ` - ${row.parent_description}` : ""}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.is_active !== false ? "default" : "secondary"}>
                        {row.is_active !== false ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/item-categories/${encodeURIComponent(row.code)}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/item-categories/${encodeURIComponent(row.code)}`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deactivate(row)}>
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

export function ItemCategoryCard() {
  const navigate = useNavigate();
  const { code } = useParams();
  const isNew = !code || code === "new";

  const [form, setForm] = useState<ItemCategory>(emptyCategory);
  const [attributes, setAttributes] = useState<AttributeRow[]>([]);
  const [inheritedAttributes, setInheritedAttributes] = useState<AttributeRow[]>([]);
  const [draftAttribute, setDraftAttribute] = useState<AttributeRow>(emptyAttribute);
  const [loading, setLoading] = useState(!isNew);

  const load = async () => {
    if (isNew || !code) return;

    try {
      setLoading(true);
      const { data } = await api.get<CategoryDetail>(
        `/item-categories/${encodeURIComponent(code)}`
      );
      setForm({
        code: data.code,
        description: data.description || "",
        parent_category_code: data.parent_category_code || "",
        is_active: data.is_active !== false,
      });
      setAttributes(Array.isArray(data.attributes) ? data.attributes : []);
      setInheritedAttributes(
        Array.isArray(data.inherited_attributes) ? data.inherited_attributes : []
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load item category");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [code]);

  const save = async () => {
    if (!form.code.trim()) return toast.error("Code is required.");
    if (!form.description.trim()) return toast.error("Description is required.");

    const payload = {
      ...form,
      code: form.code.trim().toUpperCase(),
      parent_category_code: form.parent_category_code || null,
    };

    try {
      if (isNew) {
        const { data } = await api.post("/item-categories", payload);
        toast.success("Item category created");
        navigate(`/item-categories/${encodeURIComponent(data.code)}`);
      } else {
        await api.put(`/item-categories/${encodeURIComponent(form.code)}`, payload);
        toast.success("Item category updated");
        load();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save item category");
    }
  };

  const addAttribute = async () => {
    if (isNew) return toast.error("Save the item category before adding attributes.");
    if (!draftAttribute.attribute_name.trim()) return toast.error("Attribute is required.");

    try {
      await api.post(`/item-categories/${encodeURIComponent(form.code)}/attributes`, draftAttribute);
      setDraftAttribute(emptyAttribute);
      toast.success("Attribute added");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to add attribute");
    }
  };

  const updateAttribute = async (row: AttributeRow, patch: Partial<AttributeRow>) => {
    if (!row.id) return;
    const next = { ...row, ...patch };
    setAttributes((current) =>
      current.map((item) => (item.id === row.id ? next : item))
    );

    try {
      await api.put(`/item-categories/attributes/${row.id}`, next);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update attribute");
      load();
    }
  };

  const deleteAttribute = async (row: AttributeRow) => {
    if (!row.id) return;
    if (!confirm(`Delete attribute ${row.attribute_name}?`)) return;

    try {
      await api.delete(`/item-categories/attributes/${row.id}`);
      toast.success("Attribute deleted");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete attribute");
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading item category...
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Item Category Card"
        subtitle={isNew ? "New manual category code" : form.code}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/item-categories")}>
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
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Code *">
              <Input
                value={form.code}
                disabled={!isNew}
                maxLength={50}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    code: event.target.value.toUpperCase().replace(/\s/g, ""),
                  }))
                }
              />
            </Field>
            <Field label="Parent Category">
              <ItemCategorySelect
                value={form.parent_category_code || ""}
                excludeCode={form.code}
                placeholder="Select Parent Category..."
                onChange={(value) =>
                  setForm((current) => ({ ...current, parent_category_code: value }))
                }
              />
            </Field>
            <Field label="Description *">
              <Input
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </Field>
            <div className="flex h-10 items-center justify-between rounded-md border px-3">
              <Label className="text-sm">Active</Label>
              <Switch
                checked={form.is_active !== false}
                onCheckedChange={(value) =>
                  setForm((current) => ({ ...current, is_active: value }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attributes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-64">Attribute</TableHead>
                    <TableHead className="min-w-56">Default Value</TableHead>
                    <TableHead className="min-w-48">Unit of Measure</TableHead>
                    <TableHead className="min-w-40">Inherited From</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inheritedAttributes.map((row, index) => (
                    <TableRow key={`inherited-${row.inherited_from}-${row.id || index}`}>
                      <TableCell>{row.attribute_name}</TableCell>
                      <TableCell>{row.default_value || "-"}</TableCell>
                      <TableCell>{row.unit_of_measure_code || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.inherited_from}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        Inherited
                      </TableCell>
                    </TableRow>
                  ))}

                  {attributes.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Input
                          value={row.attribute_name || ""}
                          onChange={(event) =>
                            updateAttribute(row, { attribute_name: event.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.default_value || ""}
                          onChange={(event) =>
                            updateAttribute(row, { default_value: event.target.value })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <UomSelect
                          value={row.unit_of_measure_code || ""}
                          onChange={(value) => updateAttribute(row, { unit_of_measure_code: value })}
                        />
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => deleteAttribute(row)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {!isNew && (
                    <TableRow>
                      <TableCell>
                        <Input
                          placeholder="Attribute"
                          value={draftAttribute.attribute_name}
                          onChange={(event) =>
                            setDraftAttribute((current) => ({
                              ...current,
                              attribute_name: event.target.value,
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Default Value"
                          value={draftAttribute.default_value || ""}
                          onChange={(event) =>
                            setDraftAttribute((current) => ({
                              ...current,
                              default_value: event.target.value,
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <UomSelect
                          value={draftAttribute.unit_of_measure_code || ""}
                          onChange={(value) =>
                            setDraftAttribute((current) => ({
                              ...current,
                              unit_of_measure_code: value,
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={addAttribute}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}

                  {isNew && inheritedAttributes.length === 0 && attributes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Save the category before adding attributes.
                      </TableCell>
                    </TableRow>
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
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
