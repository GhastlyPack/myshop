import Image from "next/image";
import { ChevronRight } from "lucide-react";

/**
 * An Instagram DM thread, static markup: a buyer types the keyword, the store replies with the
 * product card. Mirrors what sendProductCard builds (image, title, one line, the product's own button).
 */
export function DmMockup() {
  return (
    <div className="ld-dm" aria-label="An Instagram conversation: someone sends the word consult and gets a booking card back">
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
        <div className="ld-dm-row ld-dm-row-out">
          <p className="ld-dm-bubble ld-dm-bubble-out">consult</p>
        </div>
        <div className="ld-dm-row">
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
        <div className="ld-dm-row">
          <p className="ld-dm-bubble">Here you go. Pick a time that works for you and I&apos;ll see you there.</p>
        </div>
      </div>
      <div className="ld-dm-input">Message…</div>
    </div>
  );
}
