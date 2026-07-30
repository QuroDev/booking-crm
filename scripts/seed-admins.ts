/**
 * One-time seed: creates the two admin users in Supabase Auth.
 * The handle_new_user trigger (migration 0001) assigns them the admin role
 * automatically based on their email.
 *
 * Usage (PowerShell, from the project root):
 *   $env:NEXT_PUBLIC_SUPABASE_URL = "https://<ref>.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "<service-role-key>"
 *   $env:ADMIN_SEED_PASSWORD = "<initial password for both admins>"
 *   npx tsx scripts/seed-admins.ts
 */
import { createClient } from "@supabase/supabase-js";

const ADMINS = [
  { email: "qaisnaveed2008@gmail.com", full_name: "Qais" },
  { email: "jaydxn413@gmail.com", full_name: "Jaydxn" },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const password = process.env.ADMIN_SEED_PASSWORD;

  if (!url || !serviceKey || !password) {
    console.error(
      "Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_SEED_PASSWORD"
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const admin of ADMINS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: admin.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: admin.full_name },
    });
    if (error) {
      console.error(`✗ ${admin.email}: ${error.message}`);
    } else {
      console.log(`✓ ${admin.email} created (${data.user?.id})`);
    }
  }
}

main();
