"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateProfile, type ProfileInput } from "@/app/app/settings/actions";
import { ImageUpload } from "@/components/app/image-upload";
import { Field, FieldHint } from "@/components/app/product-editor/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCIES } from "@/lib/format";

const CURRENCY_LABELS: Record<(typeof CURRENCIES)[number], string> = {
  usd: "USD · US dollar",
  eur: "EUR · Euro",
  gbp: "GBP · British pound",
  cad: "CAD · Canadian dollar",
  aud: "AUD · Australian dollar",
};

type Social = keyof ProfileInput["socials"];
const SOCIALS: { key: Social; label: string; placeholder: string; prefix?: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "yourname", prefix: "@" },
  { key: "tiktok", label: "TikTok", placeholder: "yourname", prefix: "@" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourname" },
  { key: "x", label: "X", placeholder: "yourname", prefix: "@" },
  { key: "threads", label: "Threads", placeholder: "yourname", prefix: "@" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/yourname" },
  { key: "website", label: "Website", placeholder: "https://" },
  { key: "email", label: "Contact email", placeholder: "you@example.com" },
];

export function SettingsForm({ initial, avatarUrl, username }: { initial: ProfileInput; avatarUrl: string | null; username: string }) {
  const router = useRouter();
  const [form, setForm] = useState<ProfileInput>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  function update(patch: Partial<ProfileInput>) {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }
  function setSocial(key: Social, value: string) {
    update({ socials: { ...form.socials, [key]: value } });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await updateProfile(form);
      if (!res.ok) {
        setErrors(res.errors);
        toast.error("Fix the highlighted fields and try again.");
        return;
      }
      setErrors({});
      setDirty(false);
      toast.success("Settings saved.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="space-y-5 rounded-xl border bg-background p-4 sm:p-5">
        <div>
          <h2 className="text-base font-semibold">Profile</h2>
          <p className="text-xs text-muted-foreground">Shown at the top of visitmy.shop/{username}.</p>
        </div>
        <ImageUpload scope="avatar" shape="circle" label="Profile photo" initialUrl={avatarUrl} onChange={(key) => update({ avatarKey: key })} />
        <Field label="Display name" htmlFor="displayName" error={errors.displayName}>
          <Input id="displayName" value={form.displayName} onChange={(e) => update({ displayName: e.target.value })} maxLength={80} aria-invalid={Boolean(errors.displayName)} />
        </Field>
        <Field label="Bio" htmlFor="bio" error={errors.bio}>
          <Textarea id="bio" value={form.bio} onChange={(e) => update({ bio: e.target.value })} maxLength={300} rows={3} />
          <FieldHint>{form.bio.length}/300</FieldHint>
        </Field>
        <Field label="About" htmlFor="about" error={errors.about}>
          <Textarea id="about" value={form.about ?? ""} onChange={(e) => update({ about: e.target.value })} maxLength={4000} rows={8} placeholder="Who you are, who your products are for, what people get. Markdown works." />
          <FieldHint>Shown under your products. Search engines read this, so say what you actually do.</FieldHint>
        </Field>
        <Field label="Store currency" error={errors.currency}>
          <Select value={form.currency} onValueChange={(v) => update({ currency: v as ProfileInput["currency"] })}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CURRENCY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldHint>Applies to every product. Changing it does not convert existing prices.</FieldHint>
        </Field>
      </section>

      <section className="space-y-5 rounded-xl border bg-background p-4 sm:p-5">
        <div>
          <h2 className="text-base font-semibold">Social links</h2>
          <p className="text-xs text-muted-foreground">Shown as icons on your store. Leave blank to hide.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIALS.map((s) => (
            <Field key={s.key} label={s.label} htmlFor={`social-${s.key}`} error={errors[`socials.${s.key}`]}>
              <div className="relative">
                {s.prefix && <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">{s.prefix}</span>}
                <Input
                  id={`social-${s.key}`}
                  value={form.socials[s.key]}
                  onChange={(e) => setSocial(s.key, e.target.value)}
                  placeholder={s.placeholder}
                  className={s.prefix ? "pl-7" : undefined}
                  inputMode={s.key === "email" ? "email" : s.prefix ? "text" : "url"}
                  autoCapitalize="none"
                  aria-invalid={Boolean(errors[`socials.${s.key}`])}
                />
              </div>
            </Field>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
          Save changes
        </Button>
        {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
      </div>
    </form>
  );
}
