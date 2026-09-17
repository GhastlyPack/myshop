"use client";

import { useEffect } from "react";
import { ga, gaUser } from "@/lib/ga";

const fired = new Set<string>();

/**
 * Fires one GA event on mount. `once` dedupes within the page lifetime (strict mode, re-renders);
 * `persist` also remembers it in localStorage so a reload of a thanks page doesn't double-count a purchase;
 * `session` remembers it for the browser session (e.g. one `login` per visit).
 */
export function GaEvent({
  name,
  params,
  once,
  persist,
  session,
  user,
}: {
  name: string;
  params?: Record<string, unknown>;
  once?: string;
  persist?: string;
  session?: string;
  user?: Record<string, string | number | boolean>;
}) {
  useEffect(() => {
    const key = `${name}:${once ?? persist ?? session ?? window.location.pathname}`;
    if (fired.has(key)) return;
    try {
      if (persist && localStorage.getItem(`ga:${persist}`)) return;
      if (session && sessionStorage.getItem(`ga:${session}`)) return;
    } catch {}
    fired.add(key);
    if (user) gaUser(user);
    ga(name, params);
    try {
      if (persist) localStorage.setItem(`ga:${persist}`, "1");
      if (session) sessionStorage.setItem(`ga:${session}`, "1");
    } catch {}
  }, [name, params, once, persist, session, user]);
  return null;
}
