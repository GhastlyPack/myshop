"use client";

import { Plus, Trash2 } from "lucide-react";
import type { CustomField } from "@/db/schema";
import type { TabProps } from "@/components/app/product-editor/editor";
import { Field, FieldError, FieldHint } from "@/components/app/product-editor/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const FIELD_TYPES: { value: CustomField["type"]; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "phone", label: "Phone number" },
  { value: "select", label: "Dropdown (pick one)" },
  { value: "multiselect", label: "Checkboxes (pick many)" },
  { value: "checkbox", label: "Single checkbox" },
];

const needsOptions = (t: CustomField["type"]) => t === "select" || t === "multiselect";

export function CheckoutTab({ form, update, errors }: TabProps) {
  const fields = form.fields;
  function setField(i: number, patch: Partial<CustomField>) {
    update({ fields: fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) });
  }
  function addField() {
    update({ fields: [...fields, { id: `f_${Math.random().toString(36).slice(2, 10)}`, label: "", type: "text", required: false }] });
  }

  return (
    <div className="space-y-6">
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

      <section className="space-y-3 rounded-xl border bg-background p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="marketing">Marketing opt-in</Label>
            <p className="mt-1 text-xs text-muted-foreground">Show a &ldquo;Send me updates&rdquo; checkbox at checkout so you can email buyers later.</p>
          </div>
          <Switch id="marketing" checked={form.marketingOptIn} onCheckedChange={(v) => update({ marketingOptIn: v })} />
        </div>
      </section>

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
