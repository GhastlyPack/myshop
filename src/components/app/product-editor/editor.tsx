"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ga } from "@/lib/ga";
import { saveProduct, type DiscountCodeRow, type FileRow } from "@/app/app/products/[id]/actions";
import { CheckoutTab } from "@/components/app/product-editor/checkout-tab";
import { ContentTab } from "@/components/app/product-editor/content-tab";
import { DetailsTab } from "@/components/app/product-editor/details-tab";
import { OptionsTab } from "@/components/app/product-editor/options-tab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ProductInput } from "@/lib/product-input";

export type EditorProduct = Omit<ProductInput, "links"> & { id: string; status: "draft" | "published" };
export type EditorSection = { id: string; title: string };
export type BumpCandidate = { id: string; title: string; priceCents: number };
export type Errors = Record<string, string>;

export type TabProps = {
  form: ProductInput;
  update: (patch: Partial<ProductInput>) => void;
  errors: Errors;
};

const TAB_FOR_ERROR: Record<string, string> = {
  files: "content",
  links: "content",
  fields: "checkout",
  confirmationSubject: "checkout",
  confirmationBody: "checkout",
  quantityLimit: "checkout",
  bumpProductId: "checkout",
  bumpHeadline: "checkout",
  bumpDiscountPercent: "checkout",
  dmKeyword: "options",
  dmReplyText: "options",
  listed: "options",
};

export function ProductEditor({
  product,
  thumbnailUrl,
  bannerUrl,
  files: initialFiles,
  links,
  sections,
  store,
  baseUrl,
  quantitySold,
  bumpCandidates,
  discountCodes,
}: {
  product: EditorProduct;
  thumbnailUrl: string | null;
  bannerUrl: string | null;
  files: FileRow[];
  links: { url: string; label: string }[];
  sections: EditorSection[];
  store: { username: string; currency: string };
  baseUrl: string;
  quantitySold: number;
  bumpCandidates: BumpCandidate[];
  discountCodes: DiscountCodeRow[];
}) {
  const router = useRouter();
  const { id, status: initialStatus, ...rest } = product;
  const [form, setForm] = useState<ProductInput>({ ...rest, links });
  const [status, setStatus] = useState(initialStatus);
  const [savedSlug, setSavedSlug] = useState(product.slug);
  const [files, setFiles] = useState<FileRow[]>(initialFiles);
  const [errors, setErrors] = useState<Errors>({});
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState("details");
  const [pending, start] = useTransition();
  const [intent, setIntent] = useState<"save" | "publish" | "unpublish" | null>(null);

  const update = useCallback((patch: Partial<ProductInput>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  function submit(kind: "save" | "publish" | "unpublish") {
    setIntent(kind);
    start(async () => {
      const res = await saveProduct(id, form, kind);
      setIntent(null);
      if (!res.ok) {
        setErrors(res.errors);
        const first = Object.keys(res.errors)[0];
        if (first) setTab(TAB_FOR_ERROR[first] ?? "details");
        toast.error(res.errors.form ?? "Fix the highlighted fields and try again.");
        return;
      }
      setErrors({});
      setDirty(false);
      setStatus(res.status);
      setSavedSlug(res.slug);
      setForm((f) => ({ ...f, slug: res.slug }));
      ga(kind === "publish" ? "product_published" : kind === "unpublish" ? "product_unpublished" : "product_saved", { product_type: form.type, is_free: Number(form.priceCents) === 0, card_style: form.cardStyle });
      toast.success(kind === "publish" ? "Published. It is live on your store." : kind === "unpublish" ? "Moved back to draft." : "Saved.");
      router.refresh();
    });
  }

  const publicPath = `/${store.username}/${savedSlug}`;

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-4 -mt-6 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:-mt-10 sm:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/app">
              <ArrowLeft data-icon="inline-start" /> Store
            </Link>
          </Button>
          <Badge variant={status === "published" ? "default" : "secondary"} className="uppercase">
            {status}
          </Badge>
          {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
          <div className="ml-auto flex items-center gap-2">
            {status === "published" && (
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <a href={publicPath} target="_blank" rel="noreferrer">
                  View <ExternalLink data-icon="inline-end" />
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" disabled={pending} onClick={() => submit("save")}>
              {pending && intent === "save" && <Loader2 className="animate-spin" data-icon="inline-start" />}
              Save
            </Button>
            {status === "published" ? (
              <Button variant="secondary" size="sm" disabled={pending} onClick={() => submit("unpublish")}>
                {pending && intent === "unpublish" && <Loader2 className="animate-spin" data-icon="inline-start" />}
                Unpublish
              </Button>
            ) : (
              <Button size="sm" disabled={pending} onClick={() => submit("publish")}>
                {pending && intent === "publish" && <Loader2 className="animate-spin" data-icon="inline-start" />}
                Publish
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight">{form.title || "Untitled product"}</h1>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {baseUrl.replace(/^https?:\/\//, "")}
          {publicPath}
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="checkout">Checkout</TabsTrigger>
          <TabsTrigger value="options">Options</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="pt-4">
          <DetailsTab form={form} update={update} errors={errors} thumbnailUrl={thumbnailUrl} bannerUrl={bannerUrl} sections={sections} currency={store.currency} />
        </TabsContent>
        <TabsContent value="content" className="pt-4">
          <ContentTab form={form} update={update} errors={errors} productId={id} files={files} setFiles={setFiles} />
        </TabsContent>
        <TabsContent value="checkout" className="pt-4">
          <CheckoutTab
            form={form}
            update={update}
            errors={errors}
            productId={id}
            currency={store.currency}
            quantitySold={quantitySold}
            bumpCandidates={bumpCandidates}
            discountCodes={discountCodes}
          />
        </TabsContent>
        <TabsContent value="options" className="pt-4">
          <OptionsTab form={form} update={update} errors={errors} productId={id} username={store.username} slug={savedSlug} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
