"use client";

import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { useLoop } from "./use-loop";

/**
 * An Instagram DM thread that plays itself: the buyer types the keyword, the store replies with
 * the product card, then a line. Mirrors what sendProductCard builds (image, title, one line, the
 * product's own button). Six beats, then it starts over.
 */
export function DmMockup() {
  const { ref, step } = useLoop<HTMLDivElement>(6, 1500);
  const show = (at: number) => (step >= at ? "ld-beat ld-beat-on" : "ld-beat");
  return (
    <div ref={ref} className="ld-dm" aria-label="An Instagram conversation: someone sends the word consult and gets a booking card back">
      <div className="ld-dm-head">
        <span className="ld-dm-avatar">
          <Image src="/landing/creator.jpg" alt="" width={36} height={36} className="h-full w-full object-cover" />
        </span>
        <span>
          <span className="block text-[0.85rem] font-semibold">Maya Ortega</span>
          <span className="block text-[0.72rem] opacity-60">Active now</span>
        </span>
      </div>
      <div className="ld-dm-body">
        <div className={`ld-dm-row ld-dm-row-out ${show(1)}`}>
          <p className="ld-dm-bubble ld-dm-bubble-out">consult</p>
        </div>
        <div className={`ld-dm-row ${step === 2 ? "ld-beat ld-beat-on" : "ld-beat"}`} aria-hidden>
          <p className="ld-dm-bubble ld-dm-typing">
            <span />
            <span />
            <span />
          </p>
        </div>
        <div className={`ld-dm-row ${show(3)}`}>
          <div className="ld-dm-card">
            <span className="block aspect-[1.91/1] overflow-hidden">
              <Image src="/landing/checklist.jpg" alt="" width={800} height={420} className="h-full w-full object-cover" />
            </span>
            <span className="block px-3.5 pt-3 pb-1">
              <span className="block text-[0.9rem] font-semibold leading-snug">Content strategy call</span>
              <span className="mt-0.5 block text-[0.76rem] leading-snug opacity-65">60 minutes on Google Meet · $120</span>
            </span>
            <span className="ld-dm-card-btn">
              Book now
              <ChevronRight size={14} />
            </span>
          </div>
        </div>
        <div className={`ld-dm-row ${show(4)}`}>
          <p className="ld-dm-bubble">Here you go. Pick a time that works for you and I&apos;ll see you there.</p>
        </div>
      </div>
      <div className="ld-dm-input">{step === 0 ? "consu" : "Message…"}</div>
    </div>
  );
}
