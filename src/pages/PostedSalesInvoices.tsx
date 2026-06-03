import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "@/lib/api";
import { formatDateDisplay } from "@/lib/date";

import { PageHeader } from "@/components/PageHeader";
import { ListPageSkeleton, PostedPurchaseInvoiceSkeleton } from "@/components/skeletons/ErpSkeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type Row = Record<string, any>;

const money = (value: any) =>
  Number(value ?? 0).toFixed(2);

const pct = (value: any) =>
  Number(value ?? 0).toFixed(3);

const text = (value: any) =>
  value === null || value === undefined || value === "" ? "-" : String(value);

export function PostedSalesInvoiceList() {
  const [rows, setRows] =
    useState<Row[]>([]);
  const [loading, setLoading] =
    useState(true);
  const navigate =
    useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res =
          await api.get("/posted-sales-invoices");

        setRows(res.data ?? []);
      } catch (err: any) {
        console.error(err);

        toast.error(
          err?.response?.data?.error ||
          "Failed to load posted sales invoices"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <ListPageSkeleton columns={8} rows={7} />;

  return (
    <div>
      <PageHeader
        title="Posted Sales Invoices"
        subtitle="Posted customer invoices"
      />

      <div className="p-6">
        <div className="rounded border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posted Invoice No.</TableHead>
                <TableHead>Customer No.</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>External Document No.</TableHead>
                <TableHead>Posting Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Tax Amount</TableHead>
                <TableHead className="text-right">Amount Incl. Tax</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No posted sales invoices yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/posted-sales-invoices/${row.id}`)}
                  >
                    <TableCell className="font-medium text-primary">
                      {row.document_no}
                    </TableCell>
                    <TableCell>{row.customer_no ?? "-"}</TableCell>
                    <TableCell>{row.customer_name ?? "-"}</TableCell>
                    <TableCell>{row.external_document_no ?? "-"}</TableCell>
                    <TableCell>{formatDateDisplay(row.posting_date)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(row.total_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(row.tax_amount ?? row.total_tax_amount ?? row.total_gst_amount ?? row.total_vat ?? row.total_tax)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(row.display_amount_including_tax ?? row.amount_including_tax ?? row.total_incl_vat)}
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

export function PostedSalesInvoiceDetails() {
  const { id } =
    useParams();
  const navigate =
    useNavigate();

  const [header, setHeader] =
    useState<Row | null>(null);
  const [lines, setLines] =
    useState<Row[]>([]);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const res =
          await api.get(`/posted-sales-invoices/${id}`);

        setHeader(res.data.header ?? null);
        setLines(res.data.lines ?? []);
      } catch (err: any) {
        console.error(err);

        toast.error(
          err?.response?.data?.error ||
          "Failed to load posted sales invoice"
        );
      }
    })();
  }, [id]);

  if (!header) return <PostedPurchaseInvoiceSkeleton />;

  const lineTotals =
    lines.reduce(
      (acc, line) => ({
        taxableAmount:
          acc.taxableAmount + Number(line.taxable_amount ?? line.line_amount ?? 0),
        cgstAmount:
          acc.cgstAmount + Number(line.cgst_amount ?? 0),
        sgstAmount:
          acc.sgstAmount + Number(line.sgst_amount ?? 0),
        igstAmount:
          acc.igstAmount + Number(line.igst_amount ?? 0),
        totalGstAmount:
          acc.totalGstAmount + Number(line.total_gst_amount ?? line.total_tax_amount ?? line.tax_amount ?? 0),
        amountIncludingTax:
          acc.amountIncludingTax + Number(line.amount_including_gst ?? line.amount_including_tax ?? 0),
      }),
      {
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalGstAmount: 0,
        amountIncludingTax: 0,
      }
    );

  return (
    <div>
      <PageHeader
        title={header.document_no}
        subtitle="Posted Sales Invoice"
        actions={
          <Button
            variant="outline"
            onClick={() => navigate("/posted-sales-invoices")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        }
      />

      <div className="p-6 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Header
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <Info label="Customer No." value={header.customer_no ?? "-"} />
            <Info label="Customer Name" value={header.customer_name ?? "-"} />
            <Info label="Customer GST Reg. No." value={header.customer_gst_reg_no ?? "-"} />
            <Info label="External Document No." value={header.external_document_no ?? "-"} />
            <Info label="Document Date" value={formatDateDisplay(header.document_date)} />
            <Info label="Posting Date" value={formatDateDisplay(header.posting_date)} />
            <Info label="Due Date" value={header.due_date ? formatDateDisplay(header.due_date) : "-"} />
            <Info label="Currency Code" value={header.currency_code ?? "-"} />
            <Info label="Payment Terms" value={header.payment_terms_code ?? header.payment_terms ?? "-"} />
            <Info label="Status" value={header.status ?? "Posted"} />
            <Info label="Location Code" value={header.location_code ?? "-"} />
            <Info label="Source Sales Invoice" value={header.source_sales_invoice_no ?? "-"} />
            <Info label="Posted Shipment" value={header.source_posted_sales_shipment_no ?? "-"} />
            <Info label="Source Sales Order" value={header.source_sales_order_no ?? "-"} />
            <Info label="Remarks" value={header.remarks ?? "-"} />
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
                  <TableHead>UOM</TableHead>
                  <TableHead>GST Place Of Supply</TableHead>
                  <TableHead>GST Group Code</TableHead>
                  <TableHead>GST Group Type</TableHead>
                  <TableHead>HSN/SAC Code</TableHead>
                  <TableHead>GST Jurisdiction Type</TableHead>
                  <TableHead>Invoice Type</TableHead>
                  <TableHead className="text-right">Qty Invoiced</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Line Disc. %</TableHead>
                  <TableHead className="text-right">Taxable Amount</TableHead>
                  <TableHead className="text-right">GST %</TableHead>
                  <TableHead className="text-right">CGST %</TableHead>
                  <TableHead className="text-right">SGST %</TableHead>
                  <TableHead className="text-right">IGST %</TableHead>
                  <TableHead className="text-right">CGST Amount</TableHead>
                  <TableHead className="text-right">SGST Amount</TableHead>
                  <TableHead className="text-right">IGST Amount</TableHead>
                  <TableHead className="text-right">Total GST</TableHead>
                  <TableHead className="text-right">Line Amount</TableHead>
                  <TableHead className="text-right">Amount Incl. Tax</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={26} className="text-center py-8 text-muted-foreground">
                      No posted invoice lines.
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>{line.line_no}</TableCell>
                      <TableCell className="font-medium">{line.item_no}</TableCell>
                      <TableCell>{text(line.variant_code)}</TableCell>
                      <TableCell>{text(line.item_description ?? line.description)}</TableCell>
                      <TableCell>{text(line.location_code ?? header.location_code)}</TableCell>
                      <TableCell>{text(line.unit_of_measure_code ?? line.uom)}</TableCell>
                      <TableCell>{text(line.gst_place_of_supply)}</TableCell>
                      <TableCell>{text(line.gst_group_code)}</TableCell>
                      <TableCell>{text(line.gst_group_type)}</TableCell>
                      <TableCell>{text(line.hsn_sac_code ?? line.hsn_sac)}</TableCell>
                      <TableCell>{text(line.gst_jurisdiction_type)}</TableCell>
                      <TableCell>{text(line.invoice_type)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(line.quantity_invoiced)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(line.unit_price)}</TableCell>
                      <TableCell className="text-right tabular-nums">{pct(line.line_discount_pct)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(line.taxable_amount ?? line.line_amount)}</TableCell>
                      <TableCell className="text-right tabular-nums">{pct(line.total_gst_pct ?? line.tax_pct)}</TableCell>
                      <TableCell className="text-right tabular-nums">{pct(line.cgst_pct)}</TableCell>
                      <TableCell className="text-right tabular-nums">{pct(line.sgst_pct)}</TableCell>
                      <TableCell className="text-right tabular-nums">{pct(line.igst_pct)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(line.cgst_amount)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(line.sgst_amount)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(line.igst_amount)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(line.total_gst_amount ?? line.total_tax_amount ?? line.tax_amount)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{money(line.line_amount)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{money(line.amount_including_gst ?? line.amount_including_tax)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="flex justify-end border-t px-4 py-3 text-sm">
              <div className="flex flex-wrap justify-end gap-x-8 gap-y-2">
                <div>
                  <span className="text-muted-foreground mr-2">Amount:</span>
                  <span className="font-semibold tabular-nums">{money(header.total_amount ?? lineTotals.taxableAmount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground mr-2">CGST:</span>
                  <span className="font-semibold tabular-nums">{money(header.cgst_amount ?? lineTotals.cgstAmount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground mr-2">SGST:</span>
                  <span className="font-semibold tabular-nums">{money(header.sgst_amount ?? lineTotals.sgstAmount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground mr-2">IGST:</span>
                  <span className="font-semibold tabular-nums">{money(header.igst_amount ?? lineTotals.igstAmount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground mr-2">Total GST:</span>
                  <span className="font-semibold tabular-nums">{money(header.total_gst_amount ?? header.total_tax_amount ?? lineTotals.totalGstAmount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground mr-2">Amount Incl. Tax:</span>
                  <span className="font-semibold tabular-nums">{money(header.display_amount_including_tax ?? header.amount_including_tax ?? header.total_incl_vat ?? lineTotals.amountIncludingTax)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
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
