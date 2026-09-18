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
  files = [],
}: TabProps & {
  productId: string;
  currency: string;
  quantitySold: number;
  bumpCandidates: BumpCandidate[];
  discountCodes: DiscountCodeRow[];
  tier: "basic" | "pro";
  /** The product's uploaded files, for choosing what each pricing tier unlocks. */
  files?: { id: string; filename: string }[];
}) {
  const isPro = tier === "pro";
  const fields = form.fields;
  const limited = form.quantityLimit != null;
  const remaining = form.quantityLimit != null ? Math.max(0, form.quantityLimit - quantitySold) : null;
  const canBump = form.priceCents >= MIN_CHARGE_CENTS;
  // The list is the model; a product that only ever set the legacy single bump is shown as a one-item list.
  const bumpsList = form.bumps && form.bumps.length > 0 ? form.bumps : form.bumpProductId ? [{ productId: form.bumpProductId, headline: form.bumpHeadline ?? "", discountPercent: form.bumpDiscountPercent ?? 0 }] : [];
  const variantsList = form.variants ?? [];
  const setBumps = (bumps: typeof bumpsList) => update({ bumps, bumpProductId: bumps[0]?.productId ?? null, bumpHeadline: bumps[0]?.headline ?? "", bumpDiscountPercent: bumps[0]?.discountPercent ?? 0 });
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
          <h2 className="text-sm font-semibold">{form.type === "booking" ? "Pre-call questionnaire" : "Checkout questions"}</h2>
          <p className="text-xs text-muted-foreground">
            {form.type === "booking"
              ? "Asked right after they book — on the confirmation page and by email. Their answers are emailed to you before the call."
              : "Name and email are always asked. Add anything else you need, like an Instagram handle or a size."}
          </p>
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
          <h2 className="text-sm font-semibold">Order bumps</h2>
          <p className="text-xs text-muted-foreground">Offer up to 5 more paid products as one-tap add-ons above the pay button. Buyers can add any of them.</p>
        </div>
        <FieldError>{errors.bumpProductId ?? errors.bumps}</FieldError>
        {!canBump ? (
          <FieldHint>Order bumps need a price of at least {formatPrice(MIN_CHARGE_CENTS, currency)} on this product, so cards can be charged for the combined total.</FieldHint>
        ) : bumpCandidates.length === 0 ? (
          <FieldHint>Publish another paid download in your store to offer it here.</FieldHint>
        ) : (
          <div className="space-y-3">
            {bumpsList.map((b, i) => {
              const cand = bumpCandidates.find((c) => c.id === b.productId) ?? null;
              const paid = cand ? bumpPriceCents(cand.priceCents, b.discountPercent ?? 0) : 0;
              const setB = (patch: Partial<typeof b>) => setBumps(bumpsList.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={`${b.productId}-${i}`} className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <Field label={`Bump ${i + 1}`}>
                        <Select value={b.productId} onValueChange={(v) => setB({ productId: v })}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {bumpCandidates.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.title} · {formatPrice(c.priceCents, currency)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove bump" className="mt-6" onClick={() => setBumps(bumpsList.filter((_, j) => j !== i))}>
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                    <Field label="Headline" htmlFor={`bumpHeadline-${i}`}>
                      <Input
                        id={`bumpHeadline-${i}`}
                        value={b.headline ?? ""}
                        onChange={(e) => setB({ headline: e.target.value })}
                        maxLength={120}
                        placeholder={cand ? `Add ${cand.title} for ${formatPrice(paid, currency)}` : "Add {title} for {price}"}
                      />
                      <FieldHint>Leave blank to use the default.</FieldHint>
                    </Field>
                    <Field label="Percent off" htmlFor={`bumpPct-${i}`}>
                      <Input
                        id={`bumpPct-${i}`}
                        inputMode="numeric"
                        value={b.discountPercent || ""}
                        onChange={(e) => {
                          const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                          setB({ discountPercent: Number.isFinite(n) ? Math.min(100, n) : 0 });
                        }}
                        placeholder="0"
                      />
                      {cand && (
                        <FieldHint>
                          Buyers pay {formatPrice(paid, currency)}
                          {(b.discountPercent ?? 0) > 0 ? ` instead of ${formatPrice(cand.priceCents, currency)}` : ""}.
                        </FieldHint>
                      )}
                    </Field>
                  </div>
                </div>
              );
            })}
            {bumpsList.length < 5 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={bumpCandidates.every((c) => bumpsList.some((b) => b.productId === c.id))}
                onClick={() => {
                  const used = new Set(bumpsList.map((b) => b.productId));
                  const next = bumpCandidates.find((c) => !used.has(c.id));
                  if (next) setBumps([...bumpsList, { productId: next.id, headline: "", discountPercent: 0 }]);
                }}
              >
                <Plus data-icon="inline-start" /> Add a bump
              </Button>
            )}
          </div>
        )}
      </section>
      ) : (
        <ProLock feature="order-bump" title="Order bumps" description="Offer one-tap add-ons above the pay button to lift order value. Available on Pro." />
      )}

      {isPro ? (
      <section className="space-y-4 rounded-xl border bg-background p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-semibold">Pricing tiers</h2>
          <p className="text-xs text-muted-foreground">Sell this product at more than one price — Basic / Plus / Pro — each unlocking the files you pick. Leave empty for a single price.</p>
        </div>
        <FieldError>{errors.variants}</FieldError>
        {form.type !== "download" ? (
          <FieldHint>Tiers are for digital downloads.</FieldHint>
        ) : (
          <div className="space-y-3">
            {variantsList.map((v, i) => {
              const setV = (patch: Partial<typeof v>) => update({ variants: variantsList.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
              const allIds = files.map((f) => f.id);
              // Empty (or unset) means every file, including ones uploaded later.
              const fileIds = v.fileIds ?? [];
              const included = fileIds.length === 0 ? allIds : fileIds;
              return (
                <div key={v.id ?? `new-${i}`} className="space-y-3 rounded-lg border p-3">
                  <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
                    <Field label="Tier name" htmlFor={`tier-name-${i}`}>
                      <Input id={`tier-name-${i}`} value={v.name} onChange={(e) => setV({ name: e.target.value })} maxLength={60} placeholder={["Basic", "Plus", "Pro"][i] ?? "Tier"} />
                    </Field>
                    <Field label="Price" htmlFor={`tier-price-${i}`}>
                      <Input
                        id={`tier-price-${i}`}
                        inputMode="decimal"
                        defaultValue={(v.priceCents / 100).toFixed(2)}
                        onBlur={(e) => setV({ priceCents: Math.max(0, Math.round((parseFloat(e.target.value) || 0) * 100)) })}
                      />
                    </Field>
                    <div className="flex items-end">
                      <Button type="button" variant="ghost" size="icon" aria-label="Remove tier" onClick={() => update({ variants: variantsList.filter((_, j) => j !== i) })}>
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                  <Field label="What's included" htmlFor={`tier-desc-${i}`}>
                    <Input id={`tier-desc-${i}`} value={v.description ?? ""} onChange={(e) => setV({ description: e.target.value })} maxLength={200} placeholder="One line buyers see under the tier name." />
                  </Field>
                  {files.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-sm font-medium">Files in this tier</span>
                      <p className="text-xs text-muted-foreground">Untick a file to leave it out of this tier.</p>
                      <div className="flex flex-wrap gap-2">
                        {files.map((f) => (
                          <label key={f.id} className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
                            <input
                              type="checkbox"
                              checked={included.includes(f.id)}
                              onChange={(e) => {
                                const next = e.target.checked ? [...new Set([...included, f.id])] : included.filter((id) => id !== f.id);
                                // Everything ticked is stored as "all" so newly uploaded files join automatically.
                                setV({ fileIds: next.length === allIds.length ? [] : next });
                              }}
                            />
                            <span className="max-w-[14rem] truncate">{f.filename}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {variantsList.length < 6 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => update({ variants: [...variantsList, { name: "", description: "", priceCents: form.priceCents, fileIds: [] }] })}
              >
                <Plus data-icon="inline-start" /> Add a tier
              </Button>
            )}
            {variantsList.length > 0 && <FieldHint>With tiers, the product&apos;s own price shows as the &quot;from&quot; price on your store.</FieldHint>}
          </div>
        )}
      </section>
      ) : (
        <ProLock feature="pricing-tiers" title="Pricing tiers" description="Sell one product at several prices, each unlocking different files. Available on Pro." />
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
