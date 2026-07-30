import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import type { Profile } from "@/types/database";
import { EmployeeList } from "./employee-list";
import { NewEmployeeDialog } from "./new-employee-dialog";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage() {
  const me = await requireAdmin();
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <>
      <PageHeader
        title="Employees"
        description="Manage who can sign in and book strategy calls."
        actions={<NewEmployeeDialog />}
      />
      <EmployeeList
        profiles={(profiles as Profile[]) ?? []}
        currentUserId={me.id}
      />
    </>
  );
}
