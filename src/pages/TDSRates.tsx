import { useEffect, useMemo, useState, type ReactNode } from "react";

import { api } from "@/lib/api";
import { formatDateDisplay } from "@/lib/date";

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/NumericInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type SectionCode = {
  code: string;
  description: string;
  is_active: boolean;
};

type AssesseeCode = {
  code: string;
  description: string;
  is_active: boolean;
};

type TDSRate = {
  id: number;
  section_code: string;
  section_description?: string | null;
  assessee_code: string;
  assessee_description?: string | null;
  effective_date: string;
  concessional_code: string | null;
  nature_of_remittance: string | null;
  act_applicable: string | null;
  country_code: string | null;
  tds_pct: number;
  surcharge_pct: number;
  cess_pct: number;
  total_tds_pct: number;
  threshold_amount: number;
  is_active: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);

const empty: Partial<TDSRate> = {
  section_code: "",
  assessee_code: "",
  effective_date: today(),
  concessional_code: "",
  nature_of_remittance: "",
  act_applicable: "",
  country_code: "",
  tds_pct: 0,
  surcharge_pct: 0,
  cess_pct: 0,
  total_tds_pct: 0,
  threshold_amount: 0,
  is_active: true,
};

const pct = (value: any) => Number(value ?? 0).toFixed(3);

const normalizedRate = (form: Partial<TDSRate>) => {
  const tds = Number(form.tds_pct ?? 0);
  const surcharge = Number(form.surcharge_pct ?? 0);
  const cess = Number(form.cess_pct ?? 0);

  return {
    ...form,
    tds_pct: tds,
    surcharge_pct: surcharge,
    cess_pct: cess,
    total_tds_pct: Number((tds + surcharge + cess).toFixed(3)),
  };
};

export default function TDSRates() {
  const [rows, setRows] = useState<TDSRate[]>([]);
  const [sections, setSections] = useState<SectionCode[]>([]);
  const [assessees, setAssessees] = useState<AssesseeCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TDSRate | null>(null);
  const [form, setForm] = useState<Partial<TDSRate>>(empty);

  const load = async () => {
    try {
      setLoading(true);
      const [ratesRes, sectionsRes, assesseesRes] = await Promise.all([
        api.get("/tds-rates"),
        api.get("/tds-section-codes"),
        api.get("/tds-assessee-codes"),
      ]);
      setRows(ratesRes.data ?? []);
      setSections((sectionsRes.data ?? []).filter((row: SectionCode) => row.is_active !== false));
      setAssessees((assesseesRes.data ?? []).filter((row: AssesseeCode) => row.is_active !== false));
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to load TDS rates");
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
      [
        row.section_code,
        row.section_description,
        row.assessee_code,
        row.assessee_description,
        row.concessional_code,
        row.nature_of_remittance,
        row.act_applicable,
        row.country_code,
      ].some((value) => String(value ?? "").toLowerCase().includes(term))
    );
  }, [query, rows]);

  const set = (key: keyof TDSRate, value: any) =>
    setForm((current) =>
      normalizedRate({
        ...current,
        [key]: value,
      })
    );

  const startNew = () => {
    setEditing(null);
    setForm(normalizedRate({ ...empty }));
    setOpen(true);
  };

  const startEdit = (row: TDSRate) => {
    setEditing(row);
    setForm(normalizedRate({ ...row }));
    setOpen(true);
  };

  const save = async () => {
    try {
      const payload = normalizedRate(form);

      if (!payload.section_code) {
        toast.error("Section Code is required");
        return;
      }

      if (!payload.assessee_code) {
        toast.error("Assessee Code is required");
        return;
      }

      if (!payload.effective_date) {
        toast.error("Effective Date is required");
        return;
      }

      if (editing) {
        await api.put(`/tds-rates/${editing.id}`, payload);
      } else {
        await api.post("/tds-rates", payload);
      }

      toast.success(editing ? "TDS Rate updated" : "TDS Rate created");
      setOpen(false);
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to save TDS rate");
    }
  };

  const deactivate = async (row: TDSRate) => {
    if (!confirm(`Deactivate TDS Rate ${row.section_code} / ${row.assessee_code}?`)) return;

    try {
      await api.delete(`/tds-rates/${row.id}`);
      toast.success("TDS Rate deactivated");
      load();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to deactivate TDS rate");
    }
  };

  const current = normalizedRate(form);

  return (
    <div>
      <PageHeader
        title="TDS Rates"
        subtitle="Rate matrix by section, assessee, effective date, country, and concession"
        actions={
          <Button onClick={startNew}>
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>
        }
      />

      <div className="p-6 space-y-3">
        <div className="flex items-center gap-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by section, assessee, remittance, country..."
            className="max-w-md"
          />
          <span className="text-xs text-muted-foreground">
            {filtered.length} rates
          </span>
        </div>

        <div className="rounded border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section Code</TableHead>
                <TableHead>Assessee Code</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead>Concessional Code</TableHead>
                <TableHead>Nature of Remittance</TableHead>
                <TableHead>Act Applicable</TableHead>
                <TableHead>Country Code</TableHead>
                <TableHead className="text-right">TDS %</TableHead>
                <TableHead className="text-right">Surcharge %</TableHead>
                <TableHead className="text-right">Cess %</TableHead>
                <TableHead className="text-right">Total TDS %</TableHead>
                <TableHead className="text-right">Threshold</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={14} className="py-8 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="py-8 text-center text-muted-foreground">
                    No TDS Rates.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.section_code}</TableCell>
                    <TableCell>{row.assessee_code}</TableCell>
                    <TableCell>{formatDateDisplay(row.effective_date)}</TableCell>
                    <TableCell>{row.concessional_code || "-"}</TableCell>
                    <TableCell>{row.nature_of_remittance || "-"}</TableCell>
                    <TableCell>{row.act_applicable || "-"}</TableCell>
                    <TableCell>{row.country_code || "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct(row.tds_pct)}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct(row.surcharge_pct)}</TableCell>
                    <TableCell className="text-right tabular-nums">{pct(row.cess_pct)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{pct(row.total_tds_pct)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(row.threshold_amount ?? 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={row.is_active ? "default" : "secondary"}>
                        {row.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deactivate(row)}>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit TDS Rate" : "New TDS Rate"}</DialogTitle>
            <DialogDescription>
              Define the effective TDS percentage for a section, assessee, date, and optional concession.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Section Code">
              <Select
                value={current.section_code ?? ""}
                onValueChange={(value) => set("section_code", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section..." />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.code} value={section.code}>
                      {section.code} - {section.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Assessee Code">
              <Select
                value={current.assessee_code ?? ""}
                onValueChange={(value) => set("assessee_code", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assessee..." />
                </SelectTrigger>
                <SelectContent>
                  {assessees.map((assessee) => (
                    <SelectItem key={assessee.code} value={assessee.code}>
                      {assessee.code} - {assessee.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Effective Date">
              <Input
                type="date"
                value={String(current.effective_date ?? "")}
                onChange={(event) => set("effective_date", event.target.value)}
              />
            </Field>
            <Field label="Concessional Code">
              <Input
                value={current.concessional_code ?? ""}
                onChange={(event) => set("concessional_code", event.target.value.toUpperCase())}
              />
            </Field>
            <Field label="Nature of Remittance">
              <Input
                value={current.nature_of_remittance ?? ""}
                onChange={(event) => set("nature_of_remittance", event.target.value)}
              />
            </Field>
            <Field label="Act Applicable">
              <Input
                value={current.act_applicable ?? ""}
                onChange={(event) => set("act_applicable", event.target.value.toUpperCase())}
              />
            </Field>
            <Field label="Country Code">
              <Input
                value={current.country_code ?? ""}
                onChange={(event) => set("country_code", event.target.value.toUpperCase())}
              />
            </Field>
            <Field label="TDS %">
              <NumericInput
                value={current.tds_pct ?? 0}
                decimalScale={3}
                min={0}
                max={100}
                onValueChange={(value) => set("tds_pct", value)}
              />
            </Field>
            <Field label="Surcharge %">
              <NumericInput
                value={current.surcharge_pct ?? 0}
                decimalScale={3}
                min={0}
                max={100}
                onValueChange={(value) => set("surcharge_pct", value)}
              />
            </Field>
            <Field label="Cess %">
              <NumericInput
                value={current.cess_pct ?? 0}
                decimalScale={3}
                min={0}
                max={100}
                onValueChange={(value) => set("cess_pct", value)}
              />
            </Field>
            <Field label="Total TDS %">
              <NumericInput value={current.total_tds_pct ?? 0} decimalScale={3} readOnly />
            </Field>
            <Field label="Threshold Amount">
              <NumericInput
                value={current.threshold_amount ?? 0}
                min={0}
                onValueChange={(value) => set("threshold_amount", value)}
              />
            </Field>
            <div className="flex h-10 items-center justify-between rounded-md border px-3">
              <Label className="text-sm">Active</Label>
              <Switch
                checked={current.is_active !== false}
                onCheckedChange={(value) => set("is_active", value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
