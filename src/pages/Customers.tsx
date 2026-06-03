import { useEffect, useState } from "react";
import { api } from "@/lib/api";

import { PageHeader } from "@/components/PageHeader";
import { MasterNoSeriesSelect } from "@/components/MasterNoSeriesSelect";
import { ListPageSkeleton } from "@/components/skeletons/ErpSkeletons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { toast } from "sonner";

import {
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

type Row = {
  id: string;

  customer_no: string;

  name: string;

  address: string | null;

  city: string | null;

  gst_customer_type: string | null;

  gst_registration_no: string | null;

  opening_balance: number;

  closing_balance: number;

  responsibility_center: string | null;

  location_code: string | null;

  phone_no: string | null;

  contact: string | null;

  email: string | null;

  balance_lcy: number;

  overdue_balance_lcy: number;

  sales_lcy: number;

  payments_lcy: number;
};

const empty = {
  customer_no: "",

  name: "",

  address: "",

  city: "",

  gst_customer_type: "",

  gst_registration_no: "",

  opening_balance: 0,

  closing_balance: 0,

  responsibility_center: "",

  location_code: "",

  phone_no: "",

  contact: "",

  email: "",

  balance_lcy: 0,

  overdue_balance_lcy: 0,

  sales_lcy: 0,

  payments_lcy: 0,
};

export default function Customers() {
  const [rows, setRows] = useState<Row[]>([]);

  const [open, setOpen] = useState(false);

  const [editing, setEditing] =
    useState<Row | null>(null);

  const [form, setForm] = useState({
    ...empty,
  });

  const [loading, setLoading] =
    useState(true);

  const [noSeriesLineId, setNoSeriesLineId] =
    useState("");

  /**
   * LOAD CUSTOMERS
   */
  const load = async () => {
    try {
      setLoading(true);

      const res =
        await api.get("/customers");

      setRows(res.data ?? []);

    } catch (err: any) {

      toast.error(
        err?.response?.data?.error ||
          "Failed to load customers"
      );

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /**
   * NEW CUSTOMER
   */
  const startNew = async () => {
    setEditing(null);

    setForm({
      ...empty,
      customer_no: "AUTO",
    });

    setNoSeriesLineId("");

    setOpen(true);
  };

  /**
   * EDIT CUSTOMER
   */
  const startEdit = (r: Row) => {
    setEditing(r);

    setForm({
      customer_no: r.customer_no,

      name: r.name,

      address: r.address ?? "",

      city: r.city ?? "",

      gst_customer_type:
        r.gst_customer_type ?? "",

      gst_registration_no:
        r.gst_registration_no ?? "",

      opening_balance:
        r.opening_balance,

      closing_balance:
        r.closing_balance,

      responsibility_center:
        r.responsibility_center ?? "",

      location_code:
        r.location_code ?? "",

      phone_no:
        r.phone_no ?? "",

      contact:
        r.contact ?? "",

      email:
        r.email ?? "",

      balance_lcy:
        r.balance_lcy,

      overdue_balance_lcy:
        r.overdue_balance_lcy,

      sales_lcy:
        r.sales_lcy,

      payments_lcy:
        r.payments_lcy,
    });

    setOpen(true);
  };

  /**
   * SAVE CUSTOMER
   */
  const save = async () => {
    try {
      const payload = {
        ...form,

        no_series_line_id:
          noSeriesLineId || undefined,

        opening_balance:
          Number(form.opening_balance),

        closing_balance:
          Number(form.closing_balance),

        balance_lcy:
          Number(form.balance_lcy),

        overdue_balance_lcy:
          Number(form.overdue_balance_lcy),

        sales_lcy:
          Number(form.sales_lcy),

        payments_lcy:
          Number(form.payments_lcy),
      };

      if (editing) {

        await api.put(
          `/customers/${editing.id}`,
          payload
        );

        toast.success("Updated");

      } else {

        await api.post(
          "/customers",
          payload
        );

        toast.success("Created");
      }

      setOpen(false);

      load();

    } catch (err: any) {

      toast.error(
        err?.response?.data?.error ||
          "Failed to save customer"
      );
    }
  };

  /**
   * DELETE CUSTOMER
   */
  const remove = async (
    id: string
  ) => {
    try {
      if (
        !confirm(
          "Delete this customer?"
        )
      )
        return;

      await api.delete(
        `/customers/${id}`
      );

      toast.success("Deleted");

      load();

    } catch (err: any) {

      toast.error(
        err?.response?.data?.error ||
          "Failed to delete customer"
      );
    }
  };

  if (loading) return <ListPageSkeleton columns={8} rows={7} />;

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Customer master list"
        actions={
          <Dialog
            open={open}
            onOpenChange={setOpen}
          >
            <DialogTrigger asChild>
              <Button
                onClick={startNew}
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editing
                    ? "Edit Customer"
                    : "New Customer"}
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="No."
                  value={
                    form.customer_no
                  }
                  onChange={(v) =>
                    setForm({
                      ...form,
                      customer_no: v,
                    })
                  }
                />

                {!editing && (
                  <MasterNoSeriesSelect
                    value={noSeriesLineId}
                    keywords={[
                      "CUSTOMER",
                      "CUST",
                      "CU",
                    ]}
                    onChange={setNoSeriesLineId}
                  />
                )}

                <Field
                  label="Name"
                  value={form.name}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      name: v,
                    })
                  }
                />

                <Field
                  label="Address"
                  value={form.address}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      address: v,
                    })
                  }
                />

                <Field
                  label="City"
                  value={form.city}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      city: v,
                    })
                  }
                />

                <Field
                  label="GST Customer Type"
                  value={
                    form.gst_customer_type
                  }
                  onChange={(v) =>
                    setForm({
                      ...form,
                      gst_customer_type: v,
                    })
                  }
                />

                <Field
                  label="GST Registration No."
                  value={
                    form.gst_registration_no
                  }
                  onChange={(v) =>
                    setForm({
                      ...form,
                      gst_registration_no:
                        v,
                    })
                  }
                />

                <Field
                  label="Opening Balance"
                  type="number"
                  value={String(
                    form.opening_balance
                  )}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      opening_balance:
                        Number(v),
                    })
                  }
                />

                <Field
                  label="Closing Balance"
                  type="number"
                  value={String(
                    form.closing_balance
                  )}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      closing_balance:
                        Number(v),
                    })
                  }
                />

                <Field
                  label="Responsibility Center"
                  value={
                    form.responsibility_center
                  }
                  onChange={(v) =>
                    setForm({
                      ...form,
                      responsibility_center:
                        v,
                    })
                  }
                />

                <Field
                  label="Location Code"
                  value={
                    form.location_code
                  }
                  onChange={(v) =>
                    setForm({
                      ...form,
                      location_code:
                        v,
                    })
                  }
                />

                <Field
                  label="Phone No."
                  value={
                    form.phone_no
                  }
                  onChange={(v) =>
                    setForm({
                      ...form,
                      phone_no: v,
                    })
                  }
                />

                <Field
                  label="Contact"
                  value={form.contact}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      contact: v,
                    })
                  }
                />

                <Field
                  label="Email"
                  value={form.email}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      email: v,
                    })
                  }
                />

                <Field
                  label="Balance (LCY)"
                  type="number"
                  value={String(
                    form.balance_lcy
                  )}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      balance_lcy:
                        Number(v),
                    })
                  }
                />

                <Field
                  label="Overdue Balance (LCY)"
                  type="number"
                  value={String(
                    form.overdue_balance_lcy
                  )}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      overdue_balance_lcy:
                        Number(v),
                    })
                  }
                />

                <Field
                  label="Sales (LCY)"
                  type="number"
                  value={String(
                    form.sales_lcy
                  )}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      sales_lcy:
                        Number(v),
                    })
                  }
                />

                <Field
                  label="Payments (LCY)"
                  type="number"
                  value={String(
                    form.payments_lcy
                  )}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      payments_lcy:
                        Number(v),
                    })
                  }
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() =>
                    setOpen(false)
                  }
                >
                  Cancel
                </Button>

                <Button
                  onClick={save}
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-6">
        <div className="rounded border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  No.
                </TableHead>

                <TableHead>
                  Name
                </TableHead>

                <TableHead>
                  Address
                </TableHead>

                <TableHead>
                  City
                </TableHead>

                <TableHead>
                  GST Customer Type
                </TableHead>

                <TableHead>
                  GST Registration No.
                </TableHead>

                <TableHead className="text-right">
                  Opening Balance
                </TableHead>

                <TableHead className="text-right">
                  Closing Balance
                </TableHead>

                <TableHead>
                  Responsibility Center
                </TableHead>

                <TableHead>
                  Location Code
                </TableHead>

                <TableHead>
                  Phone No.
                </TableHead>

                <TableHead>
                  Contact
                </TableHead>

                <TableHead>
                  Email
                </TableHead>

                <TableHead className="text-right">
                  Balance (LCY)
                </TableHead>

                <TableHead className="text-right">
                  Overdue Balance
                </TableHead>

                <TableHead className="text-right">
                  Sales (LCY)
                </TableHead>

                <TableHead className="text-right">
                  Payments (LCY)
                </TableHead>

                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={18}
                    className="text-center text-muted-foreground py-8"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={18}
                    className="text-center text-muted-foreground py-8"
                  >
                    No customers yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-primary whitespace-nowrap">
                      {r.customer_no}
                    </TableCell>

                    <TableCell>
                      {r.name}
                    </TableCell>

                    <TableCell>
                      {r.address}
                    </TableCell>

                    <TableCell>
                      {r.city}
                    </TableCell>

                    <TableCell>
                      {
                        r.gst_customer_type
                      }
                    </TableCell>

                    <TableCell>
                      {
                        r.gst_registration_no
                      }
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {Number(
                        r.opening_balance
                      ).toFixed(2)}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {Number(
                        r.closing_balance
                      ).toFixed(2)}
                    </TableCell>

                    <TableCell>
                      {
                        r.responsibility_center
                      }
                    </TableCell>

                    <TableCell>
                      {
                        r.location_code
                      }
                    </TableCell>

                    <TableCell>
                      {r.phone_no}
                    </TableCell>

                    <TableCell>
                      {r.contact}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {r.email}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {Number(
                        r.balance_lcy
                      ).toFixed(2)}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {Number(
                        r.overdue_balance_lcy
                      ).toFixed(2)}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {Number(
                        r.sales_lcy
                      ).toFixed(2)}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {Number(
                        r.payments_lcy
                      ).toFixed(2)}
                    </TableCell>

                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          startEdit(r)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          remove(r.id)
                        }
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
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label className="text-xs">
        {label}
      </Label>

      <Input
        type={type}
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
      />
    </div>
  );
}
