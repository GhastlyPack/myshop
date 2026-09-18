import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";

/** Shown above the demo store only: says what it is and gives the visitor a way back to claiming their own. */
export function DemoBar() {
  return (
    <div className="flex items-center justify-between gap-4 bg-[#111111] px-4 py-2.5 text-white sm:px-6" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <Link href="/" className="flex items-center gap-2.5 text-[0.8rem]" aria-label="visitmy.shop home">
        <Wordmark size={16} />
        <span className="hidden text-white/60 sm:inline">A demo store on visitmy.shop. Poke around.</span>
      </Link>
      <Link href="/" className="shrink-0 rounded-full bg-[#f4611e] px-3.5 py-1.5 text-[0.8rem] font-semibold text-[#111111] hover:bg-[#ff7a3d]">
        Claim your link
      </Link>
    </div>
  );
}
