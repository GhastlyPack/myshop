import type { BookingSettings, WeeklyHours } from "@/db/schema";
import { parseHhMm, utcToZonedParts, zonedWallTimeToUtc } from "@/lib/timezone";

/**
 * Pure booking-slot engine. Open hours (per weekday, in the creator's timezone) minus the
 * connected calendar's busy times and existing bookings, filtered by notice and horizon,
 * yields the bookable start times. No timezone library and no I/O, so it's easy to test.
 */

export type BusyInterval = { start: Date; end: Date };

export const DEFAULT_BOOKING_SETTINGS: Required<Omit<BookingSettings, "weekly">> & { weekly: WeeklyHours } = {
  timezone: "America/New_York",
  weekly: {},
  bufferMin: 0,
  minNoticeHours: 12,
  maxAdvanceDays: 30,
};

export type SlotOptions = {
  settings: BookingSettings;
  durationMinutes: number;
  /** Window to generate within; usually [now, now + maxAdvanceDays]. */
  from: Date;
  to: Date;
  /** Calendar busy times + existing confirmed bookings (UTC instants). */
  busy?: BusyInterval[];
  /** Clock, injectable for tests. */
  now?: Date;
};

const MIN = 60_000;
const DAY = 86_400_000;

function overlaps(startMs: number, endMs: number, busy: BusyInterval[], bufferMs: number): boolean {
  for (const b of busy) {
    // Keep `buffer` clear after each busy block.
    if (startMs < b.end.getTime() + bufferMs && endMs > b.start.getTime()) return true;
  }
  return false;
}

/**
 * Bookable start instants (UTC), sorted ascending. Candidate starts are aligned to each open
 * window and stepped by the call duration, so slots are back-to-back within a window.
 */
export function generateSlots(opts: SlotOptions): Date[] {
  const s = opts.settings;
  const tz = s.timezone || DEFAULT_BOOKING_SETTINGS.timezone;
  const weekly = s.weekly ?? {};
  const durationMs = Math.max(1, opts.durationMinutes) * MIN;
  const bufferMs = Math.max(0, s.bufferMin ?? DEFAULT_BOOKING_SETTINGS.bufferMin) * MIN;
  const now = opts.now ?? new Date();
  const minNoticeMs = Math.max(0, s.minNoticeHours ?? DEFAULT_BOOKING_SETTINGS.minNoticeHours) * 60 * MIN;
  const horizonMs = Math.max(1, s.maxAdvanceDays ?? DEFAULT_BOOKING_SETTINGS.maxAdvanceDays) * DAY;

  const earliest = now.getTime() + minNoticeMs;
  const latest = Math.min(opts.to.getTime(), now.getTime() + horizonMs);
  const busy = opts.busy ?? [];

  const out: Date[] = [];
  // Walk calendar dates in the creator's timezone across the window (pad a day each side for tz edges).
  for (let cursor = opts.from.getTime() - DAY; cursor <= latest + DAY; cursor += DAY) {
    const parts = utcToZonedParts(new Date(cursor), tz);
    const windows = weekly[parts.weekday as keyof WeeklyHours] ?? [];
    for (const w of windows) {
      const startMin = parseHhMm(w.start);
      const endMin = parseHhMm(w.end);
      if (startMin === null || endMin === null || endMin <= startMin) continue;
      const windowStart = zonedWallTimeToUtc(tz, parts.year, parts.month, parts.day, Math.floor(startMin / 60), startMin % 60).getTime();
      const windowEnd = zonedWallTimeToUtc(tz, parts.year, parts.month, parts.day, Math.floor(endMin / 60), endMin % 60).getTime();
      for (let start = windowStart; start + durationMs <= windowEnd; start += durationMs) {
        const end = start + durationMs;
        if (start < earliest || start > latest) continue;
        if (start < opts.from.getTime()) continue;
        if (overlaps(start, end, busy, bufferMs)) continue;
        out.push(new Date(start));
      }
    }
  }
  // Dedupe (tz padding can revisit a date) and sort.
  const seen = new Set<number>();
  return out
    .filter((d) => (seen.has(d.getTime()) ? false : (seen.add(d.getTime()), true)))
    .sort((a, b) => a.getTime() - b.getTime());
}

/** Group slots by their calendar date in a display timezone, for a date-then-time picker. */
export function groupSlotsByDay(slots: Date[], displayTz: string): { date: string; slots: Date[] }[] {
  const byDay = new Map<string, Date[]>();
  for (const slot of slots) {
    const p = utcToZonedParts(slot, displayTz);
    const key = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
    (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(slot);
  }
  return [...byDay.entries()].map(([date, slots]) => ({ date, slots })).sort((a, b) => a.date.localeCompare(b.date));
}

/** True when a specific start is still bookable given current busy list — a re-check at pay time. */
export function isSlotOpen(start: Date, opts: Omit<SlotOptions, "from" | "to">): boolean {
  const dayStart = new Date(start.getTime() - MIN);
  const dayEnd = new Date(start.getTime() + opts.durationMinutes * MIN + MIN);
  return generateSlots({ ...opts, from: dayStart, to: dayEnd }).some((d) => d.getTime() === start.getTime());
}
