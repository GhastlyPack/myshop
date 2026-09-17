"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { reorderProducts } from "@/app/app/actions";
import { reorderSections } from "@/app/app/sections/actions";
import { AddSection } from "@/components/app/add-section";
import { NewProductButton } from "@/components/app/new-product-button";
import { ProductRow, ProductRowStatic } from "@/components/app/product-row";
import { SectionBlock } from "@/components/app/section-block";

export type BoardSection = { id: string; title: string };
export type BoardProduct = {
  id: string;
  sectionId: string | null;
  title: string;
  slug: string;
  priceCents: number;
  currency: string;
  status: "draft" | "published";
  listed: boolean;
  type: "download" | "link";
  thumbnailUrl: string | null;
};

export const NONE = "__none__";
export const containerDroppableId = (key: string) => `container:${key}`;

type DragData = { type: "product" | "section" | "container"; container?: string };

export function ProductsBoard({
  sections,
  products,
  username,
  baseUrl,
}: {
  sections: BoardSection[];
  products: BoardProduct[];
  username: string;
  baseUrl: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const sectionsById = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);

  const [sectionOrder, setSectionOrder] = useState<string[]>(() => sections.map((s) => s.id));
  const [columns, setColumns] = useState<Record<string, string[]>>(() => {
    const cols: Record<string, string[]> = { [NONE]: [] };
    for (const s of sections) cols[s.id] = [];
    for (const p of products) {
      const key = p.sectionId && cols[p.sectionId] ? p.sectionId : NONE;
      cols[key].push(p.id);
    }
    return cols;
  });
  const [active, setActive] = useState<{ id: UniqueIdentifier; type: DragData["type"] } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const collision: CollisionDetection = (args) => {
    const type = (args.active.data.current as DragData | undefined)?.type;
    const containers = args.droppableContainers.filter((c) => {
      const t = (c.data.current as DragData | undefined)?.type;
      return type === "section" ? t === "section" : t === "product" || t === "container";
    });
    if (type === "product") {
      const within = pointerWithin({ ...args, droppableContainers: containers });
      const productHits = within.filter((c) => (c.data?.droppableContainer?.data.current as DragData | undefined)?.type === "product");
      if (productHits.length) return productHits;
      if (within.length) return within;
    }
    return closestCorners({ ...args, droppableContainers: containers });
  };

  function findContainer(id: UniqueIdentifier): string | undefined {
    const s = String(id);
    if (s.startsWith("container:")) return s.slice("container:".length);
    return Object.keys(columns).find((k) => columns[k].includes(s));
  }

  function onDragStart({ active }: DragStartEvent) {
    setActive({ id: active.id, type: (active.data.current as DragData).type });
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || (active.data.current as DragData).type !== "product") return;
    const from = findContainer(active.id);
    const to = findContainer(over.id);
    if (!from || !to || from === to) return;
    setColumns((prev) => {
      const fromItems = prev[from] ?? [];
      const toItems = prev[to] ?? [];
      const overIndex = toItems.indexOf(String(over.id));
      let newIndex: number;
      if (overIndex < 0) newIndex = toItems.length;
      else {
        const translated = active.rect.current.translated;
        const below = translated ? translated.top > over.rect.top + over.rect.height / 2 : false;
        newIndex = overIndex + (below ? 1 : 0);
      }
      return {
        ...prev,
        [from]: fromItems.filter((id) => id !== active.id),
        [to]: [...toItems.slice(0, newIndex), String(active.id), ...toItems.slice(newIndex)],
      };
    });
  }

  function persistProducts(cols: Record<string, string[]>, order: string[]) {
    const items = [
      ...cols[NONE].map((id) => ({ id, sectionId: null })),
      ...order.flatMap((sid) => (cols[sid] ?? []).map((id) => ({ id, sectionId: sid }))),
    ];
    startTransition(async () => {
      const res = await reorderProducts(items);
      if (!res.ok) {
        toast.error(res.error);
        router.refresh();
      }
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActive(null);
    if (!over) return;
    const type = (active.data.current as DragData).type;

    if (type === "section") {
      if (active.id === over.id) return;
      const from = sectionOrder.indexOf(String(active.id));
      const to = sectionOrder.indexOf(String(over.id));
      if (from < 0 || to < 0) return;
      const next = arrayMove(sectionOrder, from, to);
      setSectionOrder(next);
      startTransition(async () => {
        const res = await reorderSections(next);
        if (!res.ok) {
          toast.error(res.error);
          router.refresh();
        }
      });
      return;
    }

    const container = findContainer(active.id);
    const overContainer = findContainer(over.id);
    if (!container || !overContainer) return;
    let next = columns;
    if (container === overContainer && active.id !== over.id) {
      const items = columns[container];
      const from = items.indexOf(String(active.id));
      const to = items.indexOf(String(over.id));
      if (from >= 0 && to >= 0) {
        next = { ...columns, [container]: arrayMove(items, from, to) };
        setColumns(next);
      }
    }
    persistProducts(next, sectionOrder);
  }

  const total = products.length;
  const activeProduct = active?.type === "product" ? byId.get(String(active.id)) : undefined;
  const activeSection = active?.type === "section" ? sectionsById.get(String(active.id)) : undefined;

  if (total === 0 && sections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-background px-6 py-14 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-muted">
          <Package className="size-5 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-base font-semibold">No products yet</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Add a digital download or a link, set a price (or make it free), then publish. Your store link is ready to go in your bio.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <NewProductButton label="Create your first product" />
          <AddSection variant="outline" />
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
      <div className="space-y-5">
        <SectionBlock id={NONE} title={sections.length ? "No section" : null} productIds={columns[NONE]} count={columns[NONE].length} isNone>
          {columns[NONE].map((id) => {
            const p = byId.get(id);
            return p ? <ProductRow key={id} product={p} container={NONE} username={username} baseUrl={baseUrl} /> : null;
          })}
        </SectionBlock>

        <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
          {sectionOrder.map((sid) => {
            const s = sectionsById.get(sid);
            if (!s) return null;
            const ids = columns[sid] ?? [];
            return (
              <SectionBlock key={sid} id={sid} title={s.title} productIds={ids} count={ids.length}>
                {ids.map((id) => {
                  const p = byId.get(id);
                  return p ? <ProductRow key={id} product={p} container={sid} username={username} baseUrl={baseUrl} /> : null;
                })}
              </SectionBlock>
            );
          })}
        </SortableContext>

        <div className="flex flex-wrap items-center gap-2">
          <AddSection variant="outline" />
          {total > 0 && <p className="text-xs text-muted-foreground">Drag the handle to reorder products or move them between sections.</p>}
        </div>
      </div>
      <DragOverlay>
        {activeProduct ? (
          <ProductRowStatic product={activeProduct} username={username} baseUrl={baseUrl} overlay />
        ) : activeSection ? (
          <div className="rounded-lg border bg-background px-3 py-2 text-sm font-medium shadow-md">{activeSection.title}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
