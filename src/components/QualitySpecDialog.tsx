import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { UomSelect } from "@/components/UomSelect";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/NumericInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type QualityType = "Range" | "Minimum" | "Maximum" | "Fixed";

type Spec = {
  id?: string | number;
  item_no: string;
  section_code: string | null;
  quality_specific: string;
  unit_of_measure_code: string | null;
  quality_type: QualityType;
  quality_from: string | number;
  quality_to: string | number;
  standard_value: string | null;
  is_active?: boolean;
};

const blankSpec = (itemNo = ""): Spec => ({
  item_no: itemNo,
  section_code: "",
  quality_specific: "",
  unit_of_measure_code: "",
  quality_type: "Range",
  quality_from: "",
  quality_to: "",
  standard_value: "",
  is_active: true,
});

const qualityTypes: QualityType[] = ["Range", "Minimum", "Maximum", "Fixed"];

const num = (value: any) => Number(value ?? 0) || 0;

function validateSpec(spec: Spec) {
  if (!spec.quality_specific?.trim()) {
    toast.error("Quality Specific is required.");
    return false;
  }

  if (!spec.quality_type) {
    toast.error("Quality Type is required.");
    return false;
  }

  if (num(spec.quality_from) < 0 || num(spec.quality_to) < 0) {
    toast.error("Quality numeric limits cannot be negative.");
    return false;
  }

  if (spec.quality_type === "Range" && num(spec.quality_from) > num(spec.quality_to)) {
    toast.error("Quality From must be less than or equal to Quality To.");
    return false;
  }

  if (spec.quality_type === "Fixed" && !String(spec.standard_value || "").trim()) {
    toast.error("Standard Value is required when Quality Type is Fixed.");
    return false;
  }

  return true;
}

function normalizePayload(spec: Spec) {
  return {
    ...spec,
    section_code: spec.section_code || null,
    unit_of_measure_code: spec.unit_of_measure_code || null,
    quality_from: num(spec.quality_from),
    quality_to: num(spec.quality_to),
    standard_value: spec.standard_value === "" ? null : spec.standard_value,
    is_active: spec.is_active !== false,
  };
}

export function QualitySpecDialog({
  open,
  onOpenChange,
  itemId,
  itemNo,
  itemDescription,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itemId: string | null;
  itemNo?: string;
  itemDescription?: string;
}) {
  const [rows, setRows] = useState<Spec[]>([]);
  const [draft, setDraft] = useState<Spec>(blankSpec(itemNo));
  const [loading, setLoading] = useState(false);

  const itemKey = itemNo || itemId || "";

  const load = async () => {
    if (!itemKey) return;
    setLoading(true);
    try {
      let data: any[] = [];
      try {
        const response = await api.get(
          `/items/${encodeURIComponent(itemKey)}/quality-specifications`
        );
        data = response.data;
      } catch (nestedErr: any) {
        if (nestedErr?.response?.status !== 404 || !itemId) throw nestedErr;
        const fallback = await api.get("/item-quality-specs", {
          params: { item_id: itemId },
        });
        data = fallback.data;
      }
      setRows(Array.isArray(data) ? data : []);
      setDraft(blankSpec(itemNo || ""));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load quality specifications");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && itemKey) load();
  }, [open, itemKey]);

  const addRow = async () => {
    if (!itemKey) return;
    const next = { ...draft, item_no: itemNo || "" };
    if (!validateSpec(next)) return;

    try {
      try {
        await api.post(
          `/items/${encodeURIComponent(itemKey)}/quality-specifications`,
          normalizePayload(next)
        );
      } catch (nestedErr: any) {
        if (nestedErr?.response?.status !== 404 || !itemId) throw nestedErr;
        await api.post("/item-quality-specs", {
          ...normalizePayload(next),
          item_id: itemId,
        });
      }
      toast.success("Quality specification added");
      setDraft(blankSpec(itemNo || ""));
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to create quality specification");
    }
  };

  const patchRow = (id: string | number | undefined, patch: Partial<Spec>) => {
    if (!id) return;
    setRows((currentRows) =>
      currentRows.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  };

  const persistRow = async (row: Spec) => {
    if (!row.id) return;
    if (!validateSpec(row)) {
      load();
      return;
    }

    try {
      try {
        await api.put(`/item-quality-specifications/${row.id}`, normalizePayload(row));
      } catch (nestedErr: any) {
        if (nestedErr?.response?.status !== 404) throw nestedErr;
        await api.put(`/item-quality-specs/${row.id}`, normalizePayload(row));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update quality specification");
      load();
    }
  };

  const updateAndPersist = async (row: Spec, patch: Partial<Spec>) => {
    const next = { ...row, ...patch };
    patchRow(row.id, patch);
    await persistRow(next);
  };

  const removeRow = async (id: string | number | undefined) => {
    if (!id) return;
    if (!confirm("Delete this quality specification?")) return;

    try {
      try {
        await api.delete(`/item-quality-specifications/${id}`);
      } catch (nestedErr: any) {
        if (nestedErr?.response?.status !== 404) throw nestedErr;
        await api.delete(`/item-quality-specs/${id}`);
      }
      setRows((currentRows) => currentRows.filter((row) => row.id !== id));
      toast.success("Quality specification deleted");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete quality specification");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-3rem)] max-w-7xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            Quality Specification List
            {itemNo ? (
              <span className="ml-2 text-sm text-muted-foreground">
                - {itemNo} {itemDescription}
              </span>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            Define reusable item quality limits for future inspection flows.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[68vh] overflow-auto rounded border bg-card">
          <Table className="min-w-[1180px] table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px] px-4">Section Code</TableHead>
                <TableHead className="w-[230px] px-4">Quality Specific</TableHead>
                <TableHead className="w-[210px] px-4">Unit of Measure Code</TableHead>
                <TableHead className="w-[150px] px-4">Quality Type</TableHead>
                <TableHead className="w-[140px] px-4 text-right">Quality From</TableHead>
                <TableHead className="w-[140px] px-4 text-right">Quality To</TableHead>
                <TableHead className="w-[210px] px-4">Standard Value</TableHead>
                <TableHead className="w-[110px] px-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="px-4 align-middle">
                  <Input
                    className="h-9 w-full"
                    value={draft.section_code ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        section_code: event.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="FINISHED"
                  />
                </TableCell>
                <TableCell className="px-4 align-middle">
                  <Input
                    className="h-9 w-full"
                    value={draft.quality_specific}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        quality_specific: event.target.value,
                      }))
                    }
                    placeholder="Weight"
                  />
                </TableCell>
                <TableCell className="px-4 align-middle">
                  <UomSelect
                    value={draft.unit_of_measure_code}
                    className="h-9 w-full"
                    onChange={(value) =>
                      setDraft((current) => ({ ...current, unit_of_measure_code: value }))
                    }
                  />
                </TableCell>
                <TableCell className="px-4 align-middle">
                  <QualityTypeSelect
                    value={draft.quality_type}
                    onChange={(value) =>
                      setDraft((current) => ({ ...current, quality_type: value }))
                    }
                  />
                </TableCell>
                <TableCell className="px-4 align-middle">
                  <NumericInput
                    className="h-9 w-full text-right"
                    min={0}
                    decimalScale={4}
                    value={draft.quality_from}
                    onChange={(value) =>
                      setDraft((current) => ({ ...current, quality_from: value }))
                    }
                  />
                </TableCell>
                <TableCell className="px-4 align-middle">
                  <NumericInput
                    className="h-9 w-full text-right"
                    min={0}
                    decimalScale={4}
                    value={draft.quality_to}
                    onChange={(value) =>
                      setDraft((current) => ({ ...current, quality_to: value }))
                    }
                  />
                </TableCell>
                <TableCell className="px-4 align-middle">
                  <Input
                    className="h-9 w-full"
                    value={draft.standard_value ?? ""}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        standard_value: event.target.value,
                      }))
                    }
                    placeholder="500 or Golden Brown"
                  />
                </TableCell>
                <TableCell className="px-4 text-right align-middle">
                  <Button size="sm" onClick={addRow}>
                    <Plus className="mr-1 h-4 w-4" />
                    New
                  </Button>
                </TableCell>
              </TableRow>

              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                    No specifications. Fill the first row and click New to add.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="px-4 align-middle">
                      <Input
                        className="h-9 w-full"
                        value={row.section_code ?? ""}
                        onChange={(event) =>
                          patchRow(row.id, { section_code: event.target.value.toUpperCase() })
                        }
                        onBlur={(event) =>
                          updateAndPersist(row, { section_code: event.currentTarget.value.toUpperCase() })
                        }
                      />
                    </TableCell>
                    <TableCell className="px-4 align-middle">
                      <Input
                        className="h-9 w-full"
                        value={row.quality_specific}
                        onChange={(event) =>
                          patchRow(row.id, { quality_specific: event.target.value })
                        }
                        onBlur={(event) =>
                          updateAndPersist(row, { quality_specific: event.currentTarget.value })
                        }
                      />
                    </TableCell>
                    <TableCell className="px-4 align-middle">
                      <UomSelect
                        value={row.unit_of_measure_code}
                        className="h-9 w-full"
                        onChange={(value) => updateAndPersist(row, { unit_of_measure_code: value })}
                      />
                    </TableCell>
                    <TableCell className="px-4 align-middle">
                      <QualityTypeSelect
                        value={row.quality_type}
                        onChange={(value) => updateAndPersist(row, { quality_type: value })}
                      />
                    </TableCell>
                    <TableCell className="px-4 align-middle">
                      <NumericInput
                        className="h-9 w-full text-right"
                        min={0}
                        decimalScale={4}
                        value={row.quality_from}
                        onChange={(value) => patchRow(row.id, { quality_from: value })}
                        onBlur={(event) =>
                          updateAndPersist(row, { quality_from: event.currentTarget.value })
                        }
                      />
                    </TableCell>
                    <TableCell className="px-4 align-middle">
                      <NumericInput
                        className="h-9 w-full text-right"
                        min={0}
                        decimalScale={4}
                        value={row.quality_to}
                        onChange={(value) => patchRow(row.id, { quality_to: value })}
                        onBlur={(event) =>
                          updateAndPersist(row, { quality_to: event.currentTarget.value })
                        }
                      />
                    </TableCell>
                    <TableCell className="px-4 align-middle">
                      <Input
                        className="h-9 w-full"
                        value={row.standard_value ?? ""}
                        onChange={(event) =>
                          patchRow(row.id, { standard_value: event.target.value })
                        }
                        onBlur={(event) =>
                          updateAndPersist(row, { standard_value: event.currentTarget.value })
                        }
                      />
                    </TableCell>
                    <TableCell className="px-4 text-right align-middle">
                      <Button size="icon" variant="ghost" onClick={() => persistRow(row)}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => removeRow(row.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QualityTypeSelect({
  value,
  onChange,
}: {
  value: QualityType;
  onChange: (value: QualityType) => void;
}) {
  return (
    <Select value={value || "Range"} onValueChange={(next) => onChange(next as QualityType)}>
      <SelectTrigger className="h-9 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {qualityTypes.map((type) => (
          <SelectItem key={type} value={type}>
            {type}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
