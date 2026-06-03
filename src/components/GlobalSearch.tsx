import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

import { api } from "@/lib/api";
import { navigationItems } from "@/config/navigation";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

type Hit = {
  group: string;
  label: string;
  sublabel?: string;
  url: string;
};

function responseRows(response: any) {
  return Array.isArray(response.data)
    ? response.data
    : response.data?.data ?? [];
}

function includesTerm(values: Array<string | null | undefined>, term: string) {
  return values.some((value) =>
    String(value ?? "").toLowerCase().includes(term)
  );
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const term = q.trim().toLowerCase();

    if (!term) {
      setHits([]);
      return;
    }

    let cancelled = false;

    async function search() {
      const [items, vendors, customers, locations, mandi, mandiVendors] =
        await Promise.all([
          api.get("/items").catch(() => ({ data: [] })),
          api.get("/vendors").catch(() => ({ data: [] })),
          api.get("/customers").catch(() => ({ data: [] })),
          api.get("/locations").catch(() => ({ data: [] })),
          api.get("/mandi-master").catch(() => ({ data: [] })),
          api.get("/mandi-vendors").catch(() => ({ data: [] })),
        ]);

      if (cancelled) return;

      const out: Hit[] = [];

      responseRows(items)
        .filter((r: any) => includesTerm([r.item_no, r.description], term))
        .slice(0, 8)
        .forEach((r: any) =>
          out.push({
            group: "Items",
            label: r.item_no,
            sublabel: r.description,
            url: "/items",
          })
        );

      responseRows(vendors)
        .filter((r: any) => includesTerm([r.vendor_no, r.name], term))
        .slice(0, 8)
        .forEach((r: any) =>
          out.push({
            group: "Vendors",
            label: r.vendor_no,
            sublabel: r.name,
            url: "/vendors",
          })
        );

      responseRows(customers)
        .filter((r: any) => includesTerm([r.customer_no, r.name], term))
        .slice(0, 8)
        .forEach((r: any) =>
          out.push({
            group: "Customers",
            label: r.customer_no,
            sublabel: r.name,
            url: "/customers",
          })
        );

      responseRows(locations)
        .filter((r: any) => includesTerm([r.code, r.name], term))
        .slice(0, 8)
        .forEach((r: any) =>
          out.push({
            group: "Locations",
            label: r.code,
            sublabel: r.name,
            url: "/locations",
          })
        );

      responseRows(mandi)
        .filter((r: any) =>
          includesTerm([r.vendor_no, r.vendor_name, r.item_no], term)
        )
        .slice(0, 8)
        .forEach((r: any) =>
          out.push({
            group: "Mandi Master",
            label: r.vendor_no,
            sublabel: `${r.vendor_name ?? ""} - ${r.item_no}`,
            url: "/mandi-master",
          })
        );

      responseRows(mandiVendors)
        .filter((r: any) => includesTerm([r.vendor_no, r.name, r.city], term))
        .slice(0, 8)
        .forEach((r: any) =>
          out.push({
            group: "Mandi Vendor",
            label: r.vendor_no,
            sublabel: `${r.name}${r.city ? ` - ${r.city}` : ""}`,
            url: "/mandi-vendor",
          })
        );

      setHits(out);
    }

    search();

    return () => {
      cancelled = true;
    };
  }, [q]);

  const go = (url: string) => {
    setOpen(false);
    setQ("");
    navigate(url);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Search pages...</span>
        <kbd className="hidden md:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          Ctrl K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search pages, setup, invoices, masters..."
          value={q}
          onValueChange={setQ}
        />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Pages">
            {navigationItems.map((page) => (
              <CommandItem
                key={`${page.path}-${page.title}`}
                value={`${page.title} ${page.category} ${page.section} ${page.path} ${page.keywords.join(" ")}`}
                onSelect={() => go(page.path)}
              >
                <page.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{page.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {page.category} - {page.path}
                  </span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>

          {hits.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Records">
                {hits.map((hit, index) => (
                  <CommandItem
                    key={index}
                    value={`${hit.group} ${hit.label} ${hit.sublabel ?? ""}`}
                    onSelect={() => go(hit.url)}
                  >
                    <span className="text-xs text-muted-foreground mr-2 w-24 shrink-0">
                      {hit.group}
                    </span>
                    <span className="font-medium">{hit.label}</span>
                    {hit.sublabel && (
                      <span className="text-muted-foreground ml-2 truncate">
                        - {hit.sublabel}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
