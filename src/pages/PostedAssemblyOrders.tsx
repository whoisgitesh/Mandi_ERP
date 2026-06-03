import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowDownAZ,
  ArrowLeft,
  ArrowUpAZ,
  Filter,
  HelpCircle,
  ListFilter,
  MoreHorizontal,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { toDateInput } from "@/lib/date";
import { matchesBCFilter } from "@/utils/filterParser";

type PostedOrder = {
  document_no: string;
  source_assembly_order_no?: string | null;
  item_no?: string | null;
  description?: string | null;
  quantity?: number;
  assembled_quantity?: number;
  unit_of_measure_code?: string | null;
  location_code?: string | null;
  posting_date?: string | null;
  due_date?: string | null;
  starting_date?: string | null;
  ending_date?: string | null;
  lines?: any[];
};

type Column = {
  key: keyof PostedOrder;
  label: string;
  type?: "text" | "number" | "date";
  align?: "left" | "right";
  description: string;
};

type FilterState = {
  field: string;
  value: string;
};

const amount = (value: any, digits = 2) => Number(value ?? 0).toFixed(digits);

const columns: Column[] = [
  {
    key: "document_no",
    label: "No.",
    description: "Posted Assembly Order number.",
  },
  {
    key: "description",
    label: "Description",
    description: "Description copied from the posted assembly document.",
  },
  {
    key: "posting_date",
    label: "Posting Date",
    type: "date",
    description: "Date when the assembly order was posted.",
  },
  {
    key: "due_date",
    label: "Due Date",
    type: "date",
    description: "Due date from the assembly order.",
  },
  {
    key: "starting_date",
    label: "Starting Date",
    type: "date",
    description: "Starting date from the assembly order.",
  },
  {
    key: "ending_date",
    label: "Ending Date",
    type: "date",
    description: "Ending date from the assembly order.",
  },
  {
    key: "item_no",
    label: "Item No.",
    description: "Assembled item number.",
  },
  {
    key: "quantity",
    label: "Quantity",
    type: "number",
    align: "right",
    description: "Posted assembly output quantity.",
  },
  {
    key: "location_code",
    label: "Location Code",
    description: "Location where the assembly output was posted.",
  },
];

const cellValue = (row: PostedOrder, field: string) =>
  row[field as keyof PostedOrder] ?? "";

const displayValue = (row: PostedOrder, column: Column) => {
  const value = cellValue(row, String(column.key));

  if (column.type === "date") {
    return toDateInput(String(value || "")) || "-";
  }

  if (column.type === "number") {
    return amount(value);
  }

  return value ? String(value) : "-";
};

const matchesFilter = (row: PostedOrder, column: Column, filterValue: string) => {
  const rawValue = cellValue(row, String(column.key));
  const target = filterValue.trim();

  if (!target) return true;

  if (column.type === "number") {
    return Number(rawValue) === Number(filterValue);
  }

  if (column.type === "date") {
    return String(rawValue ?? "").slice(0, 10) === filterValue.slice(0, 10);
  }

  return matchesBCFilter(rawValue, filterValue, {
    containsForPlainText: true,
  });
};

const compareRows = (
  a: PostedOrder,
  b: PostedOrder,
  column: Column,
  direction: "asc" | "desc"
) => {
  const av = cellValue(a, String(column.key));
  const bv = cellValue(b, String(column.key));

  let result = 0;
  if (column.type === "number") {
    result = Number(av ?? 0) - Number(bv ?? 0);
  } else {
    result = String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }

  return direction === "asc" ? result : -result;
};

export function PostedAssemblyOrderList() {
  const [rows, setRows] = useState<PostedOrder[]>([]);
  const [q, setQ] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState[]>([]);
  const [draftField, setDraftField] = useState<string>("document_no");
  const [draftValue, setDraftValue] = useState("");
  const [sort, setSort] = useState<{ field: string; direction: "asc" | "desc" } | null>({
    field: "posting_date",
    direction: "desc",
  });
  const [selectedDocumentNo, setSelectedDocumentNo] = useState<string | null>(null);
  const tableWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    api.get("/posted-assembly-orders")
      .then(({ data }) => setRows(Array.isArray(data) ? data : []))
      .catch((err) => toast.error(err?.response?.data?.error || "Failed to load Posted Assembly Orders"));
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && tableWrapRef.current && !tableWrapRef.current.contains(target)) {
        setSelectedDocumentNo(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
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
          row.document_no,
          row.description,
          row.item_no,
          row.location_code,
          row.source_assembly_order_no,
        ].some((value) =>
          matchesBCFilter(value, q, {
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
  }, [filters, q, rows, sort]);

  const upsertFilter = (field: string, value: string) => {
    setFilters((current) => {
      const exists = current.some((filter) => filter.field === field);
      if (exists) {
        return current.map((filter) => (filter.field === field ? { field, value } : filter));
      }
      return [...current, { field, value }];
    });
  };

  const clearFilter = (field: string) => {
    setFilters((current) => current.filter((filter) => filter.field !== field));
  };

  const openFilterForColumn = (field: string) => {
    setDraftField(field);
    setDraftValue(activeFilterMap.get(field) ?? "");
    setFilterOpen(true);
  };

  const filterToSelectedValue = (column: Column) => {
    const selected = visibleRows.find((row) => row.document_no === selectedDocumentNo);

    if (!selected) {
      toast("Select a row first, then use Filter to this value.");
      return;
    }

    const selectedValue = displayValue(selected, column);
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
        title="Posted Assembly Orders"
        subtitle="Read-only posted assembly documents"
        actions={
          <Button
            variant={filterOpen || filters.length > 0 ? "default" : "outline"}
            onClick={() => setFilterOpen(true)}
          >
            <ListFilter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        }
      />
      <div className="space-y-3 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Find posted assembly orders..."
            value={q}
            onChange={(event) => setQ(event.target.value)}
            className="max-w-md"
          />
          <span className="text-xs text-muted-foreground">{visibleRows.length} orders</span>
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

        <div ref={tableWrapRef} className="overflow-x-auto rounded border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <ColumnHeader
                    key={String(column.key)}
                    column={column}
                    filtered={activeFilterMap.has(String(column.key))}
                    sorted={sort?.field === column.key ? sort.direction : null}
                    onSort={(direction) => setSort({ field: String(column.key), direction })}
                    onFilter={() => openFilterForColumn(String(column.key))}
                    onFilterValue={() => filterToSelectedValue(column)}
                    onClear={() => clearFilter(String(column.key))}
                  />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => (
                <TableRow
                  key={row.document_no}
                  className={
                    selectedDocumentNo === row.document_no
                      ? "bg-primary/10 hover:bg-primary/10"
                      : "cursor-pointer"
                  }
                  onClick={() =>
                    setSelectedDocumentNo((current) =>
                      current === row.document_no ? null : row.document_no
                    )
                  }
                >
                  {columns.map((column) => (
                    <PostedAssemblyCell
                      key={`${row.document_no}-${String(column.key)}`}
                      row={row}
                      column={column}
                    />
                  ))}
                </TableRow>
              ))}
              {visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                    No Posted Assembly Orders match the current filters.
                  </TableCell>
                </TableRow>
              ) : null}
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
              <div className="text-sm font-semibold">Views</div>
              <button className="text-sm font-semibold text-primary underline underline-offset-4">
                All
              </button>
            </section>

            <section className="space-y-3">
              <div className="text-sm font-medium">Filter list by:</div>
              <div className="grid grid-cols-1 gap-2">
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
                  <Plus className="mr-2 h-4 w-4" />
                  Filter...
                </Button>
              </div>

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
              <div className="mb-3 text-sm font-semibold text-primary">Visible Fields</div>
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
      <div
        className={
          column.align === "right"
            ? "flex items-center justify-end gap-1"
            : "flex items-center gap-1"
        }
      >
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
              <ArrowUpAZ className="mr-2 h-4 w-4" />
              Ascending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSort("desc")}>
              <ArrowDownAZ className="mr-2 h-4 w-4" />
              Descending
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onFilter}>
              <Filter className="mr-2 h-4 w-4" />
              Filter...
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onFilterValue}>
              <Filter className="mr-2 h-4 w-4" />
              Filter to this value
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onClear} disabled={!filtered}>
              <X className="mr-2 h-4 w-4" />
              Clear Filter
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast(column.description)}>
              <HelpCircle className="mr-2 h-4 w-4" />
              What's this?
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TableHead>
  );
}

function PostedAssemblyCell({
  row,
  column,
}: {
  row: PostedOrder;
  column: Column;
}) {
  const value = displayValue(row, column);
  const className = [
    column.align === "right" ? "text-right tabular-nums" : "",
    ["document_no", "item_no"].includes(String(column.key)) ? "font-medium" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <TableCell className={className}>
      {column.key === "document_no" ? (
        <Link
          className="font-medium text-primary hover:underline"
          to={`/posted-assembly-orders/${encodeURIComponent(row.document_no)}`}
          onClick={(event) => event.stopPropagation()}
        >
          {row.document_no}
        </Link>
      ) : (
        value
      )}
    </TableCell>
  );
}

export function PostedAssemblyOrderDetails() {
  const navigate = useNavigate();
  const { documentNo = "" } = useParams();
  const [order, setOrder] = useState<PostedOrder | null>(null);
  useEffect(() => {
    api.get(`/posted-assembly-orders/${encodeURIComponent(documentNo)}`)
      .then(({ data }) => setOrder(data))
      .catch((err) => toast.error(err?.response?.data?.error || "Failed to load Posted Assembly Order"));
  }, [documentNo]);

  if (!order) return <div><PageHeader title="Posted Assembly Order" subtitle="Loading..." /></div>;

  return (
    <div>
      <PageHeader title="Posted Assembly Order" subtitle={order.document_no} actions={<Button variant="outline" onClick={() => navigate("/posted-assembly-orders")}><ArrowLeft className="h-4 w-4" /> Back</Button>} />
      <div className="p-6 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">General</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Field label="No."><Input value={order.document_no} readOnly /></Field>
            <Field label="Source Assembly Order No."><Input value={order.source_assembly_order_no || ""} readOnly /></Field>
            <Field label="Item No."><Input value={order.item_no || ""} readOnly /></Field>
            <Field label="Description"><Input value={order.description || ""} readOnly /></Field>
            <Field label="Quantity"><Input value={amount(order.quantity)} readOnly /></Field>
            <Field label="Assembled Quantity"><Input value={amount(order.assembled_quantity)} readOnly /></Field>
            <Field label="UOM"><Input value={order.unit_of_measure_code || ""} readOnly /></Field>
            <Field label="Location"><Input value={order.location_code || ""} readOnly /></Field>
            <Field label="Posting Date"><Input value={toDateInput(order.posting_date || "")} readOnly /></Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Lines</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded border">
              <Table>
                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>No.</TableHead><TableHead>Description</TableHead><TableHead>Variant</TableHead><TableHead>Location</TableHead><TableHead>UOM</TableHead><TableHead className="text-right">Qty Per</TableHead><TableHead className="text-right">Consumed Qty</TableHead></TableRow></TableHeader>
                <TableBody>{(order.lines ?? []).map((line) => <TableRow key={line.id}><TableCell>{line.type}</TableCell><TableCell>{line.item_no}</TableCell><TableCell>{line.description || "-"}</TableCell><TableCell>{line.variant_code || "-"}</TableCell><TableCell>{line.location_code || "-"}</TableCell><TableCell>{line.unit_of_measure_code || "-"}</TableCell><TableCell className="text-right">{amount(line.quantity_per, 4)}</TableCell><TableCell className="text-right">{amount(line.consumed_quantity)}</TableCell></TableRow>)}</TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
