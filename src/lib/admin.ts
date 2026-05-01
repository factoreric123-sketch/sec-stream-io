import type { User } from "@supabase/supabase-js";

/**
 * Hardcoded admin allowlist. Add your email(s) here to access /admin.
 * Edit this list and redeploy to add or remove admins.
 */
export const ADMIN_EMAILS: readonly string[] = [
  // "you@example.com",
];

export function isAdmin(user: { email?: string | null } | null | undefined): boolean {
  const email = user?.email?.toLowerCase();
  if (!email) return false;
  return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email);
}

export function isAdminUser(user: User | null | undefined): boolean {
  return isAdmin(user ?? null);
}
