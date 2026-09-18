import type { BookingSettings } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AvailabilityForm } from "@/components/app/availability-form";
import { CalendarDisconnect } from "@/components/app/calendar-disconnect";
import { bookingsConfigured, inBookingsBeta } from "@/lib/bookings-access";
import { getCalendarConnection } from "@/lib/calendar";
import { env } from "@/lib/env";

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

const CAL_ERROR: Record<string, string> = {
  not_configured: "Bookings aren't enabled on this deployment yet.",
  beta: "Bookings are in private beta. You're not on the tester list yet.",
  denied: "You cancelled the Google sign-in.",
  state: "That link expired. Please try connecting again.",
  exchange: "Couldn't finish connecting to Google. Please try again.",
};

/** Settings → Bookings. Connect the creator's Google Calendar so paid calls land on it. Pro + beta. */
export async function BookingsSettings({ store, booking, error }: { store: { id: string; username: string }; booking: BookingSettings; error?: string | null }) {
  if (!bookingsConfigured()) {
    return (
      <Card className="border-dashed bg-muted/40">
        <CardHeader>
          <CardTitle className="text-base">Booking calls</CardTitle>
          <CardDescription>Not enabled on this deployment yet. Sell hour-long calls that book straight onto your calendar — coming soon.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const beta = inBookingsBeta(store.username);
  const conn = beta ? await getCalendarConnection(store.id) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarIcon className="size-4" /> Booking calls
          {!env.BOOKINGS_PUBLIC && <Badge variant="secondary">Beta</Badge>}
        </CardTitle>
        <CardDescription>
          Connect your Google Calendar so paid calls book onto it with a Meet link, and your busy times block your open hours automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-destructive">{CAL_ERROR[error] ?? `Couldn't connect: ${error}`}</p>}
        {!beta ? (
          <p className="text-sm text-muted-foreground">Bookings are in private beta while we finish Google&apos;s review. We&apos;ll let you know when your account is in.</p>
        ) : conn ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-3">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="default">Connected</Badge>
                <span className="text-muted-foreground">{conn.email}</span>
              </div>
              <CalendarDisconnect />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Your open hours</p>
              <AvailabilityForm initial={booking} />
            </div>
          </div>
        ) : (
          <>
            <Button asChild>
              <a href="/api/calendar/google/connect">Connect Google Calendar</a>
            </Button>
            <p className="text-xs text-muted-foreground">
              You&apos;ll see a &quot;Google hasn&apos;t verified this app&quot; screen while we&apos;re in beta — choose <span className="font-medium">Advanced → continue</span> to finish.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
