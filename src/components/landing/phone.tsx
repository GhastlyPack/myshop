import Image from "next/image";
import { ArrowUpRight, ChevronRight, MessageCircle, Star, Wallet, Zap } from "lucide-react";
import { SOCIAL_ICONS } from "@/components/storefront/socials";
import { resolveTheme, themeToCssVars, THEME_PRESETS } from "@/lib/theme";
import type { CSSProperties } from "react";

/**
 * Hero phone: a real-looking storefront rendered with the storefront's own
 * .sf-* classes and the "sunset" preset, so what the visitor sees is what a
 * store actually looks like. Static markup only (no links, no tracking).
 */
export function HeroPhone() {
  const vars = themeToCssVars(resolveTheme(THEME_PRESETS.sunset.theme)) as CSSProperties;
  const Instagram = SOCIAL_ICONS.instagram;
  const TikTok = SOCIAL_ICONS.tiktok;
  const YouTube = SOCIAL_ICONS.youtube;

  return (
    <div className="ld-phone-wrap">
      <div className="ld-phone ld-phone-tilt">
        <div className="ld-screen" style={vars}>
          <div className="ld-island" aria-hidden />
          <div className="px-4 pt-14 pb-6">
            <div className="flex flex-col items-center gap-2.5 text-center">
              <div className="sf-avatar grid place-content-center overflow-hidden" data-shape="circle" data-size="sm" aria-hidden>
                <Image src="/landing/avatar.jpg" alt="" width={64} height={64} className="h-full w-full object-cover" priority />
              </div>
              <div>
                <div className="sf-heading text-[1.05rem]">Roemer AI Solutions</div>
                <p className="sf-muted mt-1 text-[0.72rem] leading-snug">AI tools + Claude skills for small businesses.</p>
              </div>
              <div className="flex gap-1.5">
                {[Instagram, TikTok, YouTube].map((Icon, i) => (
                  <span key={i} className="sf-social !h-7 !w-7">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <div className="sf-card">
                <span className="sf-thumb block aspect-[16/9]">
                  <Image src="/landing/manual-banner.jpg" alt="" width={900} height={506} priority />
                </span>
                <span className="flex flex-col gap-1 p-3.5">
                  <span className="sf-heading text-[0.9rem]">Replace a $1M Marketing Team with One AI Tool</span>
                  <span className="sf-muted text-[0.72rem]">Manual 1 · PDF, toolkit + Claude skill</span>
                  <span className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[0.85rem] font-semibold">$39</span>
                    <span className="sf-btn sf-btn-sm !px-3 !py-2 !text-[0.75rem]">
                      Get the manual
                      <ChevronRight size={14} className="sf-card-arrow" />
                    </span>
                  </span>
                </span>
              </div>

              <div className="sf-card">
                <span className="flex gap-3 p-3">
                  <span className="sf-thumb sf-thumb-sm !h-14 !w-14">
                    <Image src="/landing/kit-thumb.jpg" alt="" width={320} height={320} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="sf-heading text-[0.85rem]">The CMO Seat Starter Kit</span>
                    <span className="sf-muted text-[0.7rem]">Cost table, kickoff script, benchmarks.</span>
                    <span className="mt-1 flex items-center justify-between gap-2">
                      <span className="sf-chip !px-2 !py-0.5 !text-[0.68rem]">Free</span>
                      <span className="sf-btn sf-btn-sm !px-3 !py-1.5 !text-[0.72rem]">
                        Download
                        <ChevronRight size={13} className="sf-card-arrow" />
                      </span>
                    </span>
                  </span>
                </span>
              </div>

              <div className="sf-card">
                <span className="flex items-center gap-3 px-4 py-3">
                  <span className="sf-heading min-w-0 flex-1 text-[0.85rem]">Book a strategy call</span>
                  <span className="sf-btn sf-btn-sm !px-3 !py-1.5 !text-[0.72rem]">
                    Open
                    <ArrowUpRight size={13} className="sf-card-arrow" />
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating proof points, Stan-style, but about things the product really does. */}
      <div className="ld-bubble -left-32 top-[20%] hidden xl:inline-flex" style={{ animationDelay: "-1.5s" }}>
        <span className="ld-bubble-icon">
          <Wallet size={15} strokeWidth={2.25} />
        </span>
        <span>
          Paid to your Stripe
          <small>Never held by us</small>
        </span>
      </div>
      <div className="ld-bubble -right-28 top-[36%] hidden xl:inline-flex" style={{ animationDelay: "-3s" }}>
        <span className="ld-bubble-icon">
          <Zap size={15} strokeWidth={2.25} />
        </span>
        <span>
          Delivered in seconds
          <small>Files + companion skill</small>
        </span>
      </div>
      <div className="ld-bubble -left-28 top-[58%] hidden xl:inline-flex" style={{ animationDelay: "-4.5s" }}>
        <span className="ld-bubble-icon">
          <Star size={15} strokeWidth={2.25} />
        </span>
        <span>
          Reviews from buyers
          <small>You approve what shows</small>
        </span>
      </div>
      <div className="ld-bubble -right-24 top-[76%] hidden xl:inline-flex" style={{ animationDelay: "-0.5s" }}>
        <span className="ld-bubble-icon">
          <MessageCircle size={15} strokeWidth={2.25} />
        </span>
        <span>
          DM keyword: MANUAL
          <small>Caption + link written for you</small>
        </span>
      </div>
    </div>
  );
}
