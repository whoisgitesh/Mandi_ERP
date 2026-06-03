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
  customer_no: string;
  customer_name: string | null;
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

export default function CustomerLedgerEntries() {
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
          await api.get("/customer-ledger-entries");

        setRows(res.data ?? []);
      } catch (err: any) {
        console.error(err);

        toast.error(
          err?.response?.data?.error ||
          "Failed to load customer ledger entries"
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
          row.customer_no,
          row.customer_name,
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
        title="Customer Ledger Entries"
        subtitle="Read-only receivable history created from posted sales invoices"
      />

      <div className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filter by customer, document, source..."
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
                <TableHead>Customer No.</TableHead>
                <TableHead>Customer Name</TableHead>
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
                    No customer ledger entries.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.entry_no}>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {row.entry_no}
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.customer_no}
                    </TableCell>
                    <TableCell>{row.customer_name ?? "-"}</TableCell>
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
