"use client";

import { useState } from "react";
import type { EditorSection, TabProps } from "@/components/app/product-editor/editor";
import { Field, FieldHint } from "@/components/app/product-editor/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { centsToDollars, dollarsToCents } from "@/lib/format";
import { toSlug } from "@/lib/product-input";

const NO_SECTION = "__none__";

export function DetailsTab({ form, update, errors, sections, currency, canBook }: TabProps & { sections: EditorSection[]; currency: string }) {
  const [slugTouched, setSlugTouched] = useState(Boolean(form.slug) && form.slug !== toSlug(form.title) && !form.slug.startsWith("untitled-"));
  const [priceText, setPriceText] = useState(centsToDollars(form.priceCents));
  const [priceError, setPriceError] = useState<string | null>(null);

  function onTitle(title: string) {
    update(slugTouched ? { title } : { title, slug: toSlug(title) });
  }

  function onPrice(text: string) {
    setPriceText(text);
    const cents = dollarsToCents(text);
    if (cents === null) return setPriceError("Enter an amount like 9.99.");
    setPriceError(null);
    update({ priceCents: cents });
  }

  return (
    <div className="grid gap-6">
      <div className="space-y-5 rounded-xl border bg-background p-4 sm:p-5">
        <Field label="Title" htmlFor="title" error={errors.title}>
          <Input id="title" value={form.title} onChange={(e) => onTitle(e.target.value)} maxLength={140} placeholder="30-day content calendar" aria-invalid={Boolean(errors.title)} />
        </Field>
        <Field label="Subtitle" htmlFor="subtitle" error={errors.subtitle}>
          <Input id="subtitle" value={form.subtitle} onChange={(e) => update({ subtitle: e.target.value })} maxLength={200} placeholder="Short line under the title" />
        </Field>
        <Field label="Slug" htmlFor="slug" error={errors.slug}>
          <Input
            id="slug"
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              update({ slug: e.target.value.toLowerCase() });
            }}
            onBlur={() => update({ slug: toSlug(form.slug || form.title) })}
            maxLength={80}
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={Boolean(errors.slug)}
          />
          <FieldHint>Lowercase letters, numbers and dashes. Part of the product link, so keep it short.</FieldHint>
        </Field>
        <Field label="Description" htmlFor="description" error={errors.description}>
          <Textarea id="description" value={form.description} onChange={(e) => update({ description: e.target.value })} rows={8} placeholder="What is inside, who it is for, what they get." />
          <FieldHint>Markdown works: **bold**, *italic*, - lists, [links](https://...).</FieldHint>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Type" error={errors.type}>
            <Select
              value={form.type}
              onValueChange={(v) => {
                const type = v as "download" | "link" | "booking";
                // Booking products need a default call length and a CTA that reads like one; only replace the stock "Get it".
                update(
                  type === "booking"
                    ? { type, durationMinutes: form.durationMinutes ?? 60, ...(form.buttonText === "Get it" ? { buttonText: "Book a call" } : {}) }
                    : { type, ...(form.buttonText === "Book a call" ? { buttonText: "Get it" } : {}) },
                );
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="download">Digital download</SelectItem>
                <SelectItem value="link">Link</SelectItem>
                {(canBook || form.type === "booking") && <SelectItem value="booking">Booking (a call)</SelectItem>}
              </SelectContent>
            </Select>
            <FieldHint>
              {form.type === "download"
                ? "Buyers get your files after checkout."
                : form.type === "link"
                  ? "Buyers are sent to a URL after checkout."
                  : "Buyers pick a time and it books onto your connected calendar. Set your open hours in Settings → Bookings."}
            </FieldHint>
          </Field>
          <Field label="Price" htmlFor="price" error={priceError ?? errors.priceCents}>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">{currency.toUpperCase()}</span>
              <Input id="price" inputMode="decimal" value={priceText} onChange={(e) => onPrice(e.target.value)} placeholder="0.00" className="pl-12" aria-invalid={Boolean(priceError)} />
            </div>
            <FieldHint>{form.priceCents > 0 ? "Connect Stripe in Settings to accept payments." : "Leave empty for a free product (collects name + email)."}</FieldHint>
          </Field>
        </div>

        {form.type === "booking" && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Call length" error={errors.durationMinutes}>
              <Select value={String(form.durationMinutes ?? 60)} onValueChange={(v) => update({ durationMinutes: Number(v) })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[15, 30, 45, 60, 90, 120].map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m < 60 ? `${m} minutes` : m === 60 ? "1 hour" : m === 90 ? "1.5 hours" : `${m / 60} hours`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldHint>How long each call runs. Slots are generated back-to-back within your open hours.</FieldHint>
            </Field>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Card style" error={errors.cardStyle}>
            <Select value={form.cardStyle} onValueChange={(v) => update({ cardStyle: v as "button" | "callout" | "preview" })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="button">Button (title only)</SelectItem>
                <SelectItem value="callout">Callout (thumbnail + text)</SelectItem>
                <SelectItem value="preview">Preview (large image)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Button text" htmlFor="buttonText" error={errors.buttonText}>
            <Input id="buttonText" value={form.buttonText} onChange={(e) => update({ buttonText: e.target.value })} maxLength={40} placeholder="Get it" aria-invalid={Boolean(errors.buttonText)} />
          </Field>
        </div>

        <Field label="Section" error={errors.sectionId}>
          <Select value={form.sectionId ?? NO_SECTION} onValueChange={(v) => update({ sectionId: v === NO_SECTION ? null : v })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SECTION}>No section</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {sections.length === 0 && <FieldHint>Create sections from your store page to group products.</FieldHint>}
        </Field>
      </div>
    </div>
  );
}
