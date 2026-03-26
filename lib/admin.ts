import { env } from "@/lib/env";

/**
 * Returns true if the given email is in the ADMIN_EMAILS env var.
 * Admin status is env-only — there is no DB admin table.
 */
export function isEmailAdmin(email: string): boolean {
  if (!env.ADMIN_EMAILS) return false;
  const admins = env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase());
  return admins.includes(email.toLowerCase());
}
