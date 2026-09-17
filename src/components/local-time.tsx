"use client";

import { useSyncExternalStore } from "react";

/**
 * Renders a timestamp in the viewer's own timezone. Server renders a UTC
 * fallback so there's no layout shift; the client swaps in local time.
 */
export function LocalTime({ date, mode = "datetime" }: { date: Date | string; mode?: "datetime" | "date" }) {
  const d = typeof date === "string" ? new Date(date) : date;
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const opts: Intl.DateTimeFormatOptions =
    mode === "date" ? { month: "short", day: "numeric", year: "numeric" } : { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" };
  const text = isClient ? d.toLocaleString(undefined, opts) : d.toLocaleString("en-US", { ...opts, timeZone: "UTC" });
  return (
    <time dateTime={d.toISOString()} title={d.toISOString()} suppressHydrationWarning>
      {text}
    </time>
  );
}
