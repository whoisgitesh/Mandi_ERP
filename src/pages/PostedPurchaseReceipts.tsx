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

type PPR = {
  id: string;

  document_no: string;

  vendor_no: string;

  vendor_name:
    string | null;

  posting_date: string;

  document_date: string;

  lr_no: string | null;

  lr_date:
    string | null;

  description:
    string | null;

  source_purchase_order_id:
    string | null;

  source_inward_gate_entry_id:
    string | null;

  source_purchase_order_no?:
    string | null;

  source_inward_gate_entry_no?:
    string | null;

  source_grn_no?:
    string | null;

  vehicle_no?:
    string | null;

  challan_no?:
    string | null;

  entry_type?:
    string | null;

  location_code?:
    string | null;

  reversed?:
    boolean | null;

  reversed_at?:
    string | null;

  reversal_reason?:
    string | null;
};

type Line = {
  id: string;

  line_no: number;

  item_no: string;

  variant_code:
    string | null;

  item_description:
    string | null;

  quantity_received:
    number;

  first_weight:
    number;

  second_weight:
    number;

  net_quantity:
    number;

  vendor_weight:
    number;

  excess_weight:
    number;

  quantity_invoiced?:
    number | null;

  reversed?:
    boolean | null;

  reversed_quantity?:
    number | null;

  reversal_document_no?:
    string | null;
};

/**
 * LIST PAGE
 */
export function PostedPurchaseReceiptsList() {

  const [rows, setRows] =
    useState<PPR[]>([]);

  const [loading, setLoading] =
    useState(true);

  const navigate =
    useNavigate();

  useEffect(() => {

    (async () => {

      try {

        const res =
          await api.get(
            "/posted-purchase-receipts"
          );

        setRows(
          res.data ?? []
        );

      } catch (err: any) {

        console.error(err);

        toast.error(
          err?.response?.data
            ?.error ||
            "Failed to load posted receipts"
        );

      } finally {

        setLoading(false);
      }

    })();

  }, []);

  return (
    <div>

      <PageHeader
        title="Posted Purchase Receipts"
        subtitle="All posted goods receipts"
      />

      <div className="p-6">

        <div className="rounded border bg-card">

          <Table>

            <TableHeader>

              <TableRow>

                <TableHead>
                  Receipt No.
                </TableHead>

                <TableHead>
                  Vendor No.
                </TableHead>

                <TableHead>
                  Vendor Name
                </TableHead>

                <TableHead>
                  LR No.
                </TableHead>

                <TableHead>
                  Posting Date
                </TableHead>

              </TableRow>

            </TableHeader>

            <TableBody>

              {loading ? (

                <TableRow>

                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Loading…
                  </TableCell>

                </TableRow>

              ) : rows.length === 0 ? (

                <TableRow>

                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No posted receipts yet.
                  </TableCell>

                </TableRow>

              ) : (

                rows.map((r) => (

                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      navigate(
                        `/posted-purchase-receipts/${r.id}`
                      )
                    }
                  >

                    <TableCell className="font-medium text-primary">

                      {r.document_no}

                    </TableCell>

                    <TableCell>
                      {r.vendor_no}
                    </TableCell>

                    <TableCell>
                      {r.vendor_name}
                    </TableCell>

                    <TableCell>
                      {r.lr_no ?? "—"}
                    </TableCell>

                    <TableCell>
                      {formatDateDisplay(r.posting_date)}
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

/**
 * DETAILS PAGE
 */
export function PostedPurchaseReceiptDetails() {

  const { id } =
    useParams();

  const navigate =
    useNavigate();

  const [ppr, setPpr] =
    useState<PPR | null>(
      null
    );

  const [lines, setLines] =
    useState<Line[]>([]);

  const [creatingInvoice, setCreatingInvoice] =
    useState(false);

  const [undoing, setUndoing] =
    useState(false);

  const [undoDialogOpen, setUndoDialogOpen] =
    useState(false);

  const [undoReason, setUndoReason] =
    useState("Received by mistake");

  const load =
    async () => {
      if (!id) return;

      try {

        const res =
          await api.get(
            `/posted-purchase-receipts/${id}`
          );

        setPpr(
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
            "Failed to load posted receipt"
        );
      }
    };

  useEffect(() => {
    if (!id) return;

    load();

  }, [id]);

  if (!ppr) {

    return (
      <div className="p-6 text-muted-foreground">
        Loading…
      </div>
    );
  }

  const createPurchaseInvoice = async () => {
    try {
      setCreatingInvoice(true);

      const res =
        await api.post(
          `/purchase-invoices/from-receipt/${ppr.id}`
        );

      toast.success(
        `Purchase Invoice ${res.data.data.document_no} created`
      );

      navigate(
        `/purchase-invoices/${res.data.data.id}`
      );
    } catch (err: any) {
      console.error(err);

      toast.error(
        err?.response?.data?.error ||
        "Failed to create purchase invoice"
      );
    } finally {
      setCreatingInvoice(false);
    }
  };

  const openUndoReceiptDialog = async () => {
    if (!ppr) return;

    if (ppr.reversed) {
      toast.error("Receipt is already reversed.");
      return;
    }

    const hasInvoiced =
      lines.some((line) => Number(line.quantity_invoiced ?? 0) > 0);

    if (hasInvoiced) {
      toast.error("Receipt cannot be undone because it has already been invoiced.");
      return;
    }

    setUndoReason("Received by mistake");
    setUndoDialogOpen(true);
  };

  const undoReceipt = async () => {
    if (!ppr) return;

    try {
      setUndoing(true);

      const res =
        await api.post(
          `/posted-purchase-receipts/${ppr.id}/undo`,
          { reason: undoReason }
        );

      toast.success(
        res.data?.message ||
        "Receipt undone successfully"
      );

      await load();
      setUndoDialogOpen(false);
    } catch (err: any) {
      console.error(err);

      toast.error(
        err?.response?.data?.error ||
        "Failed to undo receipt"
      );
    } finally {
      setUndoing(false);
    }
  };

  return (
    <div>

      <PageHeader
        title={
          ppr.document_no
        }
        subtitle="Posted Purchase Receipt"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  "/posted-purchase-receipts"
                )
              }
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button
              onClick={createPurchaseInvoice}
              disabled={creatingInvoice || Boolean(ppr.reversed)}
            >
              <FileText className="h-4 w-4 mr-1" />
              Create Purchase Invoice
            </Button>
            {!ppr.reversed && (
              <Button
                variant="outline"
                onClick={openUndoReceiptDialog}
                disabled={undoing}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Undo Receipt
              </Button>
            )}
          </>
        }
      />

      <Dialog open={undoDialogOpen} onOpenChange={setUndoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Undo Posted Purchase Receipt</DialogTitle>
            <DialogDescription>
              This will create reversal item ledger entries for {ppr.document_no}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <Input
              value={undoReason}
              onChange={(event) => setUndoReason(event.target.value)}
              placeholder="Reason for undoing this receipt"
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
            <Button onClick={undoReceipt} disabled={undoing}>
              Undo Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="p-6 space-y-4">

        <Card>

          <CardHeader className="pb-3">

            <CardTitle className="text-base">
              Header
              {ppr.reversed && (
                <Badge variant="secondary" className="ml-2">
                  Reversed
                </Badge>
              )}
            </CardTitle>

          </CardHeader>

          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">

            <Info
              label="Vendor No."
              value={
                ppr.vendor_no
              }
            />

            <Info
              label="Vendor Name"
              value={
                ppr.vendor_name ??
                "—"
              }
            />

            <Info
              label="Entry Type"
              value={
                ppr.entry_type ??
                "—"
              }
            />

            <Info
              label="Vehicle No."
              value={
                ppr.vehicle_no ??
                "—"
              }
            />

            <Info
              label="Challan No. *"
              value={
                ppr.challan_no ??
                "—"
              }
            />

            <Info
              label="Location Code"
              value={
                ppr.location_code ??
                "—"
              }
            />

            <Info
              label="LR No."
              value={
                ppr.lr_no ??
                "—"
              }
            />

            <Info
              label="Source Purchase Order"
              value={
                ppr.source_purchase_order_no ??
                "-"
              }
            />

            <Info
              label="Source Inward Gate Entry"
              value={
                ppr.source_inward_gate_entry_no ??
                "-"
              }
            />

            <Info
              label="Source GRN"
              value={
                ppr.source_grn_no ??
                "-"
              }
            />

            <Info
              label="LR Date"
              value={
                ppr.lr_date ? formatDateDisplay(ppr.lr_date) :
                "—"
              }
            />

            <Info
              label="Document Date"
              value={
                formatDateDisplay(ppr.document_date)
              }
            />

            <Info
              label="Posting Date"
              value={
                formatDateDisplay(ppr.posting_date)
              }
            />

            {ppr.reversed && (
              <>
                <Info
                  label="Reversed At"
                  value={
                    ppr.reversed_at ? formatDateDisplay(ppr.reversed_at) :
                    "—"
                  }
                />
                <Info
                  label="Reversal Reason"
                  value={
                    ppr.reversal_reason ??
                    "—"
                  }
                />
              </>
            )}

            <div className="md:col-span-3">

              <Info
                label="Description"
                value={
                  ppr.description ??
                  "—"
                }
              />

            </div>

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

                  <TableHead>
                    #
                  </TableHead>

                  <TableHead>
                    Item No.
                  </TableHead>

                  <TableHead>
                    Variant
                  </TableHead>

                  <TableHead>
                    Description
                  </TableHead>

                  <TableHead className="text-right">
                    Qty Received
                  </TableHead>

                  <TableHead className="text-right">
                    Qty Invoiced
                  </TableHead>

                  <TableHead className="text-right">
                    Reversed Qty
                  </TableHead>

                  <TableHead>
                    Reversal No.
                  </TableHead>

                  <TableHead className="text-right">
                    First Wt.
                  </TableHead>

                  <TableHead className="text-right">
                    Second Wt.
                  </TableHead>

                  <TableHead className="text-right">
                    Net Qty
                  </TableHead>

                  <TableHead className="text-right">
                    Excess/Short
                  </TableHead>

                </TableRow>

              </TableHeader>

              <TableBody>

                {lines.map((l) => (

                  <TableRow
                    key={l.id}
                  >

                    <TableCell>
                      {l.line_no}
                    </TableCell>

                    <TableCell className="font-medium">
                      {l.item_no}
                    </TableCell>

                    <TableCell>
                      {l.variant_code ?? "-"}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {
                        l.item_description
                      }
                    </TableCell>

                    <TableCell>
                      {l.reversal_document_no ? (
                        <button
                          type="button"
                          className="font-medium text-primary hover:underline"
                          onClick={() =>
                            navigate(
                              `/reversal-entries/${encodeURIComponent(l.reversal_document_no || "")}`
                            )
                          }
                        >
                          {l.reversal_document_no}
                        </button>
                      ) : (
                        "-"
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      {Number(
                        l.quantity_received
                      ).toFixed(2)}
                    </TableCell>

                    <TableCell className="text-right">
                      {Number(
                        l.quantity_invoiced ?? 0
                      ).toFixed(2)}
                    </TableCell>

                    <TableCell className="text-right">
                      {l.reversed ? (
                        <span className="font-medium text-destructive">
                          {Number(
                            l.reversed_quantity ?? 0
                          ).toFixed(2)}
                        </span>
                      ) : (
                        "0.00"
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      {Number(
                        l.first_weight
                      ).toFixed(2)}
                    </TableCell>

                    <TableCell className="text-right">
                      {Number(
                        l.second_weight
                      ).toFixed(2)}
                    </TableCell>

                    <TableCell className="text-right">
                      {Number(
                        l.net_quantity
                      ).toFixed(2)}
                    </TableCell>

                    <TableCell className={`text-right ${Number(l.excess_weight ?? 0) < 0 ? "text-destructive" : ""}`}>
                      {Number(
                        l.excess_weight
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
