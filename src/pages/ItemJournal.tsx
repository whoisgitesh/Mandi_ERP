import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { NoSeriesSelect } from "@/components/NoSeriesSelect";
import { PageHeader } from "@/components/PageHeader";
import { UomSelect } from "@/components/UomSelect";
import { VariantSelect } from "@/components/VariantSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NumericInput } from "@/components/ui/NumericInput";
import { api } from "@/lib/api";
import { useNoSeries } from "@/hooks/useNoSeries";
import { todayDateInput } from "@/lib/date";

type ItemOption = {
  item_no: string;
  description?: string | null;
  base_unit_of_measure?: string | null;
  unit_cost?: number | string | null;
  inventory?: number | string | null;
};

type LocationOption = {
  code: string;
  description?: string | null;
};

type JournalLine = {
  item_no: string;
  description: string;
  location_code: string;
  variant_code: string;
  unit_of_measure_code: string;
  quantity: string;
  unit_cost: string;
};

const blankLine = (): JournalLine => ({
  item_no: "",
  description: "",
  location_code: "",
  variant_code: "",
  unit_of_measure_code: "",
  quantity: "",
  unit_cost: "",
});

export default function ItemJournal() {
  const { noSeries } = useNoSeries();
  const [postingDate, setPostingDate] = useState(todayDateInput());
  const [noSeriesCode, setNoSeriesCode] = useState<string | null>(null);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [lines, setLines] = useState<JournalLine[]>([blankLine()]);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [lookupRes, setupRes] = await Promise.all([
          api.get("/item-journals/lookups"),
          api.get("/setup/inventory"),
        ]);
        if (!cancelled) {
          const data = lookupRes.data;
          setItems(data.items ?? []);
          setLocations(data.locations ?? []);
          setNoSeriesCode(setupRes.data?.data?.item_journal_nos ?? "ITEM_JOURNAL");
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.error || "Failed to load Item Journal lookups");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const itemByNo = useMemo(
    () => new Map(items.map((item) => [item.item_no, item])),
    [items]
  );

  const updateLine = (index: number, patch: Partial<JournalLine>) => {
    setLines((current) => {
      const next = [...current];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const selectItem = (index: number, itemNo: string) => {
    const item = itemByNo.get(itemNo);
    updateLine(index, {
      item_no: itemNo,
      description: item?.description ?? "",
      variant_code: "",
      unit_of_measure_code: item?.base_unit_of_measure ?? "",
      unit_cost: String(item?.unit_cost ?? 0),
    });
  };

  const postJournal = async () => {
    const postingLines = lines.filter((line) => line.item_no || line.quantity || line.location_code);
    if (postingLines.length === 0) {
      toast.error("At least one Item Journal line is required.");
      return;
    }

    try {
      setPosting(true);
      const { data } = await api.post("/item-journals/post", {
        posting_date: postingDate,
        no_series_code: noSeriesCode,
        lines: postingLines,
      });
      toast.success(`Item Journal ${data.journal_no} posted`);
      setLines([blankLine()]);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to post Item Journal");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Item Journal"
        subtitle="Post positive raw material inventory adjustments"
        actions={<Button onClick={postJournal} disabled={posting}>Post Journal</Button>}
      />

      <div className="p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Posting Date</Label>
              <Input
                type="date"
                value={postingDate}
                onChange={(event) => setPostingDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Item Journal Nos.</Label>
              <NoSeriesSelect
                value={noSeriesCode}
                options={noSeries}
                placeholder="Select Item Journal Nos."
                onChange={setNoSeriesCode}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Lines</CardTitle>
            <Button variant="outline" onClick={() => setLines((current) => [...current, blankLine()])}>
              <Plus className="h-4 w-4" /> Add Line
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">Line No.</TableHead>
                    <TableHead className="min-w-[220px]">Item No.</TableHead>
                    <TableHead className="min-w-[220px]">Description</TableHead>
                    <TableHead className="min-w-[180px]">Location Code</TableHead>
                    <TableHead className="min-w-[130px]">Variant</TableHead>
                    <TableHead className="min-w-[130px]">UOM</TableHead>
                    <TableHead className="min-w-[130px] text-right">Quantity</TableHead>
                    <TableHead className="min-w-[130px] text-right">Unit Cost</TableHead>
                    <TableHead className="w-14" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {(index + 1) * 10000}
                      </TableCell>
                      <TableCell>
                        <Select value={line.item_no || "__none__"} onValueChange={(value) => selectItem(index, value === "__none__" ? "" : value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Item" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Select Item</SelectItem>
                            {items.map((item) => (
                              <SelectItem key={item.item_no} value={item.item_no}>
                                {item.item_no}
                                {item.description ? ` - ${item.description}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.description}
                          onChange={(event) => updateLine(index, { description: event.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={line.location_code || "__none__"} onValueChange={(value) => updateLine(index, { location_code: value === "__none__" ? "" : value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Location" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Select Location</SelectItem>
                            {locations.map((location) => (
                              <SelectItem key={location.code} value={location.code}>
                                {location.code}
                                {location.description ? ` - ${location.description}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <VariantSelect
                          itemNo={line.item_no}
                          value={line.variant_code}
                          placeholder="Select Variant"
                          onChange={(value) => updateLine(index, { variant_code: value })}
                          disabled={!line.item_no}
                        />
                      </TableCell>
                      <TableCell>
                        <UomSelect
                          value={line.unit_of_measure_code}
                          placeholder="Select UOM"
                          onChange={(value) => updateLine(index, { unit_of_measure_code: value })}
                        />
                      </TableCell>
                      <TableCell>
                        <NumericInput
                          className="text-right"
                          value={line.quantity}
                          min={0}
                          decimalScale={2}
                          onChange={(value) => updateLine(index, { quantity: value })}
                        />
                      </TableCell>
                      <TableCell>
                        <NumericInput
                          className="text-right"
                          value={line.unit_cost}
                          min={0}
                          decimalScale={2}
                          onChange={(value) => updateLine(index, { unit_cost: value })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}
                          disabled={lines.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
