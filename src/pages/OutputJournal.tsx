import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toDateInput, todayDateInput } from "@/lib/date";

type Order = {
  document_no: string;
  source_no: string;
  description?: string | null;
  status: string;
  posting_date?: string | null;
  quantity: number;
  finished_quantity: number;
  remaining_quantity: number;
  location_code: string;
};

const qty = (value: any) => Number(value ?? 0).toFixed(2);

const orderLabel = (row: Order) =>
  [row.document_no, row.source_no, row.description].filter(Boolean).join(" - ");

export default function OutputJournal() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedNo, setSelectedNo] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [postingDate, setPostingDate] = useState(todayDateInput());
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/released-production-orders");
        setOrders(
          (Array.isArray(data) ? data : []).filter(
            (row) => row.status !== "Finished" && Number(row.remaining_quantity ?? 0) > 0
          )
        );
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
        setQuantity(String(Number(data.remaining_quantity ?? 0)));
      } catch (err: any) {
        toast.error(err?.response?.data?.error || "Failed to load production order");
      }
    })();
  }, [selectedNo]);

  const post = async () => {
    if (!order) return;

    try {
      const { data } = await api.post(`/released-production-orders/${encodeURIComponent(order.document_no)}/post-output`, {
        posting_date: postingDate,
        quantity: Number(quantity || 0),
      });
      setOrder(data);
      setQuantity(String(Number(data.remaining_quantity ?? 0)));
      toast.success("Output posted");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to post output");
    }
  };

  return (
    <div>
      <PageHeader
        title="Output Journal"
        subtitle="Post finished goods output from released production orders"
        actions={<Button onClick={post} disabled={!order}>Post Output</Button>}
      />

      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Released Production Order</Label>
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
            </div>

            <div className="space-y-2">
              <Label>Posting Date</Label>
              <Input type="date" value={postingDate} onChange={(event) => setPostingDate(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Finished Goods Item</Label>
              <Input value={order?.source_no ?? ""} readOnly />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={order?.description ?? ""} readOnly />
            </div>

            <div className="space-y-2">
              <Label>Location Code</Label>
              <Input value={order?.location_code ?? ""} readOnly />
            </div>

            <div className="space-y-2">
              <Label>Quantity to Output</Label>
              <Input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Finished Quantity</Label>
              <Input value={qty(order?.finished_quantity)} readOnly />
            </div>

            <div className="space-y-2">
              <Label>Remaining Quantity</Label>
              <Input value={qty(order?.remaining_quantity)} readOnly />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
