"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { bookCall } from "@/app/[username]/[slug]/booking-actions";
import { utcToZonedParts } from "@/lib/timezone";

type Props = {
  username: string;
  slug: string;
  slotsIso: string[];
  priceCents: number;
  currency: string;
  durationMinutes: number;
  marketingOptIn: boolean;
  buttonText: string;
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const dayKey = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/**
 * Standard month-grid calendar (the Calendly/Cal.com pattern): pick a day with open
 * times, then a time. Everything is shown in the buyer's own timezone.
 */
export function BookingPicker({ username, slug, slotsIso, priceCents, currency, durationMinutes, marketingOptIn, buttonText }: Props) {
  const tz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  // Slots bucketed by the buyer's local calendar day.
  const byDay = useMemo(() => {
    const map = new Map<string, { iso: string; time: string }[]>();
    const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
    for (const iso of slotsIso) {
      const d = new Date(iso);
      const p = utcToZonedParts(d, tz);
      const key = dayKey(p.year, p.month, p.day);
      (map.get(key) ?? map.set(key, []).get(key)!).push({ iso, time: timeFmt.format(d) });
    }
    return map;
  }, [slotsIso, tz]);

  const availableKeys = useMemo(() => [...byDay.keys()].sort(), [byDay]);
  const today = utcToZonedParts(new Date(), tz);
  const todayKey = dayKey(today.year, today.month, today.day);

  // Month bounds: from the first available day's month to the last's.
  const first = availableKeys[0];
  const last = availableKeys[availableKeys.length - 1];
  const parseKey = (k: string) => k.split("-").map(Number) as [number, number, number];
  const [fy, fm] = first ? parseKey(first) : [today.year, today.month, 1];
  const [ly, lm] = last ? parseKey(last) : [today.year, today.month, 1];

  const [view, setView] = useState<{ y: number; m: number }>({ y: fy, m: fm });
  const [selectedDay, setSelectedDay] = useState<string | null>(first ?? null);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [pending, start] = useTransition();

  if (availableKeys.length === 0) {
    return <p className="sf-muted text-center text-[0.95rem]">No open times right now. Check back soon.</p>;
  }

  const canPrev = view.y > fy || (view.y === fy && view.m > fm);
  const canNext = view.y < ly || (view.y === ly && view.m < lm);
  const shiftMonth = (delta: number) => {
    let m = view.m + delta;
    let y = view.y;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setView({ y, m });
  };

  // Grid for the viewed month. Weekday of a civil date is timezone-independent, so UTC math is exact here.
  const daysInMonth = new Date(Date.UTC(view.y, view.m, 0)).getUTCDate();
  const leadingBlanks = new Date(Date.UTC(view.y, view.m - 1, 1)).getUTCDay();
  const cells: (number | null)[] = [...Array<null>(leadingBlanks).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const daySlots = selectedDay ? (byDay.get(selectedDay) ?? []) : [];
  const tzLabel = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? tz;
  const selectedLabel = selectedDay
    ? (() => {
        const [y, m, d] = parseKey(selectedDay);
        return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
      })()
    : "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    start(async () => {
      const res = await bookCall({ username, slug, name, email, slot: selected, timezone: tz, marketingOptIn: optIn, pageUrl: typeof window !== "undefined" ? window.location.href : undefined });
      if (res && !res.ok) toast.error(res.error);
    });
  }

  const inputCls = "w-full rounded-lg border bg-transparent px-3 py-2.5 text-[0.95rem] outline-none focus:border-foreground/50";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="sf-heading text-[1.2rem]">Pick a time</h2>
        <p className="sf-muted mt-1 text-sm">
          {durationMinutes < 60 ? `${durationMinutes} min` : durationMinutes === 60 ? "1 hour" : `${durationMinutes / 60} hr`} · {priceCents === 0 ? "Free" : money(priceCents, currency)} · times in {tzLabel}
        </p>
      </div>

      {/* Month calendar */}
      <div className="rounded-xl border p-3">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" onClick={() => shiftMonth(-1)} disabled={!canPrev} aria-label="Previous month" className="rounded-md p-1.5 disabled:opacity-30">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold">
            {MONTHS[view.m - 1]} {view.y}
          </span>
          <button type="button" onClick={() => shiftMonth(1)} disabled={!canNext} aria-label="Next month" className="rounded-md p-1.5 disabled:opacity-30">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w) => (
            <div key={w} className="sf-muted py-1 text-[11px] font-medium uppercase">
              {w}
            </div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={`b${i}`} />;
            const key = dayKey(view.y, view.m, d);
            const open = byDay.has(key);
            const isSelected = key === selectedDay;
            const isToday = key === todayKey;
            return (
              <button
                key={key}
                type="button"
                disabled={!open}
                onClick={() => {
                  setSelectedDay(key);
                  setSelected(null);
                }}
                className={`relative aspect-square rounded-full text-sm transition-colors ${
                  isSelected ? "bg-[var(--sf-ink,#111)] font-semibold text-white" : open ? "font-semibold hover:bg-[color-mix(in_srgb,var(--sf-text)_10%,transparent)]" : "opacity-30"
                } ${isToday && !isSelected ? "ring-1 ring-current" : ""}`}
              >
                {d}
                {open && !isSelected && <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-current" aria-hidden />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Times for the chosen day */}
      {selectedDay && (
        <div>
          <p className="sf-muted mb-2 text-sm">{selectedLabel}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {daySlots.map((s) => (
              <button
                key={s.iso}
                type="button"
                onClick={() => setSelected(s.iso)}
                className={`rounded-lg border px-2 py-2 text-sm transition-colors ${selected === s.iso ? "border-transparent bg-[var(--sf-ink,#111)] text-white" : "hover:border-foreground/40"}`}
              >
                {s.time}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Details + book */}
      {selected && (
        <form onSubmit={submit} className="space-y-3 border-t pt-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required className={inputCls} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@email.com" required className={inputCls} />
          {marketingOptIn && (
            <label className="flex items-center gap-2 text-sm sf-muted">
              <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
              Keep me posted with occasional emails
            </label>
          )}
          <button type="submit" disabled={pending} className="sf-btn w-full text-base">
            {pending ? "Booking…" : priceCents === 0 ? buttonText || "Book this time" : `${buttonText || "Book"} · ${money(priceCents, currency)}`}
          </button>
        </form>
      )}
    </div>
  );
}
