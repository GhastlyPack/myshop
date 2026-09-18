"use client";

import { useMemo, useState, useTransition } from "react";
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

export function BookingPicker({ username, slug, slotsIso, priceCents, currency, durationMinutes, marketingOptIn, buttonText }: Props) {
  const tz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  // Group slots by the buyer's local date.
  const days = useMemo(() => {
    const map = new Map<string, { label: string; slots: { iso: string; time: string }[] }>();
    const dateFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" });
    const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
    for (const iso of slotsIso) {
      const d = new Date(iso);
      const p = utcToZonedParts(d, tz);
      const key = `${p.year}-${p.month}-${p.day}`;
      if (!map.has(key)) map.set(key, { label: dateFmt.format(d), slots: [] });
      map.get(key)!.slots.push({ iso, time: timeFmt.format(d) });
    }
    return [...map.values()];
  }, [slotsIso, tz]);

  const [dayIdx, setDayIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [optIn, setOptIn] = useState(true);
  const [pending, start] = useTransition();

  if (days.length === 0) {
    return <p className="sf-muted text-center text-[0.95rem]">No open times right now. Check back soon.</p>;
  }

  const day = days[Math.min(dayIdx, days.length - 1)];
  const tzLabel = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? tz;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    start(async () => {
      const res = await bookCall({ username, slug, name, email, slot: selected, timezone: tz, marketingOptIn: optIn, pageUrl: typeof window !== "undefined" ? window.location.href : undefined });
      // On success the action redirects; only an error comes back.
      if (res && !res.ok) toast.error(res.error);
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="sf-heading text-[1.2rem]">Pick a time</h2>
        <p className="sf-muted mt-1 text-sm">
          {durationMinutes < 60 ? `${durationMinutes} min` : durationMinutes === 60 ? "1 hour" : `${durationMinutes / 60} hr`} · {priceCents === 0 ? "Free" : money(priceCents, currency)} · times in {tzLabel}
        </p>
      </div>

      {/* Day selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((d, i) => (
          <button
            key={d.label}
            type="button"
            onClick={() => {
              setDayIdx(i);
              setSelected(null);
            }}
            className={`sf-chip shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm ${i === dayIdx ? "border-transparent bg-[var(--sf-ink,#111)] text-white" : "bg-transparent"}`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Times */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {day.slots.map((s) => (
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

      {/* Details + book */}
      {selected && (
        <form onSubmit={submit} className="space-y-3 border-t pt-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            className="w-full rounded-lg border bg-transparent px-3 py-2.5 text-[0.95rem] outline-none focus:border-foreground/50"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@email.com"
            required
            className="w-full rounded-lg border bg-transparent px-3 py-2.5 text-[0.95rem] outline-none focus:border-foreground/50"
          />
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
