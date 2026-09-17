import Image from "next/image";
import type { CSSProperties } from "react";
import { resolveTheme, themeToCssVars } from "@/lib/theme";
import { LANDING_STORE_THEME } from "./store-theme";

/**
 * Static UI mockups for the feature rows: the product editor, a buyer's
 * checkout, and the income view. Plain markup, no live data.
 */

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[var(--ld-tint)] p-4 sm:p-8">
      <div className={`ld-card overflow-hidden ${className}`}>{children}</div>
    </div>
  );
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="ld-muted mb-1.5 text-xs font-medium">{label}</div>
      <div className="flex h-10 items-center justify-between rounded-lg border ld-line px-3 text-sm">
        <span>{value}</span>
        {hint && <span className="ld-muted text-xs">{hint}</span>}
      </div>
    </div>
  );
}

/** Product editor: title, price, file, link, publish. */
export function EditorMock() {
  return (
    <Panel>
      <div className="flex items-center justify-between border-b ld-line px-5 py-3.5">
        <div className="text-sm font-semibold">New product</div>
        <span className="rounded-full border ld-line px-2.5 py-0.5 text-xs font-medium">Draft</span>
      </div>
      <div className="space-y-4 px-5 py-5">
        <Field label="Title" value="Reels Template Pack" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price" value="$19.00" hint="USD" />
          <Field label="Type" value="Download" />
        </div>
        <div>
          <div className="ld-muted mb-1.5 text-xs font-medium">File</div>
          <div className="flex items-center justify-between rounded-lg border ld-line px-3 py-2.5 text-sm">
            <span className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-content-center rounded-md bg-[var(--ld-tint)] text-[10px] font-semibold">ZIP</span>
              reels-pack.zip
            </span>
            <span className="ld-muted text-xs">48 MB · uploaded</span>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t ld-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="ld-muted text-sm">
            visitmy.shop/maya/<span className="text-[var(--ld-ink)]">reels-template-pack</span>
          </div>
          <span className="ld-btn ld-btn-sm ld-btn-ink">Publish</span>
        </div>
      </div>
    </Panel>
  );
}

/** Buyer checkout for a $9 product, rendered with the storefront's own classes. */
export function CheckoutMock() {
  const vars = themeToCssVars(resolveTheme(LANDING_STORE_THEME)) as CSSProperties;
  return (
    <div className="min-w-0 rounded-2xl p-4 sm:p-8" style={{ ...vars, background: "var(--sf-bg)", color: "var(--sf-text)", fontFamily: "var(--sf-body-font)" }}>
      <div className="sf-surface mx-auto max-w-sm p-5">
        <div className="flex items-center gap-3">
          <span className="sf-thumb sf-thumb-sm !h-12 !w-12">
            <Image src="/landing/preset.jpg" alt="" width={96} height={96} className="h-full w-full object-cover" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="sf-heading text-[0.95rem]">Golden Hour Preset</div>
            <div className="sf-muted text-xs">One Lightroom preset</div>
          </div>
          <div className="font-semibold">$9</div>
        </div>
        <div className="mt-5 space-y-3">
          <div>
            <div className="sf-label">Name</div>
            <div className="sf-input">Priya Shah</div>
          </div>
          <div>
            <div className="sf-label">Email</div>
            <div className="sf-input">priya@example.com</div>
          </div>
        </div>
        <span className="sf-btn mt-5 w-full">Pay $9</span>
        <p className="sf-muted mt-3 text-center text-xs">Card handled by Stripe. File arrives by email the moment it clears.</p>
      </div>
    </div>
  );
}

const SALES = [
  ["Today, 9:14 AM", "Golden Hour Preset", "$9.00"],
  ["Today, 7:02 AM", "Reels Template Pack", "$19.00"],
  ["Yesterday", "Reels Template Pack", "$19.00"],
  ["Yesterday", "7-Day Launch Checklist", "Free"],
];

/** Income view: summary, recent orders, where the money went. */
export function IncomeMock() {
  return (
    <Panel>
      <div className="flex items-center justify-between border-b ld-line px-5 py-3.5">
        <div className="text-sm font-semibold">Income</div>
        <span className="ld-muted text-xs">Stripe account · connected</span>
      </div>
      <div className="grid grid-cols-3 divide-x ld-line border-b ld-line">
        {[
          ["This month", "$412"],
          ["Orders", "31"],
          ["Refunds", "1"],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0 px-4 py-4 sm:px-5">
            <div className="ld-muted text-xs">{k}</div>
            <div className="mt-1 text-xl font-semibold tracking-tight">{v}</div>
          </div>
        ))}
      </div>
      <ul className="divide-y ld-line">
        {SALES.map(([when, what, amt]) => (
          <li key={when + what} className="flex items-center gap-4 px-5 py-3 text-sm">
            <span className="ld-muted w-24 shrink-0 text-xs sm:w-28">{when}</span>
            <span className="min-w-0 flex-1 truncate">{what}</span>
            <span className="font-medium">{amt}</span>
          </li>
        ))}
      </ul>
      <div className="ld-muted border-t ld-line px-5 py-3 text-xs">Paid out by Stripe to your bank on Stripe’s schedule. We never hold a balance.</div>
    </Panel>
  );
}
