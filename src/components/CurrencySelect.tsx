import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CurrencyOption = {
  code: string;
  description: string;
  iso_code?: string | null;
  symbol?: string | null;
  is_active?: boolean | null;
};

type CurrencySelectProps = {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  allowBlank?: boolean;
};

export function CurrencySelect({
  value,
  onChange,
  placeholder = "Select Currency",
  disabled = false,
  allowBlank = true,
}: CurrencySelectProps) {
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data } = await api.get("/currencies", { params: { active: true } });
        if (!cancelled) setCurrencies(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setCurrencies([]);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Select
      value={value || (allowBlank ? "__blank__" : "INR")}
      disabled={disabled}
      onValueChange={(next) => onChange(next === "__blank__" ? null : next)}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowBlank && <SelectItem value="__blank__">{placeholder}</SelectItem>}
        {currencies.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            {currency.code} - {currency.description}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
