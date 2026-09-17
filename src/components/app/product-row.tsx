"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink, EyeOff, GripVertical, ImageIcon, Link2, Pencil } from "lucide-react";
import { CopyButton } from "@/components/app/copy-button";
import type { BoardProduct } from "@/components/app/products-board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ProductRow({ product, container, username, baseUrl }: { product: BoardProduct; container: string; username: string; baseUrl: string }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: product.id,
    data: { type: "product", container },
  });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={cn(isDragging && "opacity-40")}>
      <ProductRowStatic
        product={product}
        username={username}
        baseUrl={baseUrl}
        handle={
          <button
            ref={setActivatorNodeRef}
            type="button"
            className="-ml-1 flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
            aria-label={`Reorder ${product.title}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        }
      />
    </div>
  );
}

export function ProductRowStatic({
  product,
  username,
  baseUrl,
  handle,
  overlay,
}: {
  product: BoardProduct;
  username: string;
  baseUrl: string;
  handle?: React.ReactNode;
  overlay?: boolean;
}) {
  const path = `/${username}/${product.slug}`;
  const editHref = `/app/products/${product.id}`;
  return (
    <div className={cn("flex items-center gap-2.5 rounded-lg border bg-background px-2.5 py-2 sm:gap-3 sm:px-3", overlay && "shadow-lg ring-1 ring-foreground/10")}>
      {handle}
      <Link href={editHref} className="relative size-11 shrink-0 overflow-hidden rounded-md bg-muted">
        {product.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.thumbnailUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-muted-foreground">
            {product.type === "link" ? <Link2 className="size-4" /> : <ImageIcon className="size-4" />}
          </span>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={editHref} className="block truncate text-sm font-medium hover:underline">
          {product.title}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{formatPrice(product.priceCents, product.currency)}</span>
          <Badge variant={product.status === "published" ? "default" : "secondary"} className="h-4 px-1.5 text-[10px] uppercase">
            {product.status}
          </Badge>
          {!product.listed && (
            <Badge variant="outline" className="h-4 gap-1 px-1.5 text-[10px] uppercase">
              <EyeOff className="size-2.5" /> Hidden
            </Badge>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center">
        <CopyButton text={`${baseUrl}${path}`} />
        <Button asChild variant="ghost" size="icon-sm" aria-label="View product page" title="View">
          <a href={path} target="_blank" rel="noreferrer">
            <ExternalLink />
          </a>
        </Button>
        <Button asChild variant="ghost" size="icon-sm" aria-label="Edit product" title="Edit">
          <Link href={editHref}>
            <Pencil />
          </Link>
        </Button>
      </div>
    </div>
  );
}
