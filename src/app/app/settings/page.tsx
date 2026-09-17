import type { Metadata } from "next";
import { ChangeUsernameForm } from "@/components/app/change-username-form";
import { DeleteStoreDialog } from "@/components/app/delete-store-dialog";
import { InstagramSettings } from "@/components/app/instagram-settings";
import { PaymentsSettings } from "@/components/app/payments-settings";
import { SettingsForm } from "@/components/app/settings-form";
import { StorePublishToggle } from "@/components/app/store-publish-toggle";
import { requireStore } from "@/lib/auth";
import { env } from "@/lib/env";
import { CURRENCIES } from "@/lib/format";
import { publicUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ig_error?: string }> }) {
  const { store } = await requireStore();
  const { ig_error } = await searchParams;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your profile, links, currency and payouts.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Link</h2>
        <ChangeUsernameForm current={store.username} host={new URL(env.APP_BASE_URL).host} />
      </section>

      <SettingsForm
        initial={{
          displayName: store.displayName,
          bio: store.bio ?? "",
          avatarKey: store.avatarKey,
          currency: (CURRENCIES as readonly string[]).includes(store.currency) ? (store.currency as (typeof CURRENCIES)[number]) : "usd",
          socials: {
            instagram: store.socials.instagram ?? "",
            tiktok: store.socials.tiktok ?? "",
            youtube: store.socials.youtube ?? "",
            x: store.socials.x ?? "",
            threads: store.socials.threads ?? "",
            linkedin: store.socials.linkedin ?? "",
            website: store.socials.website ?? "",
            email: store.socials.email ?? "",
          },
        }}
        avatarUrl={publicUrl(store.avatarKey)}
        username={store.username}
      />

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Payments</h2>
          <p className="text-xs text-muted-foreground">Connect a payout account to sell paid products. Free products work without one.</p>
        </div>
        <PaymentsSettings storeId={store.id} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Instagram</h2>
          <p className="text-xs text-muted-foreground">Turn keyword comments and DMs into automatic replies with your product link.</p>
        </div>
        <InstagramSettings storeId={store.id} error={ig_error ?? null} />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Visibility</h2>
        <StorePublishToggle published={store.published} username={store.username} />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-destructive">Danger zone</h2>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-background p-4 sm:p-5">
          <div>
            <div className="text-sm font-medium">Delete this store</div>
            <p className="text-xs text-muted-foreground">Removes your products, files, orders and customer data. Buyers lose their download links.</p>
          </div>
          <DeleteStoreDialog username={store.username} />
        </div>
      </section>
    </div>
  );
}
