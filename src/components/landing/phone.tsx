import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { SOCIAL_ICONS } from "@/components/storefront/socials";
import { resolveTheme, themeToCssVars, THEME_PRESETS } from "@/lib/theme";
import type { CSSProperties } from "react";

/**
 * Hero phone: a storefront for a fictional creator, rendered with the
 * storefront's own .sf-* classes and the "sunset" preset. Static markup only.
 */
export function HeroPhone() {
  const vars = themeToCssVars(resolveTheme(THEME_PRESETS.sunset.theme)) as CSSProperties;
  const Instagram = SOCIAL_ICONS.instagram;
  const TikTok = SOCIAL_ICONS.tiktok;

  return (
    <div className="ld-phone">
      <div className="ld-screen" style={vars}>
        <div className="ld-island" aria-hidden />
        <div className="px-4 pt-14 pb-5">
          <div className="flex flex-col items-center gap-2.5 text-center">
            <div className="sf-avatar overflow-hidden" data-shape="circle" data-size="sm" aria-hidden>
              <Image src="/landing/creator.jpg" alt="" width={64} height={64} className="h-full w-full object-cover" priority />
            </div>
            <div>
              <div className="sf-heading text-[1.05rem]">Maya Ortega</div>
              <p className="sf-muted mt-1 text-[0.74rem] leading-snug">Content coach. Free checklist below, templates when you’re ready.</p>
            </div>
            <div className="flex gap-1.5">
              {[Instagram, TikTok].map((Icon, i) => (
                <span key={i} className="sf-social !h-7 !w-7">
                  <Icon className="h-3.5 w-3.5" />
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <div className="sf-card">
              <span className="sf-thumb block aspect-[2/1]">
                <Image src="/landing/reels-pack.jpg" alt="" width={1536} height={1024} className="h-full w-full object-cover" priority />
              </span>
              <span className="flex flex-col gap-1 p-3.5">
                <span className="sf-heading text-[0.95rem]">Reels Template Pack</span>
                <span className="sf-muted text-[0.74rem]">12 editable CapCut + Canva templates.</span>
                <span className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[0.9rem] font-semibold">$19</span>
                  <span className="sf-btn sf-btn-sm !px-3 !py-2 !text-[0.76rem]">
                    Get the pack
                    <ChevronRight size={14} className="sf-card-arrow" />
                  </span>
                </span>
              </span>
            </div>

            <div className="sf-card">
              <span className="flex gap-3 p-3">
                <span className="sf-thumb sf-thumb-sm !h-14 !w-14">
                  <Image src="/landing/preset.jpg" alt="" width={320} height={320} className="h-full w-full object-cover" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="sf-heading text-[0.9rem]">Golden Hour Preset</span>
                  <span className="sf-muted text-[0.72rem]">One Lightroom preset. Warm, soft, done.</span>
                  <span className="mt-1 flex items-center justify-between gap-2">
                    <span className="text-[0.85rem] font-semibold">$9</span>
                    <span className="sf-btn sf-btn-sm !px-3 !py-1.5 !text-[0.74rem]">
                      Buy
                      <ChevronRight size={13} className="sf-card-arrow" />
                    </span>
                  </span>
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
