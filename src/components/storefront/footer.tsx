import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

/** "Made with visitmy.shop" badge. Colors follow the store theme so it never clashes. */
export function StoreFooter({ show }: { show: boolean }) {
  if (!show) return <div className="h-10" />;
  return (
    <footer className="sf-muted pt-14 pb-8 text-center text-xs">
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-full border px-3.5 py-2 transition-opacity hover:opacity-70"
        style={{ borderColor: "color-mix(in srgb, var(--sf-text) 14%, transparent)", background: "color-mix(in srgb, var(--sf-surface) 70%, transparent)" }}
      >
        <span>Made with</span>
        <span style={{ color: "var(--sf-text)" }}>
          <Wordmark size={13} />
        </span>
      </Link>
    </footer>
  );
}
