import type { CSSProperties, ReactNode } from "react";
import { publicUrl } from "@/lib/storage";
import { googleFontsHref, themeToCssVars, type ResolvedTheme } from "@/lib/theme";

/**
 * Wraps every public storefront page. Applies the theme as CSS variables on a
 * root element and loads the two Google fonts the theme picked.
 */
export function ThemeRoot({ theme, children }: { theme: ResolvedTheme; children: ReactNode }) {
  const vars = themeToCssVars(theme) as CSSProperties;
  const bg = publicUrl(theme.bgImageKey);
  return (
    <>
      <link rel="stylesheet" href={googleFontsHref(theme)} />
      <div className="sf-root" style={vars} data-layout={theme.layout}>
        {bg && <div className="sf-bg-image" style={{ backgroundImage: `url("${bg}")` }} aria-hidden />}
        {children}
      </div>
    </>
  );
}
