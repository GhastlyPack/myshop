"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { CustomField } from "@/db/schema";
import { submitBookingQuestionnaire } from "@/app/[username]/[slug]/booking-actions";

type Answers = Record<string, string | string[] | boolean>;

/**
 * Post-booking intake: "thanks for booking, fill this out before the call." Renders the
 * creator's questions (the product's custom fields) on the booking page; answers save to the
 * order and are emailed to the creator. Can be revisited from the confirmation email.
 */
export function BookingQuestionnaire({ orderId, fields, initial, storeName }: { orderId: string; fields: CustomField[]; initial: Answers; storeName: string }) {
  const [answers, setAnswers] = useState<Answers>(() => {
    const a: Answers = {};
    for (const f of fields) a[f.id] = initial[f.id] ?? (f.type === "checkbox" ? false : f.type === "multiselect" ? [] : "");
    return a;
  });
  const alreadyDone = fields.some((f) => initial[f.id] !== undefined && initial[f.id] !== "" && initial[f.id] !== false);
  const [done, setDone] = useState(alreadyDone);
  const [pending, start] = useTransition();

  const set = (id: string, v: string | string[] | boolean) => setAnswers((a) => ({ ...a, [id]: v }));
  const inputCls = "w-full rounded-lg border bg-transparent px-3 py-2.5 text-[0.95rem] outline-none focus:border-foreground/50";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await submitBookingQuestionnaire({ orderId, answers });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDone(true);
      toast.success(`Sent to ${storeName}. See you on the call.`);
    });
  }

  return (
    <section className="sf-surface p-6 sm:p-7">
      <h2 className="sf-heading text-[1.1rem]">{done ? "Thanks, that's on its way" : "Before the call, a few quick questions"}</h2>
      <p className="sf-muted mt-1 text-sm">{done ? `${storeName} has your answers. You can update them any time from this page.` : `Helps ${storeName} make the most of your time.`}</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        {fields.map((f) => {
          const v = answers[f.id];
          const label = (
            <span className="text-sm font-medium">
              {f.label}
              {f.required && <span className="sf-muted"> *</span>}
            </span>
          );
          if (f.type === "checkbox") {
            return (
              <label key={f.id} className="flex items-center gap-2">
                <input type="checkbox" checked={Boolean(v)} onChange={(e) => set(f.id, e.target.checked)} />
                {label}
              </label>
            );
          }
          if (f.type === "select") {
            return (
              <label key={f.id} className="block space-y-1.5">
                {label}
                <select value={String(v ?? "")} onChange={(e) => set(f.id, e.target.value)} required={f.required} className={inputCls}>
                  <option value="">Choose…</option>
                  {(f.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
            );
          }
          if (f.type === "multiselect") {
            const arr = Array.isArray(v) ? v : [];
            return (
              <div key={f.id} className="space-y-1.5">
                {label}
                <div className="flex flex-wrap gap-2">
                  {(f.options ?? []).map((o) => {
                    const on = arr.includes(o);
                    return (
                      <button
                        key={o}
                        type="button"
                        onClick={() => set(f.id, on ? arr.filter((x) => x !== o) : [...arr, o])}
                        className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-transparent bg-[var(--sf-ink,#111)] text-white" : ""}`}
                      >
                        {o}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }
          // text / phone → a textarea for text (room to answer), input for phone
          return (
            <label key={f.id} className="block space-y-1.5">
              {label}
              {f.type === "phone" ? (
                <input type="tel" value={String(v ?? "")} onChange={(e) => set(f.id, e.target.value)} required={f.required} className={inputCls} />
              ) : (
                <textarea value={String(v ?? "")} onChange={(e) => set(f.id, e.target.value)} required={f.required} rows={3} className={inputCls} />
              )}
            </label>
          );
        })}
        <button type="submit" disabled={pending} className="sf-btn w-full text-base">
          {pending ? "Sending…" : done ? "Update answers" : "Send answers"}
        </button>
      </form>
    </section>
  );
}
