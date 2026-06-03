import { useEffect, useState } from "react";
import { toast } from "sonner";

import { NoSeriesSelect } from "@/components/NoSeriesSelect";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNoSeries } from "@/hooks/useNoSeries";
import { api } from "@/lib/api";

type Setup = {
  released_prod_order_nos: string | null;
  production_bom_nos: string | null;
  production_bom_version_nos: string | null;
  item_journal_nos: string | null;
  assembly_order_nos: string | null;
  posted_assembly_order_nos: string | null;
  consumption_journal_nos: string | null;
  output_journal_nos: string | null;
  normal_starting_time: string | null;
  normal_ending_time: string | null;
  default_safety_lead_time: string | null;
};

const emptySetup: Setup = {
  released_prod_order_nos: null,
  production_bom_nos: null,
  production_bom_version_nos: null,
  item_journal_nos: null,
  assembly_order_nos: null,
  posted_assembly_order_nos: null,
  consumption_journal_nos: null,
  output_journal_nos: null,
  normal_starting_time: "08:00",
  normal_ending_time: "17:00",
  default_safety_lead_time: "",
};

export default function ManufacturingSetup() {
  const { noSeries } = useNoSeries();
  const [setup, setSetup] = useState<Setup>(emptySetup);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const setField = (field: keyof Setup, value: any) =>
    setSetup((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data } = await api.get("/manufacturing-setup");
        if (!cancelled) {
          setSetup({
            ...emptySetup,
            ...data,
            normal_starting_time: String(data.normal_starting_time || "08:00").slice(0, 5),
            normal_ending_time: String(data.normal_ending_time || "17:00").slice(0, 5),
          });
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.error || "Failed to load manufacturing setup");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      const { data } = await api.put("/manufacturing-setup", setup);
      setSetup({
        ...emptySetup,
        ...data,
        normal_starting_time: String(data.normal_starting_time || "08:00").slice(0, 5),
        normal_ending_time: String(data.normal_ending_time || "17:00").slice(0, 5),
      });
      toast.success("Manufacturing setup saved");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save manufacturing setup");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Manufacturing Setup"
        subtitle="No. Series and defaults for production orders, consumption, and output"
        actions={<Button onClick={save} disabled={saving || loading}>Save</Button>}
      />

      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Released Production Order Nos.</Label>
              <NoSeriesSelect
                value={setup.released_prod_order_nos}
                onChange={(value) => setField("released_prod_order_nos", value)}
                options={noSeries}
                placeholder="Select Released Production Order Nos."
              />
            </div>

            <div className="space-y-2">
              <Label>Production BOM Nos.</Label>
              <NoSeriesSelect
                value={setup.production_bom_nos}
                onChange={(value) => setField("production_bom_nos", value)}
                options={noSeries}
                placeholder="Select Production BOM Nos."
              />
            </div>

            <div className="space-y-2">
              <Label>Production BOM Version Nos.</Label>
              <NoSeriesSelect
                value={setup.production_bom_version_nos}
                onChange={(value) => setField("production_bom_version_nos", value)}
                options={noSeries}
                placeholder="Select Production BOM Version Nos."
              />
            </div>

            <div className="space-y-2">
              <Label>Item Journal Nos.</Label>
              <NoSeriesSelect
                value={setup.item_journal_nos}
                onChange={(value) => setField("item_journal_nos", value)}
                options={noSeries}
                placeholder="Select Item Journal Nos."
              />
            </div>

            <div className="space-y-2">
              <Label>Assembly Order Nos.</Label>
              <NoSeriesSelect
                value={setup.assembly_order_nos}
                onChange={(value) => setField("assembly_order_nos", value)}
                options={noSeries}
                placeholder="Select Assembly Order Nos."
              />
            </div>

            <div className="space-y-2">
              <Label>Posted Assembly Order Nos.</Label>
              <NoSeriesSelect
                value={setup.posted_assembly_order_nos}
                onChange={(value) => setField("posted_assembly_order_nos", value)}
                options={noSeries}
                placeholder="Select Posted Assembly Order Nos."
              />
            </div>

            <div className="space-y-2">
              <Label>Consumption Journal Nos.</Label>
              <NoSeriesSelect
                value={setup.consumption_journal_nos}
                onChange={(value) => setField("consumption_journal_nos", value)}
                options={noSeries}
                placeholder="Select Consumption Journal Nos."
              />
            </div>

            <div className="space-y-2">
              <Label>Output Journal Nos.</Label>
              <NoSeriesSelect
                value={setup.output_journal_nos}
                onChange={(value) => setField("output_journal_nos", value)}
                options={noSeries}
                placeholder="Select Output Journal Nos."
              />
            </div>

            <div className="space-y-2">
              <Label>Default Safety Lead Time</Label>
              <Input
                value={setup.default_safety_lead_time ?? ""}
                onChange={(event) => setField("default_safety_lead_time", event.target.value)}
                placeholder="Example: 1D"
              />
            </div>

            <div className="space-y-2">
              <Label>Normal Starting Time</Label>
              <Input
                type="time"
                value={setup.normal_starting_time ?? "08:00"}
                onChange={(event) => setField("normal_starting_time", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Normal Ending Time</Label>
              <Input
                type="time"
                value={setup.normal_ending_time ?? "17:00"}
                onChange={(event) => setField("normal_ending_time", event.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
