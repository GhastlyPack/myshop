"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateAvailability } from "@/app/app/settings/actions";
import type { BookingSettings } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

// Display order: Monday first.
const DAYS: { day: number; label: string }[] = [
  { day: 1, label: "Monday" },
  { day: 2, label: "Tuesday" },
  { day: 3, label: "Wednesday" },
  { day: 4, label: "Thursday" },
  { day: 5, label: "Friday" },
  { day: 6, label: "Saturday" },
  { day: 0, label: "Sunday" },
];

type DayState = { enabled: boolean; start: string; end: string };

function initialDays(b: BookingSettings): Record<number, DayState> {
  const out: Record<number, DayState> = {};
  const hasAny = b.weekly && Object.keys(b.weekly).length > 0;
  for (const { day } of DAYS) {
    const win = b.weekly?.[day as keyof NonNullable<BookingSettings["weekly"]>]?.[0];
    if (win) out[day] = { enabled: true, start: win.start, end: win.end };
    // Sensible default for a brand-new schedule: Mon–Fri 9–5.
    else if (!hasAny && day >= 1 && day <= 5) out[day] = { enabled: true, start: "09:00", end: "17:00" };
    else out[day] = { enabled: false, start: "09:00", end: "17:00" };
  }
  return out;
}

function browserTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
  } catch {
    return "America/New_York";
  }
}

export function AvailabilityForm({ initial }: { initial: BookingSettings }) {
  const router = useRouter();
  const [tz, setTz] = useState(initial.timezone || browserTz());
  const [days, setDays] = useState<Record<number, DayState>>(() => initialDays(initial));
  const [bufferMin, setBufferMin] = useState(initial.bufferMin ?? 0);
  const [minNoticeHours, setMinNoticeHours] = useState(initial.minNoticeHours ?? 12);
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(initial.maxAdvanceDays ?? 30);
  const [pending, start] = useTransition();

  const tzOptions = TIMEZONES.includes(tz) ? TIMEZONES : [tz, ...TIMEZONES];

  function setDay(day: number, patch: Partial<DayState>) {
    setDays((d) => ({ ...d, [day]: { ...d[day], ...patch } }));
  }

  function save() {
    const weekly = DAYS.filter(({ day }) => days[day].enabled).map(({ day }) => ({ day, start: days[day].start, end: days[day].end }));
    start(async () => {
      const res = await updateAvailability({ timezone: tz, weekly, bufferMin, minNoticeHours, maxAdvanceDays });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Availability saved.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5 rounded-xl border bg-background p-4 sm:p-5">
      <div className="space-y-1.5">
        <Label>Time zone</Label>
        <Select value={tz} onValueChange={setTz}>
          <SelectTrigger className="w-full sm:max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tzOptions.map((z) => (
              <SelectItem key={z} value={z}>
                {z.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Your open hours are in this zone; buyers see times in theirs.</p>
      </div>

      <div className="space-y-2">
        <Label>Open hours</Label>
        <div className="divide-y rounded-lg border">
          {DAYS.map(({ day, label }) => {
            const d = days[day];
            return (
              <div key={day} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <div className="flex w-32 items-center gap-2">
                  <Switch checked={d.enabled} onCheckedChange={(v) => setDay(day, { enabled: v })} />
                  <span className={`text-sm ${d.enabled ? "" : "text-muted-foreground"}`}>{label}</span>
                </div>
                {d.enabled ? (
                  <div className="flex items-center gap-2">
                    <Input type="time" value={d.start} onChange={(e) => setDay(day, { start: e.target.value })} className="w-32" />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input type="time" value={d.end} onChange={(e) => setDay(day, { end: e.target.value })} className="w-32" />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Unavailable</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="buffer">Buffer (min)</Label>
          <Input id="buffer" type="number" min={0} max={240} value={bufferMin} onChange={(e) => setBufferMin(Number(e.target.value))} />
          <p className="text-xs text-muted-foreground">Kept clear after each call.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notice">Min notice (hrs)</Label>
          <Input id="notice" type="number" min={0} max={720} value={minNoticeHours} onChange={(e) => setMinNoticeHours(Number(e.target.value))} />
          <p className="text-xs text-muted-foreground">Soonest someone can book.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="advance">Book up to (days)</Label>
          <Input id="advance" type="number" min={1} max={365} value={maxAdvanceDays} onChange={(e) => setMaxAdvanceDays(Number(e.target.value))} />
          <p className="text-xs text-muted-foreground">How far ahead.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save availability"}
        </Button>
      </div>
    </div>
  );
}
