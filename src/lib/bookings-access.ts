import "server-only";
import { planTier } from "@/lib/billing";
import { env, googleCalendarConfigured } from "@/lib/env";

/**
 * Bookings is a Pro feature and, until the Google app is verified, beta-gated: only the
 * allowlisted stores (BOOKINGS_BETA_USERNAMES) or everyone when BOOKINGS_PUBLIC is set.
 * Mirrors the Instagram beta gate while the OAuth app clears verification.
 */

function betaUsernames(): Set<string> {
  return new Set(
    (env.BOOKINGS_BETA_USERNAMES ?? "")
      .split(",")
      .map((u) => u.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Is bookings enabled on this deployment at all (env + Google configured)? */
export function bookingsConfigured(): boolean {
  return googleCalendarConfigured;
}

export function inBookingsBeta(username: string): boolean {
  return Boolean(env.BOOKINGS_PUBLIC) || betaUsernames().has(username.toLowerCase());
}

/** Full gate for a store: feature on, Pro, and past the beta wall. */
export async function canUseBookings(store: { userId: string; username: string }): Promise<boolean> {
  if (!bookingsConfigured()) return false;
  if (!inBookingsBeta(store.username)) return false;
  return (await planTier(store)) === "pro";
}
