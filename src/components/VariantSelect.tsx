import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LookupCombobox, LookupItem } from "@/components/LookupCombobox";

/**
 * VariantSelect - Dropdown of variants defined on the Item Card.
 * Values come from public.item_variant filtered by the selected item.
 */
export function VariantSelect({
  itemNo,
  value,
  onChange,
  placeholder = "Select variant...",
  className,
  disabled = false,
}: {
  itemNo: string | null | undefined;
  value: string | null | undefined;
  onChange: (code: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [items, setItems] = useState<LookupItem[]>([]);

  useEffect(() => {
    if (!itemNo) {
      setItems([]);
      return;
    }

    (async () => {
      const { data } = await api.get(`/items/${itemNo}/variants`);
      setItems(
        ((data as any[]) ?? []).map((v) => ({
          value: v.code,
          label: v.description ?? v.code,
          sub: [
            v.unit_of_measure_code,
            v.weight ? `Wt ${v.weight}` : null,
          ]
            .filter(Boolean)
            .join(" - "),
        }))
      );
    })();
  }, [itemNo]);

  return (
    <LookupCombobox
      value={value ?? ""}
      items={items}
      placeholder={itemNo ? placeholder : "Select item first"}
      onSelect={(i) => onChange(i.value)}
      className={className}
      disabled={disabled}
    />
  );
}
