import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ReactNode,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowDownAZ,
  ArrowLeft,
  ArrowUpAZ,
  ExternalLink,
  Filter,
  HelpCircle,
  ListFilter,
  MoreHorizontal,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { formatDateDisplay } from "@/lib/date";
import { matchesBCFilter } from "@/utils/filterParser";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Row = {
  entry_no: number;
  reversal_no: string;
  reversal_type: string;
  source_document_type: string;
  source_document_no: string;
  source_line_no: number | null;
  source_entry_no: number | null;
  item_no: string | null;
  description: string | null;
  variant_code: string | null;
  location_code: string | null;
  unit_of_measure_code: string | null;
  original_quantity: number;
  reversal_quantity: number;
  original_entry_type: string | null;
  reversal_entry_type: string | null;
  original_document_type: string | null;
  reversal_document_type: string | null;
  original_item_ledger_entry_no: number | null;
  reversal_item_ledger_entry_no: number | null;
  reason: string | null;
  posting_date: string | null;
  reversed_by: string | null;
  reversed_at: string | null;
  status: string | null;
};

type Column = {
  key: keyof Row;
  label: string;
  type?: "text" | "number" | "date";
  align?: "left" | "right";
  description: string;
};

type FilterState = {
  field: string;
  value: string;
};

const columns: Column[] = [
  { key: "entry_no", label: "Entry No.", type: "number", align: "right", description: "System entry number for the reversal entry." },
  { key: "reversal_no", label: "Reversal No.", description: "Number generated from Reversal Entry Nos." },
  { key: "reversal_type", label: "Reversal Type", description: "Business action that created this reversal." },
  { key: "source_document_type", label: "Source Document Type", description: "Posted document type that was undone." },
  { key: "source_document_no", label: "Source Document No.", description: "Posted document number that was undone." },
  { key: "item_no", label: "Item No.", description: "Item affected by the reversal." },
  { key: "description", label: "Description", description: "Item or posted line description." },
  { key: "location_code", label: "Location Code", description: "Inventory location for the reversal." },
  { key: "variant_code", label: "Variant Code", description: "Variant code, if used." },
  { key: "unit_of_measure_code", label: "UOM", description: "Unit of measure used for the movement." },
  { key: "original_quantity", label: "Original Quantity", type: "number", align: "right", description: "Original signed item ledger quantity." },
  { key: "reversal_quantity", label: "Reversal Quantity", type: "number", align: "right", description: "Opposite signed quantity posted by the reversal." },
  { key: "original_item_ledger_entry_no", label: "Original ILE No.", type: "number", align: "right", description: "Original item ledger entry number." },
  { key: "reversal_item_ledger_entry_no", label: "Reversal ILE No.", type: "number", align: "right", description: "Reversal item ledger entry number." },
  { key: "posting_date", label: "Posting Date", type: "date", description: "Posting date of the reversal." },
  { key: "reversed_by", label: "Reversed By", description: "User who created the reversal, when available." },
  { key: "reversed_at", label: "Reversed At", type: "date", description: "Timestamp when the reversal was posted." },
  { key: "reason", label: "Reason", description: "Reason entered during undo." },
  { key: "status", label: "Status", description: "Posted status of the reversal entry." },
];

const money = (value: any) =>
  Number(value ?? 0).toFixed(2);

const cellValue = (row: Row, field: string) =>
  row[field as keyof Row] ?? "";

const displayValue = (row: Row, column: Column) => {
  const value = cellValue(row, String(column.key));

  if (column.type === "date") {
    return value ? formatDateDisplay(String(value)) : "-";
  }

  if (column.type === "number") {
    return money(value);
  }

  return value ? String(value) : "-";
};

const matchesFilter = (row: Row, column: Column, filterValue: string) => {
  const rawValue = cellValue(row, String(column.key));
  const target = filterValue.trim();

  if (!target) return true;

  if (column.type === "number") {
    const parts = target.split("|").map((item) => item.trim()).filter(Boolean);
    return parts.some((part) => Number(rawValue) === Number(part));
  }

  if (column.type === "date") {
    return String(rawValue ?? "").slice(0, 10) === target.slice(0, 10);
  }

  return matchesBCFilter(rawValue, filterValue, {
    containsForPlainText: true,
  });
};

const compareRows = (
  a: Row,
  b: Row,
  column: Column,
  direction: "asc" | "desc"
) => {
  const av = cellValue(a, String(column.key));
  const bv = cellValue(b, String(column.key));
  const result =
    column.type === "number"
      ? Number(av ?? 0) - Number(bv ?? 0)
      : String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
          numeric: true,
          sensitivity: "base",
        });

  return direction === "asc" ? result : -result;
};

export function ReversalEntryList() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState[]>([]);
  const [draftField, setDraftField] = useState<string>("reversal_no");
  const [draftValue, setDraftValue] = useState("");
  const [selectedRowNo, setSelectedRowNo] = useState<string | null>(null);
  const [sort, setSort] = useState<{ field: string; direction: "asc" | "desc" } | null>({
    field: "entry_no",
    direction: "desc",
  });
  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;

      if (target && tableWrapRef.current && !tableWrapRef.current.contains(target)) {
        setSelectedRowNo(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/reversal-entries");
        setRows(res.data ?? []);
      } catch (err: any) {
        console.error(err);
        toast.error(err?.response?.data?.error || "Failed to load reversal entries");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeFilterMap = useMemo(() => {
    const map = new Map<string, string>();
    filters.forEach((filter) => {
      if (filter.value.trim()) map.set(filter.field, filter.value);
    });
    return map;
  }, [filters]);

  const visibleRows = useMemo(() => {
    const search = q.trim();
    let next = rows.filter((row) => {
      const matchesSearch =
        !search ||
        [
          row.reversal_no,
          row.reversal_type,
          row.source_document_type,
          row.source_document_no,
          row.item_no,
          row.description,
          row.location_code,
          row.reason,
        ].some((value) =>
          matchesBCFilter(value, search, {
            containsForPlainText: true,
          })
        );

      if (!matchesSearch) return false;

      return filters.every((filter) => {
        const column = columns.find((item) => item.key === filter.field);
        if (!column || !filter.value.trim()) return true;
        return matchesFilter(row, column, filter.value);
      });
    });

    if (sort) {
      const column = columns.find((item) => item.key === sort.field);
      if (column) {
        next = [...next].sort((a, b) => compareRows(a, b, column, sort.direction));
      }
    }

    return next;
  }, [rows, q, filters, sort]);

  const upsertFilter = (field: string, value: string) => {
    setFilters((current) => {
      if (current.some((filter) => filter.field === field)) {
        return current.map((filter) =>
          filter.field === field ? { field, value } : filter
        );
      }

      return [...current, { field, value }];
    });
  };

  const clearFilter = (field: string) =>
    setFilters((current) => current.filter((filter) => filter.field !== field));

  const openFilterForColumn = (field: string) => {
    setDraftField(field);
    setDraftValue(activeFilterMap.get(field) ?? "");
    setFilterOpen(true);
  };

  const filterToSelectedValue = (column: Column) => {
    const selectedRow = visibleRows.find((row) => row.reversal_no === selectedRowNo);

    if (!selectedRow) {
      toast("Select a row first, then use Filter to this value.");
      return;
    }

    const selectedValue = displayValue(selectedRow, column);
    if (!selectedValue || selectedValue === "-") {
      toast("The selected row has no value for this column.");
      return;
    }

    upsertFilter(String(column.key), selectedValue);
  };

  const applyDraftFilter = () => {
    upsertFilter(draftField, draftValue);
    setDraftValue("");
  };

  return (
    <div>
      <PageHeader
        title="Reversal Entries"
        subtitle="Read-only audit trail for posted document undo transactions"
        actions={
          <Button
            variant={filterOpen || filters.length > 0 ? "default" : "outline"}
            onClick={() => setFilterOpen(true)}
          >
            <ListFilter className="h-4 w-4 mr-1" />
            Filter
          </Button>
        }
      />

      <div className="p-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Find reversal entries..."
            value={q}
            onChange={(event) => setQ(event.target.value)}
            className="max-w-md"
          />
          <span className="text-xs text-muted-foreground">
            {visibleRows.length} entries
          </span>
          {filters.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setFilters([])}>
              Clear All Filters
            </Button>
          )}
        </div>

        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const column = columns.find((item) => item.key === filter.field);

              return (
                <Badge key={filter.field} variant="secondary" className="gap-1 rounded-sm">
                  {column?.label ?? filter.field}: {filter.value}
                  <button type="button" onClick={() => clearFilter(filter.field)} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}

        <div ref={tableWrapRef} className="rounded border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <ColumnHeader
                    key={String(column.key)}
                    column={column}
                    filtered={activeFilterMap.has(String(column.key))}
                    sorted={sort?.field === column.key ? sort.direction : null}
                    onSort={(direction) =>
                      setSort({
                        field: String(column.key),
                        direction,
                      })
                    }
                    onFilter={() => openFilterForColumn(String(column.key))}
                    onFilterValue={() => filterToSelectedValue(column)}
                    onClear={() => clearFilter(String(column.key))}
                  />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                    No reversal entries match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map((row) => (
                  <TableRow
                    key={row.reversal_no}
                    className={
                      selectedRowNo === row.reversal_no
                        ? "bg-primary/10 hover:bg-primary/10"
                        : "cursor-pointer"
                    }
                    onClick={() =>
                      setSelectedRowNo((current) =>
                        current === row.reversal_no ? null : row.reversal_no
                      )
                    }
                    onDoubleClick={() => navigate(`/reversal-entries/${row.reversal_no}`)}
                  >
                    {columns.map((column) => (
                      <TableCell
                        key={`${row.reversal_no}-${String(column.key)}`}
                        className={column.align === "right" ? "text-right" : undefined}
                      >
                        {column.key === "reversal_no" ? (
                          <button
                            type="button"
                            className="font-medium text-primary hover:underline"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/reversal-entries/${row.reversal_no}`);
                            }}
                          >
                            {row.reversal_no}
                          </button>
                        ) : column.key === "status" ? (
                          <Badge variant="outline">{displayValue(row, column)}</Badge>
                        ) : (
                          displayValue(row, column)
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" className="w-[360px] sm:max-w-[360px]">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <section className="space-y-2">
              <div className="font-semibold text-sm">Views</div>
              <button className="text-sm font-semibold text-primary underline underline-offset-4">
                All
              </button>
            </section>

            <section className="space-y-3">
              <div className="text-sm font-medium">Filter list by:</div>
              <Select value={draftField} onValueChange={setDraftField}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={String(column.key)} value={String(column.key)}>
                      {column.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={draftValue}
                placeholder="Filter value"
                onChange={(event) => setDraftValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyDraftFilter();
                }}
              />

              <Button type="button" onClick={applyDraftFilter} className="justify-start">
                <Plus className="h-4 w-4 mr-1" />
                Filter...
              </Button>

              {filters.length > 0 && (
                <div className="space-y-2 rounded-md border p-3">
                  {filters.map((filter) => {
                    const column = columns.find((item) => item.key === filter.field);

                    return (
                      <div key={filter.field} className="flex items-center justify-between gap-2 text-sm">
                        <span>
                          {column?.label ?? filter.field}:{" "}
                          <span className="font-medium">{filter.value}</span>
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => clearFilter(filter.field)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              <Button variant="outline" onClick={() => setFilters([])} disabled={filters.length === 0}>
                Clear All Filters
              </Button>
            </section>

            <section className="rounded-md border bg-card p-3">
              <div className="mb-3 text-sm font-semibold text-primary">
                Visible Fields
              </div>
              <div className="max-h-[300px] space-y-3 overflow-y-auto text-sm">
                {columns.map((column) => (
                  <div key={String(column.key)}>{column.label}</div>
                ))}
              </div>
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function ReversalEntryCard() {
  const { reversalNo } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/reversal-entries/${encodeURIComponent(reversalNo || "")}`);
        setRow(res.data);
      } catch (err: any) {
        console.error(err);
        toast.error(err?.response?.data?.error || "Failed to load reversal entry");
      } finally {
        setLoading(false);
      }
    })();
  }, [reversalNo]);

  const openSource = () => {
    if (!row) return;

    if (row.source_document_type === "Posted Sales Shipment") {
      navigate(`/posted-sales-shipments/${encodeURIComponent(row.source_document_no)}`);
      return;
    }

    if (row.source_document_type === "Posted Purchase Receipt") {
      navigate(`/posted-purchase-receipts/${encodeURIComponent(row.source_document_no)}`);
      return;
    }

    toast("Source document navigation is not configured for this reversal type.");
  };

  const openLedger = () => {
    const values = [
      row?.original_item_ledger_entry_no,
      row?.reversal_item_ledger_entry_no,
    ].filter(Boolean).join("|");

    navigate(values ? `/item-ledger-entries?entry_no=${encodeURIComponent(values)}` : "/item-ledger-entries");
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Reversal Entry" subtitle="Loading..." />
        <div className="p-6 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!row) {
    return (
      <div>
        <PageHeader title="Reversal Entry" subtitle="Not found" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Reversal Entry"
        subtitle={row.reversal_no}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/reversal-entries")}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button variant="outline" onClick={openSource}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Open Source Document
            </Button>
            <Button variant="outline" onClick={openLedger}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Open Item Ledger Entries
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        <ReadOnlySection
          title="General"
          fields={[
            ["Reversal No.", row.reversal_no],
            ["Reversal Type", row.reversal_type],
            ["Source Document Type", row.source_document_type],
            ["Source Document No.", row.source_document_no],
            ["Posting Date", formatDateDisplay(row.posting_date || "")],
            ["Status", row.status || "Posted"],
            ["Reason", row.reason || "-"],
            ["Reversed By", row.reversed_by || "-"],
            ["Reversed At", row.reversed_at ? formatDateDisplay(row.reversed_at) : "-"],
          ]}
        />

        <ReadOnlySection
          title="Item Details"
          fields={[
            ["Item No.", row.item_no || "-"],
            ["Description", row.description || "-"],
            ["Variant Code", row.variant_code || "-"],
            ["Location Code", row.location_code || "-"],
            ["Unit of Measure Code", row.unit_of_measure_code || "-"],
          ]}
        />

        <ReadOnlySection
          title="Quantity Details"
          fields={[
            ["Original Quantity", money(row.original_quantity)],
            ["Reversal Quantity", money(row.reversal_quantity)],
            ["Original Entry Type", row.original_entry_type || "-"],
            ["Reversal Entry Type", row.reversal_entry_type || "-"],
            ["Original Document Type", row.original_document_type || "-"],
            ["Reversal Document Type", row.reversal_document_type || "-"],
          ]}
        />

        <ReadOnlySection
          title="Ledger Reference"
          fields={[
            ["Original Item Ledger Entry No.", row.original_item_ledger_entry_no || "-"],
            ["Reversal Item Ledger Entry No.", row.reversal_item_ledger_entry_no || "-"],
          ]}
        />
      </div>
    </div>
  );
}

function ColumnHeader({
  column,
  filtered,
  sorted,
  onSort,
  onFilter,
  onFilterValue,
  onClear,
}: {
  column: Column;
  filtered: boolean;
  sorted: "asc" | "desc" | null;
  onSort: (direction: "asc" | "desc") => void;
  onFilter: () => void;
  onFilterValue: () => void;
  onClear: () => void;
}) {
  return (
    <TableHead className={column.align === "right" ? "text-right" : undefined}>
      <div className={column.align === "right" ? "flex items-center justify-end gap-1" : "flex items-center gap-1"}>
        <span>{column.label}</span>
        {filtered && <Filter className="h-3.5 w-3.5 text-primary" />}
        {sorted === "asc" && <ArrowUpAZ className="h-3.5 w-3.5 text-primary" />}
        {sorted === "desc" && <ArrowDownAZ className="h-3.5 w-3.5 text-primary" />}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem onClick={() => onSort("asc")}>
              <ArrowUpAZ className="h-4 w-4 mr-2" />
              Ascending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort("desc")}>
              <ArrowDownAZ className="h-4 w-4 mr-2" />
              Descending
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onFilter}>
              <Filter className="h-4 w-4 mr-2" />
              Filter...
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onFilterValue}>
              <Filter className="h-4 w-4 mr-2" />
              Filter to this value
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onClear} disabled={!filtered}>
              <X className="h-4 w-4 mr-2" />
              Clear Filter
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast(column.description)}>
              <HelpCircle className="h-4 w-4 mr-2" />
              What's this?
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TableHead>
  );
}

function ReadOnlySection({
  title,
  fields,
}: {
  title: string;
  fields: Array<[string, ReactNode]>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
          {fields.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[180px_1fr] items-center gap-3">
              <div className="text-sm text-muted-foreground">{label}</div>
              <div className="min-h-10 rounded border bg-muted/40 px-3 py-2 text-sm">
                {value}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
