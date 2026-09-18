"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { SOCIAL_ICONS } from "@/components/storefront/socials";
import { resolveTheme, themeToCssVars } from "@/lib/theme";
import { LANDING_STORE_THEME } from "./store-theme";
import { useLoop } from "./use-loop";

/**
 * Three phones that play one purchase, start to finish, on a shared clock: the store, the booking
 * page with its calendar, then checkout with an order bump and the paid state. Built from the
 * storefront's own .sf-* classes and the landing store theme, so it is the product, not a picture of it.
 *
 * Beats (1.4s each, 11 per loop, the last one a hold on the paid state):
 *  0-1 store cards rise in     2 the call card is tapped
 *  3 booking page opens        4 a day is picked          5 a time is picked      6 Book is tapped
 *  7 checkout opens, filled    8 the bump is added         9 paid
 */
const STEPS = 11;

export function Walkthrough() {
  const { ref, step, still } = useLoop<HTMLDivElement>(STEPS, 1400);
  const vars = themeToCssVars(resolveTheme(LANDING_STORE_THEME)) as CSSProperties;
  const Instagram = SOCIAL_ICONS.instagram;
  const at = (n: number) => step >= n;
  const on = (cond: boolean) => (cond ? "ld-beat ld-beat-on" : "ld-beat");
  const bumpOn = at(8);
  const paid = at(9);

  return (
    <div ref={ref} className="grid gap-12 md:grid-cols-3 md:gap-6">
      {/* ---------- 1. the store ---------- */}
      <figure>
        <div className="ld-phone ld-phone-sm">
          <div className="ld-screen" style={vars}>
            <div className="ld-island" aria-hidden />
            <div className="px-3.5 pt-12 pb-4">
              <div className={`flex flex-col items-center gap-2 text-center ${on(still || at(0))}`}>
                <div className="sf-avatar overflow-hidden" data-shape="circle" data-size="sm" aria-hidden>
                  <Image src="/landing/creator.jpg" alt="" width={64} height={64} className="h-full w-full object-cover" />
                </div>
                <div>
                  <div className="sf-heading text-[1rem]">Maya Ortega</div>
                  <p className="sf-muted mt-0.5 text-[0.7rem] leading-snug">Content coach. Templates and calls.</p>
                </div>
                <span className="sf-social !h-6 !w-6">
                  <Instagram className="h-3 w-3" />
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-2.5">
                <div className={`sf-card ${on(still || at(1))}`}>
                  <span className="flex gap-2.5 p-2.5">
                    <span className="sf-thumb sf-thumb-sm !h-12 !w-12">
                      <Image src="/landing/reels-pack.jpg" alt="" width={200} height={200} className="h-full w-full object-cover" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="sf-heading text-[0.82rem] leading-tight">Reels Template Pack</span>
                      <span className="sf-muted text-[0.68rem]">Basic, Plus, or Pro.</span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="text-[0.78rem] font-semibold">From $19</span>
                        <span className="sf-btn sf-btn-sm !px-2.5 !py-1.5 !text-[0.7rem]">Get</span>
                      </span>
                    </span>
                  </span>
                </div>
                <div className={`sf-card ld-press ${on(still || at(1))}`} data-pressed={!still && step === 2 ? "true" : undefined} style={{ transitionDelay: at(1) && !at(2) ? "120ms" : "0ms" }}>
                  <span className="sf-thumb block aspect-[2/1]">
                    <Image src="/landing/checklist.jpg" alt="" width={800} height={400} className="h-full w-full object-cover" />
                  </span>
                  <span className="flex flex-col gap-1 p-3">
                    <span className="sf-heading text-[0.9rem]">Content strategy call</span>
                    <span className="sf-muted text-[0.7rem]">60 minutes on Google Meet.</span>
                    <span className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[0.85rem] font-semibold">$120</span>
                      <span className="sf-btn sf-btn-sm !px-2.5 !py-1.5 !text-[0.7rem]">
                        Book now
                        <ChevronRight size={12} className="sf-card-arrow" />
                      </span>
                    </span>
                  </span>
                </div>
                <div className={`sf-card ${on(still || at(1))}`} style={{ transitionDelay: at(1) && !at(2) ? "240ms" : "0ms" }}>
                  <span className="flex items-center gap-2.5 px-2.5 py-2">
                    <span className="sf-thumb sf-thumb-sm !h-10 !w-10">
                      <Image src="/landing/preset.jpg" alt="" width={200} height={200} className="h-full w-full object-cover" />
                    </span>
                    <span className="sf-heading min-w-0 flex-1 text-[0.8rem] leading-tight">Golden Hour Preset</span>
                    <span className="text-[0.76rem] font-semibold">$9</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <figcaption className="mx-auto mt-6 max-w-[300px] text-center md:mx-0 md:max-w-none md:text-left">
          <div className="text-lg font-semibold">Your store</div>
          <p className="ld-muted mt-1.5 text-[0.95rem] leading-relaxed">One link. Downloads at three prices, an hour of your time, all on one page at visitmy.shop/you.</p>
        </figcaption>
      </figure>

      {/* ---------- 2. the booking page ---------- */}
      <figure>
        <div className="ld-phone ld-phone-sm">
          <div className="ld-screen" style={vars}>
            <div className="ld-island" aria-hidden />
            <div className={`px-3.5 pt-12 pb-4 ${on(still || at(3))}`}>
              <div className="sf-heading text-[1.05rem] leading-tight">Content strategy call</div>
              <p className="sf-muted mt-1 text-[0.7rem]">60 min · Google Meet · $120</p>
              <div className="sf-surface mt-3 p-3">
                <div className="mb-1.5 flex items-center justify-between text-[0.72rem] font-semibold">
                  <ChevronLeft size={12} className="opacity-30" />
                  <span>October 2026</span>
                  <ChevronRight size={12} />
                </div>
                <div className="grid grid-cols-7 gap-0.5 text-center text-[0.62rem]">
                  {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                    <span key={i} className="sf-muted py-0.5 font-medium">
                      {d}
                    </span>
                  ))}
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                    const open = [6, 8, 13, 15, 20, 22, 27, 29].includes(d);
                    const picked = d === 13 && (still || at(4));
                    return (
                      <span key={d} className={`relative grid aspect-square place-content-center rounded-full transition-colors duration-300 ${picked ? "bg-[var(--sf-text)] font-semibold text-[var(--sf-bg)]" : open ? "font-semibold" : "opacity-30"}`}>
                        {d}
                        {open && !picked && <span className="absolute bottom-0.5 left-1/2 size-0.5 -translate-x-1/2 rounded-full bg-current" aria-hidden />}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className={`mt-3 ${on(still || at(4))}`}>
                <p className="sf-muted mb-1.5 text-[0.7rem]">Tuesday, October 13 · your time</p>
                <div className="grid grid-cols-3 gap-1.5 text-[0.7rem] font-semibold">
                  {["9:00 AM", "10:30 AM", "2:00 PM"].map((t, i) => {
                    const picked = i === 1 && (still || at(5));
                    return (
                      <span key={t} className={`rounded-full border py-1.5 text-center transition-colors duration-300 ${picked ? "border-[var(--sf-text)] bg-[var(--sf-text)] text-[var(--sf-bg)]" : "border-[color-mix(in_srgb,var(--sf-text)_18%,transparent)]"}`}>
                        {t}
                      </span>
                    );
                  })}
                </div>
              </div>
              <span className={`sf-btn ld-press mt-3 w-full !py-2 !text-[0.78rem] ${on(still || at(5))}`} data-pressed={!still && step === 6 ? "true" : undefined}>
                Book for $120
              </span>
            </div>
          </div>
        </div>
        <figcaption className="mx-auto mt-6 max-w-[300px] text-center md:mx-0 md:max-w-none md:text-left">
          <div className="text-lg font-semibold">A booking page</div>
          <p className="ld-muted mt-1.5 text-[0.95rem] leading-relaxed">Your open hours minus your Google Calendar, shown in the buyer&apos;s timezone. Pick a day, pick a time.</p>
        </figcaption>
      </figure>

      {/* ---------- 3. checkout ---------- */}
      <figure>
        <div className="ld-phone ld-phone-sm">
          <div className="ld-screen" style={vars}>
            <div className="ld-island" aria-hidden />
            <div className={`px-3.5 pt-12 pb-4 ${on(still || at(7))}`}>
              <div className="sf-heading text-[1.05rem] leading-tight">Checkout</div>
              <p className="sf-muted mt-1 text-[0.7rem]">Content strategy call · Oct 13, 10:30 AM</p>
              <div className="mt-3 space-y-2">
                <div>
                  <span className="sf-label !text-[0.68rem] !mb-1">Name</span>
                  <span className="sf-input block !py-1.5 !text-[0.75rem]">Jordan Lee</span>
                </div>
                <div>
                  <span className="sf-label !text-[0.68rem] !mb-1">Email</span>
                  <span className="sf-input block !py-1.5 !text-[0.75rem]">jordan@studio.co</span>
                </div>
              </div>
              <div className="sf-bump mt-3 !gap-2.5 !p-2.5" data-on={bumpOn ? "true" : undefined}>
                <span className={`ld-fakecheck ${bumpOn ? "ld-fakecheck-on" : ""}`} aria-hidden>
                  <Check size={11} strokeWidth={3.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.74rem] font-semibold leading-snug">Add the Reels Template Pack</span>
                  <span className="block text-[0.68rem] font-semibold">
                    <span className="sf-strike mr-1">$39</span>$19
                  </span>
                </span>
              </div>
              <div className="sf-muted mt-3 flex items-center justify-between text-[0.72rem]">
                <span>Total</span>
                <span className="font-semibold text-[var(--sf-text)]">{bumpOn ? "$139" : "$120"}</span>
              </div>
              <span className={`sf-btn mt-2.5 w-full !py-2 !text-[0.78rem] transition-colors duration-300 ${paid ? "!bg-[var(--sf-text)] !text-[var(--sf-bg)]" : ""}`}>
                {paid ? (
                  <>
                    <Check size={14} strokeWidth={3} />
                    Booked. Invite sent.
                  </>
                ) : (
                  `Pay ${bumpOn ? "$139" : "$120"}`
                )}
              </span>
            </div>
          </div>
        </div>
        <figcaption className="mx-auto mt-6 max-w-[300px] text-center md:mx-0 md:max-w-none md:text-left">
          <div className="text-lg font-semibold">Checkout</div>
          <p className="ld-muted mt-1.5 text-[0.95rem] leading-relaxed">Name, email, card. An order bump if you set one. The invite, the Meet link, and the prep doc go out the second it clears.</p>
        </figcaption>
      </figure>
    </div>
  );
}
