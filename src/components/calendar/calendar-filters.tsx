"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BOOKING_STATUSES, CALL_TYPES } from "@/lib/constants";

const ALL = "__all__";

export function CalendarFilters({
  employees,
}: {
  employees?: { id: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== ALL) params.set(key, value);
      else params.delete(key);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return (
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
    </div>
  );
}
