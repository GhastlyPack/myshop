import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Store } from "@/db/schema";
import { publicUrl } from "@/lib/storage";
import type { ResolvedTheme } from "@/lib/theme";
import { Socials } from "./socials";

function Avatar({ store, theme, size }: { store: Store; theme: ResolvedTheme; size: ResolvedTheme["avatarSize"] }) {
  const src = publicUrl(store.avatarKey);
  const initial = store.displayName.trim().charAt(0).toUpperCase() || "•";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- creator-uploaded asset, sized by CSS
    return <img src={src} alt={store.displayName} fetchPriority="high" decoding="async" className="sf-avatar" data-shape={theme.avatarShape} data-size={size} />;
  }
  return (
    <div className="sf-avatar sf-heading grid place-content-center text-3xl" data-shape={theme.avatarShape} data-size={size} aria-hidden>
      {initial}
    </div>
  );
}

/** Big centered header for the storefront. */
export function StoreHeader({ store, theme }: { store: Store; theme: ResolvedTheme }) {
  return (
    <header className="sf-rise flex flex-col items-center gap-4 text-center">
      <Avatar store={store} theme={theme} size={theme.avatarSize} />
      <div className="space-y-2">
        <h1 className="sf-heading text-[1.75rem] sm:text-[2rem]">{store.displayName}</h1>
        {store.bio && <p className="sf-muted mx-auto max-w-[36ch] text-[0.95rem] leading-relaxed whitespace-pre-line">{store.bio}</p>}
      </div>
      <Socials socials={store.socials} />
    </header>
  );
}

/** Compact header for product pages: back link + avatar + name. */
export function CompactStoreHeader({ store, theme }: { store: Store; theme: ResolvedTheme }) {
  return (
    <div className="sf-rise flex items-center justify-between gap-3">
      <Link href={`/${store.username}`} className="sf-muted inline-flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70">
        <ArrowLeft size={16} strokeWidth={2} />
        Back
      </Link>
      <Link href={`/${store.username}`} className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
        <span className="text-sm font-medium">{store.displayName}</span>
        <Avatar store={store} theme={theme} size="sm" />
      </Link>
    </div>
  );
}
