"use client";

import { useActionState, useState, useTransition } from "react";
import { Lock, X } from "lucide-react";
import type { CustomField } from "@/db/schema";
import { applyDiscountAction, checkoutAction, type CheckoutState } from "@/app/[username]/[slug]/actions";
import { formatPrice } from "./price";
import { sendBeacon, usePageUrl, useSessionId } from "./session";
import { trackPixel } from "@/components/meta-pixel";

type Props = {
  username: string;
  slug: string;
  storeId: string;
  storeName: string;
  productId: string;
  priceCents: number;
  currency: string;
  buttonText: string;
  fields: CustomField[];
  marketingOptIn: boolean;
  /** Order bump offered above the pay button (paid products only). */
  bump?: BumpOffer | null;
};

export type BumpOffer = {
  productId: string;
  title: string;
  headline: string;
  thumbUrl: string | null;
  /** Full price and what the buyer pays after the creator's % off. */
  priceCents: number;
  bumpCents: number;
};

type Applied = { code: string; discountCents: number };

function DiscountCode({ username, slug, currency, applied, onApply }: { username: string; slug: string; currency: string; applied: Applied | null; onApply: (a: Applied | null) => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (applied) {
    return (
      <div className="sf-code-applied">
        <span>
          <strong style={{ fontFamily: "ui-monospace, monospace", letterSpacing: "0.06em" }}>{applied.code}</strong>
          <span className="sf-muted"> · −{formatPrice(applied.discountCents, currency)}</span>
        </span>
        <button type="button" className="sf-linkbtn inline-flex items-center gap-1" onClick={() => onApply(null)} aria-label="Remove code">
          <X size={14} /> Remove
        </button>
      </div>
    );
  }
  if (!open) {
    return (
      <button type="button" className="sf-linkbtn" onClick={() => setOpen(true)}>
        Have a code?
      </button>
    );
  }
  function apply() {
    setError(null);
    start(async () => {
      const res = await applyDiscountAction({ username, slug, code });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onApply({ code: res.code, discountCents: res.discountCents });
      setCode("");
    });
  }
  return (
    <div className="space-y-2">
      <label htmlFor="co-code" className="sf-label">
        Discount code
      </label>
      <div className="sf-code-row">
        <input
          id="co-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          className="sf-input"
          placeholder="CODE"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={32}
        />
        <button type="button" className="sf-btn sf-btn-ghost shrink-0" onClick={apply} disabled={pending || !code.trim()}>
          {pending ? "Checking…" : "Apply"}
        </button>
      </div>
      {error && (
        <p className="sf-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Field({ f }: { f: CustomField }) {
  const id = `f_${f.id}`;
  const req = f.required ? <span className="sf-accent"> *</span> : null;
  if (f.type === "checkbox") {
    return (
      <label className="sf-check">
        <input type="checkbox" name={id} required={f.required} />
        <span>
          {f.label}
          {req}
        </span>
      </label>
    );
  }
  if (f.type === "multiselect") {
    return (
      <fieldset className="space-y-2">
        <legend className="sf-label">
          {f.label}
          {req}
        </legend>
        {(f.options ?? []).map((o) => (
          <label key={o} className="sf-check">
            <input type="checkbox" name={id} value={o} />
            <span>{o}</span>
          </label>
        ))}
      </fieldset>
    );
  }
  if (f.type === "select") {
    return (
      <div>
        <label htmlFor={id} className="sf-label">
          {f.label}
          {req}
        </label>
        <select id={id} name={id} required={f.required} className="sf-input" defaultValue="">
          <option value="" disabled={f.required}>
            {f.required ? "Choose one" : "Optional"}
          </option>
          {(f.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div>
      <label htmlFor={id} className="sf-label">
        {f.label}
        {req}
      </label>
      <input id={id} name={id} type={f.type === "phone" ? "tel" : "text"} required={f.required} className="sf-input" autoComplete={f.type === "phone" ? "tel" : "off"} />
    </div>
  );
}

export function CheckoutForm(p: Props) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(checkoutAction, null);
  const sessionId = useSessionId();
  const pageUrl = usePageUrl();
  const [applied, setApplied] = useState<Applied | null>(null);
  const [bumpOn, setBumpOn] = useState(false);
  const free = p.priceCents === 0;
  const discount = free ? 0 : Math.min(p.priceCents, applied?.discountCents ?? 0);
  const bumpCents = p.bump && bumpOn ? p.bump.bumpCents : 0;
  const total = Math.max(0, p.priceCents - discount + bumpCents);

  return (
    <form
      action={action}
      onSubmit={() => {
        sendBeacon({ storeId: p.storeId, productId: p.productId, type: "checkout_start" });
        trackPixel("InitiateCheckout", { content_ids: [p.productId, ...(p.bump && bumpOn ? [p.bump.productId] : [])], currency: p.currency, value: total / 100 });
      }}
      className="space-y-4"
      noValidate={false}
    >
      <input type="hidden" name="username" value={p.username} />
      <input type="hidden" name="slug" value={p.slug} />
      <input type="hidden" name="sessionId" value={sessionId ?? ""} />
      <input type="hidden" name="pageUrl" value={pageUrl} />
      {applied && <input type="hidden" name="code" value={applied.code} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="co-name" className="sf-label">
            Name
          </label>
          <input id="co-name" name="name" required autoComplete="name" className="sf-input" placeholder="Your name" />
        </div>
        <div>
          <label htmlFor="co-email" className="sf-label">
            Email
          </label>
          <input id="co-email" name="email" type="email" required autoComplete="email" inputMode="email" className="sf-input" placeholder="you@example.com" />
        </div>
      </div>

      {p.fields.map((f) => (
        <Field key={f.id} f={f} />
      ))}

      {p.marketingOptIn && (
        <label className="sf-check">
          <input type="checkbox" name="optIn" />
          <span>Email me updates from {p.storeName}</span>
        </label>
      )}

      {!free && <DiscountCode username={p.username} slug={p.slug} currency={p.currency} applied={applied} onApply={setApplied} />}

      {!free && p.bump && (
        <label className="sf-bump">
          <span className="sf-check">
            <input type="checkbox" name="bump" checked={bumpOn} onChange={(e) => setBumpOn(e.target.checked)} />
          </span>
          {p.bump.thumbUrl && (
            <span className="sf-thumb sf-bump-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element -- creator upload */}
              <img src={p.bump.thumbUrl} alt="" loading="lazy" />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block font-semibold leading-snug">{p.bump.headline}</span>
            <span className="sf-muted block text-sm">{p.bump.title}</span>
            <span className="mt-1 block text-sm font-semibold">
              {p.bump.bumpCents < p.bump.priceCents && <span className="sf-strike mr-1.5">{formatPrice(p.bump.priceCents, p.currency)}</span>}
              {formatPrice(p.bump.bumpCents, p.currency)}
            </span>
          </span>
        </label>
      )}

      {state?.error && (
        <p className="sf-error" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" className="sf-btn w-full text-base" disabled={pending} style={{ padding: "1rem 1.25rem" }}>
        {pending ? "One sec…" : free ? p.buttonText : `${p.buttonText} · ${formatPrice(total, p.currency)}`}
      </button>
      <p className="sf-muted flex items-center justify-center gap-1.5 text-xs">
        <Lock size={12} />
        {free || total === 0 ? "Instant delivery to your inbox. No spam." : "Secure checkout. Instant delivery after payment."}
      </p>
    </form>
  );
}
