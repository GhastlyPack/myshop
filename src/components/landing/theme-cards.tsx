import Image from "next/image";
import type { CSSProperties } from "react";
import { ChevronRight } from "lucide-react";
import { FONTS, resolveTheme, themeToCssVars, THEME_PRESETS } from "@/lib/theme";

/** Google Fonts stylesheet covering every font a preset uses, so the mini stores render in their real type. */
function presetFontsHref() {
  const fams = new Set<string>();
  for (const { theme } of Object.values(THEME_PRESETS)) {
    const t = resolveTheme(theme);
    fams.add(FONTS[t.headingFont].google);
    fams.add(FONTS[t.bodyFont].google);
  }
  return `https://fonts.googleapis.com/css2?${[...fams].map((f) => `family=${f}`).join("&")}&display=swap`;
}

type Store = { name: string; handle: string; bio: string; img: string; products: [{ title: string; price: string }, { title: string; price: string }] };

/** One fictional creator per preset, each selling something that fits the look. */
const STORES: Record<string, Store> = {
  clean: { name: "Ava Chen", handle: "avachen", bio: "Notion templates for freelancers.", img: "ava", products: [{ title: "Freelance OS for Notion", price: "$29" }, { title: "Client onboarding kit", price: "$12" }] },
  midnight: { name: "Deon Reyes", handle: "deonbeats", bio: "Producer. Sample packs and drum kits.", img: "deon", products: [{ title: "Late Nights Vol. 2", price: "$24" }, { title: "808 Essentials drum kit", price: "$9" }] },
  editorial: { name: "Harriet Vale", handle: "harrietwrites", bio: "Essays on slow living. One a week.", img: "harriet", products: [{ title: "Small Hours, an ebook", price: "$14" }, { title: "52 writing prompts", price: "$8" }] },
  sunset: { name: "Sol Navarro", handle: "solnavarro", bio: "Travel photographer. Presets for warm light.", img: "sol", products: [{ title: "Golden Coast presets", price: "$19" }, { title: "Print: Baja at dusk", price: "$45" }] },
  neon: { name: "Kit Park", handle: "kitpark", bio: "Front-end dev. UI kits and snippets.", img: "kit", products: [{ title: "Glass UI kit", price: "$39" }, { title: "CSS snippets pack", price: "$12" }] },
  blush: { name: "Lena Moss", handle: "lenamoss", bio: "Pilates coach. Plans for busy weeks.", img: "lena", products: [{ title: "4-week mat plan", price: "$22" }, { title: "Morning mobility, video", price: "$9" }] },
};

function Cta({ small }: { small?: boolean }) {
  return (
    <span className={`sf-btn sf-btn-sm !gap-1 !px-2.5 !py-1.5 ${small ? "!text-[0.7rem]" : "!text-[0.74rem]"}`}>
      Get
      <ChevronRight size={12} className="sf-card-arrow" />
    </span>
  );
}

/** One mini storefront per theme preset, rendered with the real theme CSS variables and .sf-* classes. */
export function ThemeCards() {
  return (
    <>
      <link rel="stylesheet" href={presetFontsHref()} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(THEME_PRESETS).map(([key, preset]) => {
          const t = resolveTheme(preset.theme);
          const vars = themeToCssVars(t) as CSSProperties;
          const s = STORES[key];
          const [p1, p2] = s.products;
          const grid = t.layout === "grid";
          return (
            <div key={key} className="ld-theme flex flex-col" style={vars}>
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="sf-avatar !h-14 !w-14 overflow-hidden !shadow-none" data-shape={t.avatarShape} aria-hidden>
                  <Image src={`/landing/stores/${s.img}-avatar.jpg`} alt="" width={112} height={112} className="h-full w-full object-cover" />
                </div>
                <div>
                  <div className="sf-heading text-[1rem]">{s.name}</div>
                  <div className="sf-muted mt-0.5 text-[0.74rem]">{s.bio}</div>
                </div>
              </div>

              {grid ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="sf-card">
                    <span className="sf-thumb block aspect-square">
                      <Image src={`/landing/stores/${s.img}-thumb.jpg`} alt="" width={240} height={240} className="h-full w-full object-cover" />
                    </span>
                    <span className="flex flex-col gap-1.5 p-2.5">
                      <span className="sf-heading text-[0.74rem] leading-tight">{p1.title}</span>
                      <span className="text-[0.74rem] font-semibold">{p1.price}</span>
                      <Cta small />
                    </span>
                  </div>
                  <div className="sf-card">
                    <span className="sf-thumb block aspect-square">
                      <Image src={`/landing/stores/${s.img}-thumb2.jpg`} alt="" width={240} height={240} className="h-full w-full object-cover" />
                    </span>
                    <span className="flex flex-col gap-1.5 p-2.5">
                      <span className="sf-heading text-[0.74rem] leading-tight">{p2.title}</span>
                      <span className="text-[0.74rem] font-semibold">{p2.price}</span>
                      <Cta small />
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  <div className="sf-card">
                    <span className="flex gap-3 p-3">
                      <span className="sf-thumb sf-thumb-sm !h-12 !w-12">
                        <Image src={`/landing/stores/${s.img}-thumb.jpg`} alt="" width={96} height={96} className="h-full w-full object-cover" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="sf-heading text-[0.82rem] leading-tight">{p1.title}</span>
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-[0.78rem] font-semibold">{p1.price}</span>
                          <Cta />
                        </span>
                      </span>
                    </span>
                  </div>
                  <div className="sf-card">
                    <span className="flex items-center gap-3 px-3 py-2.5">
                      <span className="sf-heading min-w-0 flex-1 text-[0.82rem] leading-tight">{p2.title}</span>
                      <span className="text-[0.78rem] font-semibold">{p2.price}</span>
                      <Cta />
                    </span>
                  </div>
                </div>
              )}
              <div className="sf-muted mt-4 text-[0.78rem]">{preset.label}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
