import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { api } from "@/lib/api";
import { formatDateDisplay } from "@/lib/date";

import { PageHeader } from "@/components/PageHeader";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { toast } from "sonner";

type Row = {
  entry_no: number;
  vendor_no: string;
  vendor_name: string | null;
  document_type: string;
  document_no: string;
  posting_date: string;
  due_date: string | null;
  amount: number;
  remaining_amount: number;
  currency_code?: string | null;
  open: boolean;
  source_code: string;
};

const money = (value: any) =>
  Number(value ?? 0).toFixed(2);

export default function VendorLedgerEntries() {
  const [rows, setRows] =
    useState<Row[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [q, setQ] =
    useState("");

  useEffect(() => {
    (async () => {
      try {
        const res =
          await api.get("/vendor-ledger-entries");

        setRows(res.data ?? []);
      } catch (err: any) {
        console.error(err);

        toast.error(
          err?.response?.data?.error ||
          "Failed to load vendor ledger entries"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered =
    useMemo(() => {
      const term =
        q.trim().toLowerCase();

      if (!term) return rows;

      return rows.filter((row) =>
        [
          row.vendor_no,
          row.vendor_name,
          row.document_type,
          row.document_no,
          row.currency_code,
          row.source_code,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(term)
        )
      );
    }, [rows, q]);

  return (
    <div>
      <PageHeader
        title="Vendor Ledger Entries"
        subtitle="Read-only payable history created from posted purchase invoices"
      />

      <div className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filter by vendor, document, source..."
            value={q}
            onChange={(event) =>
              setQ(event.target.value)
            }
            className="max-w-md"
          />
          <span className="text-xs text-muted-foreground">
            {filtered.length} entries
          </span>
        </div>

        <div className="rounded border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">Entry No.</TableHead>
                <TableHead>Vendor No.</TableHead>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>Document No.</TableHead>
                <TableHead>Posting Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Remaining Amount</TableHead>
                <TableHead>Currency Code</TableHead>
                <TableHead>Open</TableHead>
                <TableHead>Source Code</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No vendor ledger entries.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.entry_no}>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {row.entry_no}
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.vendor_no}
                    </TableCell>
                    <TableCell>{row.vendor_name ?? "-"}</TableCell>
                    <TableCell>{row.document_type}</TableCell>
                    <TableCell className="font-medium">
                      {row.document_no}
                    </TableCell>
                    <TableCell>
                      {formatDateDisplay(row.posting_date)}
                    </TableCell>
                    <TableCell>
                      {row.due_date
                        ? formatDateDisplay(row.due_date)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {money(row.amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {money(row.remaining_amount)}
                    </TableCell>
                    <TableCell>{row.currency_code || "INR"}</TableCell>
                    <TableCell>
                      <Badge variant={row.open ? "outline" : "secondary"}>
                        {row.open ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.source_code}</TableCell>
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
