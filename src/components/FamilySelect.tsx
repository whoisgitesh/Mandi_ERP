import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, ExternalLink, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type FamilyOption = {
  family_no: string;
  description?: string | null;
  item_category_code?: string | null;
  item_category_description?: string | null;
  blocked?: boolean | null;
};

export function FamilySelect({
  value,
  onChange,
  placeholder = "Select Family...",
  disabled = false,
  itemCategoryCode,
  onSelectFamily,
}: {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  itemCategoryCode?: string | null;
  onSelectFamily?: (family: FamilyOption | null) => void;
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<FamilyOption[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data } = await api.get("/families?active=true");
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (!cancelled) {
          setRows([]);
          toast.error(err?.response?.data?.error || "Failed to load families");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(() => {
    const category = String(itemCategoryCode || "").toUpperCase();
    return rows
      .filter((row) => !category || !row.item_category_code || row.item_category_code === category)
      .sort((a, b) => a.family_no.localeCompare(b.family_no));
  }, [itemCategoryCode, rows]);

  const current =
    rows.find((row) => row.family_no === value) ||
    items.find((row) => row.family_no === value);

  const navigateAndClose = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const choose = (family: FamilyOption) => {
    onChange(family.family_no);
    onSelectFamily?.(family);
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    onSelectFamily?.(null);
  };

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="h-9 w-full justify-between px-3 font-normal"
          >
            <span className="truncate">
              {current ? (
                `${current.family_no} - ${current.description || current.family_no}`
              ) : value ? (
                value
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
            <span className="ml-2 flex items-center gap-1 text-muted-foreground">
              <ExternalLink className="h-3.5 w-3.5" />
              <ChevronsUpDown className="h-4 w-4" />
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[620px] max-w-[calc(100vw-2rem)] p-0" align="start">
          <div className="border-b bg-background">
            <div className="grid grid-cols-[120px_1fr_120px] px-4 py-3 text-xs font-medium text-muted-foreground">
              <div>No.</div>
              <div>Description</div>
              <div>Item Category</div>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No families.
              </div>
            ) : (
              items.map((row) => (
                <button
                  type="button"
                  key={row.family_no}
                  className={cn(
                    "grid w-full grid-cols-[28px_120px_1fr_120px] items-center border-b px-3 py-2 text-left text-sm hover:bg-muted",
                    value === row.family_no && "bg-blue-50"
                  )}
                  onClick={() => choose(row)}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 text-primary",
                      value === row.family_no ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-medium text-primary">{row.family_no}</span>
                  <span className="truncate">{row.description || "-"}</span>
                  <span className="truncate">{row.item_category_code || "-"}</span>
                </button>
              ))
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t bg-background px-3 py-2 text-sm">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => navigateAndClose("/families/new")}
            >
              <Plus className="h-4 w-4" />
              New
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!value}
                onClick={() => value && navigateAndClose(`/families/${encodeURIComponent(value)}`)}
              >
                Show details
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-primary"
                onClick={() => navigateAndClose("/families")}
              >
                Select from full list
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {value && !disabled && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 shrink-0"
          onClick={clear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
