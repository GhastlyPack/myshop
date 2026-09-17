import Link from "next/link";

export function StoreFooter({ show }: { show: boolean }) {
  if (!show) return <div className="h-10" />;
  return (
    <footer className="sf-muted pt-14 pb-8 text-center text-xs">
      <Link href="/" className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-opacity hover:opacity-70">
        Made with <span className="font-semibold" style={{ color: "var(--sf-text)" }}>visitmy.shop</span>
      </Link>
    </footer>
  );
}
