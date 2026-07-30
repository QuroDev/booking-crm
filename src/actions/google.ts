"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { clearGoogleCredentials } from "@/lib/google/tokens";

export async function disconnectGoogle(): Promise<{ ok: boolean }> {
  await requireAdmin();
  await clearGoogleCredentials();
  revalidatePath("/settings");
  return { ok: true };
}
