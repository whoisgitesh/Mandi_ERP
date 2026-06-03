import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { api } from "@/lib/api";
import { formatDateDisplay } from "@/lib/date";

import { PageHeader } from "@/components/PageHeader";

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

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ArrowLeft, FileText, RotateCcw } from "lucide-react";

import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type Row =
  Record<string, any>;

export function PostedSalesShipmentList() {

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
          await api.get(
            "/posted-sales-shipments"
          );

        setRows(
          res.data ?? []
        );

      } catch (err: any) {

        console.error(err);

        toast.error(
          err?.response?.data
            ?.error ||
            "Failed to load posted sales shipments"
        );

      } finally {

        setLoading(false);
      }

    })();

  }, []);

  return (
    <div>

      <PageHeader
        title="Posted Sales Shipments"
        subtitle="All posted shipments"
      />

      <div className="p-6">

        <div className="rounded border bg-card">

          <Table>

            <TableHeader>

              <TableRow>

                <TableHead>
                  Shipment No.
                </TableHead>

                <TableHead>
                  Customer No.
                </TableHead>

                <TableHead>
                  Customer Name
                </TableHead>

                <TableHead>
                  Source SO
                </TableHead>

                <TableHead>
                  Posting Date
                </TableHead>

                <TableHead>
                  Shipment Date
                </TableHead>

              </TableRow>

            </TableHeader>

            <TableBody>

              {loading ? (

                <TableRow>

                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Loading…
                  </TableCell>

                </TableRow>

              ) : rows.length === 0 ? (

                <TableRow>

                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No posted shipments yet.
                  </TableCell>

                </TableRow>

              ) : (

                rows.map((r) => (

                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      navigate(
                        `/posted-sales-shipments/${r.id}`
                      )
                    }
                  >

                    <TableCell className="font-medium text-primary">

                      {r.document_no}

                    </TableCell>

                    <TableCell>
                      {r.customer_no}
                    </TableCell>

                    <TableCell>
                      {r.customer_name}
                    </TableCell>

                    <TableCell>

                      {r.source_sales_order_no ??
                        "—"}

                    </TableCell>

                    <TableCell>
                      {formatDateDisplay(r.posting_date)}
                    </TableCell>

                    <TableCell>
                      {formatDateDisplay(r.shipment_date)}
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

export function PostedSalesShipmentDetails() {

  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const [h, setH] =
    useState<Row | null>(
      null
    );

  const [lines, setLines] =
    useState<Row[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [creatingInvoice, setCreatingInvoice] =
    useState(false);

  const [undoing, setUndoing] =
    useState(false);

  const [undoDialogOpen, setUndoDialogOpen] =
    useState(false);

  const [undoReason, setUndoReason] =
    useState("Posted by mistake");

  const load =
    async () => {
      if (!id) return;

      try {

        const res =
          await api.get(
            `/posted-sales-shipments/${id}`
          );

        setH(
          res.data.header
        );

        setLines(
          res.data.lines ??
            []
        );

      } catch (err: any) {

        console.error(err);

        toast.error(
          err?.response?.data
            ?.error ||
            "Failed to load posted sales shipment"
        );

      } finally {

        setLoading(false);
      }
    };

  useEffect(() => {

    if (!id) return;

    load();

  }, [id]);

  if (loading) {

    return (
      <div className="p-6 text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!h) {

    return (
      <div className="p-6 text-destructive">
        Shipment not found.
      </div>
    );
  }

  const createInvoice =
    async () => {
      if (!h) return;

      const hasRemaining =
        lines.some(
          (line) =>
            Number(
              line.remaining_qty_to_invoice ??
              line.remaining_quantity ??
              0
            ) > 0
        );

      if (!hasRemaining) {
        toast.error("All quantities from this shipment are already invoiced.");
        return;
      }

      try {
        setCreatingInvoice(true);

        const res =
          await api.post(
            `/posted-sales-shipments/${h.id}/create-invoice`
          );

        toast.success(
          `${res.data.sales_invoice_no ?? "Sales Invoice"} created`
        );

        navigate(
          `/sales-invoices/${res.data.sales_invoice_id}`
        );
      } catch (err: any) {
        console.error(err);

        toast.error(
          err?.response?.data?.error ||
          "Failed to create sales invoice"
        );
      } finally {
        setCreatingInvoice(false);
      }
    };

  const openUndoShipmentDialog =
    async () => {
      if (!h) return;

      if (h.reversed) {
        toast.error("Shipment is already reversed.");
        return;
      }

      const hasInvoiced =
        lines.some((line) => Number(line.quantity_invoiced ?? 0) > 0);

      if (hasInvoiced) {
        toast.error("Shipment cannot be undone because it has already been invoiced.");
        return;
      }

      setUndoReason("Posted by mistake");
      setUndoDialogOpen(true);
    };

  const undoShipment =
    async () => {
      if (!h) return;

      try {
        setUndoing(true);
        const res =
          await api.post(
            `/posted-sales-shipments/${h.id}/undo`,
            { reason: undoReason }
          );

        toast.success(
          res.data?.message ||
          "Shipment undone successfully"
        );

        await load();
        setUndoDialogOpen(false);
      } catch (err: any) {
        console.error(err);
        toast.error(
          err?.response?.data?.error ||
          "Failed to undo shipment"
        );
      } finally {
        setUndoing(false);
      }
    };

  return (
    <div>

      <PageHeader
        title={h.document_no}
        subtitle="Posted Sales Shipment"
        actions={

          <div className="flex flex-wrap gap-2">

            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  "/posted-sales-shipments"
                )
              }
            >

              <ArrowLeft className="h-4 w-4 mr-1" />

              Back

            </Button>

            {lines.some((line) => Number(line.remaining_qty_to_invoice ?? line.remaining_quantity ?? 0) > 0) && (
              <Button
                onClick={createInvoice}
                disabled={creatingInvoice || Boolean(h.reversed)}
              >

                <FileText className="h-4 w-4 mr-1" />

                Create Sales Invoice

              </Button>
            )}

            {!h.reversed && (
              <Button
                variant="outline"
                onClick={openUndoShipmentDialog}
                disabled={undoing}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Undo Shipment
              </Button>
            )}

          </div>
        }
      />

      <Dialog open={undoDialogOpen} onOpenChange={setUndoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Undo Posted Sales Shipment</DialogTitle>
            <DialogDescription>
              This will create reversal item ledger entries for {h.document_no}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <Input
              value={undoReason}
              onChange={(event) => setUndoReason(event.target.value)}
              placeholder="Reason for undoing this shipment"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUndoDialogOpen(false)}
              disabled={undoing}
            >
              Cancel
            </Button>
            <Button onClick={undoShipment} disabled={undoing}>
              Undo Shipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="p-6 space-y-4">

        <Card>

          <CardHeader className="pb-3">

            <CardTitle className="text-base">
              Header
              {h.reversed && (
                <Badge variant="secondary" className="ml-2">
                  Reversed
                </Badge>
              )}
            </CardTitle>

          </CardHeader>

          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">

            <Info
              label="Customer No."
              value={
                h.customer_no
              }
            />

            <Info
              label="Customer Name"
              value={
                h.customer_name ??
                "—"
              }
            />

            <Info
              label="Source SO"
              value={
                h.source_sales_order_no ??
                "—"
              }
            />

            <Info
              label="Posting Date"
              value={
                formatDateDisplay(h.posting_date)
              }
            />

            <Info
              label="Shipment Date"
              value={
                formatDateDisplay(h.shipment_date)
              }
            />

            <Info
              label="Location"
              value={
                h.location_code ??
                "—"
              }
            />

            <Info
              label="Salesperson"
              value={
                h.salesperson_code ??
                "—"
              }
            />

            <Info
              label="Shipment Method"
              value={
                h.shipment_method_code ??
                "—"
              }
            />

            <Info
              label="External Doc No."
              value={
                h.external_document_no ??
                "—"
              }
            />

            {h.reversed && (
              <>
                <Info
                  label="Reversed At"
                  value={h.reversed_at ? formatDateDisplay(h.reversed_at) : "—"}
                />
                <Info
                  label="Reversal Reason"
                  value={h.reversal_reason ?? "—"}
                />
              </>
            )}

            <div className="md:col-span-3">

              <Info
                label="Address"
                value={
                  `${h.address ?? ""} ${h.city ?? ""} ${h.post_code ?? ""}`.trim() ||
                  "—"
                }
              />

            </div>

            {h.source_sales_order_id && (

              <div className="md:col-span-3">

                <Button
                  variant="link"
                  className="px-0"
                  onClick={() =>
                    navigate(
                      `/sales-orders/${h.source_sales_order_id}`
                    )
                  }
                >

                  ← Source Sales Order

                </Button>

              </div>
            )}

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

                  <TableHead className="w-12">
                    #
                  </TableHead>

                  <TableHead>
                    Item No.
                  </TableHead>

                  <TableHead>
                    Description
                  </TableHead>

                  <TableHead>
                    Location
                  </TableHead>

                  <TableHead>
                    UOM
                  </TableHead>

                  <TableHead className="text-right">
                    Qty Shipped
                  </TableHead>

                  <TableHead className="text-right">
                    Qty Invoiced
                  </TableHead>

                  <TableHead className="text-right">
                    Remaining Qty to Invoice
                  </TableHead>

                  <TableHead className="text-right">
                    Reversed Qty
                  </TableHead>

                  <TableHead>
                    Reversal No.
                  </TableHead>

                  <TableHead className="text-right">
                    Unit Price
                  </TableHead>

                  <TableHead className="text-right">
                    Line Amount
                  </TableHead>

                </TableRow>

              </TableHeader>

              <TableBody>

                {lines.map((l) => (

                  <TableRow
                    key={l.id}
                  >

                    <TableCell className="text-muted-foreground">

                      {l.line_no}

                    </TableCell>

                    <TableCell className="font-medium">

                      {l.item_no}

                    </TableCell>

                    <TableCell className="text-muted-foreground">

                      {l.item_description}

                    </TableCell>

                    <TableCell>
                      {l.location_code}
                    </TableCell>

                    <TableCell>
                      {l.unit_of_measure_code}
                    </TableCell>

                    <TableCell className="text-right tabular-nums font-medium">

                      {Number(
                        l.quantity_shipped
                      ).toFixed(2)}

                    </TableCell>

                    <TableCell>
                      {l.reversal_document_no ? (
                        <button
                          type="button"
                          className="font-medium text-primary hover:underline"
                          onClick={() =>
                            navigate(
                              `/reversal-entries/${encodeURIComponent(l.reversal_document_no)}`
                            )
                          }
                        >
                          {l.reversal_document_no}
                        </button>
                      ) : (
                        "-"
                      )}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">

                      {Number(
                        l.quantity_invoiced ?? 0
                      ).toFixed(2)}

                    </TableCell>

                    <TableCell className="text-right tabular-nums">

                      {Number(
                        l.remaining_qty_to_invoice ??
                        l.remaining_quantity ??
                        0
                      ).toFixed(2)}

                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {l.reversed ? (
                        <span className="font-medium text-destructive">
                          {Number(l.reversed_quantity ?? 0).toFixed(2)}
                        </span>
                      ) : (
                        "0.00"
                      )}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">

                      {Number(
                        l.unit_price
                      ).toFixed(2)}

                    </TableCell>

                    <TableCell className="text-right tabular-nums">

                      {Number(
                        l.line_amount
                      ).toFixed(2)}

                    </TableCell>

                  </TableRow>
                ))}

              </TableBody>

            </Table>

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
