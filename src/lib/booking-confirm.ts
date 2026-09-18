import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, users, type Booking, type Product, type Store } from "@/db/schema";
import { DEFAULT_BOOKING_SETTINGS } from "@/lib/booking";
import { createCalendarEvent } from "@/lib/calendar";
import { buildIcs } from "@/lib/ics";
import { newId } from "@/lib/ids";
import { sendMail } from "@/lib/mailer";
import { renderBookingEmail } from "@/emails/booking";
import { env } from "@/lib/env";
import { formatBookingWhen } from "@/lib/timezone";

/**
 * Turn a paid/free booking into a confirmed call: write it to the creator's calendar (Meet
 * link), store the booking row, and email both sides a branded confirmation with an .ics.
 * Idempotent per order — a second call for the same order returns the existing booking.
 * Never throws; the calendar/email are best-effort so a hiccup can't fail the checkout webhook.
 */
export async function confirmBooking(opts: {
  store: Store;
  product: Product;
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  startAt: Date;
  /** The buyer's timezone, captured at checkout; falls back to the creator's. */
  buyerTimezone?: string | null;
}): Promise<Booking | null> {
  const { store, product, orderId, buyerName, buyerEmail, startAt } = opts;

  const existing = await db.query.bookings.findFirst({ where: eq(bookings.orderId, orderId) });
  if (existing) return existing;

  const duration = product.durationMinutes ?? 60;
  const endAt = new Date(startAt.getTime() + duration * 60_000);
  const creatorTz = store.booking?.timezone ?? DEFAULT_BOOKING_SETTINGS.timezone;
  const buyerTz = opts.buyerTimezone || creatorTz;

  // Write to the creator's calendar first (gives us the Meet link). Best-effort.
  let googleEventId: string | null = null;
  let meetingUrl: string | null = null;
  try {
    const ev = await createCalendarEvent(store.id, {
      summary: `${product.title} — ${buyerName}`,
      description: product.description ?? undefined,
      start: startAt,
      end: endAt,
      timezone: creatorTz,
      attendeeEmail: buyerEmail,
      attendeeName: buyerName,
    });
    googleEventId = ev.eventId;
    meetingUrl = ev.meetUrl ?? null;
  } catch (e) {
    console.error("[booking] calendar write failed", e);
  }

  const [row] = await db
    .insert(bookings)
    .values({
      id: newId("bkg"),
      storeId: store.id,
      productId: product.id,
      orderId,
      buyerEmail,
      buyerName,
      startAt,
      endAt,
      timezone: buyerTz,
      status: "confirmed",
      googleEventId,
      meetingUrl,
    })
    .returning();

  // Emails with the .ics invite. Best-effort.
  try {
    const owner = await db.query.users.findFirst({ where: eq(users.id, store.userId), columns: { email: true } });
    const uid = `${row.id}@visitmy.shop`;
    const ics = buildIcs({
      uid,
      start: startAt,
      end: endAt,
      title: `${product.title} with ${store.displayName}`,
      description: meetingUrl ? `Join: ${meetingUrl}` : product.description ?? undefined,
      location: meetingUrl ?? undefined,
      organizerName: store.displayName,
      organizerEmail: owner?.email ?? env.EMAIL_FROM,
      attendeeName: buyerName,
      attendeeEmail: buyerEmail,
    });
    const attachments = [{ filename: "invite.ics", content: ics, contentType: "text/calendar; method=REQUEST" }];

    const buyerMail = await renderBookingEmail({
      storeName: store.displayName,
      recipientName: buyerName,
      withName: store.displayName,
      productTitle: product.title,
      whenText: formatBookingWhen(startAt, endAt, buyerTz),
      meetUrl: meetingUrl ?? undefined,
      forCreator: false,
    });
    await sendMail({ to: buyerEmail, ...buyerMail, attachments });

    if (owner?.email) {
      const creatorMail = await renderBookingEmail({
        storeName: store.displayName,
        recipientName: store.displayName,
        withName: buyerName,
        productTitle: product.title,
        whenText: formatBookingWhen(startAt, endAt, creatorTz),
        meetUrl: meetingUrl ?? undefined,
        forCreator: true,
      });
      await sendMail({ to: owner.email, ...creatorMail, attachments });
    }
  } catch (e) {
    console.error("[booking] email failed", e);
  }

  return row;
}
