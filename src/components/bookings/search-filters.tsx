"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BOOKING_STATUSES, CALL_TYPES } from "@/lib/constants";

const ALL = "__all__";

export function SearchFilters({
  employees,
}: {
  /** Present only for admins. */
  employees?: { id: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== ALL) params.set(key, value);
      else params.delete(key);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if ((searchParams.get("q") ?? "") !== q) setParam("q", q || null);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, setParam, searchParams]);

  const hasFilters =
    Boolean(searchParams.get("q")) ||
    Boolean(searchParams.get("status")) ||
    Boolean(searchParams.get("callType")) ||
    Boolean(searchParams.get("employee")) ||
    Boolean(searchParams.get("from")) ||
    Boolean(searchParams.get("to"));

  return (
    <div className="mb-5 space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search client, business, phone, email, city…"
          className="pl-9"
          aria-label="Search bookings"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          items={[
            { label: "All statuses", value: ALL },
            ...BOOKING_STATUSES.map((s) => ({ label: s.label, value: s.value })),
          ]}
          value={searchParams.get("status") ?? ALL}
          onValueChange={(v) => setParam("status", v)}
        >
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {BOOKING_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          items={[
            { label: "All call types", value: ALL },
            ...CALL_TYPES.map((c) => ({ label: c.label, value: c.value })),
          ]}
          value={searchParams.get("callType") ?? ALL}
          onValueChange={(v) => setParam("callType", v)}
        >
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All call types</SelectItem>
            {CALL_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {employees && employees.length > 0 ? (
          <Select
            items={[
              { label: "All employees", value: ALL },
              ...employees.map((e) => ({ label: e.label, value: e.id })),
            ]}
            value={searchParams.get("employee") ?? ALL}
            onValueChange={(v) => setParam("employee", v)}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All employees</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            aria-label="From date"
            className="h-8 w-36 text-xs"
            value={searchParams.get("from") ?? ""}
            onChange={(e) => setParam("from", e.target.value || null)}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="To date"
            className="h-8 w-36 text-xs"
            value={searchParams.get("to") ?? ""}
            onChange={(e) => setParam("to", e.target.value || null)}
          />
        </div>

        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              router.replace(pathname, { scroll: false });
            }}
          >
            <X className="size-3.5" /> Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
