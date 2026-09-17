"use client";

import { useActionState, useEffect } from "react";
import { ga } from "@/lib/ga";
import { Inbox } from "lucide-react";
import { requestLinkAction, type MagicState } from "./actions";

export function MagicForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState<MagicState, FormData>(requestLinkAction, null);
  useEffect(() => {
    if (state && "sent" in state) ga("library_link_requested");
  }, [state]);
  if (state && "sent" in state) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-center shadow-sm">
        <Inbox className="mx-auto mb-3 size-8 text-neutral-500" />
        <h2 className="text-lg font-semibold">Check your inbox</h2>
        <p className="mt-1 text-sm text-neutral-600">
          We sent a sign-in link to <strong className="text-neutral-900">{state.sent}</strong>. It works once and expires in 15 minutes.
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="rounded-2xl border bg-white p-6 shadow-sm">
      <label htmlFor="me-email" className="mb-1.5 block text-sm font-medium">
        Email you used at checkout
      </label>
      <input
        id="me-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        placeholder="you@example.com"
        className="w-full rounded-xl border border-neutral-300 px-3.5 py-3 text-base outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10"
      />
      {(initialError || (state && "error" in state)) && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state && "error" in state ? state.error : initialError}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 w-full rounded-xl bg-neutral-900 px-4 py-3 text-base font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
      <p className="mt-3 text-center text-xs text-neutral-500">No password. No account. Just your downloads.</p>
    </form>
  );
}
