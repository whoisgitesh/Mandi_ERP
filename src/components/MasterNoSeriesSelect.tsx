import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";

import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type NoSeriesOption = {
  code: string;
  description: string | null;
};

type NoSeriesLine = {
  id: string;
  no_series_code: string;
  code?: string;
  description?: string | null;
  starting_no: string;
  ending_no: string | null;
  last_no_used: string | null;
  sequence_no: number | null;
  open: boolean;
  is_related?: boolean;
  relationship_source_code?: string | null;
  next_no?: string | null;
};

type Props = {
  label?: string;
  value: string;
  codes?: string[];
  keywords: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
};

function lineLabel(line: NoSeriesLine) {
  if (!line.starting_no) {
    return `${line.no_series_code ?? line.code} - No line`;
  }

  const range = line.ending_no
    ? `${line.starting_no} .. ${line.ending_no}`
    : `${line.starting_no} ..`;

  return `${line.no_series_code ?? line.code} - ${range}`;
}

export function MasterNoSeriesSelect({
  label = "No. Series Range",
  value,
  codes = [],
  keywords,
  onChange,
  disabled = false,
}: Props) {
  const [series, setSeries] = useState<NoSeriesOption[]>([]);
  const [lines, setLines] = useState<NoSeriesLine[]>([]);
  const codeKey = codes.join("|");
  const keywordKey = keywords.join("|");

  useEffect(() => {
    let alive = true;

    async function load() {
      const seriesRes = await api.get("/no-series/options");
      const allSeries: NoSeriesOption[] =
        seriesRes.data?.data ?? seriesRes.data ?? [];

      if (!alive) return;

      setSeries(allSeries);

      const exactCodes = codeKey
        .split("|")
        .filter(Boolean)
        .map((code) => code.toUpperCase());

      const needles = keywordKey
        .split("|")
        .filter(Boolean)
        .map((k) => k.toUpperCase());

      const matchingSeries =
        exactCodes.length > 0
          ? allSeries.filter((option) =>
              exactCodes.includes(option.code.toUpperCase())
            )
          : allSeries.filter((option) => {
              const text = `${option.code} ${option.description ?? ""}`.toUpperCase();
              return needles.some((k) => text.includes(k));
            });

      const seriesToLoad =
        matchingSeries.length > 0 ? matchingSeries : allSeries;

      const lineResponses = await Promise.all(
        seriesToLoad.map((option) =>
          api
            .get(`/no-series/${encodeURIComponent(option.code)}/with-relationships`)
            .then((res) => {
              const rows = res.data?.data ?? res.data ?? [];
              if (Array.isArray(rows) && rows.length > 0) return rows;

              return api
                .get(`/no-series/${encodeURIComponent(option.code)}/lines`)
                .then((fallbackRes) =>
                  fallbackRes.data?.data ?? fallbackRes.data ?? []
                );
            })
            .catch(() =>
              api
                .get(`/no-series/${encodeURIComponent(option.code)}/lines`)
                .then((fallbackRes) =>
                  fallbackRes.data?.data ?? fallbackRes.data ?? []
                )
                .catch(() => [])
            )
        )
      );

      if (!alive) return;

      const deduped = new Map<string, NoSeriesLine>();

      lineResponses
        .flat()
        .forEach((line: NoSeriesLine) => {
          const seriesCode = line.no_series_code ?? line.code ?? "";
          if (!seriesCode) return;
          const optionId = line.id ?? `__no_line_${seriesCode}`;
          if (deduped.has(String(optionId))) return;
          deduped.set(String(optionId), {
            ...line,
            id: String(optionId),
            no_series_code: seriesCode,
          });
        });

      setLines(Array.from(deduped.values()));
    }

    load().catch(() => {
      if (alive) {
        setSeries([]);
        setLines([]);
      }
    });

    return () => {
      alive = false;
    };
  }, [codeKey, keywordKey]);

  const options = useMemo(() => {
    const seriesByCode = new Map(
      series.map((option) => [option.code, option])
    );

    return lines.map((line) => ({
      ...line,
      description: seriesByCode.get(line.no_series_code)?.description ?? null,
    }));
  }, [lines, series]);

  useEffect(() => {
    const firstOpen =
      options.find((option) => option.open !== false && option.starting_no) ??
      options[0];

    if (!value && firstOpen) {
      onChange(String(firstOpen.id));
    }
  }, [onChange, options, value]);

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Select range..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((line) => (
            <SelectItem
              key={line.id}
              value={String(line.id)}
              disabled={line.open === false || !line.starting_no}
            >
              <span>{lineLabel(line)}</span>
              {line.last_no_used ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  Last: {line.last_no_used}
                </span>
              ) : null}
              {line.is_related ? (
                <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Related
                </span>
              ) : null}
              {line.open === false || !line.starting_no ? (
                <span className="ml-2 text-xs text-destructive">
                  No open line
                </span>
              ) : null}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
