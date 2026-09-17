import { Manrope } from "next/font/google";
import { AwningMark } from "./mark";
import { cn } from "@/lib/utils";

const manrope = Manrope({ subsets: ["latin"], weight: "800", variable: "--font-manrope" });

/**
 * visitmy.shop wordmark with the awning mark as the dot.
 * `size` is the font size in px; the mark scales with it. Text color comes from
 * the surrounding `color`; the mark defaults to brand orange.
 */
export function Wordmark({ size = 20, className, markColor = "#F4611E" }: { size?: number; className?: string; markColor?: string }) {
  const markW = size * 0.34;
  return (
    <span
      className={cn(manrope.className, "inline-flex items-baseline whitespace-nowrap font-extrabold leading-none", className)}
      style={{ fontSize: size, letterSpacing: "-0.03em" }}
      aria-label="visitmy.shop"
    >
      visitmy
      <AwningMark width={markW} color={markColor} className="mx-[0.06em]" />
      shop
    </span>
  );
}
