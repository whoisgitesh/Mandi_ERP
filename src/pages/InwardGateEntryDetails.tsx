import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "@/lib/api";
import { dateInputOrToday, toDateInput } from "@/lib/date";

import { PageHeader } from "@/components/PageHeader";
import { VariantSelect } from "@/components/VariantSelect";
import { IgeQualityDialog } from "@/components/IgeQualityDialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/NumericInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { toast } from "sonner";
import { ArrowLeft, ClipboardCheck, FileCheck2, Save } from "lucide-react";

type Header = {
  id: string;
  document_no: string;
  source_purchase_order_id: string | null;
  vendor_no: string;
  vendor_name: string | null;
  vendor_gst_reg_no?: string | null;
  lr_no: string | null;
  lr_date: string | null;
  document_date: string;
  posting_date: string;
  description: string | null;
  status: "Open" | "Released" | "Posted";
  entry_type: string | null;
  vehicle_no: string | null;
  challan_no: string | null;
  location_code: string | null;
};

type Line = {
  id: string;
  inward_gate_entry_id: string;
  line_no: number;
  po_line_id: string | null;
  item_no: string;
  item_description: string | null;
  variant_code: string | null;
  unit_of_measure: string | null;
  po_quantity: number;
  po_pending_quantity: number;
  bill_quantity: number;
  qty_per_bag: number;
  receive_bags: number;
  actual_quantity: number;
  first_weight: number;
  second_weight: number;
  net_quantity: number;
  excess_weight: number;
  balance_quantity: number;
};

type QualityCounts = Record<
  string,
  {
    Pre: { total: number; fail: number };
    Post: { total: number; fail: number };
  }
>;

const asArray = (value: any) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rows)) return value.rows;
  return [];
};

const calculateIgeLine = (line: Line): Line => {
  const poQuantity = Number(line.po_quantity ?? 0);
  const qtyPerBag = Number(line.qty_per_bag ?? 0);
  const receiveBags = Number(line.receive_bags ?? 0);
  const actualQuantity =
    qtyPerBag || receiveBags
      ? qtyPerBag * receiveBags
      : Number(line.actual_quantity ?? 0);
  const firstWeight = Number(line.first_weight ?? 0);
  const secondWeight = Number(line.second_weight ?? 0);
  const netQuantity = firstWeight - secondWeight;
  const billQuantity = Number(line.bill_quantity ?? 0);
  const balanceBase =
    netQuantity !== 0
      ? netQuantity
      : billQuantity !== 0
        ? billQuantity
        : actualQuantity;

  return {
    ...line,
    po_quantity: poQuantity,
    po_pending_quantity: Number(line.po_pending_quantity ?? 0),
    bill_quantity: billQuantity,
    qty_per_bag: qtyPerBag,
    receive_bags: receiveBags,
    actual_quantity: actualQuantity,
    first_weight: firstWeight,
    second_weight: secondWeight,
    net_quantity: netQuantity,
    excess_weight: netQuantity - billQuantity,
    balance_quantity: poQuantity - balanceBase,
  };
};

export default function InwardGateEntryDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [header, setHeader] = useState<Header | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [locations, setLocations] = useState<{ code: string; name: string }[]>([]);
  const [qualityFlags, setQualityFlags] = useState<Record<string, boolean>>({});
  const [qualityCounts, setQualityCounts] = useState<QualityCounts>({});
  const [qualityFor, setQualityFor] = useState<{ line: Line; stage: "Pre" | "Post" } | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const load = async () => {
    if (!id) return;

    try {
      setLoadError("");
      const [detailRes, locationRes, itemRes] = await Promise.all([
        api.get(`/inward-gate-entries/${id}`),
        api.get("/locations"),
        api.get("/items"),
      ]);

      const nextLines = asArray(detailRes.data?.lines);
      setHeader(detailRes.data.header ?? null);
      setLines(nextLines.map(calculateIgeLine));
      setLocations(asArray(locationRes.data));

      const itemNos = new Set(nextLines.map((line: Line) => line.item_no).filter(Boolean));
      const flags: Record<string, boolean> = {};
      asArray(itemRes.data).forEach((item: any) => {
        if (itemNos.has(item.item_no)) {
          flags[item.item_no] = !!item.quality_to_be_done;
        }
      });
      setQualityFlags(flags);
      setQualityCounts({});
    } catch (err: any) {
      const message = err?.response?.data?.error || "Failed to load inward gate entry";
      setLoadError(message);
      toast.error(message);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const totals = useMemo(
    () =>
      lines.reduce(
        (acc, rawLine) => {
          const line = calculateIgeLine(rawLine);
          return {
          actual: acc.actual + Number(line.actual_quantity ?? 0),
          net: acc.net + Number(line.net_quantity ?? 0),
          excess: acc.excess + Number(line.excess_weight ?? 0),
          balance: acc.balance + Number(line.balance_quantity ?? 0),
          };
        },
        { actual: 0, net: 0, excess: 0, balance: 0 }
      ),
    [lines]
  );

  const updateHeader = (patch: Partial<Header>) => {
    setHeader((current) => (current ? { ...current, ...patch } : current));
  };

  const saveHeader = async () => {
    if (!header) return null;

    if (!String(header.vehicle_no ?? "").trim()) {
      toast.error("Vehicle No. is required");
      return null;
    }

    if (!String(header.location_code ?? "").trim()) {
      toast.error("Location Code is required");
      return null;
    }

    try {
      setSaving(true);
      const res = await api.put(`/inward-gate-entries/${header.id}`, {
        vendor_no: header.vendor_no,
        vendor_name: header.vendor_name,
        vendor_gst_reg_no: header.vendor_gst_reg_no,
        lr_no: header.lr_no,
        lr_date: dateInputOrToday(header.lr_date),
        document_date: dateInputOrToday(header.document_date),
        posting_date: dateInputOrToday(header.posting_date),
        description: header.description,
        entry_type: header.entry_type,
        vehicle_no: header.vehicle_no,
        challan_no: header.challan_no,
        location_code: header.location_code,
        status: header.status,
      });
      const savedHeader = { ...header, ...res.data };
      setHeader(savedHeader);
      toast.success("Saved");
      return savedHeader;
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save inward gate entry");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const updateLine = async (lineId: string, patch: Partial<Line>) => {
    setLines((prev) =>
      prev.map((line) => (line.id === lineId ? calculateIgeLine({ ...line, ...patch }) : line))
    );

    try {
      const res = await api.put(`/inward-gate-entries/line/${lineId}`, patch);
      setLines((prev) => prev.map((line) => (line.id === lineId ? calculateIgeLine(res.data) : line)));
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update inward gate entry line");
      load();
    }
  };

  const goToGrn = async () => {
    if (!header) return;

    if (!String(header.vehicle_no ?? "").trim()) {
      toast.error("Vehicle No. is required");
      return;
    }

    if (!String(header.location_code ?? "").trim()) {
      toast.error("Location Code is required");
      return;
    }

    if (lines.length === 0) {
      toast.error("Add lines before creating GRN");
      return;
    }

    const savedHeader = await saveHeader();
    if (!savedHeader) return;

    navigate(`/inward-gate-entries/${savedHeader.id}/grn`);
  };

  if (loadError) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-destructive">{loadError}</div>
        <Button variant="outline" onClick={() => navigate("/inward-gate-entries")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>
    );
  }

  if (!header) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  return (
    <div>
      <PageHeader
        title={header.document_no}
        subtitle="Inward Gate Entry"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/inward-gate-entries")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button variant="outline" onClick={saveHeader} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button onClick={goToGrn} disabled={header.status === "Posted"}>
              <FileCheck2 className="h-4 w-4 mr-1" />
              GRN (Goods Receipt Note)
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              General <Badge variant={header.status === "Posted" ? "secondary" : "default"}>{header.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Entry Type">
              <Input value={header.entry_type ?? "Inward"} onChange={(event) => updateHeader({ entry_type: event.target.value })} disabled={header.status === "Posted"} />
            </Field>
            <Field label="Vendor/Customer No.">
              <Input value={header.vendor_no ?? ""} onChange={(event) => updateHeader({ vendor_no: event.target.value })} disabled={header.status === "Posted"} />
            </Field>
            <Field label="Vendor/Customer Name">
              <Input value={header.vendor_name ?? ""} onChange={(event) => updateHeader({ vendor_name: event.target.value })} disabled={header.status === "Posted"} />
            </Field>
            <Field label="Vehicle No. *">
              <Input value={header.vehicle_no ?? ""} onChange={(event) => updateHeader({ vehicle_no: event.target.value })} disabled={header.status === "Posted"} />
            </Field>
            <Field label="Challan No. *">
              <Input value={header.challan_no ?? ""} onChange={(event) => updateHeader({ challan_no: event.target.value })} disabled={header.status === "Posted"} />
            </Field>
            <Field label="Location Code *">
              <Select value={header.location_code ?? ""} onValueChange={(value) => updateHeader({ location_code: value })} disabled={header.status === "Posted"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location..." />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.code} value={location.code}>
                      {location.code} - {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="LR No.">
              <Input value={header.lr_no ?? ""} onChange={(event) => updateHeader({ lr_no: event.target.value })} disabled={header.status === "Posted"} />
            </Field>
            <Field label="LR Date">
              <Input type="date" value={dateInputOrToday(header.lr_date)} onChange={(event) => updateHeader({ lr_date: event.target.value })} disabled={header.status === "Posted"} />
            </Field>
            <Field label="Document Date">
              <Input type="date" value={dateInputOrToday(header.document_date)} onChange={(event) => updateHeader({ document_date: event.target.value })} disabled={header.status === "Posted"} />
            </Field>
            <Field label="Posting Date">
              <Input type="date" value={dateInputOrToday(header.posting_date)} onChange={(event) => updateHeader({ posting_date: event.target.value })} disabled={header.status === "Posted"} />
            </Field>
            <div className="md:col-span-3">
              <Field label="Description">
                <Input value={header.description ?? ""} onChange={(event) => updateHeader({ description: event.target.value })} disabled={header.status === "Posted"} />
              </Field>
            </div>
            {header.source_purchase_order_id && (
              <div className="md:col-span-3">
                <Button variant="link" className="px-0" onClick={() => navigate(`/purchase-orders/${header.source_purchase_order_id}`)}>
                  &larr; View source Purchase Order
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lines</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Item No.</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">PO Qty</TableHead>
                  <TableHead className="text-right">Pending Qty</TableHead>
                  <TableHead className="text-right min-w-[120px]">Bill Qty</TableHead>
                  <TableHead className="text-right min-w-[120px]">Qty/Bag</TableHead>
                  <TableHead className="text-right min-w-[120px]">Receive Bags</TableHead>
                  <TableHead className="text-right">Actual Qty</TableHead>
                  <TableHead className="text-right min-w-[120px]">First Wt.</TableHead>
                  <TableHead className="text-right min-w-[120px]">Second Wt.</TableHead>
                  <TableHead className="text-right min-w-[110px]">Net Qty</TableHead>
                  <TableHead className="text-right min-w-[120px]">Excess/Short</TableHead>
                  <TableHead className="text-right">Balance Qty</TableHead>
                  <TableHead className="w-64">Quality</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-8 text-muted-foreground">
                      No lines
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((rawLine) => {
                    const line = calculateIgeLine(rawLine);

                    return (
                    <TableRow key={line.id}>
                      <TableCell className="text-muted-foreground">{line.line_no}</TableCell>
                      <TableCell className="font-medium">{line.item_no}</TableCell>
                      <TableCell>
                        <VariantSelect itemNo={line.item_no} value={line.variant_code} onChange={(value) => updateLine(line.id, { variant_code: value })} className="h-8 min-w-[140px]" />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{line.item_description}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(line.po_quantity ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{Number(line.po_pending_quantity ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <NumberCell value={line.bill_quantity} disabled={header.status === "Posted"} onDraft={(value) => updateLocalLine(line.id, { bill_quantity: value }, setLines)} onCommit={(value) => updateLine(line.id, { bill_quantity: value })} />
                      </TableCell>
                      <TableCell className="text-right">
                        <NumberCell value={line.qty_per_bag} disabled={header.status === "Posted"} onDraft={(value) => updateLocalLine(line.id, { qty_per_bag: value }, setLines)} onCommit={(value) => updateLine(line.id, { qty_per_bag: value })} />
                      </TableCell>
                      <TableCell className="text-right">
                        <NumberCell value={line.receive_bags} disabled={header.status === "Posted"} onDraft={(value) => updateLocalLine(line.id, { receive_bags: value }, setLines)} onCommit={(value) => updateLine(line.id, { receive_bags: value })} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{Number(line.actual_quantity ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <NumberCell value={line.first_weight} disabled={header.status === "Posted"} onDraft={(value) => updateLocalLine(line.id, { first_weight: value }, setLines)} onCommit={(value) => updateLine(line.id, { first_weight: value })} />
                      </TableCell>
                      <TableCell className="text-right">
                        <NumberCell value={line.second_weight} disabled={header.status === "Posted"} onDraft={(value) => updateLocalLine(line.id, { second_weight: value }, setLines)} onCommit={(value) => updateLine(line.id, { second_weight: value })} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{Number(line.net_quantity ?? 0).toFixed(2)}</TableCell>
                      <TableCell className={`text-right tabular-nums font-medium ${Number(line.excess_weight ?? 0) < 0 ? "text-destructive" : ""}`}>{Number(line.excess_weight ?? 0).toFixed(2)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{Number(line.balance_quantity ?? 0).toFixed(2)}</TableCell>
                      <TableCell>
                        {qualityFlags[line.item_no] ? (
                          <div className="flex flex-col gap-1">
                            {(["Pre", "Post"] as const).map((stage) => {
                              const count = qualityCounts[line.id]?.[stage];
                              return (
                                <div key={stage} className="flex items-center gap-2">
                                  <Button size="sm" variant="outline" className="h-7" onClick={() => setQualityFor({ line, stage })}>
                                    <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                                    {stage}-Quality
                                  </Button>
                                  {count && count.total > 0 && (
                                    <Badge variant={count.fail > 0 ? "destructive" : "secondary"}>
                                      {count.total - count.fail}/{count.total}
                                    </Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            <div className="flex justify-end gap-6 px-4 py-3 border-t bg-muted/30 text-sm">
              <div>
                <span className="text-muted-foreground mr-2">Total Actual Qty:</span>
                <span className="font-semibold tabular-nums">{totals.actual.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground mr-2">Total Net Qty:</span>
                <span className="font-semibold tabular-nums">{totals.net.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground mr-2">Total Excess/Short:</span>
                <span className="font-semibold tabular-nums">{totals.excess.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-muted-foreground mr-2">Total Balance Qty:</span>
                <span className="font-semibold tabular-nums">{totals.balance.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {qualityFor && header && (
        <IgeQualityDialog
          open={!!qualityFor}
          onOpenChange={(open) => {
            if (!open) {
              setQualityFor(null);
              load();
            }
          }}
          igeId={header.id}
          lineId={qualityFor.line.id}
          itemNo={qualityFor.line.item_no}
          itemDescription={qualityFor.line.item_description}
          stage={qualityFor.stage}
          locked={header.status === "Posted"}
        />
      )}
    </div>
  );
}

function updateLocalLine(
  lineId: string,
  patch: Partial<Line>,
  setLines: React.Dispatch<React.SetStateAction<Line[]>>
) {
  setLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)));
}

function NumberCell({
  value,
  disabled,
  onDraft,
  onCommit,
}: {
  value: any;
  disabled: boolean;
  onDraft: (value: number) => void;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(Number(value ?? 0)));

  useEffect(() => {
    setDraft(String(Number(value ?? 0)));
  }, [value]);

  const commit = () => {
    onCommit(Number(draft || 0));
  };

  return (
    <NumericInput
      className="h-8 text-right"
      value={draft}
      disabled={disabled}
      onChange={(value) => {
        setDraft(value);
        onDraft(Number(value || 0));
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
