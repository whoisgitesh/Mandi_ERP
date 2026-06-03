import { useEffect, useState, type ReactNode } from "react";

import { api } from "@/lib/api";

import { NoSeriesSelect } from "@/components/NoSeriesSelect";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useNoSeries } from "@/hooks/useNoSeries";

import { Save } from "lucide-react";
import { toast } from "sonner";

type TDSSetupRow = {
  tax_type: string;
  tds_nil_challan_nos: string | null;
  nil_pay_tds_document_nos: string | null;
  tds_rounding_precision: number;
  tds_rounding_type: "Nearest" | "Up" | "Down";
  tds_enabled: boolean;
};

const empty: TDSSetupRow = {
  tax_type: "TDS",
  tds_nil_challan_nos: null,
  nil_pay_tds_document_nos: null,
  tds_rounding_precision: 1,
  tds_rounding_type: "Nearest",
  tds_enabled: true,
};

export default function TDSSetup() {
  const { noSeries } = useNoSeries();
  const [form, setForm] = useState<TDSSetupRow>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/tds-setup");
      setForm({
        ...empty,
        ...(res.data ?? {}),
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to load TDS setup");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (field: keyof TDSSetupRow, value: any) =>
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

  const save = async () => {
    try {
      setSaving(true);
      const res = await api.put("/tds-setup", form);
      setForm({
        ...empty,
        ...(res.data ?? {}),
      });
      toast.success("TDS Setup saved");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to save TDS setup");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="TDS Setup"
        subtitle="Global Tax Deducted at Source settings and number series"
        actions={
          <Button onClick={save} disabled={saving || loading}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        }
      />

      <div className="p-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Tax Type">
              <Input
                value={form.tax_type ?? "TDS"}
                onChange={(event) => set("tax_type", event.target.value)}
              />
            </Field>
            <Field label="Nil Pay TDS Document Nos.">
              <NoSeriesSelect
                value={form.nil_pay_tds_document_nos}
                options={noSeries}
                onChange={(value) => set("nil_pay_tds_document_nos", value)}
              />
            </Field>
            <Field label="TDS Nil Challan Nos.">
              <NoSeriesSelect
                value={form.tds_nil_challan_nos}
                options={noSeries}
                onChange={(value) => set("tds_nil_challan_nos", value)}
              />
            </Field>
            <Field label="TDS Rounding Type">
              <Select
                value={form.tds_rounding_type ?? "Nearest"}
                onValueChange={(value) => set("tds_rounding_type", value)}
              >
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
            <Field label="TDS Rounding Precision">
              <NumericInput
                value={form.tds_rounding_precision ?? 1}
                min={0}
                onValueChange={(value) => set("tds_rounding_precision", value)}
              />
            </Field>
            <div className="flex h-10 items-center justify-between rounded-md border px-3">
              <Label className="text-sm">TDS Enabled</Label>
              <Switch
                checked={form.tds_enabled !== false}
                onCheckedChange={(value) => set("tds_enabled", value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
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
