import "server-only";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { bookings, type Product, type Store } from "@/db/schema";
import { DEFAULT_BOOKING_SETTINGS, generateSlots, type BusyInterval } from "@/lib/booking";
import { getBusy } from "@/lib/calendar";

/**
 * Bookable start times for a booking product: the creator's open hours, minus their
 * connected calendar's busy times, minus slots already taken. Live (uncached) — reflects
 * the calendar right now. Returns [] if the product isn't a booking or has no duration.
 */
export async function getBookingSlots(store: Store, product: Pick<Product, "durationMinutes" | "type">): Promise<Date[]> {
  if (product.type !== "booking" || !product.durationMinutes) return [];
  const now = new Date();
  const settings = store.booking ?? {};
  const horizonDays = settings.maxAdvanceDays ?? DEFAULT_BOOKING_SETTINGS.maxAdvanceDays;
  const from = now;
  const to = new Date(now.getTime() + horizonDays * 86_400_000);

  const [calendarBusy, taken] = await Promise.all([
    getBusy(store.id, from, to).catch(() => [] as BusyInterval[]),
    db
      .select({ startAt: bookings.startAt, endAt: bookings.endAt })
      .from(bookings)
      .where(and(eq(bookings.storeId, store.id), eq(bookings.status, "confirmed"), gte(bookings.startAt, from), lte(bookings.startAt, to))),
  ]);
  const busy: BusyInterval[] = [...calendarBusy, ...taken.map((b) => ({ start: b.startAt, end: b.endAt }))];

  return generateSlots({ settings, durationMinutes: product.durationMinutes, from, to, busy, now });
}

/** True when the creator has open hours set (so the storefront can show a real picker). */
export function hasOpenHours(store: Store): boolean {
  const weekly = store.booking?.weekly ?? {};
  return Object.values(weekly).some((wins) => (wins?.length ?? 0) > 0);
}
