"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ActionResult {
  ok: boolean;
  error?: string;
  warning?: string;
}

const createEmployeeSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required").max(120),
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "employee"]),
});

export async function createEmployee(input: {
  fullName: string;
  email: string;
  password: string;
  role: "admin" | "employee";
}): Promise<ActionResult> {
  await requireAdmin();

  const parsed = createEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      ok: false,
      error:
        "SUPABASE_SERVICE_ROLE_KEY is not configured — employee accounts must be created from the Supabase dashboard until it is set.",
    };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });
  if (error) return { ok: false, error: error.message };

  // The trigger defaults new users to 'employee'; promote if admin was chosen.
  if (parsed.data.role === "admin" && data.user) {
    const { error: roleError } = await admin
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", data.user.id);
    if (roleError) {
      return {
        ok: true,
        warning: `User created but promoting to admin failed: ${roleError.message}`,
      };
    }
  }

  revalidatePath("/employees");
  return { ok: true };
}

export async function setEmployeeActive(
  profileId: string,
  isActive: boolean
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (me.id === profileId && !isActive) {
    return { ok: false, error: "You can't deactivate your own account." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };
  }

  const { error } = await admin
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", profileId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/employees");
  return { ok: true };
}
