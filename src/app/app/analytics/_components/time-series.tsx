"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Dependency-free SVG charts for the analytics page.
 *  - <TimeSeries>  daily line/area chart with a crosshair + tooltip on hover/touch.
 *  - <Sparkline>   tiny trend line for KPI tiles (no axes, no hover).
 * Width is measured from the container so text never scales with the viewport.
 */

export type Point = { day: string; value: number };

const PAD = { top: 12, right: 12, bottom: 24, left: 40 };

function useWidth<T extends HTMLElement>(fallback = 600) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.max(120, Math.floor(w)));
    });
    ro.observe(el);
    setWidth(Math.max(120, Math.floor(el.getBoundingClientRect().width)));
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

/** Round the axis max up to a clean number and pick ~4 ticks. */
function niceScale(max: number) {
  const m = Math.max(1, max);
  const exp = Math.pow(10, Math.floor(Math.log10(m)));
  const f = m / exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  const top = nf * exp;
  const steps = nf === 2.5 ? 5 : 4;
  const ticks = Array.from({ length: steps + 1 }, (_, i) => (top / steps) * i);
  return { top, ticks };
}

const fmtDay = (iso: string, withYear = false) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" });
};
const fmtNum = (n: number) => n.toLocaleString("en-US");

export function TimeSeries({
  points,
  label,
  height = 220,
  formatValue = fmtNum,
  className,
}: {
  points: Point[];
  label: string;
  height?: number;
  formatValue?: (n: number) => string;
  className?: string;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gradId = useId();

  const geo = useMemo(() => {
    const innerW = Math.max(1, width - PAD.left - PAD.right);
    const innerH = Math.max(1, height - PAD.top - PAD.bottom);
    const { top, ticks } = niceScale(Math.max(0, ...points.map((p) => p.value)));
    const n = points.length;
    const x = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
    const coords = points.map((p, i) => [x(i), y(p.value)] as const);
    const line = coords.map(([cx, cy], i) => `${i === 0 ? "M" : "L"}${cx.toFixed(1)},${cy.toFixed(1)}`).join(" ");
    const area = coords.length ? `${line} L${coords[coords.length - 1][0].toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${coords[0][0].toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z` : "";
    // x labels: aim for a label every ~90px, always including first and last.
    const every = Math.max(1, Math.ceil((n * 90) / Math.max(innerW, 1)));
    const xLabels = points.map((p, i) => ({ i, label: fmtDay(p.day) })).filter(({ i }) => i === 0 || i === n - 1 || (i % every === 0 && i < n - 1 - every / 2));
    return { innerW, innerH, top, ticks, x, y, coords, line, area, xLabels, baseline: PAD.top + innerH };
  }, [points, width, height]);

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const n = points.length;
    if (n === 0) return;
    const t = (px - PAD.left) / Math.max(1, geo.innerW);
    const i = Math.round(Math.min(1, Math.max(0, t)) * (n - 1));
    setHover(i);
  }

  const h = hover !== null ? points[hover] : null;
  const hx = hover !== null ? geo.x(hover) : 0;
  const hy = h ? geo.y(h.value) : 0;
  const tooltipLeft = hx > width * 0.6;

  return (
    <div ref={ref} className={cn("relative w-full select-none", className)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label} by day`}
        className="block overflow-visible text-primary"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.14" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* gridlines + y ticks */}
        {geo.ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(t)} y2={geo.y(t)} stroke="var(--border)" strokeWidth={1} shapeRendering="crispEdges" />
            <text x={PAD.left - 8} y={geo.y(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--muted-foreground)">
              {formatValue(t)}
            </text>
          </g>
        ))}

        {/* x labels */}
        {geo.xLabels.map(({ i, label: l }) => (
          <text
            key={i}
            x={geo.x(i)}
            y={height - 6}
            textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
            fontSize={11}
            fill="var(--muted-foreground)"
          >
            {l}
          </text>
        ))}

        {points.length > 0 && (
          <>
            <path d={geo.area} fill={`url(#${gradId})`} />
            <path d={geo.line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {/* end marker */}
            <circle cx={geo.coords[geo.coords.length - 1][0]} cy={geo.coords[geo.coords.length - 1][1]} r={4} fill="currentColor" stroke="var(--card)" strokeWidth={2} />
          </>
        )}

        {h && (
          <g>
            <line x1={hx} x2={hx} y1={PAD.top} y2={geo.baseline} stroke="var(--muted-foreground)" strokeWidth={1} strokeOpacity={0.5} />
            <circle cx={hx} cy={hy} r={5} fill="currentColor" stroke="var(--card)" strokeWidth={2} />
          </g>
        )}
      </svg>

      {h && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
          style={{ top: Math.max(0, hy - 44), ...(tooltipLeft ? { right: width - hx + 10 } : { left: hx + 10 }) }}
        >
          <div className="text-muted-foreground">{fmtDay(h.day, true)}</div>
          <div className="font-medium tabular-nums">
            {formatValue(h.value)} <span className="font-normal text-muted-foreground">{label.toLowerCase()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function Sparkline({ values, height = 28, className }: { values: number[]; height?: number; className?: string }) {
  const { ref, width } = useWidth<HTMLDivElement>(120);
  const max = Math.max(1, ...values);
  const n = values.length;
  const pts = values.map((v, i) => [n <= 1 ? width / 2 : (i / (n - 1)) * (width - 4) + 2, height - 3 - (v / max) * (height - 6)] as const);
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <div ref={ref} className={cn("w-full text-muted-foreground", className)}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="block overflow-visible">
        {n > 0 && (
          <>
            <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
            {last && <circle cx={last[0]} cy={last[1]} r={2.5} className="text-primary" fill="currentColor" />}
          </>
        )}
      </svg>
    </div>
  );
}

/** Metric toggle + chart. Keeps a single axis: every metric is a daily count. */
export function TimeSeriesSwitcher({ metrics }: { metrics: { key: string; label: string; points: Point[] }[] }) {
  const [active, setActive] = useState(metrics[0]?.key);
  const m = metrics.find((x) => x.key === active) ?? metrics[0];
  if (!m) return null;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Metric">
        {metrics.map((x) => {
          const total = x.points.reduce((s, p) => s + p.value, 0);
          const on = x.key === m.key;
          return (
            <button
              key={x.key}
              role="tab"
              aria-selected={on}
              onClick={() => setActive(x.key)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs transition-colors",
                on ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {x.label} <span className={cn("tabular-nums", on ? "opacity-80" : "opacity-70")}>{fmtNum(total)}</span>
            </button>
          );
        })}
      </div>
      <TimeSeries points={m.points} label={m.label} />
    </div>
  );
}
