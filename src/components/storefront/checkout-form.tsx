"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import type { CustomField } from "@/db/schema";
import { checkoutAction, type CheckoutState } from "@/app/[username]/[slug]/actions";
import { formatPrice } from "./price";
import { sendBeacon, usePageUrl, useSessionId } from "./session";

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
};

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
  const free = p.priceCents === 0;

  return (
    <form
      action={action}
      onSubmit={() => sendBeacon({ storeId: p.storeId, productId: p.productId, type: "checkout_start" })}
      className="space-y-4"
      noValidate={false}
    >
      <input type="hidden" name="username" value={p.username} />
      <input type="hidden" name="slug" value={p.slug} />
      <input type="hidden" name="sessionId" value={sessionId ?? ""} />
      <input type="hidden" name="pageUrl" value={pageUrl} />

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

      {state?.error && (
        <p className="sf-error" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" className="sf-btn w-full text-base" disabled={pending} style={{ padding: "1rem 1.25rem" }}>
        {pending ? "One sec…" : free ? p.buttonText : `${p.buttonText} · ${formatPrice(p.priceCents, p.currency)}`}
      </button>
      <p className="sf-muted flex items-center justify-center gap-1.5 text-xs">
        <Lock size={12} />
        {free ? "Instant delivery to your inbox. No spam." : "Secure checkout. Instant delivery after payment."}
      </p>
    </form>
  );
}
