"use client";

import { useState, type ReactNode } from "react";

/** Long text clipped to a few lines with a "Read more" toggle. */
export function Collapsible({ children, lines = 4 }: { children: ReactNode; lines?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div style={open ? undefined : { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{children}</div>
      <button type="button" className="sf-link mt-2 text-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? "Show less" : "Read more"}
      </button>
    </div>
  );
}
