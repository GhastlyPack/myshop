"use client";

import { Plus, Trash2 } from "lucide-react";
import type { CustomField } from "@/db/schema";
import type { DiscountCodeRow } from "@/app/app/products/[id]/actions";
import { DiscountCodes } from "@/components/app/product-editor/discount-codes";
import type { BumpCandidate, TabProps } from "@/components/app/product-editor/editor";
import { ProLock } from "@/components/app/pro-lock";
import { Field, FieldError, FieldHint } from "@/components/app/product-editor/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/format";

const NO_BUMP = "__none__";
/** Stripe's minimum charge; mirrors MIN_CHARGE_CENTS in src/lib/commerce.ts (server-only). */
const MIN_CHARGE_CENTS = 50;

function bumpPriceCents(priceCents: number, percentOff: number) {
  const pct = Math.min(100, Math.max(0, Math.round(percentOff || 0)));
  return Math.max(0, priceCents - Math.round((priceCents * pct) / 100));
}

const FIELD_TYPES: { value: CustomField["type"]; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "phone", label: "Phone number" },
  { value: "select", label: "Dropdown (pick one)" },
  { value: "multiselect", label: "Checkboxes (pick many)" },
  { value: "checkbox", label: "Single checkbox" },
];

const needsOptions = (t: CustomField["type"]) => t === "select" || t === "multiselect";

export function CheckoutTab({
  form,
  update,
  errors,
  productId,
  currency,
  quantitySold,
  bumpCandidates,
  discountCodes,
  tier,
}: TabProps & { productId: string; currency: string; quantitySold: number; bumpCandidates: BumpCandidate[]; discountCodes: DiscountCodeRow[]; tier: "basic" | "pro" }) {
  const isPro = tier === "pro";
  const fields = form.fields;
  const limited = form.quantityLimit != null;
  const remaining = form.quantityLimit != null ? Math.max(0, form.quantityLimit - quantitySold) : null;
  const canBump = form.priceCents >= MIN_CHARGE_CENTS;
  const bump = bumpCandidates.find((b) => b.id === form.bumpProductId) ?? null;
  const bumpPrice = bump ? bumpPriceCents(bump.priceCents, form.bumpDiscountPercent) : 0;
  const bumpPlaceholder = bump ? `Add ${bump.title} for ${formatPrice(bumpPrice, currency)}` : "Add {title} for {price}";
  function setField(i: number, patch: Partial<CustomField>) {
    update({ fields: fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) });
  }
  function addField() {
    update({ fields: [...fields, { id: `f_${Math.random().toString(36).slice(2, 10)}`, label: "", type: "text", required: false }] });
  }

  return (
    <div className="space-y-6">
      {isPro ? (
      <section className="space-y-4 rounded-xl border bg-background p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-semibold">Checkout questions</h2>
          <p className="text-xs text-muted-foreground">Name and email are always asked. Add anything else you need, like an Instagram handle or a size.</p>
        </div>
        <FieldError>{errors.fields}</FieldError>
        <div className="space-y-3">
          {fields.map((f, i) => (
            <div key={f.id} className="space-y-3 rounded-lg border p-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
                <Field label="Question" htmlFor={`field-label-${f.id}`}>
                  <Input id={`field-label-${f.id}`} value={f.label} onChange={(e) => setField(i, { label: e.target.value })} placeholder="Your Instagram handle" maxLength={120} />
                </Field>
                <Field label="Type">
                  <Select
                    value={f.type}
                    onValueChange={(v) => setField(i, { type: v as CustomField["type"], options: needsOptions(v as CustomField["type"]) ? (f.options ?? []) : undefined })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Button type="button" variant="ghost" size="icon" aria-label="Remove question" onClick={() => update({ fields: fields.filter((_, idx) => idx !== i) })}>
                  <Trash2 />
                </Button>
              </div>
              {needsOptions(f.type) && (
                <Field label="Options" htmlFor={`field-options-${f.id}`}>
                  <Textarea
                    id={`field-options-${f.id}`}
                    value={(f.options ?? []).join("\n")}
                    onChange={(e) => setField(i, { options: e.target.value.split("\n") })}
                    onBlur={() => setField(i, { options: (f.options ?? []).map((o) => o.trim()).filter(Boolean) })}
                    rows={3}
                    placeholder={"Small\nMedium\nLarge"}
                  />
                  <FieldHint>One option per line.</FieldHint>
                </Field>
              )}
              <label className="flex items-center gap-2 text-sm">
                <Switch size="sm" checked={f.required} onCheckedChange={(v) => setField(i, { required: v })} />
                Required
              </label>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addField}>
          <Plus data-icon="inline-start" /> Add question
        </Button>
      </section>
      ) : (
        <ProLock feature="checkout-questions" title="Checkout questions" description="Ask buyers for extra details at checkout — handle, size, anything. Available on Pro." />
      )}

      <section className="space-y-3 rounded-xl border bg-background p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="marketing">Marketing opt-in</Label>
            <p className="mt-1 text-xs text-muted-foreground">Show a &ldquo;Send me updates&rdquo; checkbox at checkout so you can email buyers later.</p>
          </div>
          <Switch id="marketing" checked={form.marketingOptIn} onCheckedChange={(v) => update({ marketingOptIn: v })} />
        </div>
      </section>

      {isPro ? (
      <section className="space-y-3 rounded-xl border bg-background p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="limitQty">Limit quantity</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              {limited ? `${quantitySold} of ${form.quantityLimit} sold${remaining === 0 ? ". Sold out." : remaining != null && remaining <= 10 ? `. Only ${remaining} left.` : "."}` : "Stop selling after a set number of orders. Handy for cohorts, seats or launch bundles."}
            </p>
          </div>
          <Switch id="limitQty" checked={limited} onCheckedChange={(v) => update({ quantityLimit: v ? Math.max(1, quantitySold, form.quantityLimit ?? 10) : null })} />
        </div>
        {limited && (
          <Field label="Total available" htmlFor="quantityLimit" error={errors.quantityLimit} className="max-w-[12rem]">
            <Input
              id="quantityLimit"
              inputMode="numeric"
              value={form.quantityLimit ?? ""}
              onChange={(e) => {
                const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                update({ quantityLimit: Number.isFinite(n) && n > 0 ? n : 1 });
              }}
              aria-invalid={Boolean(errors.quantityLimit)}
            />
            <FieldHint>Counts paid orders, including when this product is bought as an add-on.</FieldHint>
          </Field>
        )}
      </section>
      ) : (
        <ProLock feature="limited-quantity" title="Limit quantity" description="Cap how many you sell — cohorts, seats, launch bundles. Available on Pro." />
      )}

      {isPro ? (
      <section className="space-y-4 rounded-xl border bg-background p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-semibold">Order bump</h2>
          <p className="text-xs text-muted-foreground">Offer one more paid product as a one-tap add-on right above the pay button.</p>
        </div>
        {!canBump ? (
          <FieldHint>Order bumps need a price of at least {formatPrice(MIN_CHARGE_CENTS, currency)} on this product, so cards can be charged for the combined total.</FieldHint>
        ) : bumpCandidates.length === 0 ? (
          <FieldHint>Publish another paid download in your store to offer it here.</FieldHint>
        ) : (
          <>
            <Field label="Product" error={errors.bumpProductId}>
              <Select
                value={form.bumpProductId ?? NO_BUMP}
                onValueChange={(v) => update({ bumpProductId: v === NO_BUMP ? null : v, ...(v === NO_BUMP ? { bumpHeadline: "", bumpDiscountPercent: 0 } : {}) })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_BUMP}>No order bump</SelectItem>
                  {bumpCandidates.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.title} · {formatPrice(b.priceCents, currency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {bump && (
              <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                <Field label="Headline" htmlFor="bumpHeadline" error={errors.bumpHeadline}>
                  <Input id="bumpHeadline" value={form.bumpHeadline} onChange={(e) => update({ bumpHeadline: e.target.value })} maxLength={120} placeholder={bumpPlaceholder} />
                  <FieldHint>Leave blank to use the default.</FieldHint>
                </Field>
                <Field label="Percent off" htmlFor="bumpDiscountPercent" error={errors.bumpDiscountPercent}>
                  <Input
                    id="bumpDiscountPercent"
                    inputMode="numeric"
                    value={form.bumpDiscountPercent || ""}
                    onChange={(e) => {
                      const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                      update({ bumpDiscountPercent: Number.isFinite(n) ? Math.min(100, n) : 0 });
                    }}
                    placeholder="0"
                  />
                  <FieldHint>
                    Buyers pay {formatPrice(bumpPrice, currency)}
                    {form.bumpDiscountPercent > 0 ? ` instead of ${formatPrice(bump.priceCents, currency)}` : ""}.
                  </FieldHint>
                </Field>
              </div>
            )}
          </>
        )}
      </section>
      ) : (
        <ProLock feature="order-bump" title="Order bump" description="Offer a one-tap add-on above the pay button to lift order value. Available on Pro." />
      )}

      {isPro ? (
        <DiscountCodes productId={productId} currency={currency} priceCents={form.priceCents} initial={discountCodes} />
      ) : (
        <ProLock feature="discount-codes" title="Discount codes" description="Create promo codes with limits and expiry dates. Available on Pro." />
      )}

      <section className="space-y-4 rounded-xl border bg-background p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-semibold">Confirmation email</h2>
          <p className="text-xs text-muted-foreground">
            Sent after checkout with the download links. Leave blank for the default. You can use <code className="rounded bg-muted px-1">{"{{name}}"}</code>,{" "}
            <code className="rounded bg-muted px-1">{"{{product}}"}</code> and <code className="rounded bg-muted px-1">{"{{store}}"}</code>.
          </p>
        </div>
        <Field label="Subject" htmlFor="confirmationSubject" error={errors.confirmationSubject}>
          <Input id="confirmationSubject" value={form.confirmationSubject} onChange={(e) => update({ confirmationSubject: e.target.value })} maxLength={200} placeholder="Your {{product}} is ready" />
        </Field>
        <Field label="Message" htmlFor="confirmationBody" error={errors.confirmationBody}>
          <Textarea
            id="confirmationBody"
            value={form.confirmationBody}
            onChange={(e) => update({ confirmationBody: e.target.value })}
            rows={6}
            placeholder={"Hi {{name}},\n\nThanks for grabbing {{product}}. Your download links are below.\n\n{{store}}"}
          />
          <FieldHint>Plain text. Download links are added automatically under your message.</FieldHint>
        </Field>
      </section>
    </div>
  );
}
