/**
 * The awning mark — the dot in visitmy.shop. Pure SVG so it inherits `color`.
 * Geometry matches the Figma master (24 × 10.5 units): a canopy with rounded
 * top corners and three scallops.
 */
export function AwningMark({ className, color = "currentColor", width = 24 }: { className?: string; color?: string; width?: number }) {
  const h = (width * 10.5) / 24;
  return (
    <svg className={className} width={width} height={h} viewBox="0 0 24 10.5" fill={color} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M3 0h18a3 3 0 0 1 3 3v3.5a4 4 0 0 1-8 0 4 4 0 0 1-8 0 4 4 0 0 1-8 0V3a3 3 0 0 1 3-3Z" />
    </svg>
  );
}
