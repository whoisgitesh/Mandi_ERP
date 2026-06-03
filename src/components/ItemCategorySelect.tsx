import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, ExternalLink, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type ItemCategory = {
  code: string;
  description?: string | null;
  parent_category_code?: string | null;
  is_active?: boolean | null;
};

export function ItemCategorySelect({
  value,
  onChange,
  placeholder = "Select Item Category...",
  disabled = false,
  excludeCode,
}: {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  excludeCode?: string | null;
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ItemCategory[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data } = await api.get("/item-categories?active=true");
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (!cancelled) {
          setRows([]);
          toast.error(err?.response?.data?.error || "Failed to load item categories");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(() => {
    const excluded = String(excludeCode || "").toUpperCase();
    return rows
      .filter((row) => row.code !== excluded)
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [excludeCode, rows]);

  const current = items.find((row) => row.code === value);

  const navigateAndClose = (path: string) => {
    setOpen(false);
    navigate(path);
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
                `${current.code} - ${current.description || current.code}`
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
        <PopoverContent className="w-[532px] max-w-[calc(100vw-2rem)] p-0" align="start">
          <div className="border-b bg-background">
            <div className="grid grid-cols-[120px_1fr] px-4 py-3 text-xs font-medium text-muted-foreground">
              <div>Code</div>
              <div>Description</div>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No item categories.
              </div>
            ) : (
              items.map((row) => (
                <button
                  type="button"
                  key={row.code}
                  className={cn(
                    "grid w-full grid-cols-[28px_120px_1fr] items-center border-b px-3 py-2 text-left text-sm hover:bg-muted",
                    value === row.code && "bg-blue-50"
                  )}
                  onClick={() => {
                    onChange(row.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 text-primary",
                      value === row.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="font-medium text-primary">{row.code}</span>
                  <span className="truncate">{row.description || "-"}</span>
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
              onClick={() => navigateAndClose("/item-categories/new")}
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
                onClick={() => value && navigateAndClose(`/item-categories/${encodeURIComponent(value)}`)}
              >
                Show details
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-primary"
                onClick={() => navigateAndClose("/item-categories")}
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
          onClick={() => onChange("")}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
