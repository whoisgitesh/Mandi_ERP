import { useEffect, useMemo, useRef, useState } from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { api } from "@/lib/api";
import { dateInputOrToday, formatDateDisplay, normalizeDateFieldsWithDefault } from "@/lib/date";

import { PageHeader } from "@/components/PageHeader";
import { LocationSelect } from "@/components/LocationSelect";
import {
  LookupCombobox,
  LookupItem,
} from "@/components/LookupCombobox";
import { VariantSelect } from "@/components/VariantSelect";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

import { toast } from "sonner";

import {
  ArrowLeft,
  FileCheck2,
  Paperclip,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

type Row = Record<string, any>;

const calculateLine = (line: Row): Row => {
  const quantity =
    Number(line.quantity ?? 0);

  const shippedQuantity =
    Number(line.shipped_quantity ?? 0);

  const rate =
    Number(line.rate ?? 0);

  return {
    ...line,
    quantity,
    shipped_quantity: shippedQuantity,
    balance_quantity: quantity - shippedQuantity,
    line_amount: quantity * rate,
  };
};

const money = (value: any) =>
  Number(value ?? 0).toFixed(2);

export default function MandiPurchaseDetails() {
  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const uploadRef =
    useRef<HTMLInputElement>(null);

  const [header, setHeader] =
    useState<Row | null>(null);

  const [lines, setLines] =
    useState<Row[]>([]);

  const [trackedPOs, setTrackedPOs] =
    useState<Row[]>([]);

  const [vendors, setVendors] =
    useState<Row[]>([]);

  const [items, setItems] =
    useState<Row[]>([]);

  const [mandiVendors, setMandiVendors] =
    useState<Row[]>([]);

  const [saving, setSaving] =
    useState(false);

  const load = async () => {
    if (!id) return;

    try {
      const [
        detailRes,
        vendorRes,
        itemRes,
        mandiVendorRes,
      ] = await Promise.all([
        api.get(`/mandi-purchases/${id}`),
        api.get("/vendors"),
        api.get("/items"),
        api.get("/mandi-vendors"),
      ]);

      setHeader(detailRes.data.header);
      setLines(detailRes.data.lines ?? []);
      setTrackedPOs(detailRes.data.tracked_purchase_orders ?? []);
      setVendors(vendorRes.data ?? []);
      setItems(itemRes.data ?? []);
      setMandiVendors(mandiVendorRes.data ?? []);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
        "Failed to load mandi purchase"
      );
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const vendorItems: LookupItem[] =
    vendors.map((vendor) => ({
      value: vendor.vendor_no,
      label: vendor.name,
      sub: vendor.city ?? undefined,
      raw: vendor,
    }));

  const itemItems: LookupItem[] =
    items.map((item) => ({
      value: item.item_no,
      label: item.description,
      sub: item.base_unit_of_measure ?? undefined,
      raw: item,
    }));

  const mandiVendorItems: LookupItem[] =
    mandiVendors.map((vendor) => ({
      value: vendor.vendor_no,
      label: vendor.name,
      sub: vendor.city ?? undefined,
      raw: vendor,
    }));

  const total =
    useMemo(
      () =>
        lines.reduce(
          (sum, line) =>
            sum + Number(calculateLine(line).line_amount ?? 0),
          0
        ),
      [lines]
    );

  const setHeaderField = (
    key: string,
    value: any
  ) => {
    setHeader((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current
    );
  };

  const saveHeader = async () => {
    if (!header) return;

    if (!String(header.challan_no ?? "").trim()) {
      toast.error("Challan No. is required");
      return;
    }

    if (!String(header.location_code ?? "").trim()) {
      toast.error("Location Code is required");
      return;
    }

    try {
      setSaving(true);

      const res =
        await api.put(
          `/mandi-purchases/${header.id}`,
          normalizeDateFieldsWithDefault(header, [
            "posting_date",
          ])
        );

      setHeader(res.data);
      toast.success("Saved");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
        "Failed to save"
      );
    } finally {
      setSaving(false);
    }
  };

  const addLine = async () => {
    if (!header) return;

    try {
      await api.post(
        `/mandi-purchases/${header.id}/lines`,
        {
          item_no: "",
          item_description: "",
          variant_code: "",
          mandi_vendor_no: "",
          mandi_vendor_name: "",
          quantity: 0,
          shipped_quantity: 0,
          balance_quantity: 0,
          rate: 0,
        }
      );

      await load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
        "Failed to add line"
      );
    }
  };

  const saveLine = async (line: Row) => {
    try {
      const calculatedLine =
        calculateLine(line);

      const res =
        await api.put(
          `/mandi-purchases/lines/${calculatedLine.id}`,
          calculatedLine
        );

      setLines((current) =>
        current.map((entry) =>
          entry.id === calculatedLine.id
            ? res.data
            : entry
        )
      );
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
        "Failed to save line"
      );
    }
  };

  const saveCurrentLine = (lineId: number) => {
    const line =
      lines.find((entry) => entry.id === lineId);

    if (line) {
      saveLine(line);
    }
  };

  const updateLine = (
    lineId: number,
    patch: Row,
    save = false
  ) => {
    let nextLine: Row | null = null;

    setLines((current) =>
      current.map((line) => {
        if (line.id !== lineId) return line;

        nextLine = {
          ...line,
          ...patch,
        };

        nextLine =
          calculateLine(nextLine);

        return nextLine;
      })
    );

    if (save && nextLine) {
      saveLine(nextLine);
    }
  };

  const commitLineValue = (
    lineId: number,
    patch: Row
  ) => {
    const currentLine =
      lines.find((line) => line.id === lineId);

    if (!currentLine) return;

    const nextLine =
      calculateLine({
        ...currentLine,
        ...patch,
      });

    setLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? nextLine
          : line
      )
    );

    saveLine(nextLine);
  };

  const removeLine = async (lineId: number) => {
    if (!confirm("Delete this line?")) return;

    try {
      await api.delete(
        `/mandi-purchases/lines/${lineId}`
      );

      setLines((current) =>
        current.filter((line) => line.id !== lineId)
      );
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
        "Failed to delete line"
      );
    }
  };

  const createPO = async () => {
    if (!header) return;

    if (!String(header.challan_no ?? "").trim()) {
      toast.error("Challan No. is required before creating Purchase Order");
      return;
    }

    if (!String(header.location_code ?? "").trim()) {
      toast.error("Location Code is required before creating Purchase Order");
      return;
    }

    if (lines.length === 0) {
      toast.error(
        "Add at least one line before creating a Purchase Order"
      );
      return;
    }

    try {
      const res =
        await api.post(
          `/mandi-purchases/${header.id}/create-po`,
          {
            vendor_no: header.vendor_no ?? null,
            vendor_name: header.vendor_name ?? null,
            posting_date: dateInputOrToday(header.posting_date),
            challan_no: header.challan_no ?? null,
            location_code: header.location_code ?? null,
          }
        );

      toast.success(res.data.message);
      await load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
        "Failed to create Purchase Order"
      );
    }
  };

  const upload = () => {
    toast.info("Attachment storage API is not connected yet");
  };

  if (!header) {
    return (
      <div className="p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={header.document_no}
        subtitle="Mandi Purchase - Header & Lines"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => navigate("/mandi-purchase")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <Button
              variant="outline"
              onClick={saveHeader}
              disabled={saving}
            >
              Save
            </Button>

            <Button onClick={createPO}>
              <FileCheck2 className="h-4 w-4 mr-1" />
              Create Purchase Order
            </Button>
          </>
        }
      />

      <div className="p-6 space-y-4">
        <section className="rounded border bg-card p-6">
          <h2 className="text-base font-semibold mb-5">
            General
          </h2>

          <div className="grid grid-cols-3 gap-x-3 gap-y-4">
            <Field label="Document No.">
              <Input value={header.document_no ?? ""} disabled />
            </Field>

            <Field label="Vendor No.">
              <LookupCombobox
                value={header.vendor_no ?? ""}
                items={vendorItems}
                placeholder="Select vendor..."
                onSelect={(item) => {
                  setHeader((current) =>
                    current
                      ? {
                          ...current,
                          vendor_no: item.value,
                          vendor_name: item.label,
                        }
                      : current
                  );
                }}
              />
            </Field>

            <Field label="Vendor Name">
              <Input
                value={header.vendor_name ?? ""}
                onChange={(event) =>
                  setHeaderField("vendor_name", event.target.value)
                }
              />
            </Field>

            <Field label="Posting Date">
              <Input
                type="date"
                value={dateInputOrToday(header.posting_date)}
                onChange={(event) =>
                  setHeaderField("posting_date", event.target.value)
                }
              />
            </Field>

            <Field label="Status">
              <Select
                value={header.status ?? "Open"}
                onValueChange={(value) =>
                  setHeaderField("status", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Released">Released</SelectItem>
                  <SelectItem value="PO Created">PO Created</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Remarks">
              <Input
                value={header.remarks ?? ""}
                onChange={(event) =>
                  setHeaderField("remarks", event.target.value)
                }
              />
            </Field>

            <Field label="Challan No. *">
              <Input
                value={header.challan_no ?? ""}
                onChange={(event) =>
                  setHeaderField("challan_no", event.target.value)
                }
              />
            </Field>

            <Field label="Location Code *">
              <LocationSelect
                value={header.location_code ?? ""}
                onChange={(value) =>
                  setHeaderField("location_code", value)
                }
              />
            </Field>
          </div>
        </section>

        <section className="rounded border bg-card">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-base font-semibold">
              Lines
            </h2>

            <Button variant="outline" onClick={addLine}>
              <Plus className="h-4 w-4 mr-1" />
              Add line
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Line</TableHead>
                <TableHead>Item No.</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Mandi Vendor</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Shipped Qty</TableHead>
                <TableHead className="text-right">Balance Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="text-center text-muted-foreground py-7"
                  >
                    No lines. Click "Add line".
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="text-muted-foreground">
                      {line.line_no}
                    </TableCell>

                    <TableCell className="min-w-[180px]">
                      <LookupCombobox
                        value={line.item_no ?? ""}
                        items={itemItems}
                        placeholder="Select item..."
                        onSelect={(item) =>
                          updateLine(
                            line.id,
                            {
                              item_no: item.value,
                              item_description: item.label,
                              variant_code: "",
                              rate: Number(item.raw?.unit_cost ?? line.rate ?? 0),
                            },
                            true
                          )
                        }
                      />
                    </TableCell>

                    <TableCell className="min-w-[160px]">
                      <VariantSelect
                        itemNo={line.item_no}
                        value={line.variant_code}
                        onChange={(value) =>
                          updateLine(
                            line.id,
                            { variant_code: value },
                            true
                          )
                        }
                      />
                    </TableCell>

                    <TableCell className="min-w-[220px]">
                      <Input
                        value={line.item_description ?? ""}
                        onChange={(event) =>
                          updateLine(line.id, {
                            item_description: event.target.value,
                          })
                        }
                        onBlur={() => saveCurrentLine(line.id)}
                      />
                    </TableCell>

                    <TableCell className="min-w-[190px]">
                      <LookupCombobox
                        value={line.mandi_vendor_no ?? ""}
                        items={mandiVendorItems}
                        placeholder="Select mandi vendor..."
                        onSelect={(item) =>
                          updateLine(
                            line.id,
                            {
                              mandi_vendor_no: item.value,
                              mandi_vendor_name: item.label,
                            },
                            true
                          )
                        }
                      />
                    </TableCell>

                    <TableCell className="min-w-[120px]">
                      <LineNumberInput
                        value={line.quantity ?? 0}
                        onDraftChange={(value) =>
                          updateLine(line.id, {
                            quantity: value,
                          })
                        }
                        onCommit={(value) =>
                          commitLineValue(line.id, {
                            quantity: value,
                          })
                        }
                      />
                    </TableCell>

                    <TableCell className="min-w-[120px]">
                      <LineNumberInput
                        value={line.shipped_quantity ?? 0}
                        onDraftChange={(value) =>
                          updateLine(line.id, {
                            shipped_quantity: value,
                          })
                        }
                        onCommit={(value) =>
                          commitLineValue(line.id, {
                            shipped_quantity: value,
                          })
                        }
                      />
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {Number(calculateLine(line).balance_quantity).toFixed(2)}
                    </TableCell>

                    <TableCell className="min-w-[120px]">
                      <LineNumberInput
                        value={line.rate ?? 0}
                        onDraftChange={(value) =>
                          updateLine(line.id, {
                            rate: value,
                          })
                        }
                        onCommit={(value) =>
                          commitLineValue(line.id, {
                            rate: value,
                          })
                        }
                      />
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {money(calculateLine(line).line_amount)}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeLine(line.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="border-t px-6 py-3 text-right text-sm">
            <span className="text-muted-foreground mr-2">Total:</span>
            <span className="font-semibold tabular-nums">
              {money(total)}
            </span>
          </div>
        </section>

        <section className="rounded border bg-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attachments
            </h2>

            <Button
              variant="outline"
              onClick={() => uploadRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1" />
              Upload
            </Button>
            <input
              ref={uploadRef}
              type="file"
              multiple
              className="hidden"
              onChange={upload}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            No documents attached.
          </p>
        </section>

        <section className="rounded border bg-card">
          <div className="p-6 pb-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Search className="h-4 w-4" />
              Tracked Purchase Orders
            </h2>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO No.</TableHead>
                <TableHead>Posting Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trackedPOs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground py-7"
                  >
                    No Purchase Orders created from this Mandi Purchase yet.
                  </TableCell>
                </TableRow>
              ) : (
                trackedPOs.map((po) => (
                  <TableRow
                    key={po.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/purchase-orders/${po.id}`)}
                  >
                    <TableCell className="font-medium text-primary">
                      {po.document_no}
                    </TableCell>
                    <TableCell>
                      {formatDateDisplay(po.posting_date)}
                    </TableCell>
                    <TableCell>
                      {po.status}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs mb-1 block">
        {label}
      </Label>
      {children}
    </div>
  );
}

function LineNumberInput({
  value,
  onDraftChange,
  onCommit,
}: {
  value: any;
  onDraftChange?: (value: number) => void;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] =
    useState(String(value ?? 0));

  const [focused, setFocused] =
    useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(String(value ?? 0));
    }
  }, [focused, value]);

  const commit = () => {
    const next =
      Number(draft || 0);

    onCommit(next);
    setDraft(String(next));
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      className="text-right"
      value={draft}
      onFocus={() =>
        setFocused(true)
      }
      onChange={(event) => {
        const nextDraft =
          event.target.value;

        setDraft(nextDraft);

        if (nextDraft !== "" && Number.isFinite(Number(nextDraft))) {
          onDraftChange?.(Number(nextDraft));
        }
      }}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
    />
  );
}
