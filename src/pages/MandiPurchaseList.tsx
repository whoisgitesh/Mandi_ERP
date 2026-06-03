import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { api } from "@/lib/api";
import { formatDateDisplay } from "@/lib/date";

import { PageHeader } from "@/components/PageHeader";
import { ListPageSkeleton } from "@/components/skeletons/ErpSkeletons";

import { Button } from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";

import { Plus } from "lucide-react";

type Row = {
  id: string;

  document_no: string;

  vendor_no: string;

  vendor_name:
    string | null;

  posting_date: string;

  status:
    | "Open"
    | "Released"
    | "PO Created";

  challan_no:
    string | null;

  serial_no:
    string | null;

  name:
    string | null;

  po_no:
    string | null;

  purchaser_name:
    string | null;
};

const statusVariant = (
  s: Row["status"]
) =>

  s === "Open"
    ? "secondary"
    : s === "Released"
    ? "default"
    : "outline";

export default function MandiPurchaseList() {

  const [rows, setRows] =
    useState<Row[]>([]);

  const [loading, setLoading] =
    useState(true);

  const navigate =
    useNavigate();

  /**
   * LOAD
   */
  const load =
    async () => {

      try {

        setLoading(true);

        const res =
          await api.get(
            "/mandi-purchases"
          );

        setRows(
          res.data ?? []
        );

      } catch (err: any) {

        console.error(err);

        toast.error(
          err?.response?.data
            ?.error ||
            "Failed to load mandi purchases"
        );

      } finally {

        setLoading(false);
      }
    };

  useEffect(() => {

    load();

  }, []);

  /**
   * CREATE NEW
   */
  const createNew =
    async () => {

      try {

        const res =
          await api.post(
            "/mandi-purchases",
            {
              vendor_no: "",

              posting_date:
                new Date()
                  .toISOString()
                  .slice(0, 10),
            }
          );

        navigate(
          `/mandi-purchase/${res.data.data.id}`
        );

      } catch (err: any) {

        console.error(err);

        toast.error(
          err?.response?.data
            ?.error ||
            "Failed to create mandi purchase"
        );
      }
    };

  if (loading) return <ListPageSkeleton columns={6} rows={7} />;

  return (
    <div>

      <PageHeader
        title="Mandi Purchases"
        subtitle="All Mandi Purchase transactions"
        actions={
          <Button
            onClick={
              createNew
            }
          >
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
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
                  Vendor No.
                </TableHead>

                <TableHead>
                  Vendor Name
                </TableHead>

                <TableHead>
                  Challan No.
                </TableHead>

                <TableHead>
                  Date
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
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    Loading…
                  </TableCell>

                </TableRow>

              ) : rows.length === 0 ? (

                <TableRow>

                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No purchases yet.
                  </TableCell>

                </TableRow>

              ) : (

                rows.map((r) => (

                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      navigate(
                        `/mandi-purchase/${r.id}`
                      )
                    }
                  >

                    <TableCell className="font-medium text-primary">

                      <Link
                        to={`/mandi-purchase/${r.id}`}
                        onClick={(e) =>
                          e.stopPropagation()
                        }
                      >
                        {r.document_no}
                      </Link>

                    </TableCell>

                    <TableCell>

                      {r.vendor_no || (
                        <span className="text-muted-foreground">
                          —
                        </span>
                      )}

                    </TableCell>

                    <TableCell>
                      {r.vendor_name ??
                        "—"}
                    </TableCell>

                    <TableCell>
                      {r.challan_no ??
                        "—"}
                    </TableCell>

                    <TableCell>
                      {formatDateDisplay(r.posting_date)}
                    </TableCell>

                    <TableCell>

                      <Badge
                        variant={statusVariant(
                          r.status
                        )}
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
