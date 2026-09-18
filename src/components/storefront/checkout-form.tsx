"use client";

import { useActionState, useState, useTransition } from "react";
import { Lock, X } from "lucide-react";
import type { CustomField } from "@/db/schema";
import { applyDiscountAction, checkoutAction, type CheckoutState } from "@/app/[username]/[slug]/actions";
import { formatPrice } from "./price";
import { sendBeacon, usePageUrl, useSessionId } from "./session";
import { fireStorePixel } from "@/components/storefront/store-pixels";
import type { ResolvedPixels } from "@/lib/pixels";
import { ga } from "@/lib/ga";

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
  /** The creator's ad pixels, for the InitiateCheckout event. */
  pixels: ResolvedPixels;
  /** Order bump offered above the pay button (paid products only). Legacy single; prefer `bumps`. */
  bump?: BumpOffer | null;
  /** Every order bump offered; the buyer can add any of them. */
  bumps?: BumpOffer[];
  /** Pricing tiers; when present the buyer picks one and its price replaces priceCents. */
  variants?: VariantOption[];
  /** Pay what you want: priceCents is the suggestion, minPriceCents the floor (0 = can be free). */
  payWhatYouWant?: boolean;
  minPriceCents?: number;
};

export type VariantOption = { id: string; name: string; description: string | null; priceCents: number };

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
  const [bumpsOn, setBumpsOn] = useState<Record<string, boolean>>({});
  const bumps = p.bumps ?? (p.bump ? [p.bump] : []);
  const variants = p.variants ?? [];
  const [variantId, setVariantId] = useState<string>(variants[0]?.id ?? "");
  const variant = variants.find((v) => v.id === variantId) ?? null;
  // Pay what you want: the buyer types an amount; the suggested price prefills it.
  const [amountText, setAmountText] = useState<string>((p.priceCents / 100).toFixed(2));
  const pwywCents = p.payWhatYouWant && !variant ? Math.max(0, Math.round((parseFloat(amountText) || 0) * 100)) : null;
  const basePrice = variant ? variant.priceCents : (pwywCents ?? p.priceCents);
  const free = basePrice === 0;
  // Codes don't stack with name-your-price; the server recomputes every number anyway.
  const discount = free || p.payWhatYouWant ? 0 : Math.min(basePrice, applied?.discountCents ?? 0);
  const chosenBumps = free ? [] : bumps.filter((b) => bumpsOn[b.productId]);
  const bumpCents = chosenBumps.reduce((s, b) => s + b.bumpCents, 0);
  const total = Math.max(0, basePrice - discount + bumpCents);

  return (
    <form
      action={action}
      onSubmit={() => {
        sendBeacon({ storeId: p.storeId, productId: p.productId, type: "checkout_start" });
        fireStorePixel(p.pixels, "InitiateCheckout", { contentIds: [p.productId, ...chosenBumps.map((b) => b.productId)], currency: p.currency, value: total / 100 });
        ga("begin_checkout", {
          store: p.username,
          currency: p.currency.toUpperCase(),
          value: total / 100,
          is_free: free,
          bump_added: chosenBumps.length > 0,
          variant: variant?.name,
          items: [{ item_id: p.productId, item_name: p.slug, price: basePrice / 100, quantity: 1 }, ...chosenBumps.map((b) => ({ item_id: b.productId, item_name: b.title, price: b.bumpCents / 100, quantity: 1 }))],
        });
      }}
      className="space-y-4"
      noValidate={false}
    >
      <input type="hidden" name="username" value={p.username} />
      <input type="hidden" name="slug" value={p.slug} />
      <input type="hidden" name="sessionId" value={sessionId ?? ""} />
      <input type="hidden" name="pageUrl" value={pageUrl} />
      {applied && <input type="hidden" name="code" value={applied.code} />}
      {variant && <input type="hidden" name="variantId" value={variant.id} />}
      {p.payWhatYouWant && !variant && <input type="hidden" name="amount" value={String(pwywCents ?? 0)} />}

      {variants.length > 0 && (
        <div className="space-y-2">
          <span className="sf-label">Choose your tier</span>
          {variants.map((v) => (
            <label key={v.id} className="sf-bump" data-on={variantId === v.id ? "true" : undefined}>
              <span className="sf-check">
                <input type="radio" name="tier" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-snug">{v.name}</span>
                {v.description && <span className="sf-muted block text-sm">{v.description}</span>}
              </span>
              <span className="text-sm font-semibold">{formatPrice(v.priceCents, p.currency)}</span>
            </label>
          ))}
        </div>
      )}

      {p.payWhatYouWant && !variant && (
        <div>
          <label htmlFor="co-amount" className="sf-label">
            Name your price {p.minPriceCents ? `(minimum ${formatPrice(p.minPriceCents, p.currency)})` : "(enter 0 to get it free)"}
          </label>
          <input id="co-amount" inputMode="decimal" value={amountText} onChange={(e) => setAmountText(e.target.value)} className="sf-input" aria-describedby="co-amount-hint" />
          {p.priceCents > 0 && (
            <p id="co-amount-hint" className="sf-muted mt-1 text-xs">
              Suggested: {formatPrice(p.priceCents, p.currency)}
            </p>
          )}
        </div>
      )}

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

      {!free && !p.payWhatYouWant && <DiscountCode username={p.username} slug={p.slug} currency={p.currency} applied={applied} onApply={setApplied} />}

      {!free &&
        bumps.map((b) => (
          <label key={b.productId} className="sf-bump">
            <span className="sf-check">
              <input
                type="checkbox"
                name={`bump_${b.productId}`}
                checked={Boolean(bumpsOn[b.productId])}
                onChange={(e) => setBumpsOn((s) => ({ ...s, [b.productId]: e.target.checked }))}
              />
            </span>
            {b.thumbUrl && (
              <span className="sf-thumb sf-bump-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element -- creator upload */}
                <img src={b.thumbUrl} alt="" loading="lazy" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block font-semibold leading-snug">{b.headline}</span>
              <span className="sf-muted block text-sm">{b.title}</span>
              <span className="mt-1 block text-sm font-semibold">
                {b.bumpCents < b.priceCents && <span className="sf-strike mr-1.5">{formatPrice(b.priceCents, p.currency)}</span>}
                {formatPrice(b.bumpCents, p.currency)}
              </span>
            </span>
          </label>
        ))}

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
