"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Globe } from "lucide-react";
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
import { getTimezoneOptions } from "@/lib/datetime";

export function TimezoneSelect({
  value,
  onChange,
  invalid,
  id,
}: {
  value: string;
  onChange: (zone: string) => void;
  invalid?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const options = useMemo(() => getTimezoneOptions(), []);
  const browserZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    []
  );

  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid || undefined}
            className={cn(
              "w-full justify-between font-normal",
              !selected && "text-muted-foreground"
            )}
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          <Globe className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {selected ? selected.label : "Select time zone…"}
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) min-w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search time zones…" />
          <CommandList className="max-h-64">
            <CommandEmpty>No time zone found.</CommandEmpty>
            {browserZone && value !== browserZone ? (
              <CommandGroup heading="Suggested">
                <CommandItem
                  value={`suggested ${browserZone}`}
                  onSelect={() => {
                    onChange(browserZone);
                    setOpen(false);
                  }}
                >
                  <Globe className="size-4" />
                  {browserZone.replaceAll("_", " ")} (your device)
                </CommandItem>
              </CommandGroup>
            ) : null}
            <CommandGroup heading="All time zones">
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "size-4",
                      option.value === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
