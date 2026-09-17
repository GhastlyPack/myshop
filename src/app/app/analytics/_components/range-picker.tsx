import Link from "next/link";
import { cn } from "@/lib/utils";
import { RANGES, type RangeDays } from "../queries";

export function RangePicker({ active, basePath = "/app/analytics" }: { active: RangeDays; basePath?: string }) {
  return (
    <div className="inline-flex rounded-lg border bg-background p-0.5" role="group" aria-label="Date range">
      {RANGES.map((d) => (
        <Link
          key={d}
          href={`${basePath}?range=${d}`}
          aria-current={d === active ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            d === active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {d}d
        </Link>
      ))}
    </div>
  );
}
