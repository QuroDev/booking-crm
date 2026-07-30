"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setEmployeeActive } from "@/actions/employees";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { Profile } from "@/types/database";

function initialsOf(p: Profile) {
  const source = p.full_name || p.email;
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function EmployeeList({
  profiles,
  currentUserId,
}: {
  profiles: Profile[];
  currentUserId: string;
}) {
  const [, startTransition] = useTransition();

  function toggle(profile: Profile, next: boolean) {
    startTransition(async () => {
      const result = await setEmployeeActive(profile.id, next);
      if (!result.ok) toast.error(result.error ?? "Something went wrong");
      else
        toast.success(
          `${profile.full_name || profile.email} ${next ? "activated" : "deactivated"}.`
        );
    });
  }

  if (profiles.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No team members yet. Add your first employee to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {profiles.map((profile) => (
        <Card key={profile.id}>
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="size-10 border border-border">
                <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                  {initialsOf(profile)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate text-sm font-medium">
                  {profile.full_name || "—"}
                  {profile.role === "admin" ? (
                    <Badge variant="secondary" className="text-[10px]">
                      Admin
                    </Badge>
                  ) : null}
                  {!profile.is_active ? (
                    <Badge variant="outline" className="text-[10px]">
                      Deactivated
                    </Badge>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {profile.email}
                </p>
              </div>
            </div>
            <Switch
              checked={profile.is_active}
              onCheckedChange={(checked) => toggle(profile, checked)}
              disabled={profile.id === currentUserId}
              aria-label={`Toggle ${profile.email} active`}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
