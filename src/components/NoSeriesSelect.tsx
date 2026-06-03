import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { NoSeriesOption } from "@/hooks/useNoSeries";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

type NoSeriesSelectProps = {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  options: NoSeriesOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function NoSeriesSelect({
  value,
  onChange,
  options,
  placeholder = "Select No. Series",
  disabled = false,
  className,
}: NoSeriesSelectProps) {
  const [relatedOptions, setRelatedOptions] =
    useState<NoSeriesOption[]>([]);

  useEffect(() => {
    let cancelled =
      false;

    const loadRelationships =
      async () => {
        if (!value) {
          setRelatedOptions([]);
          return;
        }

        try {
          const response =
            await api.get(
              `/no-series/${encodeURIComponent(value)}/with-relationships`
            );

          const rows =
            Array.isArray(response.data)
              ? response.data
              : response.data?.data ?? [];

          if (!cancelled) {
            setRelatedOptions(
              Array.isArray(rows)
                ? rows
                : []
            );
          }
        } catch (err) {
          if (!cancelled) {
            setRelatedOptions([]);
          }
        }
      };

    loadRelationships();

    return () => {
      cancelled =
        true;
    };
  }, [value]);

  const mergedOptions =
    useMemo(() => {
      const byCode =
        new Map<string, NoSeriesOption>();

      for (const option of options) {
        byCode.set(option.code, option);
      }

      for (const option of relatedOptions) {
        const existing =
          byCode.get(option.code);

        byCode.set(
          option.code,
          {
            ...existing,
            ...option,
            description:
              option.description ??
              existing?.description ??
              null,
          }
        );
      }

      if (
        value &&
        !byCode.has(value)
      ) {
        byCode.set(value, {
          code: value,
          description: null,
          is_active: true,
        });
      }

      return Array.from(byCode.values())
        .filter((option) =>
          option.is_active !== false ||
          option.code === value
        )
        .sort((a, b) => {
          if (a.code === value) return -1;
          if (b.code === value) return 1;
          if (a.is_related && !b.is_related) return -1;
          if (!a.is_related && b.is_related) return 1;
          return a.code.localeCompare(b.code);
        });
    }, [
      options,
      relatedOptions,
      value,
    ]);

  return (
    <Select
      value={value || "__none__"}
      disabled={disabled}
      onValueChange={(nextValue) => onChange(nextValue === "__none__" ? null : nextValue)}
    >
      <SelectTrigger className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">{placeholder}</SelectItem>
        {mergedOptions.map((option) => (
          <SelectItem key={option.code} value={option.code}>
            <span className="flex w-full items-center justify-between gap-3">
              <span>
                {option.code}
                {option.description ? ` - ${option.description}` : ""}
              </span>
              {option.is_related ? (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  Relationship
                </Badge>
              ) : null}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
