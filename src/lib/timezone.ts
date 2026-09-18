/**
 * Dependency-free timezone math via Intl. Enough for booking-slot generation:
 * turn a wall-clock time in an IANA zone into a UTC instant and back. Around the
 * one ambiguous hour of a DST transition it picks a consistent side, which is fine
 * for open-hours slotting.
 */

export type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number; second: number; weekday: number };

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** How a UTC instant reads on the wall clock of `timeZone` (24h fields + weekday 0=Sun). */
export function utcToZonedParts(date: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) parts[p.type] = p.value;
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0; // some engines render midnight as "24"
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAY_INDEX[parts.weekday] ?? 0,
  };
}

/** The zone's offset from UTC (ms it is ahead of UTC) at a given instant. */
export function zoneOffsetMs(date: Date, timeZone: string): number {
  const z = utcToZonedParts(date, timeZone);
  const asUtc = Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second);
  return asUtc - date.getTime();
}

/** The UTC instant for a wall-clock time in `timeZone`. Minutes past midnight is accepted for convenience. */
export function zonedWallTimeToUtc(timeZone: string, year: number, month1to12: number, day: number, hour: number, minute: number): Date {
  const naiveUtc = Date.UTC(year, month1to12 - 1, day, hour, minute);
  // Offset computed at the guess, then corrected — good enough outside the DST-gap hour.
  const offset = zoneOffsetMs(new Date(naiveUtc), timeZone);
  return new Date(naiveUtc - offset);
}

/** "HH:MM" → minutes past midnight, or null if malformed. */
export function parseHhMm(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 24 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** A short label like "Sep 18" for a UTC instant, rendered in a zone. */
export function zonedDateLabel(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(date);
}
