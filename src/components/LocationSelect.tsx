import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LookupCombobox, LookupItem } from "@/components/LookupCombobox";

export function LocationSelect({
  value,
  onChange,
  placeholder = "Select location...",
  className,
  disabled = false,
}: {
  value: string | null | undefined;
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [items, setItems] = useState<LookupItem[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/locations");
      const rows = Array.isArray(data)
        ? data
        : data?.data ?? [];

      setItems(
        rows.map((l: any) => ({
          value: l.code,
          label: l.name,
        }))
      );
    })();
  }, []);

  return (
    <LookupCombobox
      value={value ?? ""}
      items={items}
      placeholder={placeholder}
      onSelect={(i) => onChange(i.value)}
      className={className}
      disabled={disabled}
    />
  );
}
