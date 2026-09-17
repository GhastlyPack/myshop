"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Loader2, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteSection, renameSection } from "@/app/app/sections/actions";
import { containerDroppableId } from "@/components/app/products-board";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * One section on the board: a sortable header (unless it is the "no section" bucket)
 * plus a droppable list of product rows. Children are the rendered rows.
 */
export function SectionBlock({
  id,
  title,
  productIds,
  count,
  isNone,
  children,
}: {
  id: string;
  title: string | null;
  productIds: string[];
  count: number;
  isNone?: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { type: "section" },
    disabled: Boolean(isNone),
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: containerDroppableId(id), data: { type: "container", container: id } });

  return (
    <section
      ref={isNone ? undefined : setNodeRef}
      style={isNone ? undefined : { transform: CSS.Translate.toString(transform), transition }}
      className={cn("space-y-2", isDragging && "opacity-40")}
    >
      {title !== null && (
        <SectionHeader
          id={id}
          title={title}
          count={count}
          handle={
            isNone ? null : (
              <button
                ref={setActivatorNodeRef}
                type="button"
                className="flex h-7 w-6 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
                aria-label={`Reorder section ${title}`}
                {...attributes}
                {...listeners}
              >
                <GripVertical className="size-4" />
              </button>
            )
          }
          isNone={isNone}
        />
      )}
      <SortableContext items={productIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setDropRef}
          className={cn(
            "space-y-2 rounded-lg transition-colors",
            productIds.length === 0 && "border border-dashed px-3 py-4 text-center text-xs text-muted-foreground",
            isOver && productIds.length === 0 && "border-foreground/40 bg-muted/60",
          )}
        >
          {productIds.length === 0 ? (isNone ? "Drop products here to take them out of a section." : "Drop products here.") : children}
        </div>
      </SortableContext>
    </section>
  );
}

function SectionHeader({ id, title, count, handle, isNone }: { id: string; title: string; count: number; handle: React.ReactNode; isNone?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    if (draft.trim() === title) return setEditing(false);
    start(async () => {
      const res = await renameSection(id, draft);
      if (!res.ok) {
            toast.error(res.error);
            return;
          }
      setEditing(false);
      router.refresh();
    });
  }

  function remove() {
    start(async () => {
      const res = await deleteSection(id);
      if (!res.ok) {
            toast.error(res.error);
            return;
          }
      toast.success("Section deleted. Its products are now unsectioned.");
      setConfirm(false);
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-7 items-center gap-1.5">
      {handle}
      {editing ? (
        <form
          className="flex flex-1 items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={80} autoFocus className="h-7 max-w-xs text-sm" />
          <Button type="submit" size="icon-sm" variant="ghost" disabled={pending} aria-label="Save name">
            {pending ? <Loader2 className="animate-spin" /> : <Check />}
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Cancel"
            onClick={() => {
              setDraft(title);
              setEditing(false);
            }}
          >
            <X />
          </Button>
        </form>
      ) : (
        <>
          <h2 className={cn("truncate text-sm font-semibold", isNone && "font-medium text-muted-foreground")}>{title}</h2>
          <span className="text-xs text-muted-foreground">{count}</span>
          {!isNone && (
            <div className="ml-auto flex items-center">
              <Button type="button" size="icon-sm" variant="ghost" aria-label="Rename section" onClick={() => setEditing(true)}>
                <Pencil />
              </Button>
              <Button type="button" size="icon-sm" variant="ghost" aria-label="Delete section" onClick={() => setConfirm(true)}>
                <Trash2 />
              </Button>
            </div>
          )}
        </>
      )}
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{title}&rdquo;?</DialogTitle>
            <DialogDescription>
              {count ? `The ${count} product${count === 1 ? "" : "s"} in it will stay in your store, just without a section.` : "This section is empty."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
              Delete section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
