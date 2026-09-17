import { Star } from "lucide-react";

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="sf-stars" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} strokeWidth={1.6} fill={n <= Math.round(value) ? "currentColor" : "none"} style={n <= Math.round(value) ? undefined : { opacity: 0.35 }} />
      ))}
    </span>
  );
}
