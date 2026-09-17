import "server-only";
import { env } from "@/lib/env";
import { sendMail } from "@/lib/mailer";
import { formatMoney } from "./money";

/**
 * Delivery email sent by the Stripe webhook once an order is paid.
 *
 * TODO(after merge): Package B ships the shared template at `src/emails/delivery`
 * (`renderDeliveryEmail`). Swap `renderPaidDeliveryEmail` for it so paid and free
 * orders send the identical email; keep `sendPaidDeliveryEmail`'s signature.
 */
export type DeliveryEmailInput = {
  to: string;
  buyerName: string;
  storeName: string;
  productTitle: string;
  amountCents: number;
  currency: string;
  thanksUrl: string;
  confirmationSubject?: string | null;
  confirmationBody?: string | null;
};

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export function renderPaidDeliveryEmail(input: DeliveryEmailInput): { subject: string; html: string; text: string } {
  const subject = input.confirmationSubject?.trim() || `Your ${input.productTitle} is ready`;
  const firstName = input.buyerName.trim().split(/\s+/)[0] || "there";
  const price = formatMoney(input.amountCents, input.currency);
  const custom = input.confirmationBody?.trim();
  const bodyLines = custom
    ? custom.split(/\r?\n/).filter(Boolean)
    : [`Thanks for your purchase from ${input.storeName}.`, `Your ${input.productTitle} is ready to download.`];
  const html = `<!doctype html>
<html><body style="margin:0;background:#f6f6f7;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <div style="background:#fff;border-radius:12px;padding:28px">
      <p style="margin:0 0 16px;font-size:16px">Hi ${esc(firstName)},</p>
      ${bodyLines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5">${esc(l)}</p>`).join("")}
      <p style="margin:24px 0">
        <a href="${esc(input.thanksUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Get your download</a>
      </p>
      <p style="margin:0;font-size:13px;color:#666">Order total: ${esc(price)}. Keep this email, the link is your access.</p>
    </div>
    <p style="margin:16px 0 0;font-size:12px;color:#888;text-align:center">Sent by ${esc(input.storeName)} via visitmy.shop</p>
  </div>
</body></html>`;
  const text = [
    `Hi ${firstName},`,
    "",
    ...bodyLines,
    "",
    `Get your download: ${input.thanksUrl}`,
    "",
    `Order total: ${price}.`,
    `Sent by ${input.storeName} via visitmy.shop`,
  ].join("\n");
  return { subject, html, text };
}

export async function sendPaidDeliveryEmail(input: DeliveryEmailInput) {
  const { subject, html, text } = renderPaidDeliveryEmail(input);
  return sendMail({ to: input.to, subject, html, text });
}

export function thanksUrl(username: string, slug: string, token: string) {
  return `${env.APP_BASE_URL}/${username}/${slug}/thanks?e=${encodeURIComponent(token)}`;
}
