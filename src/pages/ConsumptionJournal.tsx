import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { toDateInput, todayDateInput } from "@/lib/date";

type Order = {
  document_no: string;
  source_no: string;
  description?: string | null;
  status: string;
  posting_date?: string | null;
  components?: any[];
};

const qty = (value: any) => Number(value ?? 0).toFixed(2);

const orderLabel = (row: Order) =>
  [row.document_no, row.source_no, row.description].filter(Boolean).join(" - ");

export default function ConsumptionJournal() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedNo, setSelectedNo] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [postingDate, setPostingDate] = useState(todayDateInput());

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/released-production-orders");
        setOrders((Array.isArray(data) ? data : []).filter((row) => row.status !== "Finished"));
      } catch (err: any) {
        toast.error(err?.response?.data?.error || "Failed to load production orders");
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedNo) {
      setOrder(null);
      return;
    }

    (async () => {
      try {
        const { data } = await api.get(`/released-production-orders/${encodeURIComponent(selectedNo)}`);
        setOrder(data);
        setPostingDate(toDateInput(data.posting_date || "") || todayDateInput());
        const next: Record<number, string> = {};
        for (const line of data.components ?? []) {
          next[line.id] = String(Number(line.remaining_quantity ?? 0));
        }
        setQuantities(next);
      } catch (err: any) {
        toast.error(err?.response?.data?.error || "Failed to load production order");
      }
    })();
  }, [selectedNo]);

  const lines = useMemo(
    () => (order?.components ?? []).filter((line) => Number(line.remaining_quantity ?? 0) > 0),
    [order]
  );

  const post = async () => {
    if (!order) return;

    try {
      const { data } = await api.post(`/released-production-orders/${encodeURIComponent(order.document_no)}/post-consumption`, {
        posting_date: postingDate,
        lines: lines.map((line) => ({
          component_id: line.id,
          quantity: Number(quantities[line.id] || 0),
        })),
      });
      setOrder(data);
      toast.success("Consumption posted");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to post consumption");
    }
  };

  return (
    <div>
      <PageHeader
        title="Consumption Journal"
        subtitle="Post raw material consumption against released production orders"
        actions={<Button onClick={post} disabled={!order || lines.length === 0}>Post Consumption</Button>}
      />

      <div className="p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[1fr_220px]">
            <Select value={selectedNo || "__none__"} onValueChange={(value) => setSelectedNo(value === "__none__" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Released Production Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select Released Production Order</SelectItem>
                {orders.map((row) => (
                  <SelectItem key={row.document_no} value={row.document_no}>
                    {orderLabel(row)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={postingDate} onChange={(event) => setPostingDate(event.target.value)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Component Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item No.</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>UOM</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Consumed</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Qty to Consume</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        Select an order with remaining component quantity.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="font-medium">{line.item_no}</TableCell>
                        <TableCell>{line.description || "-"}</TableCell>
                        <TableCell>{line.location_code || "-"}</TableCell>
                        <TableCell>{line.unit_of_measure_code || "-"}</TableCell>
                        <TableCell className="text-right tabular-nums">{qty(line.expected_quantity)}</TableCell>
                        <TableCell className="text-right tabular-nums">{qty(line.consumed_quantity)}</TableCell>
                        <TableCell className="text-right tabular-nums">{qty(line.remaining_quantity)}</TableCell>
                        <TableCell>
                          <Input
                            className="text-right"
                            inputMode="decimal"
                            value={quantities[line.id] ?? ""}
                            onChange={(event) => setQuantities((current) => ({ ...current, [line.id]: event.target.value }))}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
