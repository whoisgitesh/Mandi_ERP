import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowDownAZ,
  ArrowLeft,
  ArrowUpAZ,
  Banknote,
  Eye,
  Filter,
  HelpCircle,
  ListFilter,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { matchesBCFilter } from "@/utils/filterParser";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Currency = Record<string, any> & {
  code: string;
  description: string;
  iso_code?: string | null;
  iso_numeric_code?: string | null;
  symbol?: string | null;
  is_active?: boolean;
};

type ExchangeRate = {
  id?: number;
  currency_code?: string;
  starting_date: string;
  exchange_rate_amount: number | string;
  adjustment_exch_rate_amount?: number | string | null;
  relational_currency_code?: string | null;
  relational_exch_rate_amount?: number | string | null;
  fixing_exch_rate_amount?: string | null;
};

type CurrencyColumn = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "boolean";
  align?: "left" | "right";
  description: string;
};

type FilterState = {
  field: string;
  value: string;
};

const currencyColumns: CurrencyColumn[] = [
  { key: "code", label: "Code", description: "Manually maintained ISO-style currency code." },
  { key: "description", label: "Description", description: "Currency description." },
  { key: "iso_code", label: "ISO Code", description: "ISO alphabetic currency code." },
  { key: "iso_numeric_code", label: "ISO Numeric Code", description: "ISO numeric currency code." },
  { key: "symbol", label: "Symbol", description: "Currency symbol shown with amounts." },
  { key: "currency_factor", label: "Currency Factor", type: "number", align: "right", description: "Currency factor used for conversion." },
  { key: "last_date_modified", label: "Last Date Modified", type: "date", description: "Last date this currency was modified." },
  { key: "amount_rounding_precision", label: "Amount Rounding Precision", type: "number", align: "right", description: "Rounding precision for normal amounts." },
  { key: "amount_decimal_places", label: "Amount Decimal Places", description: "Decimal places displayed for amounts." },
  { key: "invoice_rounding_precision", label: "Invoice Rounding Precision", type: "number", align: "right", description: "Invoice rounding precision." },
  { key: "invoice_rounding_type", label: "Invoice Rounding Type", description: "Rounding direction for invoices." },
  { key: "unit_amount_rounding_precision", label: "Unit-Amount Rounding Precision", type: "number", align: "right", description: "Rounding precision for unit amounts." },
  { key: "unit_amount_decimal_places", label: "Unit-Amount Decimal Places", description: "Decimal places displayed for unit amounts." },
  { key: "appln_rounding_precision", label: "Appln. Rounding Precision", type: "number", align: "right", description: "Application rounding precision." },
  { key: "realized_gains_acc", label: "Realized Gains Acc.", description: "Account used for realized currency gains." },
  { key: "realized_losses_acc", label: "Realized Losses Acc.", description: "Account used for realized currency losses." },
  { key: "unrealized_gains_acc", label: "Unrealized Gains Acc.", description: "Account used for unrealized currency gains." },
  { key: "unrealized_losses_acc", label: "Unrealized Losses Acc.", description: "Account used for unrealized currency losses." },
  { key: "is_active", label: "Active", type: "boolean", description: "Whether this currency is active." },
];

const emptyCurrency: Currency = {
  code: "",
  description: "",
  iso_code: "",
  iso_numeric_code: "",
  symbol: "",
  currency_symbol_position: "Before Amount",
  emu_currency: false,
  currency_factor: 1,
  unrealized_gains_acc: "",
  realized_gains_acc: "",
  unrealized_losses_acc: "",
  realized_losses_acc: "",
  amount_rounding_precision: 0.01,
  amount_decimal_places: "2:2",
  invoice_rounding_precision: 0.01,
  invoice_rounding_type: "Nearest",
  unit_amount_rounding_precision: 0.001,
  unit_amount_decimal_places: "2:5",
  appln_rounding_precision: 0,
  conv_lcy_rndg_debit_acc: "",
  conv_lcy_rndg_credit_acc: "",
  max_vat_difference_allowed: 0,
  vat_rounding_type: "Nearest",
  payment_tolerance_pct: 0,
  max_payment_tolerance_amount: 0,
  last_date_modified: "",
  last_date_adjusted: "",
  realized_gl_gains_account: "",
  realized_gl_losses_account: "",
  residual_gains_account: "",
  residual_losses_account: "",
  is_active: true,
};

const emptyRate: ExchangeRate = {
  starting_date: "",
  exchange_rate_amount: 1,
  adjustment_exch_rate_amount: 1,
  relational_currency_code: "",
  relational_exch_rate_amount: 1,
  fixing_exch_rate_amount: "",
};

const money = (value: any, digits = 2) => Number(value || 0).toFixed(digits);
const dateOnly = (value: any) => (value ? String(value).slice(0, 10) : "");

const cellValue = (row: Currency, field: string) => row[field] ?? "";

const displayCurrencyValue = (row: Currency, column: CurrencyColumn) => {
  const value = cellValue(row, column.key);

  if (column.type === "date") return dateOnly(value) || "-";
  if (column.type === "number") return money(value, 6);
  if (column.type === "boolean") return value !== false ? "Active" : "Inactive";

  return value ? String(value) : "-";
};

const matchesCurrencyFilter = (row: Currency, column: CurrencyColumn, filterValue: string) => {
  const rawValue = cellValue(row, column.key);
  const target = filterValue.trim();
  if (!target) return true;

  if (column.type === "number") {
    return Number(rawValue) === Number(filterValue);
  }

  if (column.type === "date") {
    return String(rawValue ?? "").slice(0, 10) === filterValue.slice(0, 10);
  }

  if (column.type === "boolean") {
    return matchesBCFilter(rawValue !== false ? "active" : "inactive", filterValue, {
      containsForPlainText: true,
    });
  }

  return matchesBCFilter(rawValue, filterValue, {
    containsForPlainText: true,
  });
};

const compareCurrencies = (
  a: Currency,
  b: Currency,
  column: CurrencyColumn,
  direction: "asc" | "desc"
) => {
  const av = cellValue(a, column.key);
  const bv = cellValue(b, column.key);

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

export function CurrencyList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Currency[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState[]>([]);
  const [draftField, setDraftField] = useState("code");
  const [draftValue, setDraftValue] = useState("");
  const [sort, setSort] = useState<{ field: string; direction: "asc" | "desc" } | null>({
    field: "code",
    direction: "asc",
  });
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/currencies");
      setRows(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load currencies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const activeFilterMap = useMemo(() => {
    const map = new Map<string, string>();
    filters.forEach((filter) => {
      if (filter.value.trim()) map.set(filter.field, filter.value);
    });
    return map;
  }, [filters]);

  const visibleRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    let next = rows.filter((row) => {
      const matchesSearch =
        !term ||
        [
          row.code,
          row.description,
          row.iso_code,
          row.iso_numeric_code,
          row.symbol,
          row.invoice_rounding_type,
        ].some((value) =>
          matchesBCFilter(value, query, {
            containsForPlainText: true,
          })
        );

      if (!matchesSearch) return false;

      return filters.every((filter) => {
        const column = currencyColumns.find((item) => item.key === filter.field);
        if (!column || !filter.value.trim()) return true;
        return matchesCurrencyFilter(row, column, filter.value);
      });
    });

    if (sort) {
      const column = currencyColumns.find((item) => item.key === sort.field);
      if (column) {
        next = [...next].sort((a, b) => compareCurrencies(a, b, column, sort.direction));
      }
    }

    return next;
  }, [filters, query, rows, sort]);

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

  const filterToSelectedValue = (column: CurrencyColumn) => {
    const selected = visibleRows.find((row) => row.code === selectedCode);

    if (!selected) {
      toast("Select a row first, then use Filter to this value.");
      return;
    }

    const selectedValue = displayCurrencyValue(selected, column);
    if (!selectedValue || selectedValue === "-") {
      toast("The selected row has no value for this column.");
      return;
    }

    upsertFilter(column.key, selectedValue);
  };

  const applyDraftFilter = () => {
    upsertFilter(draftField, draftValue);
    setDraftValue("");
  };

  const deactivate = async (row: Currency) => {
    if (!confirm(`Deactivate currency ${row.code}?`)) return;
    try {
      await api.delete(`/currencies/${encodeURIComponent(row.code)}`);
      toast.success("Currency deactivated");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to deactivate currency");
    }
  };

  return (
    <div>
      <PageHeader
        title="Currencies"
        subtitle="Currency codes, rounding, accounts, and exchange rates"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/currencies/new")}>
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
            <Button
              variant={filterOpen || filters.length > 0 ? "default" : "outline"}
              onClick={() => setFilterOpen(true)}
            >
              <ListFilter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>
        }
      />

      <div className="space-y-3 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by code, description, ISO code..."
            className="max-w-md"
          />
          <span className="text-xs text-muted-foreground">{visibleRows.length} currencies</span>
          {filters.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setFilters([])}>
              Clear All Filters
            </Button>
          )}
        </div>

        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const column = currencyColumns.find((item) => item.key === filter.field);

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

        <div className="overflow-x-auto rounded border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                {currencyColumns.map((column) => (
                  <CurrencyColumnHeader
                    key={column.key}
                    column={column}
                    filtered={activeFilterMap.has(column.key)}
                    sorted={sort?.field === column.key ? sort.direction : null}
                    onSort={(direction) => setSort({ field: column.key, direction })}
                    onFilter={() => openFilterForColumn(column.key)}
                    onFilterValue={() => filterToSelectedValue(column)}
                    onClear={() => clearFilter(column.key)}
                  />
                ))}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={currencyColumns.length + 1} className="py-8 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={currencyColumns.length + 1} className="py-8 text-center text-muted-foreground">
                    No currencies match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map((row) => (
                  <TableRow
                    key={row.code}
                    className={selectedCode === row.code ? "bg-primary/10 hover:bg-primary/10" : "cursor-pointer"}
                    onClick={() => setSelectedCode((current) => (current === row.code ? null : row.code))}
                  >
                    {currencyColumns.map((column) => (
                      <CurrencyCell key={`${row.code}-${column.key}`} row={row} column={column} />
                    ))}
                    <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/currencies/${encodeURIComponent(row.code)}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/currencies/${encodeURIComponent(row.code)}`)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/currencies/${encodeURIComponent(row.code)}/exchange-rates`)}>
                        <Banknote className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deactivate(row)}>
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
                    {currencyColumns.map((column) => (
                      <SelectItem key={column.key} value={column.key}>
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
                    const column = currencyColumns.find((item) => item.key === filter.field);

                    return (
                      <div key={filter.field} className="flex items-center justify-between gap-2 text-sm">
                        <span>
                          {column?.label ?? filter.field}: <span className="font-medium">{filter.value}</span>
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => clearFilter(filter.field)}>
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
                {currencyColumns.map((column) => (
                  <div key={column.key}>{column.label}</div>
                ))}
              </div>
            </section>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function CurrencyCard() {
  const navigate = useNavigate();
  const { code } = useParams();
  const isNew = !code || code === "new";
  const [form, setForm] = useState<Currency>(emptyCurrency);
  const [loading, setLoading] = useState(!isNew);

  const set = (key: string, value: any) => setForm((current) => ({ ...current, [key]: value }));

  const load = async () => {
    if (isNew || !code) return;
    try {
      setLoading(true);
      const { data } = await api.get(`/currencies/${encodeURIComponent(code)}`);
      setForm({ ...emptyCurrency, ...data });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load currency");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [code]);

  const save = async () => {
    if (!form.code?.trim()) return toast.error("Currency Code is required.");
    if (!form.description?.trim()) return toast.error("Description is required.");

    const payload = { ...form, code: form.code.trim().toUpperCase() };
    try {
      if (isNew) {
        const { data } = await api.post("/currencies", payload);
        toast.success("Currency created");
        navigate(`/currencies/${encodeURIComponent(data.code)}`);
      } else {
        await api.put(`/currencies/${encodeURIComponent(form.code)}`, payload);
        toast.success("Currency saved");
        load();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save currency");
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading currency...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Currency Card"
        subtitle={isNew ? "New currency" : form.code}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/currencies")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {!isNew && (
              <Button variant="outline" onClick={() => navigate(`/currencies/${encodeURIComponent(form.code)}/exchange-rates`)}>
                <Banknote className="mr-2 h-4 w-4" />
                Exch. Rates
              </Button>
            )}
            <Button onClick={save}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
        }
      />

      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="general">
              <TabsList className="mb-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="rounding">Rounding</TabsTrigger>
                <TabsTrigger value="reporting">Reporting</TabsTrigger>
              </TabsList>

              <TabsContent value="general">
                <Section title="General">
                  <TextField label="Code *" value={form.code} disabled={!isNew} onChange={(value) => set("code", value.toUpperCase())} />
                  <TextField label="Unrealized Losses Acc." value={form.unrealized_losses_acc} onChange={(value) => set("unrealized_losses_acc", value)} />
                  <TextField label="Description *" value={form.description} onChange={(value) => set("description", value)} />
                  <TextField label="Realized Losses Acc." value={form.realized_losses_acc} onChange={(value) => set("realized_losses_acc", value)} />
                  <TextField label="ISO Code" value={form.iso_code} onChange={(value) => set("iso_code", value.toUpperCase())} />
                  <SwitchField label="EMU Currency" checked={Boolean(form.emu_currency)} onChange={(value) => set("emu_currency", value)} />
                  <TextField label="ISO Numeric Code" value={form.iso_numeric_code} onChange={(value) => set("iso_numeric_code", value)} />
                  <TextField label="Last Date Modified" type="date" value={dateOnly(form.last_date_modified)} onChange={(value) => set("last_date_modified", value)} />
                  <TextField label="Symbol" value={form.symbol} onChange={(value) => set("symbol", value)} />
                  <TextField label="Last Date Adjusted" type="date" value={dateOnly(form.last_date_adjusted)} onChange={(value) => set("last_date_adjusted", value)} />
                  <TextField label="Unrealized Gains Acc." value={form.unrealized_gains_acc} onChange={(value) => set("unrealized_gains_acc", value)} />
                  <NumberField label="Payment Tolerance %" value={form.payment_tolerance_pct} onChange={(value) => set("payment_tolerance_pct", value)} />
                  <TextField label="Realized Gains Acc." value={form.realized_gains_acc} onChange={(value) => set("realized_gains_acc", value)} />
                  <NumberField label="Max. Payment Tolerance Amount" value={form.max_payment_tolerance_amount} onChange={(value) => set("max_payment_tolerance_amount", value)} />
                  <NumberField label="Currency Factor" value={form.currency_factor} onChange={(value) => set("currency_factor", value)} />
                  <SwitchField label="Active" checked={form.is_active !== false} onChange={(value) => set("is_active", value)} />
                </Section>
              </TabsContent>

              <TabsContent value="rounding">
                <Section title="Rounding">
                  <NumberField label="Invoice Rounding Precision" value={form.invoice_rounding_precision} onChange={(value) => set("invoice_rounding_precision", value)} />
                  <NumberField label="Appln. Rounding Precision" value={form.appln_rounding_precision} onChange={(value) => set("appln_rounding_precision", value)} />
                  <RoundingTypeField label="Invoice Rounding Type" value={form.invoice_rounding_type} onChange={(value) => set("invoice_rounding_type", value)} />
                  <TextField label="Conv. LCY Rndg. Debit Acc." value={form.conv_lcy_rndg_debit_acc} onChange={(value) => set("conv_lcy_rndg_debit_acc", value)} />
                  <NumberField label="Amount Rounding Precision" value={form.amount_rounding_precision} onChange={(value) => set("amount_rounding_precision", value)} />
                  <TextField label="Conv. LCY Rndg. Credit Acc." value={form.conv_lcy_rndg_credit_acc} onChange={(value) => set("conv_lcy_rndg_credit_acc", value)} />
                  <TextField label="Amount Decimal Places" value={form.amount_decimal_places} onChange={(value) => set("amount_decimal_places", value)} />
                  <NumberField label="Max. VAT Difference Allowed" value={form.max_vat_difference_allowed} onChange={(value) => set("max_vat_difference_allowed", value)} />
                  <NumberField label="Unit-Amount Rounding Precision" value={form.unit_amount_rounding_precision} onChange={(value) => set("unit_amount_rounding_precision", value)} />
                  <RoundingTypeField label="VAT Rounding Type" value={form.vat_rounding_type} onChange={(value) => set("vat_rounding_type", value)} />
                  <TextField label="Unit-Amount Decimal Places" value={form.unit_amount_decimal_places} onChange={(value) => set("unit_amount_decimal_places", value)} />
                  <TextField label="Currency Symbol Position" value={form.currency_symbol_position} onChange={(value) => set("currency_symbol_position", value)} />
                </Section>
              </TabsContent>

              <TabsContent value="reporting">
                <Section title="Reporting">
                  <TextField label="Realized G/L Gains Account" value={form.realized_gl_gains_account} onChange={(value) => set("realized_gl_gains_account", value)} />
                  <TextField label="Residual Gains Account" value={form.residual_gains_account} onChange={(value) => set("residual_gains_account", value)} />
                  <TextField label="Realized G/L Losses Account" value={form.realized_gl_losses_account} onChange={(value) => set("realized_gl_losses_account", value)} />
                  <TextField label="Residual Losses Account" value={form.residual_losses_account} onChange={(value) => set("residual_losses_account", value)} />
                </Section>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function CurrencyExchangeRates() {
  const navigate = useNavigate();
  const { code } = useParams();
  const currencyCode = String(code || "").toUpperCase();
  const [rows, setRows] = useState<ExchangeRate[]>([]);
  const [draft, setDraft] = useState<ExchangeRate>(emptyRate);

  const load = async () => {
    try {
      const { data } = await api.get(`/currencies/${encodeURIComponent(currencyCode)}/exchange-rates`);
      setRows(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load exchange rates");
    }
  };

  useEffect(() => {
    if (currencyCode) load();
  }, [currencyCode]);

  const addRate = async () => {
    if (!draft.starting_date) return toast.error("Starting Date is required.");
    try {
      await api.post(`/currencies/${encodeURIComponent(currencyCode)}/exchange-rates`, draft);
      setDraft(emptyRate);
      toast.success("Exchange rate added");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to add exchange rate");
    }
  };

  const updateRate = async (row: ExchangeRate, patch: Partial<ExchangeRate>) => {
    if (!row.id) return;
    const next = { ...row, ...patch };
    setRows((current) => current.map((item) => (item.id === row.id ? next : item)));
    try {
      await api.put(`/currencies/exchange-rates/${row.id}`, next);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to update exchange rate");
      load();
    }
  };

  const deleteRate = async (row: ExchangeRate) => {
    if (!row.id) return;
    if (!confirm("Delete this exchange rate?")) return;
    try {
      await api.delete(`/currencies/exchange-rates/${row.id}`);
      toast.success("Exchange rate deleted");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete exchange rate");
    }
  };

  return (
    <div>
      <PageHeader
        title="Currency Exchange Rates"
        subtitle={currencyCode}
        actions={
          <Button variant="outline" onClick={() => navigate(`/currencies/${encodeURIComponent(currencyCode)}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exchange Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency Code</TableHead>
                    <TableHead>Starting Date</TableHead>
                    <TableHead>Exchange Rate Amount</TableHead>
                    <TableHead>Adjustment Exch. Rate Amount</TableHead>
                    <TableHead>Relational Currency Code</TableHead>
                    <TableHead>Relational Exch. Rate Amount</TableHead>
                    <TableHead>Fixing Exch. Rate Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{currencyCode}</TableCell>
                      <TableCell><Input type="date" value={dateOnly(row.starting_date)} onChange={(event) => updateRate(row, { starting_date: event.target.value })} /></TableCell>
                      <TableCell><Input type="number" step="0.000001" value={row.exchange_rate_amount ?? ""} onChange={(event) => updateRate(row, { exchange_rate_amount: event.target.value })} /></TableCell>
                      <TableCell><Input type="number" step="0.000001" value={row.adjustment_exch_rate_amount ?? ""} onChange={(event) => updateRate(row, { adjustment_exch_rate_amount: event.target.value })} /></TableCell>
                      <TableCell><Input value={row.relational_currency_code || ""} onChange={(event) => updateRate(row, { relational_currency_code: event.target.value.toUpperCase() })} /></TableCell>
                      <TableCell><Input type="number" step="0.000001" value={row.relational_exch_rate_amount ?? ""} onChange={(event) => updateRate(row, { relational_exch_rate_amount: event.target.value })} /></TableCell>
                      <TableCell><Input value={row.fixing_exch_rate_amount || ""} onChange={(event) => updateRate(row, { fixing_exch_rate_amount: event.target.value })} /></TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => deleteRate(row)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell>{currencyCode}</TableCell>
                    <TableCell><Input type="date" value={draft.starting_date} onChange={(event) => setDraft((current) => ({ ...current, starting_date: event.target.value }))} /></TableCell>
                    <TableCell><Input type="number" step="0.000001" value={draft.exchange_rate_amount} onChange={(event) => setDraft((current) => ({ ...current, exchange_rate_amount: event.target.value }))} /></TableCell>
                    <TableCell><Input type="number" step="0.000001" value={draft.adjustment_exch_rate_amount ?? ""} onChange={(event) => setDraft((current) => ({ ...current, adjustment_exch_rate_amount: event.target.value }))} /></TableCell>
                    <TableCell><Input value={draft.relational_currency_code || ""} onChange={(event) => setDraft((current) => ({ ...current, relational_currency_code: event.target.value.toUpperCase() }))} /></TableCell>
                    <TableCell><Input type="number" step="0.000001" value={draft.relational_exch_rate_amount ?? ""} onChange={(event) => setDraft((current) => ({ ...current, relational_exch_rate_amount: event.target.value }))} /></TableCell>
                    <TableCell><Input value={draft.fixing_exch_rate_amount || ""} onChange={(event) => setDraft((current) => ({ ...current, fixing_exch_rate_amount: event.target.value }))} /></TableCell>
                    <TableCell className="text-right"><Button size="sm" onClick={addRate}><Plus className="mr-2 h-4 w-4" />Add</Button></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-4 border-b pb-2 text-base font-semibold">{title}</h3>
      <div className="grid gap-x-10 gap-y-3 md:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[220px_1fr] items-center gap-3">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function TextField({ label, value, onChange, type = "text", disabled = false }: { label: string; value: any; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
  return (
    <Field label={label}>
      <Input type={type} value={value ?? ""} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: any; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <Input type="number" min="0" step="0.000001" value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

function SwitchField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <Field label={label}>
      <Switch checked={checked} onCheckedChange={onChange} />
    </Field>
  );
}

function RoundingTypeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <Select value={value || "Nearest"} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Nearest">Nearest</SelectItem>
          <SelectItem value="Up">Up</SelectItem>
          <SelectItem value="Down">Down</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}

function CurrencyColumnHeader({
  column,
  filtered,
  sorted,
  onSort,
  onFilter,
  onFilterValue,
  onClear,
}: {
  column: CurrencyColumn;
  filtered: boolean;
  sorted: "asc" | "desc" | null;
  onSort: (direction: "asc" | "desc") => void;
  onFilter: () => void;
  onFilterValue: () => void;
  onClear: () => void;
}) {
  return (
    <TableHead className={column.align === "right" ? "text-right" : undefined}>
      <div className={`flex items-center gap-1 ${column.align === "right" ? "justify-end" : ""}`}>
        <span>{column.label}</span>
        {filtered && <Filter className="h-3.5 w-3.5 text-primary" />}
        {sorted === "asc" && <ArrowUpAZ className="h-3.5 w-3.5 text-muted-foreground" />}
        {sorted === "desc" && <ArrowDownAZ className="h-3.5 w-3.5 text-muted-foreground" />}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
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

function CurrencyCell({
  row,
  column,
}: {
  row: Currency;
  column: CurrencyColumn;
}) {
  const value = displayCurrencyValue(row, column);

  return (
    <TableCell className={column.align === "right" ? "text-right tabular-nums" : undefined}>
      {column.key === "code" ? (
        <Link
          to={`/currencies/${encodeURIComponent(row.code)}`}
          className="font-medium text-primary hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {value}
        </Link>
      ) : column.key === "is_active" ? (
        <Badge variant={row.is_active === false ? "outline" : "default"}>{value}</Badge>
      ) : (
        value
      )}
    </TableCell>
  );
}
