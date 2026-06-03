import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "@/lib/api";
import { dateInputOrToday, formatDateDisplay, normalizeDateFieldsWithDefault } from "@/lib/date";

import { LocationSelect } from "@/components/LocationSelect";
import { CurrencySelect } from "@/components/CurrencySelect";
import { PageHeader } from "@/components/PageHeader";
import { ListPageSkeleton, PurchaseInvoiceSkeleton } from "@/components/skeletons/ErpSkeletons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/NumericInput";
import { Switch } from "@/components/ui/switch";
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
import { ArrowLeft, Plus, Save, Send } from "lucide-react";

type Row = Record<string, any>;

type GSTGroup = {
  code: string;
  description: string | null;
  is_active?: boolean;
};

const DATE_FIELDS = [
  "posting_date",
  "document_date",
  "due_date",
  "vendor_invoice_date",
];

const toDateTimeLocalInput = (value: any) => {
  if (!value) return "";

  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year =
    date.getFullYear();
  const month =
    String(date.getMonth() + 1).padStart(2, "0");
  const day =
    String(date.getDate()).padStart(2, "0");
  const hours =
    String(date.getHours()).padStart(2, "0");
  const minutes =
    String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const money = (value: any) =>
  Number(value ?? 0).toFixed(2);

const calculateLine = (line: Row, changeTds = false) => {
  const quantityReceived =
    Number(line.quantity_received ?? 0);
  const quantityInvoiced =
    Number(line.quantity_invoiced ?? 0);
  const remaining =
    Math.max(quantityReceived - quantityInvoiced, 0);
  const qtyToInvoice =
    Math.min(
      Math.max(Number(line.qty_to_invoice ?? remaining), 0),
      remaining || quantityReceived
    );
  const directUnitCost =
    Number(line.direct_unit_cost ?? 0);
  const lineDiscountPct =
    Number(line.line_discount_pct ?? 0);
  const lineDiscountAmount =
    Number((qtyToInvoice * directUnitCost * lineDiscountPct / 100).toFixed(2));
  const lineAmount =
    Number((qtyToInvoice * directUnitCost - lineDiscountAmount).toFixed(2));
  const explicitCgstPct =
    Number(line.cgst_pct ?? 0);
  const explicitSgstPct =
    Number(line.sgst_pct ?? 0);
  const explicitIgstPct =
    Number(line.igst_pct ?? 0);
  let cgstPct =
    explicitCgstPct;
  let sgstPct =
    explicitSgstPct;
  let igstPct =
    explicitIgstPct;
  let totalGstPct =
    Number(line.total_gst_pct ?? line.tax_pct ?? 0);
  const componentPct =
    explicitCgstPct + explicitSgstPct + explicitIgstPct;

  const isInterState =
    String(line.gst_calculation_type ?? "").toLowerCase() === "inter-state";

  if (isInterState) {
    totalGstPct =
      totalGstPct || componentPct;
    igstPct =
      totalGstPct || explicitIgstPct;
    cgstPct = 0;
    sgstPct = 0;
  } else if (componentPct > 0) {
    totalGstPct = componentPct;
  } else if (totalGstPct > 0) {
    cgstPct = Number((totalGstPct / 2).toFixed(2));
    sgstPct = Number((totalGstPct - cgstPct).toFixed(2));
    igstPct = 0;
  }

  totalGstPct =
    Number((cgstPct + sgstPct + igstPct).toFixed(2));
  const taxableAmount =
    lineAmount;
  const cgstAmount =
    Number((taxableAmount * cgstPct / 100).toFixed(2));
  const sgstAmount =
    Number((taxableAmount * sgstPct / 100).toFixed(2));
  const igstAmount =
    Number((taxableAmount * igstPct / 100).toFixed(2));
  const totalGstAmount =
    Number((cgstAmount + sgstAmount + igstAmount).toFixed(2));
  const amountIncludingTax =
    Number((taxableAmount + totalGstAmount).toFixed(2));
  const tdsApplicable =
    Boolean(line.tds_applicable);
  const tdsPct =
    tdsApplicable ? Number(line.tds_pct ?? 0) : 0;
  const surchargePct =
    tdsApplicable ? Number(line.surcharge_pct ?? 0) : 0;
  const cessPct =
    tdsApplicable ? Number(line.cess_pct ?? 0) : 0;
  const totalTdsPct =
    tdsApplicable
      ? Number((tdsPct + surchargePct + cessPct).toFixed(3))
      : 0;
  const hasStoredTdsBase =
    line.tds_base_amount !== undefined &&
    line.tds_base_amount !== null &&
    line.tds_base_amount !== "";
  const tdsBaseAmount =
    tdsApplicable
      ? hasStoredTdsBase
        ? Number(line.tds_base_amount ?? 0)
        : lineAmount
      : 0;
  const tdsAmount =
    changeTds && tdsApplicable
      ? Number(line.tds_amount ?? 0)
      : Number((tdsBaseAmount * totalTdsPct / 100).toFixed(2));
  const amountAfterTds =
    Number((amountIncludingTax - tdsAmount).toFixed(2));

  return {
    ...line,
    quantity_received: quantityReceived,
    quantity_invoiced: quantityInvoiced,
    qty_to_invoice: qtyToInvoice,
    direct_unit_cost: directUnitCost,
    line_discount_pct: lineDiscountPct,
    line_discount_amount: lineDiscountAmount,
    gst_calculation_type:
      line.gst_calculation_type || (igstPct > 0 ? "Inter-State" : "Intra-State"),
    cgst_pct: cgstPct,
    sgst_pct: sgstPct,
    igst_pct: igstPct,
    total_gst_pct: totalGstPct,
    cgst_amount: cgstAmount,
    sgst_amount: sgstAmount,
    igst_amount: igstAmount,
    total_gst_amount: totalGstAmount,
    taxable_amount: taxableAmount,
    amount_including_gst: amountIncludingTax,
    tax_pct: totalGstPct,
    tax_amount: totalGstAmount,
    line_amount: lineAmount,
    amount_including_tax: amountIncludingTax,
    tds_applicable: tdsApplicable,
    tds_threshold_amount: tdsApplicable ? Number(line.tds_threshold_amount ?? 0) : 0,
    tds_base_amount: tdsBaseAmount,
    tds_pct: tdsPct,
    surcharge_pct: surchargePct,
    cess_pct: cessPct,
    total_tds_pct: totalTdsPct,
    tds_amount: tdsAmount,
    amount_after_tds: amountAfterTds,
  };
};

const applyTdsThreshold = (lines: Row[], header: Row | null) => {
  if (!header || Boolean(header.change_tds)) return lines;

  const tdsApplicable =
    Boolean(header.tds_applicable);
  const thresholdAmount =
    Number(header.tds_threshold_amount ?? 0);
  const previousVendorTotal =
    Number(header.previous_tds_base_amount ?? 0);
  const currentTaxableAmount =
    lines.reduce(
      (sum, line) =>
        sum + (tdsApplicable && line.tds_applicable ? Number(line.taxable_amount ?? line.line_amount ?? 0) : 0),
      0
    );

  let eligibleBase =
    currentTaxableAmount;

  if (thresholdAmount > 0) {
    if (previousVendorTotal >= thresholdAmount) {
      eligibleBase =
        currentTaxableAmount;
    } else {
      eligibleBase =
        Math.min(
          currentTaxableAmount,
          Math.max(previousVendorTotal + currentTaxableAmount - thresholdAmount, 0)
        );
    }
  }

  let remainingEligibleBase =
    Number(eligibleBase.toFixed(2));

  return lines.map((line) => {
    if (!tdsApplicable || !line.tds_applicable) {
      return calculateLine(
        {
          ...line,
          tds_applicable: false,
          tds_base_amount: 0,
          tds_amount: 0,
        },
        false
      );
    }

    const taxableAmount =
      Number(line.taxable_amount ?? line.line_amount ?? 0);
    const tdsBaseAmount =
      Number(Math.min(taxableAmount, Math.max(remainingEligibleBase, 0)).toFixed(2));

    remainingEligibleBase =
      Number((remainingEligibleBase - tdsBaseAmount).toFixed(2));

    return calculateLine(
      {
        ...line,
        tds_threshold_amount: thresholdAmount,
        tds_base_amount: tdsBaseAmount,
        tds_amount: 0,
      },
      false
    );
  });
};

export function PurchaseInvoiceList() {
  const [rows, setRows] =
    useState<Row[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [creating, setCreating] =
    useState(false);
  const navigate =
    useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res =
          await api.get("/purchase-invoices");

        setRows(res.data ?? []);
      } catch (err: any) {
        console.error(err);

        toast.error(
          err?.response?.data?.error ||
          "Failed to load purchase invoices"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const createNew = async () => {
    try {
      setCreating(true);

      const res =
        await api.post("/purchase-invoices", {});

      toast.success(
        `Purchase Invoice ${res.data.data.document_no} created`
      );

      navigate(`/purchase-invoices/${res.data.data.id}`);
    } catch (err: any) {
      console.error(err);

      toast.error(
        err?.response?.data?.error ||
        "Failed to create purchase invoice"
      );
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <ListPageSkeleton columns={7} rows={7} />;

  return (
    <div>
      <PageHeader
        title="Purchase Invoices"
        subtitle="Vendor invoices created from posted purchase receipts"
        actions={
          <Button
            onClick={createNew}
            disabled={creating}
          >
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        }
      />

      <div className="p-6">
        <div className="rounded border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No.</TableHead>
                <TableHead>Vendor No.</TableHead>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Vendor Invoice No.</TableHead>
                <TableHead>Posting Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No purchase invoices yet. Create one from a Posted Purchase Receipt.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/purchase-invoices/${row.id}`)}
                  >
                    <TableCell className="font-medium text-primary">
                      {row.document_no}
                    </TableCell>
                    <TableCell>{row.vendor_no ?? "-"}</TableCell>
                    <TableCell>{row.vendor_name ?? "-"}</TableCell>
                    <TableCell>{row.vendor_invoice_no ?? "-"}</TableCell>
                    <TableCell>{formatDateDisplay(row.posting_date)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(row.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge>{row.status ?? "Open"}</Badge>
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

export function PurchaseInvoiceDetails() {
  const { id } =
    useParams();
  const navigate =
    useNavigate();

  const [header, setHeader] =
    useState<Row | null>(null);
  const [lines, setLines] =
    useState<Row[]>([]);
  const [gstGroups, setGstGroups] =
    useState<GSTGroup[]>([]);
  const [saving, setSaving] =
    useState(false);
  const [posting, setPosting] =
    useState(false);

  const readonly =
    header?.status === "Posted";

  const load = async () => {
    if (!id) return;

    try {
      const [res, groupsRes] =
        await Promise.all([
          api.get(`/purchase-invoices/${id}`),
          api.get("/gst-groups"),
        ]);

      const loadedHeader =
        res.data.header ?? null;

      setHeader(loadedHeader);
      if (loadedHeader?.tds_warning) {
        toast.warning(loadedHeader.tds_warning);
      }
      setGstGroups(
        (groupsRes.data ?? []).filter(
          (group: GSTGroup) =>
            group.is_active !== false
        )
      );
      setLines(
        (res.data.lines ?? []).map((line: Row) =>
          calculateLine(line, Boolean(loadedHeader?.change_tds))
        )
      );
    } catch (err: any) {
      console.error(err);

      toast.error(
        err?.response?.data?.error ||
        "Failed to load purchase invoice"
      );
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const setHeaderField = (field: string, value: any) => {
    setHeader((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current
    );
  };

  const setLineField = (lineId: any, field: string, value: any) => {
    setLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? calculateLine(
              {
                ...line,
                [field]: value,
              },
              Boolean(header?.change_tds)
            )
          : line
      )
    );
  };

  const setChangeTds = (value: boolean) => {
    setHeaderField("change_tds", value);
    setLines((current) =>
      current.map((line) => calculateLine(line, value))
    );
  };

  const resolveGstState = () => {
    const fromState =
      header?.from_state_code ||
      header?.location_state_code ||
      header?.state_code ||
      header?.vendor_state_code ||
      "";
    const toState =
      header?.to_state_code ||
      header?.vendor_state_code ||
      fromState;

    return {
      fromState,
      toState,
    };
  };

  const setLineGstGroup = async (lineId: any, gstGroupCode: string) => {
    if (!header) return;

    if (!gstGroupCode) {
      setLineField(lineId, "gst_group_code", "");
      return;
    }

    try {
      const { fromState, toState } =
        resolveGstState();
      const res =
        await api.get("/gst-rates/resolve", {
          params: {
            gst_group_code: gstGroupCode,
            from_state: fromState,
            to_state: toState,
            date: dateInputOrToday(header.posting_date),
          },
        });
      const rate =
        res.data ?? {};

      setLines((current) =>
        current.map((line) =>
          line.id === lineId
            ? calculateLine(
                {
                  ...line,
                  gst_group_code: gstGroupCode,
                  gst_calculation_type: rate.gst_calculation_type,
                  cgst_pct: Number(rate.cgst_pct ?? 0),
                  sgst_pct: Number(rate.sgst_pct ?? 0),
                  igst_pct: Number(rate.igst_pct ?? 0),
                  total_gst_pct: Number(rate.total_gst_pct ?? 0),
                  tax_pct: Number(rate.total_gst_pct ?? 0),
                },
                Boolean(header.change_tds)
              )
            : line
        )
      );
    } catch (err: any) {
      console.error(err);
      toast.error(
        err?.response?.data?.error ||
        "GST rate not found for selected GST Group and posting date."
      );
    }
  };

  const save = async () => {
    if (!id || !header) return false;

    if (!String(header.location_code ?? "").trim()) {
      toast.error("Location Code is required");
      return false;
    }

    try {
      setSaving(true);

      const payload =
        normalizeDateFieldsWithDefault(
          {
            ...header,
            lines: applyTdsThreshold(
              lines.map((line) =>
                calculateLine(line, Boolean(header.change_tds))
              ),
              header
            ),
          },
          DATE_FIELDS
        );

      await api.put(`/purchase-invoices/${id}`, payload);

      toast.success("Purchase Invoice saved");
      await load();
      return true;
    } catch (err: any) {
      console.error(err);

      toast.error(
        err?.response?.data?.error ||
        "Failed to save purchase invoice"
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const post = async () => {
    if (!id || !header) return;

    if (!header.vendor_invoice_no) {
      toast.error("Vendor Invoice No. is mandatory before posting");
      return;
    }

    if (!String(header.location_code ?? "").trim()) {
      toast.error("Location Code is required");
      return;
    }

    try {
      setPosting(true);

      const saved =
        await save();

      if (!saved) return;

      const res =
        await api.post(`/purchase-invoices/${id}/post`);

      toast.success(
        `Posted Purchase Invoice ${res.data.document_no} created`
      );

      navigate(
        `/posted-purchase-invoices/${res.data.posted_invoice_id}`
      );
    } catch (err: any) {
      console.error(err);

      toast.error(
        err?.response?.data?.error ||
        "Failed to post purchase invoice"
      );
    } finally {
      setPosting(false);
    }
  };

  if (!header) return <PurchaseInvoiceSkeleton />;

  const calculatedLines: Row[] =
    applyTdsThreshold(
      lines.map((line) =>
        calculateLine(line, Boolean(header.change_tds))
      ),
      header
    );
  const subtotalExclVat =
    calculatedLines.reduce<number>((sum, line) => sum + Number(line.taxable_amount ?? 0), 0);
  const igstAmount =
    calculatedLines.reduce<number>((sum, line) => sum + Number(line.igst_amount ?? 0), 0);
  const cgstAmount =
    calculatedLines.reduce<number>((sum, line) => sum + Number(line.cgst_amount ?? 0), 0);
  const sgstAmount =
    calculatedLines.reduce<number>((sum, line) => sum + Number(line.sgst_amount ?? 0), 0);
  const totalGstAmount =
    calculatedLines.reduce<number>((sum, line) => sum + Number(line.total_gst_amount ?? 0), 0);
  const totalAmount =
    subtotalExclVat;
  const invoiceDiscountAmount =
    Number(header.invoice_discount_amount ?? 0);
  const totalExclVat =
    Math.max(subtotalExclVat - invoiceDiscountAmount, 0);
  const totalVat =
    totalGstAmount;
  const totalInclVat =
    totalExclVat + totalVat;
  const totalTdsAmount =
    calculatedLines.reduce<number>((sum, line) => sum + Number(line.tds_amount ?? 0), 0);
  const totalTdsBaseAmount =
    calculatedLines.reduce<number>((sum, line) => sum + Number(line.tds_base_amount ?? 0), 0);
  const tdsThresholdAmount =
    Math.max(
      Number(header.tds_threshold_amount ?? 0),
      ...calculatedLines.map((line) => Number(line.tds_threshold_amount ?? 0))
    );
  const tdsLessAmount =
    totalInclVat - totalTdsAmount;
  const previousTdsBaseAmount =
    Number(header.previous_tds_base_amount ?? 0);
  const currentTdsBaseAmount =
    calculatedLines.reduce<number>(
      (sum, line) => sum + (line.tds_applicable ? Number(line.taxable_amount ?? line.line_amount ?? 0) : 0),
      0
    );

  return (
    <div>
      <PageHeader
        title={header.document_no}
        subtitle="Purchase Invoice"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => navigate("/purchase-invoices")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button
              variant="outline"
              onClick={save}
              disabled={saving || readonly}
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button
              onClick={post}
              disabled={posting || readonly}
            >
              <Send className="h-4 w-4 mr-1" />
              Post Invoice
            </Button>
          </>
        }
      />

      <div className="p-6 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Header
              <Badge className="ml-2">
                {header.status ?? "Open"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Vendor No.">
              <Input value={header.vendor_no ?? ""} onChange={(e) => setHeaderField("vendor_no", e.target.value)} disabled={readonly} />
            </Field>
            <Field label="Vendor Name">
              <Input value={header.vendor_name ?? ""} onChange={(e) => setHeaderField("vendor_name", e.target.value)} disabled={readonly} />
            </Field>
            <Field label="Vendor Invoice No. *">
              <Input value={header.vendor_invoice_no ?? ""} onChange={(e) => setHeaderField("vendor_invoice_no", e.target.value)} disabled={readonly} />
            </Field>
            <Field label="Vendor Invoice Date">
              <Input type="date" value={dateInputOrToday(header.vendor_invoice_date)} onChange={(e) => setHeaderField("vendor_invoice_date", e.target.value)} disabled={readonly} />
            </Field>
            <Field label="Document Date">
              <Input type="date" value={dateInputOrToday(header.document_date)} onChange={(e) => setHeaderField("document_date", e.target.value)} disabled={readonly} />
            </Field>
            <Field label="Posting Date">
              <Input type="date" value={dateInputOrToday(header.posting_date)} onChange={(e) => setHeaderField("posting_date", e.target.value)} disabled={readonly} />
            </Field>
            <Field label="Due Date">
              <Input type="date" value={dateInputOrToday(header.due_date)} onChange={(e) => setHeaderField("due_date", e.target.value)} disabled={readonly} />
            </Field>
            <Field label="Location Code *">
              <LocationSelect value={header.location_code ?? ""} onChange={(value) => setHeaderField("location_code", value)} />
            </Field>
            <Field label="Challan No.">
              <Input value={header.challan_no ?? ""} onChange={(e) => setHeaderField("challan_no", e.target.value)} disabled={readonly} />
            </Field>
            <Field label="Currency Code">
              <CurrencySelect value={header.currency_code ?? ""} onChange={(value) => setHeaderField("currency_code", value || "INR")} disabled={readonly} />
            </Field>
            <Field label="Payment Terms">
              <Input value={header.payment_terms_code ?? ""} onChange={(e) => setHeaderField("payment_terms_code", e.target.value)} disabled={readonly} />
            </Field>
            <Field label="Remarks">
              <Input value={header.remarks ?? ""} onChange={(e) => setHeaderField("remarks", e.target.value)} disabled={readonly} />
            </Field>
            <Info label="TDS Applicable" value={header.tds_applicable ? "Yes" : "No"} />
            <Info label="TDS Section Code" value={header.tds_section_code ?? "-"} />
            <Info label="TDS Assessee Code" value={header.tds_assessee_code ?? "-"} />
            <Info label="Posted Receipt" value={header.source_posted_purchase_receipt_no ?? "-"} />
            <Info label="Purchase Order" value={header.source_purchase_order_no ?? "-"} />
            <Info label="GRN No." value={header.source_grn_no ?? "-"} />
            <Field label="Posted At">
              <Input
                type="datetime-local"
                value={toDateTimeLocalInput(header.posted_at)}
                onChange={(e) => setHeaderField("posted_at", e.target.value)}
                disabled={readonly}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Lines
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Item No.</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Qty Received</TableHead>
                  <TableHead className="text-right">Qty Invoiced</TableHead>
                  <TableHead className="text-right">Qty. to Invoice</TableHead>
                  <TableHead className="text-right">Direct Unit Cost</TableHead>
                  <TableHead className="text-right">Line Disc. %</TableHead>
                  <TableHead className="text-right">Line Disc. Amount</TableHead>
                  <TableHead>GST Group</TableHead>
                  <TableHead className="text-right">GST %</TableHead>
                  <TableHead className="text-right">IGST Amount</TableHead>
                  <TableHead className="text-right">CGST Amount</TableHead>
                  <TableHead className="text-right">SGST Amount</TableHead>
                  <TableHead className="text-right">Total GST</TableHead>
                  <TableHead className="text-right">Line Amount</TableHead>
                  <TableHead className="text-right">Amount Incl. Tax</TableHead>
                  <TableHead>TDS Section</TableHead>
                  <TableHead>TDS Assessee</TableHead>
                  <TableHead className="text-right">TDS Threshold</TableHead>
                  <TableHead className="text-right">TDS Base</TableHead>
                  <TableHead className="text-right">TDS %</TableHead>
                  <TableHead className="text-right">Surcharge %</TableHead>
                  <TableHead className="text-right">Cess %</TableHead>
                  <TableHead className="text-right">Total TDS %</TableHead>
                  <TableHead className="text-right">TDS Amount</TableHead>
                  <TableHead className="text-right">Net Payable</TableHead>
                  <TableHead>HSN/SAC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const calc =
                    calculatedLines.find((calculatedLine) => calculatedLine.id === line.id) ||
                    calculateLine(line, Boolean(header.change_tds));

                  return (
                  <TableRow key={line.id}>
                    <TableCell>{line.line_no}</TableCell>
                    <TableCell className="font-medium">{line.item_no}</TableCell>
                    <TableCell>{line.variant_code ?? "-"}</TableCell>
                    <TableCell className="min-w-48">{line.item_description}</TableCell>
                    <TableCell>{line.location_code ?? header.location_code ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(line.quantity_received)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(line.quantity_invoiced)}</TableCell>
                    <TableCell>
                      <NumericInput
                        value={line.qty_to_invoice ?? 0}
                        onChange={(value) => setLineField(line.id, "qty_to_invoice", value)}
                        className="w-28 text-right"
                        disabled={readonly}
                      />
                    </TableCell>
                    <TableCell>
                      <NumericInput
                        value={line.direct_unit_cost ?? 0}
                        onChange={(value) => setLineField(line.id, "direct_unit_cost", value)}
                        className="w-32 text-right"
                        disabled={readonly}
                      />
                    </TableCell>
                    <TableCell>
                      <NumericInput
                        value={line.line_discount_pct ?? 0}
                        decimalScale={3}
                        min={0}
                        max={100}
                        onChange={(value) => setLineField(line.id, "line_discount_pct", value)}
                        className="w-28 text-right"
                        disabled={readonly}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(calc.line_discount_amount)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={line.gst_group_code ?? ""}
                        onValueChange={(value) => setLineGstGroup(line.id, value)}
                        disabled={readonly}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select GST Group" />
                        </SelectTrigger>
                        <SelectContent>
                          {gstGroups.map((group) => (
                            <SelectItem key={group.code} value={group.code}>
                              {group.code} - {group.description || group.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(calc.total_gst_pct)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(calc.igst_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(calc.cgst_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(calc.sgst_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(calc.total_gst_amount)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {money(calc.line_amount)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {money(calc.amount_including_tax)}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.tds_section_code ?? ""}
                        onChange={(e) => setLineField(line.id, "tds_section_code", e.target.value)}
                        className="w-32"
                        disabled={readonly || !line.tds_applicable}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.tds_assessee_code ?? ""}
                        onChange={(e) => setLineField(line.id, "tds_assessee_code", e.target.value)}
                        className="w-32"
                        disabled={readonly || !line.tds_applicable}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(calc.tds_threshold_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(calc.tds_base_amount)}
                    </TableCell>
                    <TableCell>
                      <NumericInput
                        value={line.tds_pct ?? 0}
                        decimalScale={3}
                        min={0}
                        max={100}
                        onChange={(value) => setLineField(line.id, "tds_pct", value)}
                        className="w-24 text-right"
                        disabled={readonly || !line.tds_applicable}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(calc.surcharge_pct ?? 0).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(calc.cess_pct ?? 0).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(calc.total_tds_pct ?? 0).toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(calc.tds_amount)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {money(calc.amount_after_tds)}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.hsn_sac_code ?? ""}
                        onChange={(e) => setLineField(line.id, "hsn_sac_code", e.target.value)}
                        className="w-28"
                        disabled={readonly}
                      />
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex flex-wrap justify-end gap-6 border-t px-4 py-3 text-sm">
              <span>
                <span className="text-muted-foreground mr-2">Amount:</span>
                <span className="font-semibold tabular-nums">{money(totalAmount)}</span>
              </span>
              <span>
                <span className="text-muted-foreground mr-2">Total GST:</span>
                <span className="font-semibold tabular-nums">{money(totalGstAmount)}</span>
              </span>
              <span>
                <span className="text-muted-foreground mr-2">Total Incl. VAT:</span>
                <span className="font-semibold tabular-nums">{money(totalInclVat)}</span>
              </span>
              <span>
                <span className="text-muted-foreground mr-2">TDS:</span>
                <span className="font-semibold tabular-nums">{money(totalTdsAmount)}</span>
              </span>
              <span>
                <span className="text-muted-foreground mr-2">Net Payable:</span>
                <span className="font-semibold tabular-nums">{money(tdsLessAmount)}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Invoice Totals
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-3 text-sm">
            <TotalsRow label="Subtotal Excl. VAT (INR)" value={money(subtotalExclVat)} />
            <TotalsRow label="TDS Amount" value={money(totalTdsAmount)} />

            <TotalsRow label="IGST Amount" value={money(igstAmount)} />
            <div className="grid grid-cols-[1fr_auto] items-center gap-4">
              <span className="text-muted-foreground">Change TDS</span>
              <Switch
                checked={Boolean(header.change_tds)}
                onCheckedChange={setChangeTds}
                disabled={readonly}
              />
            </div>

            <TotalsRow label="CGST Amount" value={money(cgstAmount)} />
            <div className="grid grid-cols-[1fr_160px] items-center gap-4">
              <span className="text-muted-foreground">Inv. Discount Amount</span>
              <NumericInput
                value={header.invoice_discount_amount ?? 0}
                onChange={(value) => setHeaderField("invoice_discount_amount", value)}
                className="text-right"
                disabled={readonly}
              />
            </div>

            <TotalsRow label="SGST Amount" value={money(sgstAmount)} />
            <div className="grid grid-cols-[1fr_160px] items-center gap-4">
              <span className="text-muted-foreground">Invoice Discount %</span>
              <NumericInput
                value={header.invoice_discount_pct ?? 0}
                decimalScale={3}
                min={0}
                max={100}
                onChange={(value) => setHeaderField("invoice_discount_pct", value)}
                className="text-right"
                disabled={readonly}
              />
            </div>

            <TotalsRow label="Total GST Amount" value={money(totalGstAmount)} />
            <TotalsRow label="Total Excl. VAT (INR)" value={money(totalExclVat)} />

            <TotalsRow label="Total Amount" value={money(totalAmount)} />
            <TotalsRow label="Total VAT (INR)" value={money(totalVat)} />

            <TotalsRow label="TDS Threshold Amount" value={money(tdsThresholdAmount)} />
            <TotalsRow label="Previous FY TDS Base" value={money(previousTdsBaseAmount)} />

            <TotalsRow label="Current TDS Base" value={money(currentTdsBaseAmount)} />
            <TotalsRow label="TDS Base Amount" value={money(totalTdsBaseAmount)} />

            <TotalsRow label="TDS Less Amount" value={money(tdsLessAmount)} strong />
            <TotalsRow label="Net Payable Amount" value={money(tdsLessAmount)} strong />
            <TotalsRow label="Total Incl. VAT (INR)" value={money(totalInclVat)} strong />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function TotalsRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>
        {value}
      </span>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">
        {label}
      </div>
      <div className="font-medium">
        {value}
      </div>
    </div>
  );
}
