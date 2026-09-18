"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const RM = "(prefers-reduced-motion: reduce)";
const subscribeRM = (cb: () => void) => {
  const mq = window.matchMedia(RM);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/**
 * Steps 0..steps-1 on a timer while the element is on screen, then wraps. With reduced motion the
 * final step is returned and nothing moves. Returns the step and a ref for the element to watch.
 */
export function useLoop<T extends HTMLElement>(steps: number, ms: number) {
  const ref = useRef<T | null>(null);
  const [tick, setTick] = useState(0);
  const still = useSyncExternalStore(subscribeRM, () => window.matchMedia(RM).matches, () => false);

  useEffect(() => {
    const el = ref.current;
    if (still || !el) return;
    let timer: number | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (timer === undefined) {
            setTick(0);
            timer = window.setInterval(() => setTick((s) => (s + 1) % steps), ms);
          }
        } else if (timer !== undefined) {
          window.clearInterval(timer);
          timer = undefined;
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, [steps, ms, still]);

  return { ref, step: still ? steps - 1 : tick, still };
}
