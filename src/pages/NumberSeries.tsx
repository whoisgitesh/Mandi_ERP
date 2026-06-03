// import { useEffect, useState } from "react";
// import { supabase } from "@/integrations/supabase/client";
// import { PageHeader } from "@/components/PageHeader";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
// import { toast } from "sonner";
// import { Pencil, Plus, Trash2 } from "lucide-react";
// import { SERIES } from "@/lib/numberSeries";

// const SERIES_OPTIONS: { code: string; label: string }[] = [
//   { code: SERIES.VENDOR, label: "Vendor" },
//   { code: SERIES.ITEM, label: "Item" },
//   { code: SERIES.MANDI_MASTER, label: "Mandi Master" },
//   { code: SERIES.MANDI_VENDOR, label: "Mandi Vendor" },
//   { code: SERIES.MANDI_PURCHASE, label: "Mandi Purchase" },
//   { code: SERIES.PURCHASE_ORDER, label: "Purchase Order" },
//   { code: SERIES.INWARD_GATE_ENTRY, label: "Inward Gate Entry" },
//   { code: SERIES.POSTED_PURCHASE_RECEIPT, label: "Posted Purchase Receipt" },
//   { code: SERIES.CUSTOMER, label: "Customer" },
//   { code: SERIES.LOCATION, label: "Location" },
//   { code: SERIES.GRN, label: "Goods Receipt Note" },
//   { code: SERIES.SALES_ORDER, label: "Sales Order" },
//   { code: SERIES.SALES_INVOICE, label: "Sales Invoice" },
//   { code: SERIES.POSTED_SALES_SHIPMENT, label: "Posted Sales Shipment" },
//   { code: SERIES.UOM, label: "Unit of Measure" },
// ];

// type Row = {
//   id: string;
//   code: string;
//   description: string | null;
//   prefix: string;
//   padding: number;
//   starting_no: number;
//   starting_date: string;
//   last_no_used: number;
// };

// const empty = {
//   code: "",
//   description: "",
//   prefix: "",
//   padding: 3,
//   starting_no: 1,
//   starting_date: new Date().toISOString().slice(0, 10),
//   last_no_used: 0,
// };

// export default function NumberSeries() {
//   const [rows, setRows] = useState<Row[]>([]);
//   const [open, setOpen] = useState(false);
//   const [editing, setEditing] = useState<Row | null>(null);
//   const [form, setForm] = useState({ ...empty });
//   const [loading, setLoading] = useState(true);

//   const load = async () => {
//     setLoading(true);
//     const { data, error } = await supabase.from("number_series" as any).select("*").order("code");
//     if (error) toast.error(error.message);
//     setRows(((data as unknown) as Row[]) ?? []);
//     setLoading(false);
//   };
//   useEffect(() => { load(); }, []);

//   const startNew = () => { setEditing(null); setForm({ ...empty }); setOpen(true); };
//   const startEdit = (r: Row) => {
//     setEditing(r);
//     setForm({
//       code: r.code,
//       description: r.description ?? "",
//       prefix: r.prefix,
//       padding: r.padding,
//       starting_no: r.starting_no,
//       starting_date: r.starting_date,
//       last_no_used: r.last_no_used,
//     });
//     setOpen(true);
//   };

//   const save = async () => {
//     if (!form.code.trim()) return toast.error("Code is required");
//     const payload = {
//       code: form.code.trim().toUpperCase(),
//       description: form.description || null,
//       prefix: form.prefix,
//       padding: Number(form.padding) || 1,
//       starting_no: Number(form.starting_no) || 1,
//       starting_date: form.starting_date,
//       last_no_used: Number(form.last_no_used) || 0,
//     };
//     const { error } = editing
//       ? await supabase.from("number_series" as any).update(payload).eq("id", editing.id)
//       : await supabase.from("number_series" as any).insert(payload);
//     if (error) return toast.error(error.message);
//     toast.success(editing ? "Updated" : "Created");
//     setOpen(false); load();
//   };

//   const remove = async (id: string) => {
//     if (!confirm("Delete this number series?")) return;
//     const { error } = await supabase.from("number_series" as any).delete().eq("id", id);
//     if (error) return toast.error(error.message);
//     toast.success("Deleted"); load();
//   };

//   const preview = (prefix: string, padding: number, n: number) =>
//     `${prefix}${String(n).padStart(Math.max(padding, 1), "0")}`;

//   return (
//     <div>
//       <PageHeader
//         title="Number Series"
//         subtitle="Centralized auto-numbering for all masters and documents"
//         actions={
//           <Dialog open={open} onOpenChange={setOpen}>
//             <DialogTrigger asChild>
//               <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" /> New</Button>
//             </DialogTrigger>
//             <DialogContent className="sm:max-w-lg">
//               <DialogHeader><DialogTitle>{editing ? "Edit Number Series" : "New Number Series"}</DialogTitle></DialogHeader>
//               <div className="grid grid-cols-2 gap-3">
//                 <div>
//                   <Label className="text-xs">Code (master)</Label>
//                   <Select value={form.code} onValueChange={(v) => setForm({ ...form, code: v })} disabled={!!editing}>
//                     <SelectTrigger><SelectValue placeholder="Select master…" /></SelectTrigger>
//                     <SelectContent>
//                       {SERIES_OPTIONS.map((o) => (
//                         <SelectItem key={o.code} value={o.code}>{o.label} <span className="text-muted-foreground ml-2 text-xs">({o.code})</span></SelectItem>
//                       ))}
//                     </SelectContent>
//                   </Select>
//                 </div>
//                 <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
//                 <Field label="Prefix" value={form.prefix} onChange={(v) => setForm({ ...form, prefix: v })} />
//                 <Field label="Padding (digits)" type="number" value={String(form.padding)} onChange={(v) => setForm({ ...form, padding: Number(v) })} />
//                 <Field label="Starting No." type="number" value={String(form.starting_no)} onChange={(v) => setForm({ ...form, starting_no: Number(v) })} />
//                 <Field label="Starting Date" type="date" value={form.starting_date} onChange={(v) => setForm({ ...form, starting_date: v })} />
//                 <Field label="Last No. Used" type="number" value={String(form.last_no_used)} onChange={(v) => setForm({ ...form, last_no_used: Number(v) })} />
//                 <div className="col-span-2 rounded border bg-muted/40 p-3 text-sm">
//                   <span className="text-muted-foreground mr-2">Next number preview:</span>
//                   <span className="font-mono font-semibold">
//                     {preview(form.prefix, form.padding, Math.max(form.last_no_used + 1, form.starting_no))}
//                   </span>
//                 </div>
//               </div>
//               <DialogFooter>
//                 <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
//                 <Button onClick={save}>Save</Button>
//               </DialogFooter>
//             </DialogContent>
//           </Dialog>
//         }
//       />
//       <div className="p-6">
//         <div className="rounded border bg-card">
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>Code</TableHead>
//                 <TableHead>Description</TableHead>
//                 <TableHead>Prefix</TableHead>
//                 <TableHead className="text-right">Padding</TableHead>
//                 <TableHead className="text-right">Starting No.</TableHead>
//                 <TableHead>Starting Date</TableHead>
//                 <TableHead className="text-right">Last No. Used</TableHead>
//                 <TableHead>Next</TableHead>
//                 <TableHead className="w-24"></TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {loading ? (
//                 <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
//               ) : rows.length === 0 ? (
//                 <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No number series defined yet.</TableCell></TableRow>
//               ) : rows.map((r) => (
//                 <TableRow key={r.id}>
//                   <TableCell className="font-medium text-primary">{r.code}</TableCell>
//                   <TableCell>{r.description}</TableCell>
//                   <TableCell className="font-mono">{r.prefix}</TableCell>
//                   <TableCell className="text-right tabular-nums">{r.padding}</TableCell>
//                   <TableCell className="text-right tabular-nums">{r.starting_no}</TableCell>
//                   <TableCell>{r.starting_date}</TableCell>
//                   <TableCell className="text-right tabular-nums">{r.last_no_used}</TableCell>
//                   <TableCell className="font-mono">{preview(r.prefix, r.padding, Math.max(r.last_no_used + 1, r.starting_no))}</TableCell>
//                   <TableCell className="text-right">
//                     <Button size="icon" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button>
//                     <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
//                   </TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
//         </div>
//       </div>
//     </div>
//   );
// }

// function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
//   return (
//     <div>
//       <Label className="text-xs">{label}</Label>
//       <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
//     </div>
//   );
// }


import {
  useEffect,
  useState,
} from "react";

import { api } from "@/lib/api";

import { PageHeader } from "@/components/PageHeader";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

import { SERIES } from "@/lib/numberSeries";

const SERIES_OPTIONS: {
  code: string;
  label: string;
}[] = [

  {
    code: SERIES.VENDOR,
    label: "Vendor",
  },

  {
    code: SERIES.ITEM,
    label: "Item",
  },

  {
    code: SERIES.MANDI_MASTER,
    label: "Mandi Master",
  },

  {
    code: SERIES.MANDI_VENDOR,
    label: "Mandi Vendor",
  },

  {
    code: SERIES.MANDI_PURCHASE,
    label: "Mandi Purchase",
  },

  {
    code: SERIES.PURCHASE_ORDER,
    label: "Purchase Order",
  },

  {
    code: SERIES.PURCHASE_INVOICE,
    label: "Purchase Invoice",
  },

  {
    code: SERIES.POSTED_PURCHASE_INVOICE,
    label: "Posted Purchase Invoice",
  },

  {
    code: SERIES.INWARD_GATE_ENTRY,
    label: "Inward Gate Entry",
  },

  {
    code: SERIES.POSTED_PURCHASE_RECEIPT,
    label: "Posted Purchase Receipt",
  },

  {
    code: SERIES.CUSTOMER,
    label: "Customer",
  },

  {
    code: SERIES.LOCATION,
    label: "Location",
  },

  {
    code: SERIES.GOODS_RECEIPT_NOTE,
    label: "Goods Receipt Note",
  },

  {
    code: SERIES.SALES_ORDER,
    label: "Sales Order",
  },

  {
    code: SERIES.SALES_INVOICE,
    label: "Sales Invoice",
  },

  {
    code: SERIES.POSTED_SALES_INVOICE,
    label: "Posted Sales Invoice",
  },

  {
    code: SERIES.POSTED_SALES_SHIPMENT,
    label: "Posted Sales Shipment",
  },

  {
    code: SERIES.UOM,
    label: "Unit of Measure",
  },
];

type Row = {
  id: string;

  code: string;

  description:
    string | null;

  prefix: string;

  padding: number;

  starting_no: number;

  starting_date: string;

  last_no_used: number;
};

const empty = {
  code: "",
  description: "",
  prefix: "",
  padding: 3,
  starting_no: 1,
  starting_date:
    new Date()
      .toISOString()
      .slice(0, 10),
  last_no_used: 0,
};

export default function NumberSeries() {

  const [rows, setRows] =
    useState<Row[]>([]);

  const [open, setOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<Row | null>(
      null
    );

  const [form, setForm] =
    useState({
      ...empty,
    });

  const [loading, setLoading] =
    useState(true);

  /**
   * LOAD
   */
  const load =
    async () => {

      try {

        setLoading(true);

        const res =
          await api.get(
            "/no-series"
          );

        setRows(
          res.data ?? []
        );

      } catch (err: any) {

        console.error(err);

        toast.error(
          err?.response?.data
            ?.error ||
            "Failed to load number series"
        );

      } finally {

        setLoading(false);
      }
    };

  useEffect(() => {

    load();

  }, []);

  /**
   * NEW
   */
  const startNew =
    () => {

      setEditing(null);

      setForm({
        ...empty,
      });

      setOpen(true);
    };

  /**
   * EDIT
   */
  const startEdit =
    (r: Row) => {

      setEditing(r);

      setForm({
        code:
          r.code,

        description:
          r.description ??
          "",

        prefix:
          r.prefix,

        padding:
          r.padding,

        starting_no:
          r.starting_no,

        starting_date:
          r.starting_date,

        last_no_used:
          r.last_no_used,
      });

      setOpen(true);
    };

  /**
   * SAVE
   */
  const save =
    async () => {

      if (
        !form.code.trim()
      ) {

        return toast.error(
          "Code is required"
        );
      }

      const payload = {

        code:
          form.code
            .trim()
            .toUpperCase(),

        description:
          form.description ||
          null,

        prefix:
          form.prefix,

        padding:
          Number(
            form.padding
          ) || 1,

        starting_no:
          Number(
            form.starting_no
          ) || 1,

        starting_date:
          form.starting_date,

        last_no_used:
          Number(
            form.last_no_used
          ) || 0,
      };

      try {

        if (editing) {

          await api.put(
            `/no-series/${editing.id}`,
            payload
          );

        } else {

          await api.post(
            "/no-series",
            payload
          );
        }

        toast.success(
          editing
            ? "Updated"
            : "Created"
        );

        setOpen(false);

        load();

      } catch (err: any) {

        console.error(err);

        toast.error(
          err?.response?.data
            ?.error ||
            "Failed to save number series"
        );
      }
    };

  /**
   * DELETE
   */
  const remove =
    async (id: string) => {

      if (
        !confirm(
          "Delete this number series?"
        )
      ) return;

      try {

        await api.delete(
          `/no-series/${id}`
        );

        toast.success(
          "Deleted"
        );

        load();

      } catch (err: any) {

        console.error(err);

        toast.error(
          err?.response?.data
            ?.error ||
            "Failed to delete number series"
        );
      }
    };

  /**
   * PREVIEW
   */
  const preview = (
    prefix: string,
    padding: number,
    n: number
  ) =>

    `${prefix}${String(n).padStart(
      Math.max(
        padding,
        1
      ),
      "0"
    )}`;

  return (
    <div>

      <PageHeader
        title="Number Series"
        subtitle="Centralized auto-numbering for all masters and documents"
        actions={
          <Dialog
            open={open}
            onOpenChange={
              setOpen
            }
          >

            <DialogTrigger asChild>

              <Button
                onClick={
                  startNew
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>

            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">

              <DialogHeader>

                <DialogTitle>

                  {editing
                    ? "Edit Number Series"
                    : "New Number Series"}

                </DialogTitle>

              </DialogHeader>

              <div className="grid grid-cols-2 gap-3">

                <div>

                  <Label className="text-xs">
                    Code (master)
                  </Label>

                  <Select
                    value={
                      form.code
                    }
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        code: v,
                      })
                    }
                    disabled={
                      !!editing
                    }
                  >

                    <SelectTrigger>

                      <SelectValue placeholder="Select master…" />

                    </SelectTrigger>

                    <SelectContent>

                      {SERIES_OPTIONS.map(
                        (o) => (

                          <SelectItem
                            key={o.code}
                            value={o.code}
                          >

                            {o.label}

                            <span className="text-muted-foreground ml-2 text-xs">

                              ({o.code})

                            </span>

                          </SelectItem>
                        )
                      )}

                    </SelectContent>

                  </Select>

                </div>

                <Field
                  label="Description"
                  value={
                    form.description
                  }
                  onChange={(v) =>
                    setForm({
                      ...form,
                      description: v,
                    })
                  }
                />

                <Field
                  label="Prefix"
                  value={
                    form.prefix
                  }
                  onChange={(v) =>
                    setForm({
                      ...form,
                      prefix: v,
                    })
                  }
                />

                <Field
                  label="Padding (digits)"
                  type="number"
                  value={String(
                    form.padding
                  )}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      padding:
                        Number(v),
                    })
                  }
                />

                <Field
                  label="Starting No."
                  type="number"
                  value={String(
                    form.starting_no
                  )}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      starting_no:
                        Number(v),
                    })
                  }
                />

                <Field
                  label="Starting Date"
                  type="date"
                  value={
                    form.starting_date
                  }
                  onChange={(v) =>
                    setForm({
                      ...form,
                      starting_date: v,
                    })
                  }
                />

                <Field
                  label="Last No. Used"
                  type="number"
                  value={String(
                    form.last_no_used
                  )}
                  onChange={(v) =>
                    setForm({
                      ...form,
                      last_no_used:
                        Number(v),
                    })
                  }
                />

                <div className="col-span-2 rounded border bg-muted/40 p-3 text-sm">

                  <span className="text-muted-foreground mr-2">

                    Next number preview:

                  </span>

                  <span className="font-mono font-semibold">

                    {preview(
                      form.prefix,
                      form.padding,
                      Math.max(
                        form.last_no_used + 1,
                        form.starting_no
                      )
                    )}

                  </span>

                </div>

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

        <div className="rounded border bg-card">

          <Table>

            <TableHeader>

              <TableRow>

                <TableHead>
                  Code
                </TableHead>

                <TableHead>
                  Description
                </TableHead>

                <TableHead>
                  Prefix
                </TableHead>

                <TableHead className="text-right">
                  Padding
                </TableHead>

                <TableHead className="text-right">
                  Starting No.
                </TableHead>

                <TableHead>
                  Starting Date
                </TableHead>

                <TableHead className="text-right">
                  Last No. Used
                </TableHead>

                <TableHead>
                  Next
                </TableHead>

                <TableHead className="w-24" />

              </TableRow>

            </TableHeader>

            <TableBody>

              {loading ? (

                <TableRow>

                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground py-8"
                  >
                    Loading…
                  </TableCell>

                </TableRow>

              ) : rows.length === 0 ? (

                <TableRow>

                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground py-8"
                  >
                    No number series defined yet.
                  </TableCell>

                </TableRow>

              ) : (

                rows.map((r) => (

                  <TableRow
                    key={r.id}
                  >

                    <TableCell className="font-medium text-primary">
                      {r.code}
                    </TableCell>

                    <TableCell>
                      {r.description}
                    </TableCell>

                    <TableCell className="font-mono">
                      {r.prefix}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {r.padding}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {r.starting_no}
                    </TableCell>

                    <TableCell>
                      {r.starting_date}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {r.last_no_used}
                    </TableCell>

                    <TableCell className="font-mono">

                      {preview(
                        r.prefix,
                        r.padding,
                        Math.max(
                          r.last_no_used + 1,
                          r.starting_no
                        )
                      )}

                    </TableCell>

                    <TableCell className="text-right">

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

  onChange:
    (v: string) => void;

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
          onChange(
            e.target.value
          )
        }
      />

    </div>
  );
}
