import { useEffect, useState } from "react";

import { api } from "@/lib/api";

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
import { NumericInput } from "@/components/ui/NumericInput";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { toast } from "sonner";

type Spec = {
  id: string | number;
  section_code: string | null;
  quality_specific: string;
  unit_of_measure_code: string | null;
  quality_type: string;
  quality_from: number;
  quality_to: number;
  standard_value: number | string | null;
};

type Reading = {
  id?: string | number;
  spec_id: string;
  section_code: string | null;
  quality_specific: string;
  unit_of_measure_code: string | null;
  quality_type: string;
  quality_from: number;
  quality_to: number;
  standard_value: number | null;
  actual_value: number | null;
  result: string | null;
  remarks: string | null;
};

function normalizeQualityType(type: string) {
  if (type === "Min") return "Minimum";
  if (type === "Max") return "Maximum";
  if (type === "Equal") return "Fixed";
  return type || "Range";
}

function evaluate(
  type: string,
  from: number,
  to: number,
  std: number | null,
  actual: number | null
): string | null {
  if (actual === null || Number.isNaN(actual)) return null;

  switch (normalizeQualityType(type)) {
    case "Range":
      return actual >= from && actual <= to ? "Pass" : "Fail";
    case "Minimum":
      return actual >= from ? "Pass" : "Fail";
    case "Maximum":
      return actual <= to ? "Pass" : "Fail";
    case "Fixed":
      return std !== null && actual === std ? "Pass" : "Fail";
    default:
      return null;
  }
}

function asRows(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: unknown[] }).data;
  }

  return [];
}

export function IgeQualityDialog({
  open,
  onOpenChange,
  igeId,
  lineId,
  itemNo,
  itemDescription,
  stage = "Pre",
  locked = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  igeId: string;
  lineId: string;
  itemNo: string;
  itemDescription?: string | null;
  stage?: "Pre" | "Post";
  locked?: boolean;
}) {
  const [rows, setRows] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);

    try {
      const [specRes, qualityRes] = await Promise.all([
        api.get(`/items/${encodeURIComponent(itemNo)}/quality-specifications`),
        api
          .get("/inward-gate-entry-quality", {
            params: {
              inward_gate_entry_line_id: lineId,
              quality_stage: stage,
            },
          })
          .catch(() => ({ data: [] })),
      ]);

      const specs = asRows(specRes.data) as Spec[];
      const existing = asRows(qualityRes.data) as Partial<Reading>[];
      const existingBySpec = new Map<string, Partial<Reading>>();

      existing.forEach((reading) => {
        if (reading.spec_id) {
          existingBySpec.set(String(reading.spec_id), reading);
        }
      });

      setRows(
        specs.map((spec) => {
          const saved = existingBySpec.get(String(spec.id));
          const standard =
            spec.standard_value === null ||
            spec.standard_value === undefined ||
            spec.standard_value === ""
              ? null
              : Number(spec.standard_value);

          return {
            id: saved?.id,
            spec_id: String(spec.id),
            section_code: spec.section_code,
            quality_specific: spec.quality_specific,
            unit_of_measure_code: spec.unit_of_measure_code,
            quality_type: normalizeQualityType(spec.quality_type),
            quality_from: Number(spec.quality_from ?? 0),
            quality_to: Number(spec.quality_to ?? 0),
            standard_value: Number.isNaN(standard) ? null : standard,
            actual_value:
              saved?.actual_value === undefined || saved?.actual_value === null
                ? null
                : Number(saved.actual_value),
            result: saved?.result ?? null,
            remarks: saved?.remarks ?? null,
          };
        })
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load quality readings";
      toast.error(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && igeId && lineId && itemNo) {
      load();
    }
  }, [open, igeId, lineId, itemNo, stage]);

  const setActual = (idx: number, value: string) => {
    setRows((current) =>
      current.map((row, index) => {
        if (index !== idx) return row;

        const actual = value === "" ? null : Number(value);

        return {
          ...row,
          actual_value: actual,
          result: evaluate(
            row.quality_type,
            row.quality_from,
            row.quality_to,
            row.standard_value,
            actual
          ),
        };
      })
    );
  };

  const setRemarks = (idx: number, value: string) => {
    setRows((current) =>
      current.map((row, index) => (index === idx ? { ...row, remarks: value } : row))
    );
  };

  const save = async () => {
    setSaving(true);

    try {
      for (const row of rows) {
        const payload = {
          inward_gate_entry_id: igeId,
          inward_gate_entry_line_id: lineId,
          item_no: itemNo,
          spec_id: row.spec_id,
          section_code: row.section_code,
          quality_specific: row.quality_specific,
          unit_of_measure_code: row.unit_of_measure_code,
          quality_type: row.quality_type,
          quality_from: row.quality_from,
          quality_to: row.quality_to,
          standard_value: row.standard_value,
          actual_value: row.actual_value,
          result: row.result,
          remarks: row.remarks,
          quality_stage: stage,
        };

        if (row.id) {
          await api.put(`/inward-gate-entry-quality/${row.id}`, payload);
        } else {
          await api.post("/inward-gate-entry-quality", payload);
        }
      }

      toast.success("Quality readings saved");
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save quality readings";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            {stage}-Quality Check
            <span className="ml-2 text-sm text-muted-foreground">
              - {itemNo} {itemDescription}
            </span>
          </DialogTitle>
          <DialogDescription>
            Enter actual quality readings against the item quality specifications.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead>Quality Specific</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">From</TableHead>
                <TableHead className="text-right">To</TableHead>
                <TableHead className="text-right">Standard</TableHead>
                <TableHead className="text-right w-32">Actual</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                    No quality specifications defined on this Item Card.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) => (
                  <TableRow key={row.spec_id}>
                    <TableCell>{row.section_code ?? "-"}</TableCell>
                    <TableCell className="font-medium">{row.quality_specific}</TableCell>
                    <TableCell>{row.unit_of_measure_code ?? "-"}</TableCell>
                    <TableCell>{row.quality_type}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(row.quality_from).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(row.quality_to).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.standard_value !== null
                        ? Number(row.standard_value).toFixed(2)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <NumericInput
                        className="h-8 text-right"
                        value={row.actual_value ?? ""}
                        readOnly={locked}
                        disabled={locked}
                        onChange={(value) => setActual(index, value)}
                      />
                    </TableCell>
                    <TableCell>
                      {row.result ? (
                        <Badge variant={row.result === "Pass" ? "default" : "destructive"}>
                          {row.result}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8"
                        value={row.remarks ?? ""}
                        readOnly={locked}
                        disabled={locked}
                        onChange={(e) => setRemarks(index, e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          {locked && (
            <span className="mr-auto text-xs text-muted-foreground">
              Readings are locked because the IGE has been posted.
            </span>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!locked && (
            <Button onClick={save} disabled={saving || rows.length === 0}>
              Save Readings
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
