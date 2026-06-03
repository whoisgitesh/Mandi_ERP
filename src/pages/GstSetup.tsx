import { useEffect, useState } from "react";

import { api } from "@/lib/api";

import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

import { Save } from "lucide-react";
import { toast } from "sonner";

type GstSetupRow = {
  gst_tax_type: string;
  cess_tax_type: string | null;
  generate_einv_on_service_post: boolean;
};

const taxTypeOptions = [
  {
    code: "GST",
    description: "Goods and Service Tax",
  },
  {
    code: "GST CESS",
    description: "GST Cess",
  },
  {
    code: "GST TDS TCS",
    description: "GST TDS/TCS",
  },
  {
    code: "TCS",
    description: "Tax Collection at Source",
  },
  {
    code: "TDS",
    description: "Tax Deduction at Source",
  },
];

const empty: GstSetupRow = {
  gst_tax_type: "GST",
  cess_tax_type: "GST CESS",
  generate_einv_on_service_post: false,
};

export default function GstSetup() {
  const [form, setForm] = useState<GstSetupRow>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/gst-setup");
      setForm({
        ...empty,
        ...(res.data ?? {}),
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to load GST setup");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (field: keyof GstSetupRow, value: any) => {
    setSaved(false);
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const save = async () => {
    if (!form.gst_tax_type) {
      toast.error("GST Tax Type is required");
      return;
    }

    try {
      setSaving(true);
      const res = await api.put("/gst-setup", form);
      setForm({
        ...empty,
        ...(res.data ?? {}),
      });
      setSaved(true);
      toast.success("GST Setup saved");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.error || "Failed to save GST setup");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="GST Setup"
        subtitle="Global GST tax type settings"
        actions={
          <div className="flex items-center gap-3">
            {saved && (
              <span className="text-sm text-muted-foreground">Saved</span>
            )}
            <Button onClick={save} disabled={saving || loading}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
        }
      />

      <div className="p-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <LookupField
                  label="GST Tax Type"
                  value={form.gst_tax_type}
                  onChange={(value) => set("gst_tax_type", value)}
                />
                <SwitchField
                  label="Generate E-Inv. on Service Post"
                  checked={form.generate_einv_on_service_post}
                  onCheckedChange={(value) =>
                    set("generate_einv_on_service_post", value)
                  }
                />
                <LookupField
                  label="Cess Tax Type"
                  value={form.cess_tax_type ?? ""}
                  onChange={(value) => set("cess_tax_type", value)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LookupField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value || "__none__"} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {taxTypeOptions.map((option) => (
            <SelectItem key={option.code} value={option.code}>
              {option.code} - {option.description}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SwitchField({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex h-10 items-center justify-between rounded-md border px-3">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
