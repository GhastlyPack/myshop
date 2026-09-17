"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProduct } from "@/app/app/products/[id]/actions";
import { DmKeywordHelper } from "@/components/app/dm-keyword-helper";
import type { TabProps } from "@/components/app/product-editor/editor";
import { Field, FieldHint } from "@/components/app/product-editor/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function OptionsTab({ form, update, errors, productId, username, slug }: TabProps & { productId: string; username: string; slug: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  function remove() {
    start(async () => {
      const res = await deleteProduct(productId);
      // deleteProduct redirects on success; only a failure returns.
      if (res && !res.ok) toast.error(res.error);
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border bg-background p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="listed">Show on my store page</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              {form.listed ? "Listed on your storefront." : "Hidden. Only people with the direct link can see it. Handy for DM-only offers."}
            </p>
          </div>
          <Switch id="listed" checked={form.listed} onCheckedChange={(v) => update({ listed: v })} />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-background p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-semibold">Instagram DM keyword</h2>
          <p className="text-xs text-muted-foreground">Tell followers to comment or DM a word, then reply with the product link. We draft the caption and reply for you.</p>
        </div>
        <Field label="Keyword" htmlFor="dmKeyword" error={errors.dmKeyword}>
          <Input id="dmKeyword" value={form.dmKeyword} onChange={(e) => update({ dmKeyword: e.target.value.toUpperCase() })} maxLength={40} placeholder="GUIDE" className="max-w-xs uppercase" />
          <FieldHint>Short and easy to type. One word works best.</FieldHint>
        </Field>
        <DmKeywordHelper username={username} slug={slug} keyword={form.dmKeyword || null} title={form.title || "Untitled product"} />
      </section>

      <section className="space-y-3 rounded-xl border border-destructive/40 bg-background p-4 sm:p-5">
        <div>
          <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
          <p className="text-xs text-muted-foreground">Deleting hides the product from your store and dashboard. Sales history stays in Income and past buyers keep their downloads.</p>
        </div>
        <Button type="button" variant="destructive" size="sm" onClick={() => setConfirm(true)}>
          Delete product
        </Button>
      </section>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{form.title || "Untitled product"}&rdquo;?</DialogTitle>
            <DialogDescription>The product disappears from your store and this list. Orders, customer records and existing download links are kept.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
              Delete forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
