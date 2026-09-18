/**
 * Slot-engine + timezone smoke test. Pure, no DB or env:
 *   pnpm exec tsx --tsconfig scripts/tsconfig.test.json scripts/test-booking.ts
 */
import assert from "node:assert/strict";
import { generateSlots, groupSlotsByDay, isSlotOpen } from "../src/lib/booking";
import { utcToZonedParts, zonedWallTimeToUtc } from "../src/lib/timezone";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

const nySettings = { timezone: "America/New_York", weekly: { 4: [{ start: "09:00", end: "11:00" }] }, bufferMin: 0, minNoticeHours: 0, maxAdvanceDays: 14 };
const now = new Date("2026-09-15T00:00:00Z"); // Tuesday
const from = now;
const to = new Date(now.getTime() + 14 * 86_400_000);

check("open Thu 9–11 EDT yields two 60-min slots on the next Thursday", () => {
  const slots = generateSlots({ settings: nySettings, durationMinutes: 60, from, to, now });
  const first = slots.filter((s) => utcToZonedParts(s, "America/New_York").day === 17 && utcToZonedParts(s, "America/New_York").month === 9);
  assert.equal(first.length, 2, "two slots on Thu 9/17");
  // 9:00 EDT (UTC-4) = 13:00Z, 10:00 EDT = 14:00Z
  assert.equal(first[0].toISOString(), "2026-09-17T13:00:00.000Z");
  assert.equal(first[1].toISOString(), "2026-09-17T14:00:00.000Z");
});

check("30-min calls double the slots in the same window", () => {
  const slots = generateSlots({ settings: nySettings, durationMinutes: 30, from, to, now }).filter(
    (s) => utcToZonedParts(s, "America/New_York").day === 17,
  );
  assert.equal(slots.length, 4, "four 30-min slots in a 2h window");
});

check("a busy 9:00–9:30 block frees only the 10:00 slot", () => {
  const busyStart = zonedWallTimeToUtc("America/New_York", 2026, 9, 17, 9, 0);
  const busy = [{ start: busyStart, end: new Date(busyStart.getTime() + 30 * 60_000) }];
  const slots = generateSlots({ settings: nySettings, durationMinutes: 60, from, to, now, busy }).filter(
    (s) => utcToZonedParts(s, "America/New_York").day === 17,
  );
  assert.equal(slots.length, 1);
  assert.equal(utcToZonedParts(slots[0], "America/New_York").hour, 10);
});

check("buffer keeps time clear after a busy block", () => {
  // Busy 8:30–9:00, buffer 30 → 9:00 slot blocked (needs clear until 9:30), 10:00 open.
  const busyStart = zonedWallTimeToUtc("America/New_York", 2026, 9, 17, 8, 30);
  const busy = [{ start: busyStart, end: new Date(busyStart.getTime() + 30 * 60_000) }];
  const slots = generateSlots({ settings: { ...nySettings, bufferMin: 30 }, durationMinutes: 60, from, to, now, busy }).filter(
    (s) => utcToZonedParts(s, "America/New_York").day === 17,
  );
  assert.deepEqual(
    slots.map((s) => utcToZonedParts(s, "America/New_York").hour),
    [10],
  );
});

check("min notice skips the too-soon Thursday", () => {
  // 72h notice from Tue 00:00Z → Thu 9/17 13:00Z is < 72h away, so it's skipped; next Thu 9/24 remains.
  const slots = generateSlots({ settings: { ...nySettings, minNoticeHours: 72 }, durationMinutes: 60, from, to, now });
  assert.ok(slots.length > 0);
  assert.equal(utcToZonedParts(slots[0], "America/New_York").day, 24, "first bookable is the following Thursday");
});

check("max advance caps the horizon", () => {
  // The next Thursday (9/17 13:00Z) is ~2.5 days out, so a 2-day cap excludes it.
  const slots = generateSlots({ settings: { ...nySettings, maxAdvanceDays: 2 }, durationMinutes: 60, from, to, now });
  assert.equal(slots.length, 0, "next Thursday is beyond a 2-day horizon");
});

check("groupSlotsByDay buckets by the display date", () => {
  const slots = generateSlots({ settings: nySettings, durationMinutes: 60, from, to, now });
  const groups = groupSlotsByDay(slots, "America/New_York");
  assert.ok(groups.every((g) => /^\d{4}-\d{2}-\d{2}$/.test(g.date)));
  assert.deepEqual(groups.map((g) => g.date).slice(0, 1), ["2026-09-17"]);
});

check("isSlotOpen re-checks a single start against busy", () => {
  const start = new Date("2026-09-17T13:00:00.000Z");
  assert.equal(isSlotOpen(start, { settings: nySettings, durationMinutes: 60, now }), true);
  const busy = [{ start, end: new Date(start.getTime() + 60 * 60_000) }];
  assert.equal(isSlotOpen(start, { settings: nySettings, durationMinutes: 60, now, busy }), false);
});

console.log(`\n${passed} checks passed.`);
