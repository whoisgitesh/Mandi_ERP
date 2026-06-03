import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type NoSeriesOption = {
  code: string;
  description: string | null;
  is_active?: boolean | null;
  is_related?: boolean | null;
  relationship_source_code?: string | null;
  starting_no?: string | null;
  ending_no?: string | null;
  last_no_used?: string | null;
  next_no?: string | null;
};

function rowsFromResponse(response: any): NoSeriesOption[] {
  const rows = Array.isArray(response?.data)
    ? response.data
    : response?.data?.data ?? [];

  return Array.isArray(rows) ? rows : [];
}

export function useNoSeries() {
  const [noSeries, setNoSeries] = useState<NoSeriesOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get("/no-series/options");
        if (!cancelled) {
          setNoSeries(rowsFromResponse(response));
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || "Failed to load No. Series");
          setNoSeries([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { noSeries, loading, error };
}
