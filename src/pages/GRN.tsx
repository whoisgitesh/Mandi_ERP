import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "@/lib/api";
import { dateInputOrToday, normalizeDateFieldsWithDefault, toDateInput } from "@/lib/date";

import { PageHeader } from "@/components/PageHeader";
import { GrnSkeleton } from "@/components/skeletons/ErpSkeletons";
import { LocationSelect } from "@/components/LocationSelect";
import {
  LookupCombobox,
  LookupItem,
} from "@/components/LookupCombobox";
import { VariantSelect } from "@/components/VariantSelect";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/NumericInput";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { toast } from "sonner";
import { ArrowLeft, ClipboardCheck, Save } from "lucide-react";

type Row = Record<string, any>;

const money = (value: any) =>
  Number(value ?? 0).toFixed(2);

const numberOrZero = (value: any) => {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }

  return Number(value);
};

const hasNumberValue = (value: any) =>
  value !== "" && value !== null && value !== undefined;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const calculateGrnLine = (line: Row): Row => {
  const gateQuantity =
    numberOrZero(line.gate_quantity) ||
    numberOrZero(line.actual_quantity) ||
    numberOrZero(line.net_quantity) ||
    numberOrZero(line.received_quantity);

  const qcQuantity =
    clamp(
      numberOrZero(line.qc_quantity) || gateQuantity,
      0,
      gateQuantity
    );

  const rejectedQuantity =
    clamp(
      numberOrZero(line.rejected_quantity),
      0,
      qcQuantity
    );

  const acceptedQuantity =
    clamp(
      hasNumberValue(line.accepted_quantity)
        ? numberOrZero(line.accepted_quantity)
        : hasNumberValue(line.qty_received)
          ? numberOrZero(line.qty_received)
          : hasNumberValue(line.received_quantity)
            ? numberOrZero(line.received_quantity)
            : qcQuantity - rejectedQuantity,
      0,
      qcQuantity - rejectedQuantity
    );

  const unitCost =
    numberOrZero(line.unit_cost) ||
    numberOrZero(line.po_unit_cost) ||
    (
      numberOrZero(line.po_quantity)
        ? numberOrZero(line.po_line_amount) /
          numberOrZero(line.po_quantity)
        : 0
    );

  return {
    ...line,
    gate_quantity: gateQuantity,
    qc_quantity: qcQuantity,
    accepted_quantity: acceptedQuantity,
    qty_received: acceptedQuantity,
    rejected_quantity: rejectedQuantity,
    unit_cost: unitCost,
    line_amount:
      Number((acceptedQuantity * unitCost).toFixed(2)),
  };
};

const grnNo = (header: Row) =>
  header.grn_document_no ||
  header.grn_no ||
  `GRN-${String(header.id ?? "").padStart(4, "0")}`;

export default function GRN() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [header, setHeader] =
    useState<Row | null>(null);
  const [lines, setLines] =
    useState<Row[]>([]);
  const [vendors, setVendors] =
    useState<Row[]>([]);
  const [saving, setSaving] =
    useState(false);
  const [posting, setPosting] =
    useState(false);

  const load = async () => {
    if (!id) return;

    try {
      const [res, vendorRes] = await Promise.all([
        api.get(`/grn/${id}`),
        api.get("/vendors"),
      ]);
      setHeader(res.data.header);
      setLines((res.data.lines ?? []).map(calculateGrnLine));
      setVendors(vendorRes.data ?? []);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
        "Failed to load GRN"
      );
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const total = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum + Number(line.line_amount ?? 0),
        0
      ),
    [lines]
  );

  const setHeaderField = (key: string, value: any) => {
    setHeader((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current
    );
  };

  const vendorItems: LookupItem[] =
    vendors.map((vendor) => ({
      value: vendor.vendor_no,
      label: vendor.name,
      sub: vendor.city ?? undefined,
      raw: vendor,
    }));

  const save = async () => {
    if (!header) return;

    if (!String(header.location_code ?? "").trim()) {
      toast.error("Location Code is required");
      return;
    }

    try {
      setSaving(true);
      const res = await api.put(
        `/grn/${header.id}`,
        normalizeDateFieldsWithDefault(header, [
          "document_date",
          "posting_date",
          "vendor_invoice_date",
        ])
      );
      setHeader({
        ...header,
        ...res.data,
      });
      toast.success("Saved");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
        "Failed to save GRN"
      );
    } finally {
      setSaving(false);
    }
  };

  const postReceipt = async () => {
    if (!header) return;

    if (!String(header.location_code ?? "").trim()) {
      toast.error("Location Code is required");
      return;
    }

    try {
      setPosting(true);

      await api.put(
        `/grn/${header.id}`,
        normalizeDateFieldsWithDefault(header, [
          "document_date",
          "posting_date",
          "vendor_invoice_date",
        ])
      );

      for (const line of lines) {
        const calculatedLine =
          calculateGrnLine(line);

        await api.put(`/grn/line/${line.id}`, {
          variant_code: calculatedLine.variant_code,
          gate_quantity: Number(calculatedLine.gate_quantity ?? 0),
          qc_quantity: Number(calculatedLine.qc_quantity ?? 0),
          accepted_quantity: Number(calculatedLine.accepted_quantity ?? 0),
          rejected_quantity: Number(calculatedLine.rejected_quantity ?? 0),
          qty_received: Number(calculatedLine.accepted_quantity ?? 0),
          unit_cost: Number(calculatedLine.unit_cost ?? 0),
          line_amount: Number(calculatedLine.line_amount ?? 0),
        });
      }

      const res =
        await api.post(`/grn/${header.id}/post`);

      toast.success(
        `${res.data.posted_receipt_no ?? "Posted Purchase Receipt"} created`
      );

      navigate(
        `/posted-purchase-receipts/${res.data.posted_receipt_id}`
      );
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
        "Failed to post GRN"
      );
    } finally {
      setPosting(false);
    }
  };

  const updateLine = (
    lineId: number,
    patch: Row,
    persist = false
  ) => {
    let nextLine: Row | null = null;

    setLines((current) =>
      current.map((line) => {
        if (line.id !== lineId) return line;

        const mergedLine = {
          ...line,
          ...patch,
        };

        if (
          Object.prototype.hasOwnProperty.call(
            patch,
            "rejected_quantity"
          )
        ) {
          const qcQuantity =
            numberOrZero(mergedLine.qc_quantity);
          const rejectedQuantity =
            clamp(
              numberOrZero(mergedLine.rejected_quantity),
              0,
              qcQuantity
            );

          mergedLine.rejected_quantity =
            rejectedQuantity;
          mergedLine.accepted_quantity =
            Math.max(qcQuantity - rejectedQuantity, 0);
        }

        if (
          Object.prototype.hasOwnProperty.call(
            patch,
            "accepted_quantity"
          )
        ) {
          const qcQuantity =
            numberOrZero(mergedLine.qc_quantity);
          const acceptedQuantity =
            clamp(
              numberOrZero(mergedLine.accepted_quantity),
              0,
              qcQuantity
            );

          mergedLine.accepted_quantity =
            acceptedQuantity;
          mergedLine.rejected_quantity =
            Math.max(qcQuantity - acceptedQuantity, 0);
        }

        if (
          Object.prototype.hasOwnProperty.call(
            patch,
            "qc_quantity"
          )
        ) {
          const gateQuantity =
            numberOrZero(mergedLine.gate_quantity);
          const qcQuantity =
            clamp(
              numberOrZero(mergedLine.qc_quantity),
              0,
              gateQuantity
            );
          const rejectedQuantity =
            clamp(
              numberOrZero(mergedLine.rejected_quantity),
              0,
              qcQuantity
            );

          mergedLine.qc_quantity =
            qcQuantity;
          mergedLine.rejected_quantity =
            rejectedQuantity;
          mergedLine.accepted_quantity =
            Math.max(qcQuantity - rejectedQuantity, 0);
        }

        nextLine =
          calculateGrnLine(mergedLine);

        return nextLine;
      })
    );

    if (persist && nextLine) {
      saveLine(nextLine);
    }
  };

  const saveLine = async (line: Row) => {
    try {
      const calculatedLine =
        calculateGrnLine(line);

      await api.put(`/grn/line/${line.id}`, {
        variant_code: calculatedLine.variant_code,
        gate_quantity: Number(calculatedLine.gate_quantity ?? 0),
        qc_quantity: Number(calculatedLine.qc_quantity ?? 0),
        accepted_quantity: Number(calculatedLine.accepted_quantity ?? 0),
        rejected_quantity: Number(calculatedLine.rejected_quantity ?? 0),
        qty_received: Number(calculatedLine.accepted_quantity ?? 0),
        unit_cost: Number(calculatedLine.unit_cost ?? 0),
        line_amount: Number(calculatedLine.line_amount ?? 0),
      });
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
        "Failed to save GRN line"
      );
    }
  };

  const saveCurrentLine = (lineId: number) => {
    const currentLine =
      lines.find((line) => line.id === lineId);

    if (currentLine) {
      saveLine(currentLine);
    }
  };

  if (!header) return <GrnSkeleton />;

  return (
    <div>
      <PageHeader
        title={grnNo(header)}
        subtitle="Goods Receipt Note"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => navigate("/inward-gate-entries")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>

            <Button onClick={save} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>

            <Button
              onClick={postReceipt}
              disabled={posting || header.status === "Posted"}
            >
              <ClipboardCheck className="h-4 w-4 mr-1" />
              Post Receipt
            </Button>
          </>
        }
      />

      <div className="p-6 space-y-4">
        <section className="rounded border bg-card p-6">
          <h2 className="text-base font-semibold mb-5 flex items-center gap-2">
            Header
            <Badge className="rounded-full">
              {header.status ?? "Open"}
            </Badge>
          </h2>

          <Tabs defaultValue="general">
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="buy-from">Buy-from</TabsTrigger>
              <TabsTrigger value="invoice">Invoice Details</TabsTrigger>
            </TabsList>

            <TabsContent
              value="general"
              className="grid grid-cols-3 gap-x-3 gap-y-4 pt-7"
            >
              <Field label="Vendor No.">
                <LookupCombobox
                  value={header.vendor_no ?? ""}
                  items={vendorItems}
                  placeholder="Select vendor..."
                  onSelect={(item) =>
                    setHeader((current) =>
                      current
                        ? {
                            ...current,
                            vendor_no: item.value,
                            vendor_name: item.label,
                            vendor_gst_reg_no:
                              item.raw?.gst_registration_no ??
                              current.vendor_gst_reg_no,
                            location_code:
                              item.raw?.location_code ??
                              current.location_code,
                          }
                        : current
                    )
                  }
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

              <Field label="Vendor GST Reg. No.">
                <Input
                  value={header.vendor_gst_reg_no ?? ""}
                  onChange={(event) =>
                    setHeaderField("vendor_gst_reg_no", event.target.value)
                  }
                />
              </Field>

              <Field label="Document Date">
                <Input
                  type="date"
                  value={dateInputOrToday(header.document_date)}
                  onChange={(event) =>
                    setHeaderField("document_date", event.target.value)
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

              <Field label="Location Code *">
                <LocationSelect
                  value={header.location_code}
                  onChange={(value) =>
                    setHeaderField("location_code", value)
                  }
                />
              </Field>

              <Field label="Vendor Invoice No.">
                <Input
                  value={header.vendor_invoice_no ?? ""}
                  onChange={(event) =>
                    setHeaderField("vendor_invoice_no", event.target.value)
                  }
                />
              </Field>

              <Field label="Vendor Invoice Date">
                <Input
                  type="date"
                  value={dateInputOrToday(header.vendor_invoice_date)}
                  onChange={(event) =>
                    setHeaderField("vendor_invoice_date", event.target.value)
                  }
                />
              </Field>

              <Field label="Receiving No.">
                <Input
                  value={header.receiving_no ?? ""}
                  onChange={(event) =>
                    setHeaderField("receiving_no", event.target.value)
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

              <Field label="Purchaser Code">
                <Input
                  value={header.purchaser_code ?? ""}
                  onChange={(event) =>
                    setHeaderField("purchaser_code", event.target.value)
                  }
                />
              </Field>

              <Field label="Broker Name">
                <Input
                  value={header.broker_name ?? ""}
                  onChange={(event) =>
                    setHeaderField("broker_name", event.target.value)
                  }
                />
              </Field>

              <Field label="Brokerage">
                <NumericInput
                  value={header.brokerage ?? 0}
                  onValueChange={(value) => setHeaderField("brokerage", value)}
                />
              </Field>
            </TabsContent>

            <TabsContent
              value="buy-from"
              className="grid grid-cols-3 gap-x-3 gap-y-4 pt-7"
            >
              <Field label="Address">
                <Input value={header.address ?? ""} disabled />
              </Field>
              <Field label="Address 2">
                <Input value={header.address_2 ?? ""} disabled />
              </Field>
              <Field label="City">
                <Input value={header.city ?? ""} disabled />
              </Field>
              <Field label="Post Code">
                <Input value={header.post_code ?? ""} disabled />
              </Field>
              <Field label="Country/Region">
                <Input value={header.country_region_code ?? ""} disabled />
              </Field>
              <Field label="Phone No.">
                <Input value={header.phone_no ?? ""} disabled />
              </Field>
              <Field label="Email">
                <Input value={header.email ?? ""} disabled />
              </Field>
            </TabsContent>

            <TabsContent
              value="invoice"
              className="grid grid-cols-3 gap-x-3 gap-y-4 pt-7"
            >
              <Field label="Currency Code">
                <Input value={header.currency_code ?? ""} disabled />
              </Field>
              <Field label="Payment Terms Code">
                <Input value={header.payment_terms_code ?? ""} disabled />
              </Field>
              <Field label="Payment Method Code">
                <Input value={header.payment_method_code ?? ""} disabled />
              </Field>
              <Field label="Source Purchase Order">
                <Input value={header.source_purchase_order_no ?? ""} disabled />
              </Field>
              <Field label="Description">
                <Input
                  value={header.description ?? ""}
                  onChange={(event) =>
                    setHeaderField("description", event.target.value)
                  }
                />
              </Field>
            </TabsContent>
          </Tabs>
        </section>

        <section className="rounded border bg-card">
          <div className="p-6 pb-4">
            <h2 className="text-base font-semibold">
              Lines
            </h2>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Item No.</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead className="text-right">PO Qty</TableHead>
                <TableHead className="text-right">Gate Qty</TableHead>
                <TableHead className="text-right">Accepted Qty</TableHead>
                <TableHead className="text-right">Rejected Qty</TableHead>
                <TableHead className="text-right">QC Qty</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Batch/Lot</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={15}
                    className="text-center text-muted-foreground py-8"
                  >
                    No lines.
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.line_no}</TableCell>
                    <TableCell className="font-medium">
                      {line.item_no}
                    </TableCell>
                    <TableCell className="min-w-[240px]">
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
                    <TableCell>{line.item_description}</TableCell>
                    <TableCell>{line.unit_of_measure_code ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(line.po_quantity)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(line.gate_quantity)}
                    </TableCell>
                    <TableCell className="min-w-[130px]">
                      <NumericInput
                        className="text-right"
                        value={line.accepted_quantity ?? 0}
                        onValueChange={(value) =>
                          updateLine(line.id, {
                            accepted_quantity: value,
                          })
                        }
                        onBlur={() => saveCurrentLine(line.id)}
                      />
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <NumericInput
                        className="text-right"
                        value={line.rejected_quantity ?? 0}
                        onValueChange={(value) =>
                          updateLine(line.id, {
                            rejected_quantity: value,
                          })
                        }
                        onBlur={() => saveCurrentLine(line.id)}
                      />
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <NumericInput
                        className="text-right"
                        value={line.qc_quantity ?? 0}
                        onValueChange={(value) =>
                          updateLine(line.id, {
                            qc_quantity: value,
                          })
                        }
                        onBlur={() => saveCurrentLine(line.id)}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(line.unit_cost)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(line.line_amount)}
                    </TableCell>
                    <TableCell>{line.location_code ?? "-"}</TableCell>
                    <TableCell>{line.batch_lot_no || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={line.status === "Posted" ? "secondary" : "default"}>
                        {line.status ?? header.status ?? "Open"}
                      </Badge>
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
