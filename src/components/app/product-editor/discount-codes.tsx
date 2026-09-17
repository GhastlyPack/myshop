"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addDiscountCode, deleteDiscountCode, setDiscountCodeActive, type DiscountCodeRow } from "@/app/app/products/[id]/actions";
import { Field, FieldError, FieldHint } from "@/components/app/product-editor/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { dollarsToCents, formatPrice } from "@/lib/format";

type Kind = "percent" | "amount";

function describe(c: DiscountCodeRow, currency: string) {
  return c.percentOff != null ? `${c.percentOff}% off` : `${formatPrice(c.amountOffCents ?? 0, currency)} off`;
}

function expired(c: DiscountCodeRow) {
  return Boolean(c.expiresAt && c.expiresAt.getTime() <= Date.now());
}

/**
 * Per-product discount codes. Rows are saved immediately through their own server
 * actions (independent of the editor's Save button) so a code can be handed out right away.
 */
export function DiscountCodes({ productId, currency, priceCents, initial }: { productId: string; currency: string; priceCents: number; initial: DiscountCodeRow[] }) {
  const [codes, setCodes] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<Kind>("percent");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCode("");
    setKind("percent");
    setValue("");
    setMaxUses("");
    setExpiresAt("");
    setError(null);
    setAdding(false);
  }

  function submit() {
    setError(null);
    const num = kind === "percent" ? (/^\d+$/.test(value.trim()) ? Number(value.trim()) : null) : dollarsToCents(value);
    if (num == null || num <= 0) return setError(kind === "percent" ? "Enter a whole percent, like 20." : "Enter an amount like 5.00.");
    const uses = maxUses.trim() ? (/^\d+$/.test(maxUses.trim()) ? Number(maxUses.trim()) : null) : null;
    if (maxUses.trim() && (uses == null || uses < 1)) return setError("Max uses must be a whole number.");
    start(async () => {
      const res = await addDiscountCode(productId, { code, kind, value: num, maxUses: uses, expiresAt: expiresAt || null });
      if (!res.ok) return setError(res.error);
      setCodes((c) => [res.code, ...c]);
      toast.success(`Code ${res.code.code} added.`);
      reset();
    });
  }

  function toggle(c: DiscountCodeRow, active: boolean) {
    setBusy(c.id);
    setCodes((rows) => rows.map((r) => (r.id === c.id ? { ...r, active } : r)));
    start(async () => {
      const res = await setDiscountCodeActive(productId, c.id, active);
      setBusy(null);
      if (!res.ok) {
        setCodes((rows) => rows.map((r) => (r.id === c.id ? { ...r, active: !active } : r)));
        toast.error(res.error);
      }
    });
  }

  function remove(c: DiscountCodeRow) {
    setBusy(c.id);
    start(async () => {
      const res = await deleteDiscountCode(productId, c.id);
      setBusy(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setCodes((rows) => rows.filter((r) => r.id !== c.id));
    });
  }

  return (
    <section className="space-y-4 rounded-xl border bg-background p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold">Discount codes</h2>
        <p className="text-xs text-muted-foreground">
          {priceCents > 0 ? "Buyers enter a code at checkout. Codes save instantly." : "Codes only apply once this product has a price."}
        </p>
      </div>

      {codes.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {codes.map((c) => {
            const dead = expired(c) || (c.maxUses != null && c.uses >= c.maxUses);
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold tracking-wide">{c.code}</span>
                    <span className="text-sm text-muted-foreground">{describe(c, currency)}</span>
                    {!c.active && <Badge variant="secondary">Off</Badge>}
                    {c.active && expired(c) && <Badge variant="secondary">Expired</Badge>}
                    {c.active && !expired(c) && c.maxUses != null && c.uses >= c.maxUses && <Badge variant="secondary">Used up</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.maxUses != null ? `${c.uses} of ${c.maxUses} used` : `${c.uses} used`}
                    {c.expiresAt ? ` · until ${c.expiresAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
                  </p>
                </div>
                <Switch size="sm" checked={c.active} disabled={busy === c.id || dead} aria-label={`${c.code} active`} onCheckedChange={(v) => toggle(c, v)} />
                <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${c.code}`} disabled={busy === c.id} onClick={() => remove(c)}>
                  {busy === c.id && pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="grid gap-3 md:grid-cols-[1fr_10rem_7rem]">
            <Field label="Code" htmlFor="dc-code">
              <Input
                id="dc-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                placeholder="LAUNCH20"
                maxLength={32}
                autoCapitalize="characters"
                spellCheck={false}
                className="font-mono"
              />
            </Field>
            <Field label="Type">
              <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent off</SelectItem>
                  <SelectItem value="amount">Amount off</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={kind === "percent" ? "Percent" : `Amount (${currency.toUpperCase()})`} htmlFor="dc-value">
              <Input id="dc-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder={kind === "percent" ? "20" : "5.00"} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Max uses (optional)" htmlFor="dc-max">
              <Input id="dc-max" inputMode="numeric" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited" />
            </Field>
            <Field label="Expires (optional)" htmlFor="dc-exp">
              <Input id="dc-exp" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </Field>
          </div>
          <FieldError>{error}</FieldError>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={pending} onClick={submit}>
              {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
              Add code
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={reset}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)} disabled={priceCents <= 0}>
          <Plus data-icon="inline-start" /> Add code
        </Button>
      )}
      {codes.length === 0 && !adding && priceCents > 0 && <FieldHint>No codes yet. Try one for launches, DMs or a loyal-follower perk.</FieldHint>}
    </section>
  );
}
