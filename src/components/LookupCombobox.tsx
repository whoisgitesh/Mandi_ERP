import { useEffect, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type LookupItem = {
  value: string;
  label: string;
  sub?: string;
  raw?: any;
};

export function LookupCombobox({
  value,
  items,
  placeholder = "Select...",
  onSelect,
  className,
  disabled = false,
}: {
  value: string;
  items: LookupItem[];
  placeholder?: string;
  onSelect: (item: LookupItem) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState(value);

  useEffect(() => setDisplay(value), [value]);

  const current = items.find((i) => i.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn("h-9 w-full justify-between font-normal", className)}
        >
          <span className="truncate">
            {current ? (
              `${current.value} - ${current.label}`
            ) : (
              display || (
                <span className="text-muted-foreground">
                  {placeholder}
                </span>
              )
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {items.map((i) => (
                <CommandItem
                  key={i.value}
                  value={`${i.value} ${i.label}`}
                  onSelect={() => {
                    onSelect(i);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === i.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {i.value} - {i.label}
                    </span>
                    {i.sub && (
                      <span className="text-xs text-muted-foreground">
                        {i.sub}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
