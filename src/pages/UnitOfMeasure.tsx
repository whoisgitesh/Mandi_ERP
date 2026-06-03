import {
  useEffect,
  useState,
} from "react";

import { api } from "@/lib/api";

import { PageHeader } from "@/components/PageHeader";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Switch } from "@/components/ui/switch";

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

type UOM = {
  id: string;

  code: string;

  description:
    string | null;

  international_standard_code:
    string | null;

  symbol:
    string | null;

  blocked: boolean;
};

const empty:
  Partial<UOM> = {

  code: "",

  description: "",

  international_standard_code: "",

  symbol: "",

  blocked: false,
};

export default function UnitOfMeasure() {

  const [rows, setRows] =
    useState<UOM[]>([]);

  const [open, setOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<UOM | null>(
      null
    );

  const [form, setForm] =
    useState<
      Partial<UOM>
    >(empty);

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
            "/uom"
          );

        setRows(
          res.data ?? []
        );

      } catch (err: any) {

        console.error(err);

        toast.error(
          err?.response?.data
            ?.error ||
            "Failed to load UOMs"
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
    (r: UOM) => {

      setEditing(r);

      setForm({
        ...r,
      });

      setOpen(true);
    };

  /**
   * SAVE
   */
  const save =
    async () => {

      const payload = {
        ...form,
      };

      try {

        if (editing) {

          await api.put(
            `/uom/${editing.id}`,
            payload
          );

        } else {

          await api.post(
            "/uom",
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
            "Failed to save UOM"
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
          "Delete this UOM?"
        )
      ) return;

      try {

        await api.delete(
          `/uom/${id}`
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
            "Failed to delete UOM"
        );
      }
    };

  const set =
    (
      k: keyof UOM,
      v: any
    ) =>

      setForm((f) => ({
        ...f,
        [k]: v,
      }));

  return (
    <div>

      <PageHeader
        title="Units of Measure"
        subtitle="Master list of UOMs used across the system"
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
                    ? "Edit UOM"
                    : "New UOM"}

                </DialogTitle>

              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 py-2">

                <div>

                  <Label className="text-xs">
                    Code
                  </Label>

                  <Input
                    value={
                      form.code ?? ""
                    }
                    onChange={(e) =>
                      set(
                        "code",
                        e.target.value.toUpperCase()
                      )
                    }
                    disabled={
                      !!editing
                    }
                  />

                </div>

                <div>

                  <Label className="text-xs">
                    Symbol
                  </Label>

                  <Input
                    value={
                      form.symbol ?? ""
                    }
                    onChange={(e) =>
                      set(
                        "symbol",
                        e.target.value
                      )
                    }
                  />

                </div>

                <div className="col-span-2">

                  <Label className="text-xs">
                    Description
                  </Label>

                  <Input
                    value={
                      form.description ?? ""
                    }
                    onChange={(e) =>
                      set(
                        "description",
                        e.target.value
                      )
                    }
                  />

                </div>

                <div className="col-span-2">

                  <Label className="text-xs">
                    International Standard Code
                  </Label>

                  <Input
                    value={
                      form.international_standard_code ?? ""
                    }
                    onChange={(e) =>
                      set(
                        "international_standard_code",
                        e.target.value
                      )
                    }
                  />

                </div>

                <div className="col-span-2 flex items-center justify-between rounded border px-3 py-2">

                  <Label className="text-xs">
                    Blocked
                  </Label>

                  <Switch
                    checked={
                      !!form.blocked
                    }
                    onCheckedChange={(v) =>
                      set(
                        "blocked",
                        v
                      )
                    }
                  />

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
                  Symbol
                </TableHead>

                <TableHead>
                  Intl. Standard Code
                </TableHead>

                <TableHead className="text-center">
                  Blocked
                </TableHead>

                <TableHead className="w-24" />

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
                    No UOMs yet.
                  </TableCell>

                </TableRow>

              ) : (

                rows.map((r) => (

                  <TableRow
                    key={r.id}
                  >

                    <TableCell className="font-medium">

                      {r.code}

                    </TableCell>

                    <TableCell>

                      {r.description}

                    </TableCell>

                    <TableCell>

                      {r.symbol}

                    </TableCell>

                    <TableCell className="text-muted-foreground">

                      {r.international_standard_code}

                    </TableCell>

                    <TableCell className="text-center">

                      {r.blocked
                        ? "Yes"
                        : "No"}

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
