import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import { api } from "@/lib/api";
import { formatDateDisplay } from "@/lib/date";

import { PageHeader } from "@/components/PageHeader";

import { Badge } from "@/components/ui/badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { toast } from "sonner";

type IGE = {
  id: string;

  document_no: string;

  vendor_no: string;

  vendor_name:
    string | null;

  lr_no: string | null;

  lr_date:
    string | null;

  document_date: string;

  posting_date: string;

  status:
    | "Open"
    | "Released"
    | "Posted";

  entry_type:
    string | null;

  vehicle_no:
    string | null;

  challan_no:
    string | null;

  location_code:
    string | null;

  description:
    string | null;
};

export default function InwardGateEntries() {

  const navigate =
    useNavigate();

  const [rows, setRows] =
    useState<IGE[]>([]);

  const [loading, setLoading] =
    useState(true);

  /**
   * LOAD IGE LIST
   */
  const load = async () => {

    try {

      setLoading(true);

      const igeRes =
        await api.get(
          "/inward-gate-entries"
        );

      setRows(
        igeRes.data ?? []
      );

    } catch (err: any) {

      console.error(err);

      toast.error(
        err?.response?.data?.error ||
        "Failed to load inward gate entries"
      );

    } finally {

      setLoading(false);
    }
  };

  useEffect(() => {

    load();

  }, []);

  return (
    <div>

      <PageHeader
        title="Inward Gate Entry List"
        subtitle="Material received at gate, pending GRN"
      />

      <div className="p-6">

        <div className="rounded border bg-card overflow-x-auto">

          <Table>

            <TableHeader>

              <TableRow>

                <TableHead>
                  Entry Type
                </TableHead>

                <TableHead>
                  No.
                </TableHead>

                <TableHead>
                  Document Date
                </TableHead>

                <TableHead>
                  Vendor/Customer No.
                </TableHead>

                <TableHead>
                  Vendor/Customer Name
                </TableHead>

                <TableHead>
                  Vehicle No.
                </TableHead>

                <TableHead>
                  Challan No.
                </TableHead>

                <TableHead>
                  Location Code
                </TableHead>

                <TableHead>
                  Description
                </TableHead>

                <TableHead>
                  Status
                </TableHead>

              </TableRow>

            </TableHeader>

            <TableBody>

              {loading ? (

                <TableRow>

                  <TableCell
                    colSpan={10}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Loading…
                  </TableCell>

                </TableRow>

              ) : rows.length === 0 ? (

                <TableRow>

                  <TableCell
                    colSpan={10}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No Inward Gate Entries yet.
                    Create one from a Purchase Order.
                  </TableCell>

                </TableRow>

              ) : (

                rows.map((r) => (

                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      navigate(
                        `/inward-gate-entries/${r.id}`
                      )
                    }
                  >

                    <TableCell className="font-medium text-primary">

                      {r.entry_type ??
                        "Inward"}

                    </TableCell>

                    <TableCell>
                      {r.document_no}
                    </TableCell>

                    <TableCell>
                      {formatDateDisplay(r.document_date)}
                    </TableCell>

                    <TableCell>
                      {r.vendor_no}
                    </TableCell>

                    <TableCell>
                      {r.vendor_name ??
                        "—"}
                    </TableCell>

                    <TableCell>
                      {r.vehicle_no ??
                        "—"}
                    </TableCell>

                    <TableCell>
                      {r.challan_no ??
                        "—"}
                    </TableCell>

                    <TableCell>
                      {r.location_code ??
                        "—"}
                    </TableCell>

                    <TableCell className="text-muted-foreground">

                      {r.description ??
                        "—"}

                    </TableCell>

                    <TableCell>

                      <Badge
                        className="cursor-pointer"
                        variant={
                          r.status ===
                          "Posted"
                            ? "secondary"
                            : "default"
                        }
                      >
                        {r.status}
                      </Badge>

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
