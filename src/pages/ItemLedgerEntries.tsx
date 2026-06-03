import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useSearchParams,
} from "react-router-dom";

import {
  ArrowDownAZ,
  ArrowUpAZ,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Row = {
  id: string;
  entry_no: number;
  posting_date: string;
  entry_type: string;
  document_type: string | null;
  document_no: string;
  item_no: string;
  description: string | null;
  location_code: string | null;
  variant_code: string | null;
  unit_of_measure_code: string | null;
  item_category_code: string | null;
  family_no: string | null;
  family_description: string | null;
  quantity: number;
  invoiced_quantity: number;
  remaining_quantity: number;
  unit_price: number;
  unit_cost: number;
  sales_amount: number;
  cost_amount: number;
  vendor_no: string | null;
  vendor_name: string | null;
  customer_no: string | null;
  customer_name: string | null;
  is_reversal: boolean;
  reversal_no: string | null;
  reversed_entry_no: number | null;
  source_posted_document_no: string | null;
  reversal_reason: string | null;
  open: boolean;
};

type Column = {
  key: keyof Row | "party";
  label: string;
  type?: "text" | "number" | "date" | "boolean";
  align?: "left" | "right";
  description: string;
};

type FilterState = {
  field: string;
  value: string;
};

const columns: Column[] = [
  {
    key: "posting_date",
    label: "Posting Date",
    type: "date",
    description: "Date when the item ledger movement was posted.",
  },
  {
    key: "entry_type",
    label: "Entry Type",
    description: "Movement type, such as Purchase or Sale.",
  },
  {
    key: "document_type",
    label: "Document Type",
    description: "Source document type that created the ledger entry.",
  },
  {
    key: "document_no",
    label: "Document No.",
    description: "Document number linked to this item movement.",
  },
  {
    key: "reversal_no",
    label: "Reversal No.",
    description: "Reversal entry number linked to this item ledger entry.",
  },
  {
    key: "item_no",
    label: "Item No.",
    description: "Item number affected by this ledger entry.",
  },
  {
    key: "description",
    label: "Description",
    description: "Item or document line description.",
  },
  {
    key: "location_code",
    label: "Location Code",
    description: "Inventory location for this movement.",
  },
  {
    key: "variant_code",
    label: "Variant Code",
    description: "Item variant code, if used.",
  },
  {
    key: "unit_of_measure_code",
    label: "UOM",
    description: "Unit of measure used for the movement.",
  },
  {
    key: "family_no",
    label: "Family",
    description: "Item family derived from the Item Master.",
  },
  {
    key: "item_category_code",
    label: "Item Category",
    description: "Item category derived from the Item Master.",
  },
  {
    key: "quantity",
    label: "Quantity",
    type: "number",
    align: "right",
    description: "Signed movement quantity. Sales are usually negative.",
  },
  {
    key: "remaining_quantity",
    label: "Remaining Qty",
    type: "number",
    align: "right",
    description: "Remaining open quantity on the ledger entry.",
  },
  {
    key: "unit_price",
    label: "Unit Price",
    type: "number",
    align: "right",
    description: "Sales unit price stored on the ledger entry.",
  },
  {
    key: "sales_amount",
    label: "Sales Amount",
    type: "number",
    align: "right",
    description: "Sales value posted by this item movement.",
  },
  {
    key: "cost_amount",
    label: "Cost Amount",
    type: "number",
    align: "right",
    description: "Cost value posted by this item movement.",
  },
  {
    key: "is_reversal",
    label: "Reversal",
    type: "boolean",
    description: "Shows whether this is an opposite entry created by undo/reversal.",
  },
  {
    key: "reversed_entry_no",
    label: "Reversed Entry No.",
    type: "number",
    align: "right",
    description: "Original item ledger entry reversed by this entry.",
  },
  {
    key: "party",
    label: "Vendor / Customer",
    description: "Vendor or customer linked to the movement.",
  },
  {
    key: "open",
    label: "Open",
    type: "boolean",
    description: "Whether this item ledger entry is still open.",
  },
  {
    key: "entry_no",
    label: "Entry No.",
    type: "number",
    align: "right",
    description: "System entry number for the item ledger entry.",
  },
];

const money = (value: any) =>
  Number(value ?? 0).toFixed(2);

const cellValue = (row: Row, field: string) => {
  if (field === "party") {
    return row.vendor_name ?? row.customer_name ?? "";
  }

  return row[field as keyof Row] ?? "";
};

const displayValue = (row: Row, column: Column) => {
  const value =
    cellValue(row, String(column.key));

  if (column.type === "date") {
    return formatDateDisplay(String(value));
  }

  if (column.type === "number") {
    return money(value);
  }

  if (column.type === "boolean") {
    return value ? "Yes" : "No";
  }

  return value ? String(value) : "-";
};

const matchesFilter = (
  row: Row,
  column: Column,
  filterValue: string
) => {
  const rawValue =
    cellValue(row, String(column.key));
  const target =
    filterValue.trim().toLowerCase();

  if (!target) return true;

  if (column.type === "number") {
    return filterValue
      .split("|")
      .map((part) => part.trim())
      .filter(Boolean)
      .some((part) => Number(rawValue) === Number(part));
  }

  if (column.type === "date") {
    return String(rawValue ?? "").slice(0, 10) === filterValue.slice(0, 10);
  }

  if (column.type === "boolean") {
    return matchesBCFilter(
      rawValue ? "yes" : "no",
      filterValue,
      {
        containsForPlainText: true,
      }
    );
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
  const av =
    cellValue(a, String(column.key));
  const bv =
    cellValue(b, String(column.key));

  let result = 0;

  if (column.type === "number") {
    result = Number(av ?? 0) - Number(bv ?? 0);
  } else if (column.type === "date") {
    result =
      String(av ?? "").localeCompare(String(bv ?? ""));
  } else {
    result =
      String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
        numeric: true,
        sensitivity: "base",
      });
  }

  return direction === "asc" ? result : -result;
};

export default function ItemLedgerEntries() {
  const [searchParams] =
    useSearchParams();
  const [rows, setRows] =
    useState<Row[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [q, setQ] =
    useState("");
  const [filterOpen, setFilterOpen] =
    useState(false);
  const [filters, setFilters] =
    useState<FilterState[]>([]);
  const [draftField, setDraftField] =
    useState<string>("posting_date");
  const [draftValue, setDraftValue] =
    useState("");
  const [sort, setSort] =
    useState<{
      field: string;
      direction: "asc" | "desc";
    } | null>({
      field: "posting_date",
      direction: "desc",
    });
  const [selectedRowId, setSelectedRowId] =
    useState<string | null>(null);
  const tableWrapRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target =
        event.target as Node | null;

      if (
        target &&
        tableWrapRef.current &&
        !tableWrapRef.current.contains(target)
      ) {
        setSelectedRowId(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    const entryNoFilter =
      searchParams.get("entry_no");

    if (entryNoFilter) {
      setFilters((current) => {
        const next =
          current.filter((filter) => filter.field !== "entry_no");

        return [
          ...next,
          {
            field: "entry_no",
            value: entryNoFilter,
          },
        ];
      });
    }
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      try {
        const res =
          await api.get(
            "/item-ledger-entries"
          );

        setRows(
          res.data ?? []
        );
      } catch (err: any) {
        console.error(err);

        toast.error(
          err?.response?.data?.error ||
          "Failed to load item ledger entries"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeFilterMap =
    useMemo(() => {
      const map =
        new Map<string, string>();

      filters.forEach((filter) => {
        if (filter.value.trim()) {
          map.set(filter.field, filter.value);
        }
      });

      return map;
    }, [filters]);

  const visibleRows =
    useMemo(() => {
      const search =
        q.trim().toLowerCase();

      let next =
        rows.filter((row) => {
          const matchesSearch =
            !search ||
            [
              row.document_no,
              row.reversal_no,
              row.source_posted_document_no,
              row.item_no,
              row.description,
              row.location_code,
              row.variant_code,
              row.vendor_name,
              row.customer_name,
              row.entry_type,
              row.document_type,
              row.reversal_reason,
            ].some((value) =>
              matchesBCFilter(value, q, {
                containsForPlainText: true,
              })
            );

          if (!matchesSearch) return false;

          return filters.every((filter) => {
            const column =
              columns.find((item) => item.key === filter.field);

            if (!column || !filter.value.trim()) return true;

            return matchesFilter(row, column, filter.value);
          });
        });

      if (sort) {
        const column =
          columns.find((item) => item.key === sort.field);

        if (column) {
          next = [...next].sort((a, b) =>
            compareRows(a, b, column, sort.direction)
          );
        }
      }

      return next;
    }, [rows, q, filters, sort]);

  const upsertFilter = (field: string, value: string) => {
    setFilters((current) => {
      const exists =
        current.some((filter) => filter.field === field);

      if (exists) {
        return current.map((filter) =>
          filter.field === field
            ? {
                field,
                value,
              }
            : filter
        );
      }

      return [
        ...current,
        {
          field,
          value,
        },
      ];
    });
  };

  const clearFilter = (field: string) => {
    setFilters((current) =>
      current.filter((filter) => filter.field !== field)
    );
  };

  const openFilterForColumn = (field: string) => {
    setDraftField(field);
    setDraftValue(activeFilterMap.get(field) ?? "");
    setFilterOpen(true);
  };

  const filterToSelectedValue = (column: Column) => {
    const selectedRow =
      visibleRows.find((row) => row.id === selectedRowId);

    if (!selectedRow) {
      toast("Select a row first, then use Filter to this value.");
      return;
    }

    const selectedValue =
      displayValue(selectedRow, column);

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
        title="Item Ledger Entries"
        subtitle="Read-only ledger of all item movements"
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
            placeholder="Find entries..."
            value={q}
            onChange={(event) =>
              setQ(event.target.value)
            }
            className="max-w-md"
          />

          <span className="text-xs text-muted-foreground">
            {visibleRows.length} entries
          </span>

          {filters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters([])}
            >
              Clear All Filters
            </Button>
          )}
        </div>

        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const column =
                columns.find((item) => item.key === filter.field);

              return (
                <Badge
                  key={filter.field}
                  variant="secondary"
                  className="gap-1 rounded-sm"
                >
                  {column?.label ?? filter.field}: {filter.value}
                  <button
                    type="button"
                    onClick={() => clearFilter(filter.field)}
                    className="ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}

        <div
          ref={tableWrapRef}
          className="rounded border bg-card overflow-x-auto"
        >
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  column.key === "open" || column.key === "entry_no" ? (
                    <TableHead
                      key={String(column.key)}
                      className={column.align === "right" ? "text-right" : undefined}
                    >
                      {column.label}
                    </TableHead>
                  ) : (
                    <ColumnHeader
                      key={String(column.key)}
                      column={column}
                      filtered={activeFilterMap.has(String(column.key))}
                      sorted={
                        sort?.field === column.key
                          ? sort.direction
                          : null
                      }
                      onSort={(direction) =>
                        setSort({
                          field: String(column.key),
                          direction,
                        })
                      }
                      onFilter={() =>
                        openFilterForColumn(String(column.key))
                      }
                    onFilterValue={() =>
                      filterToSelectedValue(column)
                    }
                      onClear={() =>
                        clearFilter(String(column.key))
                      }
                    />
                  )
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No ledger entries match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={
                      selectedRowId === row.id
                        ? "bg-primary/10 hover:bg-primary/10"
                        : "cursor-pointer"
                    }
                    onClick={() =>
                      setSelectedRowId((current) =>
                        current === row.id ? null : row.id
                      )
                    }
                  >
                    {columns.map((column) => (
                      <LedgerCell
                        key={`${row.id}-${String(column.key)}`}
                        row={row}
                        column={column}
                      />
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Sheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
      >
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

              <div className="grid grid-cols-1 gap-2">
                <Select
                  value={draftField}
                  onValueChange={setDraftField}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((column) => (
                      <SelectItem
                        key={String(column.key)}
                        value={String(column.key)}
                      >
                        {column.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={draftValue}
                  placeholder="Filter value"
                  onChange={(event) =>
                    setDraftValue(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      applyDraftFilter();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={applyDraftFilter}
                  className="justify-start"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Filter...
                </Button>
              </div>

              {filters.length > 0 && (
                <div className="space-y-2 rounded-md border p-3">
                  {filters.map((filter) => {
                    const column =
                      columns.find((item) => item.key === filter.field);

                    return (
                      <div
                        key={filter.field}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
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

              <Button
                variant="outline"
                onClick={() => setFilters([])}
                disabled={filters.length === 0}
              >
                Clear All Filters
              </Button>
            </section>

            <section className="rounded-md border bg-card p-3">
              <div className="mb-3 text-sm font-semibold text-primary">
                Visible Fields
              </div>
              <div className="max-h-[300px] space-y-3 overflow-y-auto text-sm">
                {columns.map((column) => (
                  <div key={String(column.key)}>
                    {column.label}
                  </div>
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
    <TableHead
      className={column.align === "right" ? "text-right" : undefined}
    >
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
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
            >
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
            <DropdownMenuItem
              onClick={onClear}
              disabled={!filtered}
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filter
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => toast(column.description)}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              What's this?
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TableHead>
  );
}

function LedgerCell({
  row,
  column,
}: {
  row: Row;
  column: Column;
}) {
  const value =
    cellValue(row, String(column.key));

  if (column.key === "entry_type") {
    return (
      <TableCell>
        <Badge
          variant={row.entry_type === "Purchase" ? "default" : "secondary"}
        >
          {row.entry_type}
        </Badge>
      </TableCell>
    );
  }

  if (column.key === "open") {
    return (
      <TableCell>
        <Badge variant={row.open ? "outline" : "secondary"}>
          {row.open ? "Yes" : "No"}
        </Badge>
      </TableCell>
    );
  }

  const className = [
    column.align === "right" ? "text-right tabular-nums" : "",
    column.key === "quantity" ? "font-medium" : "",
    column.key === "quantity" && Number(value) < 0 ? "text-destructive" : "",
    ["document_type", "description", "party", "entry_no"].includes(String(column.key))
      ? "text-muted-foreground"
      : "",
    ["document_no", "item_no"].includes(String(column.key))
      ? "font-medium"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <TableCell className={className}>
      {displayValue(row, column)}
    </TableCell>
  );
}
