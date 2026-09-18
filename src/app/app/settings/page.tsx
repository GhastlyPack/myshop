import { GaEvent } from "@/components/analytics/ga-event";
import type { Metadata } from "next";
import { ChangeUsernameForm } from "@/components/app/change-username-form";
import { DeleteStoreDialog } from "@/components/app/delete-store-dialog";
import { InstagramSettings } from "@/components/app/instagram-settings";
import { BookingsSettings } from "@/components/app/bookings-settings";
import { PaymentsSettings } from "@/components/app/payments-settings";
import { PixelsForm } from "@/components/app/pixels-form";
import { ProLock } from "@/components/app/pro-lock";
import { SettingsForm } from "@/components/app/settings-form";
import { StorePublishToggle } from "@/components/app/store-publish-toggle";
import { requireStore } from "@/lib/auth";
import { planTier } from "@/lib/billing";
import { env } from "@/lib/env";
import { CURRENCIES } from "@/lib/format";
import { pixelsToForm } from "@/lib/pixels";
import { publicUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ig_error?: string; cal_error?: string; connected?: string }> }) {
  const { store } = await requireStore();
  const { ig_error, cal_error, connected } = await searchParams;
  const tier = await planTier(store);
  return (
    <div className="space-y-8">
      {(connected === "stripe" || connected === "instagram" || connected === "calendar") && <GaEvent name={`${connected}_connected`} once={`connected:${connected}`} />}
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
          about: store.about ?? "",
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
        {tier === "pro" ? (
          <InstagramSettings storeId={store.id} error={ig_error ?? null} />
        ) : (
          <ProLock feature="instagram" title="Instagram auto-replies" description="Auto-DM your product link when someone comments or DMs a keyword. Available on Pro." />
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Bookings</h2>
          <p className="text-xs text-muted-foreground">Sell calls that book onto your calendar. Connect Google Calendar so your busy times block your open hours and each booking gets a Meet link.</p>
        </div>
        {tier === "pro" ? (
          <BookingsSettings store={{ id: store.id, username: store.username }} error={cal_error ?? null} />
        ) : (
          <ProLock feature="bookings" title="Booking calls" description="Sell hour-long calls that book straight onto your connected calendar, with an automatic Meet link. Available on Pro." />
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Pixels &amp; tracking</h2>
          <p className="text-xs text-muted-foreground">Fire your own Meta, Google and TikTok pixels on your storefront so your ad campaigns optimize on your traffic.</p>
        </div>
        {tier === "pro" ? (
          <PixelsForm initial={pixelsToForm(store.pixels)} />
        ) : (
          <ProLock feature="pixels" title="Ad pixels" description="Connect your own Meta, Google and TikTok pixels so your campaigns optimize and retarget on your storefront traffic. Available on Pro." />
        )}
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
