import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, ExternalLink, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type SalespersonPurchaserOption = {
  code: string;
  name?: string | null;
  job_title?: string | null;
  phone_no?: string | null;
  email?: string | null;
  blocked?: boolean | null;
};

export function SalespersonPurchaserSelect({
  value,
  onChange,
  placeholder = "Select Salesperson/Purchaser...",
  disabled = false,
  onSelect,
}: {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onSelect?: (row: SalespersonPurchaserOption | null) => void;
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SalespersonPurchaserOption[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data } = await api.get("/salespeople-purchasers", { params: { active: true } });
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (!cancelled) toast.error(err?.response?.data?.error || "Failed to load salespeople/purchasers");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = rows.find((row) => row.code === value);
  const items = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.code, row.name, row.job_title, row.phone_no, row.email]
        .filter(Boolean)
        .some((part) => String(part).toLowerCase().includes(term))
    );
  }, [rows, search]);

  const choose = (row: SalespersonPurchaserOption) => {
    if (row.blocked) {
      toast.warning("Blocked Salesperson/Purchaser cannot be selected.");
      return;
    }
    onChange(row.code);
    onSelect?.(row);
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    onSelect?.(null);
  };

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" disabled={disabled} className="h-9 w-full justify-between px-3 font-normal">
            <span className="truncate">
              {current ? `${current.code} - ${current.name || current.code}` : value || <span className="text-muted-foreground">{placeholder}</span>}
            </span>
            <span className="ml-2 flex items-center gap-1 text-muted-foreground">
              <ExternalLink className="h-3.5 w-3.5" />
              <ChevronsUpDown className="h-4 w-4" />
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[720px] max-w-[calc(100vw-2rem)] p-0" align="start">
          <div className="border-b p-3">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search code, name, phone, email..." className="h-9" />
          </div>
          <div className="grid grid-cols-[110px_220px_160px_140px] border-b px-4 py-3 text-xs font-medium text-muted-foreground">
            <div>Code</div>
            <div>Name</div>
            <div>Phone No.</div>
            <div>Email</div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No salespeople/purchasers.</div>
            ) : (
              items.map((row) => (
                <button
                  type="button"
                  key={row.code}
                  className={cn(
                    "grid w-full grid-cols-[28px_110px_220px_160px_140px] items-center border-b px-3 py-2 text-left text-sm hover:bg-muted",
                    value === row.code && "bg-blue-50",
                    row.blocked && "cursor-not-allowed opacity-60"
                  )}
                  onClick={() => choose(row)}
                >
                  <Check className={cn("h-4 w-4 text-primary", value === row.code ? "opacity-100" : "opacity-0")} />
                  <span className="font-medium text-primary">{row.code}</span>
                  <span className="truncate">{row.name || "-"}</span>
                  <span className="truncate">{row.phone_no || "-"}</span>
                  <span className="truncate">{row.email || "-"}</span>
                </button>
              ))
            )}
          </div>
          <div className="flex items-center justify-between border-t px-3 py-2">
            <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/salespeople-purchasers/new")}>
              <Plus className="h-4 w-4" />
              New
            </Button>
            <Button type="button" variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/salespeople-purchasers")}>
              Select from full list
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {value && !disabled && (
        <Button type="button" variant="outline" size="icon" className="h-9 shrink-0" onClick={clear}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
