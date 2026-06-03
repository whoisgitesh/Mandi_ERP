import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { api } from "@/lib/api";

import { PageHeader } from "@/components/PageHeader";

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

import {
  LookupCombobox,
  LookupItem,
} from "@/components/LookupCombobox";

import { VariantSelect } from "@/components/VariantSelect";

import { toast } from "sonner";

import {
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

type Row = {
  id: string;
  vendor_no: string;
  vendor_name: string | null;
  date: string;
  item_no: string;
  item_description: string | null;
  today_purchase_quantity: number;
  today_purchase_rate: number;
  variant_code: string | null;
  starting_date: string | null;
  expected_qty: number;
  expected_rate: number;
  bardana_weight: number;
  dammi: number;
  mandi_labour: number;
  loading_stiching: number;
  commission: number;
  dalali: number;
  market_fees: number;
  hrdf: number;
  cancer_fund: number;
  mandi_dhara_fof_payment: number;
  initial_update_time: string | null;
  fill_up_time: string | null;
  per_pack_qty: number;
};

type Vendor = {
  vendor_no: string;
  name: string;
  city: string | null;
  email: string | null;
};

type Item = {
  item_no: string;
  description: string;
  unit_cost: number;
  base_unit_of_measure: string | null;
};

const today = () =>
  new Date()
    .toISOString()
    .slice(0, 10);

const empty = {
  vendor_no: "",
  vendor_name: "",
  date: today(),
  item_no: "",
  item_description: "",
  today_purchase_quantity: 0,
  today_purchase_rate: 0,
  variant_code: "",
  starting_date: today(),
  expected_qty: 0,
  expected_rate: 0,
  bardana_weight: 0,
  dammi: 0,
  mandi_labour: 0,
  loading_stiching: 0,
  commission: 0,
  dalali: 0,
  market_fees: 0,
  hrdf: 0,
  cancer_fund: 0,
  mandi_dhara_fof_payment: 0,
  initial_update_time: "",
  fill_up_time: "",
  per_pack_qty: 0,
};

export default function MandiMaster() {
  const [rows, setRows] =
    useState<Row[]>([]);

  const [vendors, setVendors] =
    useState<Vendor[]>([]);

  const [items, setItems] =
    useState<Item[]>([]);

  const [open, setOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<Row | null>(null);

  const [form, setForm] =
    useState({ ...empty });

  const [loading, setLoading] =
    useState(true);

  const load = async () => {
    try {
      setLoading(true);

      const [
        mandiRes,
        vendorRes,
        itemRes,
      ] = await Promise.all([
        api.get("/mandi-master"),
        api.get("/vendors"),
        api.get("/items"),
      ]);

      setRows(mandiRes.data ?? []);
      setVendors(vendorRes.data ?? []);
      setItems(itemRes.data ?? []);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
        "Failed to load mandi details"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const vendorByNo =
    useMemo(
      () =>
        new Map(
          vendors.map((v) => [
            v.vendor_no,
            v,
          ])
        ),
      [vendors]
    );

  const vendorByName =
    useMemo(
      () =>
        new Map(
          vendors.map((v) => [
            v.name,
            v,
          ])
        ),
      [vendors]
    );

  const itemByNo =
    useMemo(
      () =>
        new Map(
          items.map((i) => [
            i.item_no,
            i,
          ])
        ),
      [items]
    );

  const itemByDesc =
    useMemo(
      () =>
        new Map(
          items.map((i) => [
            i.description,
            i,
          ])
        ),
      [items]
    );

  const vendorNoItems: LookupItem[] =
    vendors.map((v) => ({
      value: v.vendor_no,
      label: v.name,
      sub: v.city ?? undefined,
    }));

  const vendorNameItems: LookupItem[] =
    vendors.map((v) => ({
      value: v.name,
      label: v.vendor_no,
      sub: v.city ?? undefined,
    }));

  const itemNoItems: LookupItem[] =
    items.map((i) => ({
      value: i.item_no,
      label: i.description,
      sub: `Cost: ${i.unit_cost ?? 0}`,
    }));

  const itemDescItems: LookupItem[] =
    items.map((i) => ({
      value: i.description,
      label: i.item_no,
      sub: `Cost: ${i.unit_cost ?? 0}`,
    }));

  const startNew = () => {
    setEditing(null);
    setForm({
      ...empty,
      date: today(),
      starting_date: today(),
    });
    setOpen(true);
  };

  const startEdit = (r: Row) => {
    setEditing(r);
    setForm({
      vendor_no: r.vendor_no,
      vendor_name: r.vendor_name ?? "",
      date: r.date,
      item_no: r.item_no,
      item_description: r.item_description ?? "",
      today_purchase_quantity: Number(r.today_purchase_quantity ?? 0),
      today_purchase_rate: Number(r.today_purchase_rate ?? 0),
      variant_code: r.variant_code ?? "",
      starting_date: r.starting_date ?? "",
      expected_qty: Number(r.expected_qty ?? 0),
      expected_rate: Number(r.expected_rate ?? 0),
      bardana_weight: Number(r.bardana_weight ?? 0),
      dammi: Number(r.dammi ?? 0),
      mandi_labour: Number(r.mandi_labour ?? 0),
      loading_stiching: Number(r.loading_stiching ?? 0),
      commission: Number(r.commission ?? 0),
      dalali: Number(r.dalali ?? 0),
      market_fees: Number(r.market_fees ?? 0),
      hrdf: Number(r.hrdf ?? 0),
      cancer_fund: Number(r.cancer_fund ?? 0),
      mandi_dhara_fof_payment: Number(r.mandi_dhara_fof_payment ?? 0),
      initial_update_time: r.initial_update_time
        ? r.initial_update_time.slice(0, 16)
        : "",
      fill_up_time: r.fill_up_time
        ? r.fill_up_time.slice(0, 16)
        : "",
      per_pack_qty: Number(r.per_pack_qty ?? 0),
    });
    setOpen(true);
  };

  const pickVendorByNo = (vendor_no: string) => {
    const vendor =
      vendorByNo.get(vendor_no);

    setForm((f) => ({
      ...f,
      vendor_no,
      vendor_name:
        vendor?.name ?? f.vendor_name,
    }));
  };

  const pickVendorByName = (name: string) => {
    const vendor =
      vendorByName.get(name);

    setForm((f) => ({
      ...f,
      vendor_name: name,
      vendor_no:
        vendor?.vendor_no ?? f.vendor_no,
    }));
  };

  const pickItemByNo = (item_no: string) => {
    const item =
      itemByNo.get(item_no);

    setForm((f) => ({
      ...f,
      item_no,
      item_description:
        item?.description ?? f.item_description,
      variant_code:
        item?.item_no !== f.item_no
          ? ""
          : f.variant_code,
      today_purchase_rate:
        item
          ? Number(item.unit_cost ?? 0)
          : f.today_purchase_rate,
    }));
  };

  const pickItemByDesc = (description: string) => {
    const item =
      itemByDesc.get(description);

    setForm((f) => ({
      ...f,
      item_description: description,
      item_no:
        item?.item_no ?? f.item_no,
      variant_code:
        item?.item_no !== f.item_no
          ? ""
          : f.variant_code,
      today_purchase_rate:
        item
          ? Number(item.unit_cost ?? 0)
          : f.today_purchase_rate,
    }));
  };

  const num =
    (key: keyof typeof empty) =>
    (value: string) =>
      setForm((f) => ({
        ...f,
        [key]: Number(value),
      }));

  const toIsoOrNull = (value: string) =>
    value
      ? new Date(value).toISOString()
      : null;

  const save = async () => {
    try {
      const payload = {
        vendor_no: form.vendor_no,
        vendor_name: form.vendor_name || null,
        date: form.date,
        item_no: form.item_no,
        item_description: form.item_description || null,
        today_purchase_quantity: Number(form.today_purchase_quantity),
        today_purchase_rate: Number(form.today_purchase_rate),
        variant_code: form.variant_code || null,
        starting_date: form.starting_date || null,
        expected_qty: Number(form.expected_qty),
        expected_rate: Number(form.expected_rate),
        bardana_weight: Number(form.bardana_weight),
        dammi: Number(form.dammi),
        mandi_labour: Number(form.mandi_labour),
        loading_stiching: Number(form.loading_stiching),
        commission: Number(form.commission),
        dalali: Number(form.dalali),
        market_fees: Number(form.market_fees),
        hrdf: Number(form.hrdf),
        cancer_fund: Number(form.cancer_fund),
        mandi_dhara_fof_payment: Number(form.mandi_dhara_fof_payment),
        initial_update_time: toIsoOrNull(form.initial_update_time),
        fill_up_time: toIsoOrNull(form.fill_up_time),
        per_pack_qty: Number(form.per_pack_qty),
      };

      if (editing) {
        await api.put(
          `/mandi-master/${editing.id}`,
          payload
        );
        toast.success("Updated");
      } else {
        await api.post(
          "/mandi-master",
          payload
        );
        toast.success("Created");
      }

      setOpen(false);
      await load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
        "Failed to save"
      );
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this entry?")) {
      return;
    }

    try {
      await api.delete(`/mandi-master/${id}`);
      toast.success("Deleted");
      await load();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error ||
        "Failed to delete"
      );
    }
  };

  return (
    <div>
      <PageHeader
        title="Mandi Details List"
        subtitle="Vendor-wise daily purchase limits & charges"
        actions={
          <Dialog
            open={open}
            onOpenChange={setOpen}
          >
            <DialogTrigger asChild>
              <Button onClick={startNew}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editing
                    ? "Edit Mandi Detail"
                    : "New Mandi Detail"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <Section title="General">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Item No.</Label>
                      <LookupCombobox
                        value={form.item_no}
                        items={itemNoItems}
                        placeholder="Select item no..."
                        onSelect={(i) => pickItemByNo(i.value)}
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Description</Label>
                      <LookupCombobox
                        value={form.item_description}
                        items={itemDescItems}
                        placeholder="Select description..."
                        onSelect={(i) => pickItemByDesc(i.value)}
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Variant</Label>
                      <VariantSelect
                        itemNo={form.item_no}
                        value={form.variant_code}
                        onChange={(v) =>
                          setForm({
                            ...form,
                            variant_code: v,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Party No.</Label>
                      <LookupCombobox
                        value={form.vendor_no}
                        items={vendorNoItems}
                        placeholder="Select party no..."
                        onSelect={(i) => pickVendorByNo(i.value)}
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Party Name</Label>
                      <LookupCombobox
                        value={form.vendor_name}
                        items={vendorNameItems}
                        placeholder="Select party name..."
                        onSelect={(i) => pickVendorByName(i.value)}
                      />
                    </div>

                    <Field
                      label="Date"
                      type="date"
                      value={form.date}
                      onChange={(v) =>
                        setForm({
                          ...form,
                          date: v,
                        })
                      }
                    />

                    <Field
                      label="Starting Date"
                      type="date"
                      value={form.starting_date}
                      onChange={(v) =>
                        setForm({
                          ...form,
                          starting_date: v,
                        })
                      }
                    />

                    <Field label="Expected Qty" type="number" value={String(form.expected_qty)} onChange={num("expected_qty")} />
                    <Field label="Expected Rate" type="number" value={String(form.expected_rate)} onChange={num("expected_rate")} />
                    <Field label="Bardana Weight" type="number" value={String(form.bardana_weight)} onChange={num("bardana_weight")} />
                    <Field label="Today Purchase Qty" type="number" value={String(form.today_purchase_quantity)} onChange={num("today_purchase_quantity")} />
                    <Field label="Today Purchase Rate" type="number" value={String(form.today_purchase_rate)} onChange={num("today_purchase_rate")} />
                  </div>
                </Section>

                <Section title="Charges">
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Dammi" type="number" value={String(form.dammi)} onChange={num("dammi")} />
                    <Field label="Mandi Labour" type="number" value={String(form.mandi_labour)} onChange={num("mandi_labour")} />
                    <Field label="Loading & Stiching" type="number" value={String(form.loading_stiching)} onChange={num("loading_stiching")} />
                    <Field label="Commission" type="number" value={String(form.commission)} onChange={num("commission")} />
                    <Field label="Dalali" type="number" value={String(form.dalali)} onChange={num("dalali")} />
                    <Field label="Market Fees" type="number" value={String(form.market_fees)} onChange={num("market_fees")} />
                    <Field label="HRDF" type="number" value={String(form.hrdf)} onChange={num("hrdf")} />
                    <Field label="Cancer Fund" type="number" value={String(form.cancer_fund)} onChange={num("cancer_fund")} />
                    <Field label="Mandi Dhara FOF Payment" type="number" value={String(form.mandi_dhara_fof_payment)} onChange={num("mandi_dhara_fof_payment")} />
                  </div>
                </Section>

                <Section title="Timings & Packing">
                  <div className="grid grid-cols-3 gap-3">
                    <Field
                      label="Initial Update Time"
                      type="datetime-local"
                      value={form.initial_update_time}
                      onChange={(v) =>
                        setForm({
                          ...form,
                          initial_update_time: v,
                        })
                      }
                    />

                    <Field
                      label="Fill-Up Time"
                      type="datetime-local"
                      value={form.fill_up_time}
                      onChange={(v) =>
                        setForm({
                          ...form,
                          fill_up_time: v,
                        })
                      }
                    />

                    <Field label="Per Pack Qty" type="number" value={String(form.per_pack_qty)} onChange={num("per_pack_qty")} />
                  </div>
                </Section>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>

                <Button onClick={save}>
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
                <TableHead>Item No.</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Party No.</TableHead>
                <TableHead>Party Name</TableHead>
                <TableHead>Starting Date</TableHead>
                <TableHead className="text-right">Expected Qty</TableHead>
                <TableHead className="text-right">Expected Rate</TableHead>
                <TableHead className="text-right">Bardana Wt.</TableHead>
                <TableHead className="text-right">Dammi</TableHead>
                <TableHead className="text-right">Mandi Labour</TableHead>
                <TableHead className="text-right">Load & Stitch</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Dalali</TableHead>
                <TableHead className="text-right">Market Fees</TableHead>
                <TableHead className="text-right">HRDF</TableHead>
                <TableHead className="text-right">Cancer Fund</TableHead>
                <TableHead className="text-right">Mandi Dhara FOF</TableHead>
                <TableHead className="text-right">Per Pack Qty</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={20}
                    className="text-center text-muted-foreground py-8"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={20}
                    className="text-center text-muted-foreground py-8"
                  >
                    No entries yet. Click "New" to add one.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.item_no}</TableCell>
                    <TableCell className="text-muted-foreground">{r.item_description}</TableCell>
                    <TableCell>{r.variant_code ?? "-"}</TableCell>
                    <TableCell>{r.vendor_no}</TableCell>
                    <TableCell>{r.vendor_name}</TableCell>
                    <TableCell>{r.starting_date ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.expected_qty ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.expected_rate ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.bardana_weight ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.dammi ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.mandi_labour ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.loading_stiching ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.commission ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.dalali ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.market_fees ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.hrdf ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.cancer_fund ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.mandi_dhara_fof_payment ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(r.per_pack_qty ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(r)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => remove(r.id)}
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

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2 text-foreground">
        {title}
      </h3>
      {children}
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
  onChange: (value: string) => void;
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
        onChange={(event) =>
          onChange(event.target.value)
        }
      />
    </div>
  );
}
