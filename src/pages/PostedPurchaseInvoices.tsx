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

const pct = (primary: any, fallback?: any) => {
  const primaryValue =
    Number(primary ?? 0);

  if (primaryValue > 0) {
    return primaryValue.toFixed(3);
  }

  return Number(fallback ?? 0).toFixed(3);
};

export function PostedPurchaseInvoiceList() {
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
          await api.get("/posted-purchase-invoices");

        setRows(res.data ?? []);
      } catch (err: any) {
        console.error(err);

        toast.error(
          err?.response?.data?.error ||
          "Failed to load posted purchase invoices"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <ListPageSkeleton columns={9} rows={7} />;

  return (
    <div>
      <PageHeader
        title="Posted Purchase Invoices"
        subtitle="Posted vendor invoices"
      />

      <div className="p-6">
        <div className="rounded border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posted Invoice No.</TableHead>
                <TableHead>Vendor No.</TableHead>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Vendor Invoice No.</TableHead>
                <TableHead>Posting Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Tax Amount</TableHead>
                <TableHead className="text-right">TDS Amount</TableHead>
                <TableHead className="text-right">Net Payable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No posted purchase invoices yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/posted-purchase-invoices/${row.id}`)}
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
                    <TableCell className="text-right tabular-nums">
                      {money(row.tax_amount ?? row.total_tax_amount ?? row.total_gst_amount ?? row.total_vat)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(row.list_tds_amount ?? row.tds_amount)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {money(
                        row.net_payable ??
                        row.net_payable_amount ??
                        row.tds_less_amount ??
                        Number(row.amount_including_tax ?? 0) - Number(row.tds_amount ?? 0)
                      )}
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

export function PostedPurchaseInvoiceDetails() {
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
          await api.get(`/posted-purchase-invoices/${id}`);

        setHeader(res.data.header ?? null);
        setLines(res.data.lines ?? []);
      } catch (err: any) {
        console.error(err);

        toast.error(
          err?.response?.data?.error ||
          "Failed to load posted purchase invoice"
        );
      }
    })();
  }, [id]);

  if (!header) return <PostedPurchaseInvoiceSkeleton />;

  return (
    <div>
      <PageHeader
        title={header.document_no}
        subtitle="Posted Purchase Invoice"
        actions={
          <Button
            variant="outline"
            onClick={() => navigate("/posted-purchase-invoices")}
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
            <Info label="Vendor No." value={header.vendor_no ?? "-"} />
            <Info label="Vendor Name" value={header.vendor_name ?? "-"} />
            <Info label="Vendor Invoice No." value={header.vendor_invoice_no ?? "-"} />
            <Info label="Vendor Invoice Date" value={header.vendor_invoice_date ? formatDateDisplay(header.vendor_invoice_date) : "-"} />
            <Info label="Document Date" value={formatDateDisplay(header.document_date)} />
            <Info label="Posting Date" value={formatDateDisplay(header.posting_date)} />
            <Info label="Due Date" value={header.due_date ? formatDateDisplay(header.due_date) : "-"} />
            <Info label="Location Code" value={header.location_code ?? "-"} />
            <Info label="Challan No." value={header.challan_no ?? "-"} />
            <Info label="Status" value={header.status ?? "Posted"} />
            <Info label="Currency Code" value={header.currency_code ?? "-"} />
            <Info label="Payment Terms" value={header.payment_terms_code ?? "-"} />
            <Info label="Remarks" value={header.remarks ?? "-"} />
            <Info label="Source Purchase Invoice" value={header.source_purchase_invoice_no ?? "-"} />
            <Info label="Posted Receipt" value={header.source_posted_purchase_receipt_no ?? "-"} />
            <Info label="Purchase Order" value={header.source_purchase_order_no ?? "-"} />
            <Info label="Posted At" value={header.posted_at ? formatDateDisplay(header.posted_at) : "-"} />
            <Info label="Total Incl. Tax" value={money(header.total_incl_vat ?? header.amount_including_tax)} />
            <Info label="TDS Threshold Amount" value={money(header.tds_threshold_amount)} />
            <Info label="TDS Base Amount" value={money(header.tds_base_amount ?? header.total_tds_base_amount)} />
            <Info label="TDS Amount" value={money(header.tds_amount ?? header.total_tds_amount)} />
            <Info label="TDS Less Amount" value={money(header.tds_less_amount ?? header.net_payable_amount)} />
            <Info label="Net Payable Amount" value={money(header.net_payable_amount ?? header.tds_less_amount)} />
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
                  <TableHead>Source Receipt</TableHead>
                  <TableHead>Receipt Line</TableHead>
                  <TableHead>Source Invoice</TableHead>
                  <TableHead>Item No.</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Qty Received</TableHead>
                  <TableHead className="text-right">Qty Invoiced</TableHead>
                  <TableHead className="text-right">Direct Unit Cost</TableHead>
                  <TableHead className="text-right">Line Disc. %</TableHead>
                  <TableHead className="text-right">Line Disc. Amount</TableHead>
                  <TableHead className="text-right">Tax %</TableHead>
                  <TableHead className="text-right">Tax Amount</TableHead>
                  <TableHead className="text-right">Line Amount</TableHead>
                  <TableHead className="text-right">Amount Incl. Tax</TableHead>
                  <TableHead className="text-right">TDS Threshold</TableHead>
                  <TableHead className="text-right">TDS Base</TableHead>
                  <TableHead className="text-right">TDS %</TableHead>
                  <TableHead className="text-right">TDS Amount</TableHead>
                  <TableHead className="text-right">Amount After TDS</TableHead>
                  <TableHead>HSN/SAC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.line_no}</TableCell>
                    <TableCell>{line.source_receipt_no ?? header.source_posted_purchase_receipt_no ?? "-"}</TableCell>
                    <TableCell>{line.source_receipt_line_no ?? "-"}</TableCell>
                    <TableCell>{line.source_invoice_no ?? header.source_purchase_invoice_no ?? "-"}</TableCell>
                    <TableCell className="font-medium">{line.item_no}</TableCell>
                    <TableCell>{line.variant_code ?? "-"}</TableCell>
                    <TableCell>{line.item_description}</TableCell>
                    <TableCell>{line.location_code ?? header.location_code ?? "-"}</TableCell>
                    <TableCell>{line.uom_code ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(line.quantity_received)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(line.quantity_invoiced)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(line.direct_unit_cost)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(line.line_discount_pct)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(line.line_discount_amount)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(line.tax_pct)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(line.tax_amount)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{money(line.line_amount)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{money(line.amount_including_tax)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(line.tds_threshold_amount)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(line.tds_base_amount)}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct(line.total_tds_pct, line.tds_pct)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(line.tds_amount)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{money(line.amount_after_tds)}</TableCell>
                    <TableCell>{line.hsn_sac_code ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex flex-wrap justify-end gap-6 border-t px-4 py-3 text-sm">
              <span>
                <span className="text-muted-foreground mr-2">Amount:</span>
                <span className="font-semibold tabular-nums">{money(header.total_amount)}</span>
              </span>
              <span>
                <span className="text-muted-foreground mr-2">Tax:</span>
                <span className="font-semibold tabular-nums">{money(header.total_tax_amount)}</span>
              </span>
              <span>
                <span className="text-muted-foreground mr-2">Amount Incl. Tax:</span>
                <span className="font-semibold tabular-nums">{money(header.amount_including_tax)}</span>
              </span>
              <span>
                <span className="text-muted-foreground mr-2">TDS Amount:</span>
                <span className="font-semibold tabular-nums">{money(header.tds_amount ?? header.total_tds_amount)}</span>
              </span>
              <span>
                <span className="text-muted-foreground mr-2">Net Payable:</span>
                <span className="font-semibold tabular-nums">{money(header.net_payable_amount ?? header.tds_less_amount)}</span>
              </span>
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
