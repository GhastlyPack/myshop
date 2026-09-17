"use client";

import { Fragment, useActionState, useEffect } from "react";
import { ga } from "@/lib/ga";
import { Check, Star } from "lucide-react";
import { submitReview, type ReviewState } from "@/app/[username]/[slug]/thanks/actions";

export function ReviewForm({ token, productTitle, defaultName }: { token: string; productTitle: string; defaultName: string }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReview, null);
  useEffect(() => {
    if (state && "ok" in state) ga("review_submitted", { product: productTitle });
  }, [state, productTitle]);
  if (state && "ok" in state) {
    return (
      <div className="flex items-center gap-3">
        <span className="sf-btn sf-btn-sm" style={{ pointerEvents: "none" }}>
          <Check size={16} />
        </span>
        <p className="text-[0.95rem]">Thanks! Your review is in. It shows up once the creator approves it.</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <p className="sf-label">How was {productTitle}?</p>
        <div className="sf-star-pick" role="radiogroup" aria-label="Rating">
          {[5, 4, 3, 2, 1].map((n) => (
            <Fragment key={n}>
              <input type="radio" name="rating" id={`star-${n}`} value={n} required />
              <label htmlFor={`star-${n}`} aria-label={`${n} star${n > 1 ? "s" : ""}`}>
                <Star size={30} strokeWidth={1.5} fill="currentColor" />
              </label>
            </Fragment>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="rv-quote" className="sf-label">
          A line for other people (optional)
        </label>
        <textarea id="rv-quote" name="quote" rows={3} maxLength={600} className="sf-input" placeholder="What did you get out of it?" />
      </div>
      <div>
        <label htmlFor="rv-name" className="sf-label">
          Show my name as
        </label>
        <input id="rv-name" name="name" maxLength={80} className="sf-input" defaultValue={defaultName} />
      </div>
      {state && "error" in state && (
        <p className="sf-error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="sf-btn sf-btn-ghost" disabled={pending}>
        {pending ? "Sending…" : "Send review"}
      </button>
    </form>
  );
}
