"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, KeyRound, LogOut, Settings, Users } from "lucide-react";
import { signOut } from "@/actions/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChangePasswordDialog } from "./change-password-dialog";

export function UserMenu({
  name,
  email,
  isAdmin,
}: {
  name: string;
  email: string;
  isAdmin: boolean;
}) {
  const [passwordOpen, setPasswordOpen] = useState(false);

  const initials =
    name
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || email.slice(0, 2).toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="size-9 border border-border">
            <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {name || "Team member"}
                  {isAdmin ? (
                    <Badge variant="secondary" className="text-[10px]">
                      Admin
                    </Badge>
                  ) : null}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {email}
                </span>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
            <KeyRound className="size-4" /> Change password
          </DropdownMenuItem>
          {isAdmin ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/analytics" />}>
                <BarChart3 className="size-4" /> Analytics
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/employees" />}>
                <Users className="size-4" /> Employees
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/settings" />}>
                <Settings className="size-4" /> Settings
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              void signOut();
            }}
          >
            <LogOut className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  );
}
