import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LookupCombobox, LookupItem } from "@/components/LookupCombobox";

/**
 * UomSelect - Dropdown sourced from the Unit of Measure master.
 * Replaces every free-text UOM input across the system.
 */
export function UomSelect({
  value,
  onChange,
  placeholder = "Select UOM...",
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
      const { data } = await api.get("/uom");
      setItems(
        ((data as any[]) ?? []).map((u) => ({
          value: u.code,
          label: u.description ?? u.code,
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
