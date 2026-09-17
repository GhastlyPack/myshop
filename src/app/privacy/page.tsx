import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy policy" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy" updated="September 17, 2026">
      <h2>What we collect</h2>
      <p>
        <strong>Creators</strong> sign in with an email address (via Auth0 or Google) and give us a display name, bio, product files, and, if they choose, connected
        Stripe and Instagram accounts. <strong>Buyers</strong> give a name and email at checkout so we can deliver what they bought and let them sign back in to
        their downloads. Payment card details go directly to Stripe and never touch our servers.
      </p>
      <h2>How we use it</h2>
      <p>
        To run the store you asked us to run: deliver files, send order and sign-in emails, show creators their sales and customers, and stop abuse. Creators
        can email buyers who opted in to updates. We do not sell personal data.
      </p>
      <h2>Instagram</h2>
      <p>
        When a creator connects Instagram, we store an access token for their account and use it only to send a direct message when someone comments or
        messages one of that creator&apos;s product keywords. We keep a log of those replies (who, which keyword, when) so creators can see what was sent. We
        never read or store other comments or messages, and never post on a creator&apos;s behalf beyond the reply they configured. Disconnecting in Settings, or
        removing the app inside Instagram, deletes the token immediately.
      </p>
      <h2 id="deletion">Deleting your data</h2>
      <p>
        Creators can delete their store from Settings, which removes their products, files, orders, and customer records. Buyers can email{" "}
        <a href="mailto:hello@visitmy.shop">hello@visitmy.shop</a> to have their records removed. Instagram data-deletion requests sent through Meta are
        honored automatically.
      </p>
      <h2>Who we share with</h2>
      <p>Stripe (payments), Supabase (database and file storage), Vercel (hosting), Resend (email), Auth0 (sign-in), and Meta (Instagram replies). Each only receives what it needs for its job.</p>
      <h2>Contact</h2>
      <p>
        <a href="mailto:hello@visitmy.shop">hello@visitmy.shop</a>
      </p>
    </LegalPage>
  );
}
