import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, ExternalLink, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type VendorOption = {
  vendor_no?: string | null;
  no?: string | null;
  name?: string | null;
  address?: string | null;
  address_2?: string | null;
  city?: string | null;
  post_code?: string | null;
  phone_no?: string | null;
  mobile_phone_no?: string | null;
  contact_person?: string | null;
  gst_registration_no?: string | null;
  pan_no?: string | null;
  blocked?: boolean | null;
};

const vendorCode = (vendor: VendorOption) =>
  String(vendor.vendor_no || vendor.no || "").trim();

export function VendorSelect({
  value,
  onChange,
  placeholder = "Select Vendor...",
  disabled = false,
  onSelectVendor,
}: {
  value?: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onSelectVendor?: (vendor: VendorOption | null) => void;
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<VendorOption[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data } = await api.get("/vendors");
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (!cancelled) {
          setRows([]);
          toast.error(err?.response?.data?.error || "Failed to load vendors");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = rows.find((row) => vendorCode(row) === value);

  const items = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (!vendorCode(row)) return false;
        if (!term) return true;
        return [
          vendorCode(row),
          row.name,
          row.address,
          row.address_2,
          row.city,
          row.post_code,
          row.phone_no,
          row.mobile_phone_no,
          row.contact_person,
          row.gst_registration_no,
          row.pan_no,
        ]
          .filter(Boolean)
          .some((part) => String(part).toLowerCase().includes(term));
      })
      .sort((a, b) => vendorCode(a).localeCompare(vendorCode(b)));
  }, [rows, search]);

  const navigateAndClose = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const choose = (vendor: VendorOption) => {
    if (vendor.blocked) {
      toast.warning("Selected vendor is blocked.");
      return;
    }

    const code = vendorCode(vendor);
    onChange(code);
    onSelectVendor?.(vendor);
    setOpen(false);
  };

  const clear = () => {
    onChange("");
    onSelectVendor?.(null);
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
                `${vendorCode(current)} - ${current.name || vendorCode(current)}`
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
        <PopoverContent className="w-[920px] max-w-[calc(100vw-2rem)] p-0" align="start">
          <div className="border-b bg-background p-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search vendor no., name, address, city, contact..."
              className="h-9"
            />
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[1280px]">
              <div className="grid grid-cols-[120px_180px_220px_180px_110px_110px_130px_150px_130px_110px] border-b px-4 py-3 text-xs font-medium text-muted-foreground">
                <div>Vendor No.</div>
                <div>Vendor Name</div>
                <div>Address</div>
                <div>Address 2</div>
                <div>City</div>
                <div>Post Code</div>
                <div>Phone No.</div>
                <div>Contact</div>
                <div>GST Reg. No.</div>
                <div>PAN No.</div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No vendors.
                  </div>
                ) : (
                  items.map((row) => {
                    const code = vendorCode(row);
                    return (
                      <button
                        type="button"
                        key={code}
                        className={cn(
                          "grid w-full grid-cols-[28px_120px_180px_220px_180px_110px_110px_130px_150px_130px_110px] items-center border-b px-3 py-2 text-left text-sm hover:bg-muted",
                          value === code && "bg-blue-50",
                          row.blocked && "cursor-not-allowed opacity-60"
                        )}
                        onClick={() => choose(row)}
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 text-primary",
                            value === code ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="font-medium text-primary">{code}</span>
                        <span className="truncate">{row.name || "-"}</span>
                        <span className="truncate">{row.address || "-"}</span>
                        <span className="truncate">{row.address_2 || "-"}</span>
                        <span className="truncate">{row.city || "-"}</span>
                        <span className="truncate">{row.post_code || "-"}</span>
                        <span className="truncate">{row.phone_no || row.mobile_phone_no || "-"}</span>
                        <span className="truncate">{row.contact_person || "-"}</span>
                        <span className="truncate">{row.gst_registration_no || "-"}</span>
                        <span className="truncate">{row.pan_no || "-"}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t bg-background px-3 py-2 text-sm">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => navigateAndClose("/vendors")}
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
                onClick={() => value && navigateAndClose(`/vendors/${encodeURIComponent(value)}`)}
              >
                Show details
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-primary"
                onClick={() => navigateAndClose("/vendors")}
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
