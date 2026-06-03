import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "@/lib/api";
import { dateInputOrToday, formatDateDisplay, normalizeDateFieldsWithDefault } from "@/lib/date";

import { PageHeader } from "@/components/PageHeader";
import { CurrencySelect } from "@/components/CurrencySelect";
import { LocationSelect } from "@/components/LocationSelect";
import { SalespersonPurchaserSelect } from "@/components/SalespersonPurchaserSelect";
import {
  LookupCombobox,
  LookupItem,
} from "@/components/LookupCombobox";
import { UomSelect } from "@/components/UomSelect";
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
import {
  ArrowLeft,
  FileText,
  Plus,
  Save,
  Trash2,
  Truck,
} from "lucide-react";

type Row = Record<string, any>;

const calculateSalesLine = (line: Row) => {
  const quantity =
    Number(line.quantity ?? 0);

  const qtyShipped =
    Number(line.qty_shipped ?? 0);

  const outstanding =
    Math.max(quantity - qtyShipped, 0);

  const requestedQtyToShip =
    Number(line.qty_to_ship ?? 0);

  return {
    ...line,
    qty_to_ship: Math.min(
      Math.max(requestedQtyToShip, 0),
      outstanding
    ),
    line_amount:
      quantity *
      Number(line.unit_price ?? 0) *
      (1 - Number(line.line_discount_pct ?? 0) / 100),
  };
};

const money = (value: any) =>
  Number(value ?? 0).toFixed(2);

const qty = (value: any) =>
  Number(value ?? 0).toFixed(2);

const lineOutstandingQty = (line: Row) =>
  Math.max(
    Number(line.quantity ?? 0) -
      Number(line.qty_shipped ?? 0),
    0
  );

export function SalesOrderList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/sales-orders");
      setRows(res.data ?? []);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          "Failed to load sales orders"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    try {
      const res = await api.post("/sales-orders", {
        customer_no: "",
      });
      navigate(`/sales-orders/${res.data.data.id}`);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          "Failed to create sales order"
      );
    }
  };

  return (
    <div>
      <PageHeader
        title="Sales Orders"
        subtitle="Customer sales orders"
        actions={
          <Button onClick={create}>
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        }
      />

      <div className="p-6">
        <div className="rounded border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SO No.</TableHead>
                <TableHead>Customer No.</TableHead>
                <TableHead>Customer Name</TableHead>
                <TableHead>Posting Date</TableHead>
                <TableHead>Document Date</TableHead>
                <TableHead className="text-right">
                  Total Amount
                </TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No Sales Orders yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      navigate(`/sales-orders/${row.id}`)
                    }
                  >
                    <TableCell className="font-medium text-primary">
                      {row.document_no}
                    </TableCell>
                    <TableCell>{row.customer_no}</TableCell>
                    <TableCell>{row.customer_name}</TableCell>
                    <TableCell>
                      {formatDateDisplay(row.posting_date)}
                    </TableCell>
                    <TableCell>
                      {formatDateDisplay(row.document_date)}
                    </TableCell>
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

export function SalesOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [header, setHeader] = useState<Row | null>(null);
  const [lines, setLines] = useState<Row[]>([]);
  const [customers, setCustomers] = useState<Row[]>([]);
  const [items, setItems] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;

    try {
      const [detailRes, customerRes, itemRes] =
        await Promise.all([
          api.get(`/sales-orders/${id}`),
          api.get("/customers"),
          api.get("/items"),
        ]);

      setHeader(detailRes.data.header);
      setLines(detailRes.data.lines ?? []);
      setCustomers(customerRes.data ?? []);
      setItems(itemRes.data ?? []);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          "Failed to load sales order"
      );
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const customerItems: LookupItem[] = customers.map((customer) => ({
    value: customer.customer_no,
    label: customer.name,
    sub: customer.city ?? undefined,
    raw: customer,
  }));

  const itemItems: LookupItem[] = items.map((item) => ({
    value: item.item_no,
    label: item.description,
    sub: item.sales_unit_of_measure || item.base_unit_of_measure,
    raw: item,
  }));

  const total = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum + Number(line.line_amount ?? 0),
        0
      ),
    [lines]
  );

  const validateLineAvailability = () => {
    for (const line of lines) {
      if (!String(line.item_no ?? "").trim()) continue;

      if (!String(line.location_code ?? header?.location_code ?? "").trim()) {
        toast.error("Location Code is required on sales order lines.");
        return false;
      }

      const quantity =
        Number(line.quantity ?? 0);

      if (quantity <= 0) {
        toast.error("Quantity must be greater than 0.");
        return false;
      }

      const available =
        Number(line.available_qty ?? 0);
      const outstanding =
        lineOutstandingQty(line);

      if (outstanding > available) {
        toast.error(
          `Quantity cannot exceed available inventory. Available inventory for ${line.item_no} is ${qty(available)}.`
        );
        return false;
      }
    }

    return true;
  };

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

  const saveHeader = async () => {
    if (!header) return;

    if (!String(header.location_code ?? "").trim()) {
      toast.error("Location Code is required");
      return false;
    }

    if (!validateLineAvailability()) {
      return false;
    }

    try {
      setSaving(true);
      const res = await api.put(
        `/sales-orders/${header.id}`,
        normalizeDateFieldsWithDefault({
          ...header,
          total_amount: total,
        }, [
          "document_date",
          "posting_date",
          "due_date",
          "shipment_date",
          "requested_delivery_date",
          "promised_delivery_date",
        ])
      );
      setHeader(res.data);
      toast.success("Saved");
      return true;
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          "Failed to save sales order"
      );
    } finally {
      setSaving(false);
    }
  };

  const saveLine = async (line: Row) => {
    try {
      const res = await api.put(
        `/sales-orders/line/${line.id}`,
        line
      );
      setLines((current) =>
        current.map((entry) =>
          entry.id === line.id ? res.data : entry
        )
      );
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          "Failed to save line"
      );
    }
  };

  const updateLine = (
    lineId: number,
    patch: Row,
    persist = true
  ) => {
    let nextLine: Row | null = null;

    setLines((current) =>
      current.map((line) => {
        if (line.id !== lineId) return line;

        nextLine = {
          ...line,
          ...patch,
        };

        nextLine =
          calculateSalesLine(nextLine);

        return nextLine;
      })
    );

    if (persist && nextLine) {
      saveLine(nextLine);
    }
  };

  const addLine = async () => {
    if (!header) return;

    try {
      const res = await api.post(
        `/sales-orders/${header.id}/lines`,
        {
          item_no: "",
          item_description: "",
          location_code: header.location_code ?? "",
          quantity: 0,
          unit_price: 0,
          line_discount_pct: 0,
          qty_to_ship: 0,
        }
      );
      setLines((current) => [...current, res.data]);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          "Failed to add line"
      );
    }
  };

  const removeLine = async (lineId: number) => {
    try {
      await api.delete(`/sales-orders/line/${lineId}`);
      setLines((current) =>
        current.filter((line) => line.id !== lineId)
      );
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          "Failed to delete line"
      );
    }
  };

  const postShipment = async () => {
    if (!header) return;

    try {
      setBusy(true);
      const saved = await saveHeader();
      if (!saved) return;
      const res = await api.post(
        `/sales-orders/${header.id}/post-shipment`
      );
      toast.success(
        `${res.data.posted_sales_shipment_no ?? "Shipment"} posted`
      );
      navigate(
        `/posted-sales-shipments/${res.data.posted_sales_shipment_id}`
      );
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          "Failed to post shipment"
      );
    } finally {
      setBusy(false);
    }
  };

  const createInvoice = async () => {
    if (!header) return;

    try {
      setBusy(true);
      const saved = await saveHeader();
      if (!saved) return;
      const res = await api.post(
        `/sales-orders/${header.id}/create-invoice`
      );
      toast.success("Invoice created");
      if (res.data?.sales_invoice_id) {
        navigate(`/sales-invoices/${res.data.sales_invoice_id}`);
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          "Failed to create invoice"
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!header) return;
    if (!confirm("Delete this Sales Order?")) return;

    try {
      await api.delete(`/sales-orders/${header.id}`);
      toast.success("Deleted");
      navigate("/sales-orders");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
          "Failed to delete sales order"
      );
    }
  };

  if (!header) {
    return (
      <div className="p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={header.document_no}
        subtitle="Sales Order"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => navigate("/sales-orders")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button
              variant="outline"
              onClick={saveHeader}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button
              variant="outline"
              onClick={postShipment}
              disabled={busy}
            >
              <Truck className="h-4 w-4 mr-1" />
              Post Shipment
            </Button>
            <Button
              onClick={createInvoice}
              disabled={busy}
            >
              <FileText className="h-4 w-4 mr-1" />
              Create Invoice
            </Button>
            <Button
              variant="destructive"
              onClick={remove}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </>
        }
      />

      <div className="p-6 space-y-4">
        <section className="rounded border bg-card p-6">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">
              Header
            </h2>
            <Badge className="rounded-full">
              {header.status ?? "Open"}
            </Badge>
          </div>

          <Tabs defaultValue="general" className="mt-4">
            <TabsList className="h-10 flex-wrap rounded-none bg-muted">
              <TabsTrigger
                value="general"
                className="rounded-none"
              >
                General
              </TabsTrigger>
              <TabsTrigger
                value="ship"
                className="rounded-none"
              >
                Ship-to / Bill-to
              </TabsTrigger>
              <TabsTrigger
                value="dates"
                className="rounded-none"
              >
                Dates
              </TabsTrigger>
              <TabsTrigger
                value="invoice"
                className="rounded-none"
              >
                Invoice
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="general"
              className="pt-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Customer No.
                  </Label>
                  <LookupCombobox
                    value={header.customer_no ?? ""}
                    items={customerItems}
                    placeholder="Select customer..."
                    onSelect={(item) => {
                      const customer = item.raw ?? {};
                      setHeader((current) =>
                        current
                          ? {
                              ...current,
                              customer_no: item.value,
                              customer_name: customer.name ?? "",
                              customer_gst_reg_no:
                                customer.gst_registration_no ?? "",
                              gst_customer_type:
                                customer.gst_customer_type ?? "",
                              location_code:
                                customer.location_code ??
                                current.location_code,
                              address: customer.address ?? "",
                              address_2:
                                customer.address_2 ?? "",
                              city: customer.city ?? "",
                              post_code:
                                customer.post_code ?? "",
                              country_region_code:
                                customer.country_region_code ?? "",
                              contact:
                                customer.contact_person ?? "",
                              email: customer.email ?? "",
                              phone_no:
                                customer.phone_no ?? "",
                              payment_terms_code:
                                customer.payment_terms_code ?? "",
                              payment_method_code:
                                customer.payment_method_code ?? "",
                              shipment_method_code:
                                customer.shipment_method_code ?? "",
                              salesperson_code:
                                customer.salesperson_code ??
                                current.salesperson_code,
                            }
                          : current
                      );
                    }}
                  />
                </div>
                <Field
                  label="Customer Name"
                  value={header.customer_name}
                  onChange={(value) =>
                    setHeaderField("customer_name", value)
                  }
                />
                <Field
                  label="Customer GST Reg. No."
                  value={header.customer_gst_reg_no}
                  onChange={(value) =>
                    setHeaderField(
                      "customer_gst_reg_no",
                      value
                    )
                  }
                />
                <Field
                  label="GST Customer Type"
                  value={header.gst_customer_type}
                  onChange={(value) =>
                    setHeaderField(
                      "gst_customer_type",
                      value
                    )
                  }
                />
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Salesperson Code
                  </Label>
                  <SalespersonPurchaserSelect
                    value={header.salesperson_code ?? ""}
                    onChange={(value) =>
                      setHeaderField(
                        "salesperson_code",
                        value
                      )
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Location Code *
                  </Label>
                  <LocationSelect
                    value={header.location_code ?? ""}
                    onChange={(value) =>
                      setHeaderField("location_code", value)
                    }
                  />
                </div>
                <Field
                  label="External Document No."
                  value={header.external_document_no}
                  onChange={(value) =>
                    setHeaderField(
                      "external_document_no",
                      value
                    )
                  }
                />
                <Field
                  label="Your Reference"
                  value={header.your_reference}
                  onChange={(value) =>
                    setHeaderField("your_reference", value)
                  }
                />
                <Field
                  label="Discount"
                  type="number"
                  value={header.discount ?? 0}
                  onChange={(value) =>
                    setHeaderField(
                      "discount",
                      Number(value || 0)
                    )
                  }
                />
                <Field
                  label="Narration"
                  value={header.narration}
                  onChange={(value) =>
                    setHeaderField("narration", value)
                  }
                />
              </div>
            </TabsContent>

            <TabsContent
              value="ship"
              className="pt-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-4">
                <Field
                  label="Address"
                  value={header.address}
                  onChange={(value) =>
                    setHeaderField("address", value)
                  }
                />
                <Field
                  label="Address 2"
                  value={header.address_2}
                  onChange={(value) =>
                    setHeaderField("address_2", value)
                  }
                />
                <Field
                  label="City"
                  value={header.city}
                  onChange={(value) =>
                    setHeaderField("city", value)
                  }
                />
                <Field
                  label="Post Code"
                  value={header.post_code}
                  onChange={(value) =>
                    setHeaderField("post_code", value)
                  }
                />
                <Field
                  label="Country/Region Code"
                  value={header.country_region_code}
                  onChange={(value) =>
                    setHeaderField(
                      "country_region_code",
                      value
                    )
                  }
                />
                <Field
                  label="Contact"
                  value={header.contact}
                  onChange={(value) =>
                    setHeaderField("contact", value)
                  }
                />
                <Field
                  label="Email"
                  value={header.email}
                  onChange={(value) =>
                    setHeaderField("email", value)
                  }
                />
                <Field
                  label="Phone No."
                  value={header.phone_no}
                  onChange={(value) =>
                    setHeaderField("phone_no", value)
                  }
                />
                <Field
                  label="Ship-to Code"
                  value={header.ship_to_code}
                  onChange={(value) =>
                    setHeaderField("ship_to_code", value)
                  }
                />
                <Field
                  label="Ship-to Name"
                  value={header.ship_to_name}
                  onChange={(value) =>
                    setHeaderField("ship_to_name", value)
                  }
                />
                <Field
                  label="Ship-to Address"
                  value={header.ship_to_address}
                  onChange={(value) =>
                    setHeaderField(
                      "ship_to_address",
                      value
                    )
                  }
                />
                <Field
                  label="Ship-to City"
                  value={header.ship_to_city}
                  onChange={(value) =>
                    setHeaderField("ship_to_city", value)
                  }
                />
              </div>
            </TabsContent>

            <TabsContent
              value="dates"
              className="pt-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-4">
                <Field
                  label="Document Date"
                  type="date"
                  value={dateInputOrToday(header.document_date)}
                  onChange={(value) =>
                    setHeaderField("document_date", value)
                  }
                />
                <Field
                  label="Posting Date"
                  type="date"
                  value={dateInputOrToday(header.posting_date)}
                  onChange={(value) =>
                    setHeaderField("posting_date", value)
                  }
                />
                <Field
                  label="Due Date"
                  type="date"
                  value={dateInputOrToday(header.due_date)}
                  onChange={(value) =>
                    setHeaderField("due_date", value)
                  }
                />
                <Field
                  label="Shipment Date"
                  type="date"
                  value={dateInputOrToday(header.shipment_date)}
                  onChange={(value) =>
                    setHeaderField("shipment_date", value)
                  }
                />
                <Field
                  label="Requested Delivery Date"
                  type="date"
                  value={dateInputOrToday(
                    header.requested_delivery_date
                  )}
                  onChange={(value) =>
                    setHeaderField(
                      "requested_delivery_date",
                      value
                    )
                  }
                />
                <Field
                  label="Promised Delivery Date"
                  type="date"
                  value={dateInputOrToday(
                    header.promised_delivery_date
                  )}
                  onChange={(value) =>
                    setHeaderField(
                      "promised_delivery_date",
                      value
                    )
                  }
                />
              </div>
            </TabsContent>

            <TabsContent
              value="invoice"
              className="pt-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-3 gap-y-4">
                <div>
                  <Label className="text-xs">Currency Code</Label>
                  <CurrencySelect
                    value={header.currency_code}
                    onChange={(value) => setHeaderField("currency_code", value || "INR")}
                  />
                </div>
                <Field
                  label="Payment Terms Code"
                  value={header.payment_terms_code}
                  onChange={(value) =>
                    setHeaderField(
                      "payment_terms_code",
                      value
                    )
                  }
                />
                <Field
                  label="Payment Method Code"
                  value={header.payment_method_code}
                  onChange={(value) =>
                    setHeaderField(
                      "payment_method_code",
                      value
                    )
                  }
                />
                <Field
                  label="Shipment Method Code"
                  value={header.shipment_method_code}
                  onChange={(value) =>
                    setHeaderField(
                      "shipment_method_code",
                      value
                    )
                  }
                />
              </div>
            </TabsContent>
          </Tabs>
        </section>

        <section className="rounded border bg-card">
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-base font-semibold">
              Lines
            </h2>
            <Button onClick={addLine}>
              <Plus className="h-4 w-4 mr-1" />
              Add Line
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Item No.</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">
                    Inventory Qty
                  </TableHead>
                  <TableHead className="text-right">
                    Committed Qty
                  </TableHead>
                  <TableHead className="text-right">
                    Available Qty
                  </TableHead>
                  <TableHead className="text-right">
                    Qty
                  </TableHead>
                  <TableHead className="text-right">
                    Unit Price
                  </TableHead>
                  <TableHead className="text-right">
                    Disc %
                  </TableHead>
                  <TableHead className="text-right">
                    Line Amount
                  </TableHead>
                  <TableHead className="text-right">
                    Qty to Ship
                  </TableHead>
                  <TableHead className="text-right">
                    Qty Shipped
                  </TableHead>
                  <TableHead>HSN/SAC</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={17}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No lines. Click "Add Line".
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell className="text-muted-foreground">
                        {line.line_no}
                      </TableCell>
                      <TableCell>
                        <LookupCombobox
                          value={line.item_no ?? ""}
                          items={itemItems}
                          placeholder="Select item..."
                          className="min-w-[180px]"
                          onSelect={(item) => {
                            const raw = item.raw ?? {};
                            updateLine(line.id, {
                              item_no: item.value,
                              item_description:
                                raw.description ?? "",
                              location_code:
                                line.location_code ||
                                header.location_code ||
                                "",
                              unit_of_measure_code:
                                raw.sales_unit_of_measure ||
                                raw.base_unit_of_measure ||
                                "",
                              unit_price:
                                Number(raw.unit_price ?? 0),
                              hsn_sac_code:
                                raw.hsn_sac_code ?? "",
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <VariantSelect
                          itemNo={line.item_no}
                          value={line.variant_code ?? ""}
                          onChange={(value) =>
                            updateLine(line.id, {
                              variant_code: value,
                            })
                          }
                          className="h-9 min-w-[160px]"
                        />
                      </TableCell>
                      <TableCell>
                        <LineInput
                          value={line.item_description}
                          onCommit={(value) =>
                            updateLine(line.id, {
                              item_description: value,
                            })
                          }
                          className="min-w-[180px]"
                        />
                      </TableCell>
                      <TableCell>
                        <LocationSelect
                          value={line.location_code ?? ""}
                          onChange={(value) =>
                            updateLine(line.id, {
                              location_code: value,
                            })
                          }
                          className="h-9 min-w-[160px]"
                        />
                      </TableCell>
                      <TableCell>
                        <UomSelect
                          value={
                            line.unit_of_measure_code ?? ""
                          }
                          onChange={(value) =>
                            updateLine(line.id, {
                              unit_of_measure_code: value,
                            })
                          }
                          className="h-9 min-w-[130px]"
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {qty(line.inventory_qty)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {qty(line.committed_qty ?? line.open_sales_order_qty)}
                      </TableCell>
                      <TableCell
                        className={
                          lineOutstandingQty(line) >
                          Number(line.available_qty ?? 0)
                            ? "text-right tabular-nums font-semibold text-destructive"
                            : "text-right tabular-nums font-semibold"
                        }
                      >
                        {qty(line.available_qty)}
                      </TableCell>
                      <TableCell>
                        <LineNumber
                          value={line.quantity ?? 0}
                          onCommit={(value) =>
                            updateLine(line.id, {
                              quantity: value,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <LineNumber
                          value={line.unit_price ?? 0}
                          onCommit={(value) =>
                            updateLine(line.id, {
                              unit_price: value,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <LineNumber
                          value={line.line_discount_pct ?? 0}
                          percentage
                          onCommit={(value) =>
                            updateLine(line.id, {
                              line_discount_pct: value,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(line.line_amount)}
                      </TableCell>
                      <TableCell>
                        <LineNumber
                          value={line.qty_to_ship ?? 0}
                          onCommit={(value) =>
                            updateLine(line.id, {
                              qty_to_ship: value,
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money(line.qty_shipped)}
                      </TableCell>
                      <TableCell>
                        <LineInput
                          value={line.hsn_sac_code}
                          onCommit={(value) =>
                            updateLine(line.id, {
                              hsn_sac_code: value,
                            })
                          }
                          className="min-w-[120px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeLine(line.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: any;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        type={type}
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    </div>
  );
}

function LineInput({
  value,
  onCommit,
  className,
}: {
  value: any;
  onCommit: (value: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  return (
    <Input
      className={className}
      value={draft}
      onChange={(event) =>
        setDraft(event.target.value)
      }
      onBlur={() => {
        if (draft !== (value ?? "")) {
          onCommit(draft);
        }
      }}
    />
  );
}

function LineNumber({
  value,
  onCommit,
  percentage = false,
}: {
  value: any;
  onCommit: (value: number) => void;
  percentage?: boolean;
}) {
  const [draft, setDraft] = useState(String(value ?? 0));

  useEffect(() => {
    setDraft(String(value ?? 0));
  }, [value]);

  return (
    <NumericInput
      className="min-w-[110px] text-right"
      value={draft}
      decimalScale={percentage ? 3 : undefined}
      min={percentage ? 0 : undefined}
      max={percentage ? 100 : undefined}
      onChange={setDraft}
      onBlur={() => {
        const next = Number(draft || 0);
        if (next !== Number(value ?? 0)) {
          onCommit(next);
        }
      }}
    />
  );
}
