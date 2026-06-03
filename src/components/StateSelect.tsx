import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type StateOption = {
  code: string;
  description: string;
  etds_tcs_state_code?: string | null;
  gst_state_code?: string | null;
  is_active?: boolean | null;
};

type StateSelectProps = {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function StateSelect({
  value,
  onChange,
  placeholder = "Select State",
  disabled = false,
}: StateSelectProps) {
  const [states, setStates] = useState<StateOption[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data } = await api.get("/states", { params: { active: true } });
        if (!cancelled) setStates(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setStates([]);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Select
      value={value || "__none__"}
      disabled={disabled}
      onValueChange={(next) => onChange(next === "__none__" ? null : next)}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">{placeholder}</SelectItem>
        {states.map((state) => (
          <SelectItem key={state.code} value={state.code}>
            {state.code} - {state.description}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
