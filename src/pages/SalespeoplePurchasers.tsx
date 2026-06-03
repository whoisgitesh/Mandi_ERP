import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Mail,
  MoreVertical,
  Pencil,
  Plus,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { NumericInput } from "@/components/ui/NumericInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

type LookupRow = {
  code: string;
  name?: string | null;
};

type SalespersonPurchaser = {
  code: string;
  name: string;
  job_title?: string | null;
  commission_pct?: number | string | null;
  phone_no?: string | null;
  email?: string | null;
  next_task_date?: string | null;
  blocked?: boolean;
  department_code?: string | null;
  department_name?: string | null;
  customer_group_code?: string | null;
  customer_group_name?: string | null;
  picture_url?: string | null;
  last_date_modified?: string | null;
};

const empty: SalespersonPurchaser = {
  code: "AUTO",
  name: "",
  job_title: "",
  commission_pct: 0,
  phone_no: "",
  email: "",
  next_task_date: "",
  blocked: false,
  department_code: "",
  customer_group_code: "",
  picture_url: "",
  last_date_modified: "",
};

const dateOnly = (value: any) => (value ? String(value).slice(0, 10) : "");

const localDateOnly = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function SalespeoplePurchaserList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SalespersonPurchaser[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/salespeople-purchasers");
      setRows(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load salespeople/purchasers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.code, row.name, row.job_title, row.phone_no, row.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [query, rows]);

  const remove = async (row: SalespersonPurchaser) => {
    if (!confirm(`Delete Salesperson/Purchaser ${row.code}?`)) return;

    try {
      await api.delete(`/salespeople-purchasers/${encodeURIComponent(row.code)}`);
      toast.success("Salesperson/Purchaser deleted");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete salesperson/purchaser");
    }
  };

  return (
    <div>
      <PageHeader
        title="Salespeople/Purchasers"
        subtitle="Responsible sales and purchase people"
        actions={
          <Button onClick={() => navigate("/salespeople-purchasers/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
        }
      />

      <div className="space-y-4 p-6">
        <div className="flex items-center gap-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by code, name, phone, email..."
            className="max-w-md"
          />
          <span className="text-xs text-muted-foreground">{filtered.length} records</span>
        </div>

        {loading ? (
          <div className="rounded border bg-card p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded border bg-card p-8 text-center text-sm text-muted-foreground">No salespeople/purchasers.</div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            {filtered.map((row) => (
              <button
                type="button"
                key={row.code}
                className={cn(
                  "flex min-h-[76px] items-center gap-4 border bg-card px-4 py-3 text-left hover:bg-muted",
                  selected === row.code && "bg-cyan-100 hover:bg-cyan-100"
                )}
                onClick={() => setSelected(row.code)}
                onDoubleClick={() => navigate(`/salespeople-purchasers/${encodeURIComponent(row.code)}`)}
              >
                <AvatarCircle row={row} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground">{row.code}</div>
                  <div className="truncate font-medium text-primary">{row.name}</div>
                  {row.blocked && <Badge variant="secondary">Blocked</Badge>}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/salespeople-purchasers/${encodeURIComponent(row.code)}`);
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/salespeople-purchasers/${encodeURIComponent(selected)}`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Open
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const row = rows.find((item) => item.code === selected);
                if (row?.email) window.location.href = `mailto:${row.email}`;
                else toast.info("No email is available for this record.");
              }}
            >
              <Mail className="mr-2 h-4 w-4" />
              Send Email
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const row = rows.find((item) => item.code === selected);
                if (row) remove(row);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function SalespeoplePurchaserCard() {
  const navigate = useNavigate();
  const { code } = useParams();
  const isNew = !code || code === "new";

  const [form, setForm] = useState<SalespersonPurchaser>(empty);
  const [departments, setDepartments] = useState<LookupRow[]>([]);
  const [customerGroups, setCustomerGroups] = useState<LookupRow[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const loadLookups = async () => {
    try {
      const { data } = await api.get("/salespeople-purchasers/lookups/options");
      setDepartments(Array.isArray(data?.departments) ? data.departments : []);
      setCustomerGroups(Array.isArray(data?.customer_groups) ? data.customer_groups : []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load lookups");
    }
  };

  const load = async () => {
    if (isNew || !code) return;

    try {
      setLoading(true);
      const { data } = await api.get(`/salespeople-purchasers/${encodeURIComponent(code)}`);
      setForm({
        ...empty,
        ...data,
        next_task_date: dateOnly(data.next_task_date),
        last_date_modified: dateOnly(data.last_date_modified),
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to load salesperson/purchaser");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    load();
  }, [code]);

  const set = (key: keyof SalespersonPurchaser, value: any) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (!String(form.code || "").trim()) return toast.error("Code is required.");
    if (!String(form.name || "").trim()) return toast.error("Name is required.");
    if (Number(form.commission_pct || 0) < 0) return toast.error("Commission % cannot be negative.");

    const payload = {
      ...form,
      code: String(form.code || "").trim().toUpperCase(),
      commission_pct: Number(form.commission_pct || 0),
      department_code: form.department_code || null,
      customer_group_code: form.customer_group_code || null,
      next_task_date: dateOnly(form.next_task_date) || null,
      last_date_modified: localDateOnly(),
    };

    try {
      setSaving(true);
      if (isNew) {
        const { data } = await api.post("/salespeople-purchasers", payload);
        toast.success("Salesperson/Purchaser created");
        navigate(`/salespeople-purchasers/${encodeURIComponent(data.code)}`);
      } else {
        await api.put(`/salespeople-purchasers/${encodeURIComponent(form.code)}`, payload);
        toast.success("Salesperson/Purchaser saved");
        load();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save salesperson/purchaser");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading salesperson/purchaser...</div>;
  }

  return (
    <div>
      <PageHeader
        title="Salesperson/Purchaser Card"
        subtitle={isNew ? "New Salesperson/Purchaser" : `${form.code} · ${form.name}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/salespeople-purchasers")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={save} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                General
                <Badge variant={form.blocked ? "secondary" : "outline"}>
                  {form.blocked ? "Blocked" : "Open"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-x-10 gap-y-4 md:grid-cols-2">
              <Field label="Code *">
                <Input
                  value={form.code || ""}
                  disabled={!isNew}
                  onChange={(event) => set("code", event.target.value.toUpperCase().replace(/\s/g, ""))}
                />
              </Field>
              <Field label="Phone No.">
                <Input value={form.phone_no || ""} onChange={(event) => set("phone_no", event.target.value)} />
              </Field>
              <Field label="Name *">
                <Input value={form.name || ""} onChange={(event) => set("name", event.target.value)} />
              </Field>
              <Field label="Email">
                <Input value={form.email || ""} onChange={(event) => set("email", event.target.value)} />
              </Field>
              <Field label="Job Title">
                <Input value={form.job_title || ""} onChange={(event) => set("job_title", event.target.value)} />
              </Field>
              <Field label="Next Task Date">
                <Input type="date" value={dateOnly(form.next_task_date)} onChange={(event) => set("next_task_date", event.target.value)} />
              </Field>
              <Field label="Commission %">
                <NumericInput value={form.commission_pct ?? 0} onChange={(value) => set("commission_pct", value)} />
              </Field>
              <Field label="Blocked">
                <Switch checked={Boolean(form.blocked)} onCheckedChange={(value) => set("blocked", value)} />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoicing</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-x-10 gap-y-4 md:grid-cols-2">
              <LookupField label="Department Code" value={form.department_code || ""} rows={departments} onChange={(value) => set("department_code", value)} />
              <LookupField label="Customergroup Code" value={form.customer_group_code || ""} rows={customerGroups} onChange={(value) => set("customer_group_code", value)} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Salesperson/Purchaser Picture</CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-4">
            {form.picture_url ? (
              <img src={form.picture_url} alt={form.name} className="h-44 w-44 rounded-full object-cover" />
            ) : (
              <div className="flex h-44 w-44 items-center justify-center rounded-full border-4 border-muted text-muted-foreground">
                <UserRound className="h-28 w-28 stroke-[1.2]" />
              </div>
            )}
            <Field label="Picture URL">
              <Input value={form.picture_url || ""} onChange={(event) => set("picture_url", event.target.value)} />
            </Field>
            <Field label="Last Date Modified">
              <div className="flex items-center gap-2 rounded border bg-muted/40 px-3 py-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                {dateOnly(form.last_date_modified) || "-"}
              </div>
            </Field>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AvatarCircle({ row }: { row: SalespersonPurchaser }) {
  if (row.picture_url) {
    return <img src={row.picture_url} alt={row.name} className="h-12 w-12 shrink-0 rounded-full object-cover" />;
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-muted-foreground">
      <UserRound className="h-7 w-7 stroke-[1.4]" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function LookupField({
  label,
  value,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  rows: LookupRow[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = rows.find((row) => row.code === value);

  return (
    <Field label={label}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="h-9 w-full justify-between px-3 font-normal">
            <span className="truncate">
              {current ? `${current.code} - ${current.name || current.code}` : value || <span className="text-muted-foreground">Select...</span>}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[520px] max-w-[calc(100vw-2rem)] p-0" align="start">
          <div className="grid grid-cols-[140px_1fr] border-b px-4 py-3 text-xs font-medium text-muted-foreground">
            <div>Code</div>
            <div>Name</div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <button
              type="button"
              className="grid w-full grid-cols-[28px_140px_1fr] border-b px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <span />
              <span className="text-muted-foreground">Blank</span>
              <span>-</span>
            </button>
            {rows.map((row) => (
              <button
                type="button"
                key={row.code}
                className={cn(
                  "grid w-full grid-cols-[28px_140px_1fr] border-b px-3 py-2 text-left text-sm hover:bg-muted",
                  value === row.code && "bg-blue-50"
                )}
                onClick={() => {
                  onChange(row.code);
                  setOpen(false);
                }}
              >
                <span className="text-primary">{value === row.code ? "✓" : ""}</span>
                <span className="font-medium text-primary">{row.code}</span>
                <span>{row.name || "-"}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between border-t px-3 py-2 text-sm">
            <span className="text-muted-foreground">+ New</span>
            <span className="text-primary">Select from full list</span>
          </div>
        </PopoverContent>
      </Popover>
    </Field>
  );
}
