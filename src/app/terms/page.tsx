import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms of service", description: "The terms for creators selling on visitmy.shop and for buyers purchasing from them.", alternates: { canonical: "/terms" } };

export default function Terms() {
  return (
    <LegalPage title="Terms of service" updated="September 17, 2026">
      <h2>The service</h2>
      <p>
        visitmy.shop lets creators sell digital products from a link. Creators own what they upload and are responsible for having the right to sell it and for
        delivering what they promise. We provide the storefront, checkout, delivery, and tooling.
      </p>
      <h2>Payments</h2>
      <p>
        Buyers pay creators directly through the creator&apos;s own Stripe account. Refunds are the creator&apos;s decision, issued from their dashboard. Stripe&apos;s
        processing fees apply. Platform fees, if any, are shown to creators before they apply.
      </p>
      <h2>Acceptable use</h2>
      <p>
        No illegal content, no content you don&apos;t have rights to, no scams, no adult content, no harassment. We can remove stores or products that break
        this and refund buyers where we can.
      </p>
      <h2>Instagram replies</h2>
      <p>
        Creators who connect Instagram authorize us to send replies on their behalf only when a follower uses a keyword the creator set. Creators are
        responsible for those messages complying with Instagram&apos;s rules.
      </p>
      <h2>Liability</h2>
      <p>The service is provided as-is. We are not liable for lost sales or data beyond what you paid us in the previous three months.</p>
      <h2>Contact</h2>
      <p>
        <a href="mailto:hello@visitmy.shop">hello@visitmy.shop</a>
      </p>
    </LegalPage>
  );
}
