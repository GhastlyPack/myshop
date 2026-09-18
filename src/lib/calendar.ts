import "server-only";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/db";
import { calendarConnections, type CalendarConnection } from "@/db/schema";
import { env, googleCalendarConfigured } from "@/lib/env";
import { newId } from "@/lib/ids";
import type { BusyInterval } from "@/lib/booking";
import { open, seal } from "@/lib/secret-box";

/**
 * Google Calendar for native bookings. OAuth (offline, so we get a refresh token) →
 * store encrypted tokens per store → read free/busy to block availability, and write the
 * confirmed booking as an event with an auto-generated Google Meet link. Never throws on
 * the read/write helpers' network path in a way that would break checkout; callers decide.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const CAL_BASE = "https://www.googleapis.com/calendar/v3";

export const GOOGLE_CALENDAR_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.readonly", // free/busy
  "https://www.googleapis.com/auth/calendar.events", // create the booking event
];

export const calendarRedirectUri = () => `${env.APP_BASE_URL}/api/calendar/google/callback`;

// ---------- OAuth state (signed, short-lived) ----------
const stateSecret = new TextEncoder().encode(env.SESSION_SECRET);

export async function signCalendarState(storeId: string): Promise<string> {
  return new SignJWT({ storeId, p: "gcal" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("15m").sign(stateSecret);
}
export async function verifyCalendarState(state: string): Promise<{ storeId: string } | null> {
  try {
    const { payload } = await jwtVerify(state, stateSecret);
    if (payload.p !== "gcal" || typeof payload.storeId !== "string") return null;
    return { storeId: payload.storeId };
  } catch {
    return null;
  }
}

export function calendarAuthorizeUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: env.GOOGLE_CALENDAR_CLIENT_ID ?? "",
    redirect_uri: calendarRedirectUri(),
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPES.join(" "),
    access_type: "offline", // get a refresh token
    prompt: "consent", // force the refresh token every time
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${p.toString()}`;
}

// ---------- token exchange + refresh ----------
type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number; scope?: string; token_type: string };

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.GOOGLE_CALENDAR_CLIENT_ID ?? "", client_secret: env.GOOGLE_CALENDAR_CLIENT_SECRET ?? "", ...body }),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => null)) as (TokenResponse & { error?: string; error_description?: string }) | null;
  if (!res.ok || !json?.access_token) throw new Error(`Google token error: ${json?.error_description ?? json?.error ?? res.status}`);
  return json;
}

/** Exchange the authorization code and persist the connection. Returns the stored row. */
export async function connectGoogleCalendar(storeId: string, code: string): Promise<CalendarConnection> {
  if (!googleCalendarConfigured) throw new Error("Google Calendar is not configured on this deployment.");
  const tok = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: calendarRedirectUri() });
  if (!tok.refresh_token) throw new Error("Google did not return a refresh token. Disconnect the app from your Google account and try again.");

  const who = await fetch(USERINFO_URL, { headers: { authorization: `Bearer ${tok.access_token}` }, signal: AbortSignal.timeout(10_000) })
    .then((r) => r.json() as Promise<{ email?: string }>)
    .catch(() => ({ email: undefined }));

  const expiresAt = new Date(Date.now() + tok.expires_in * 1000);
  const existing = await db.query.calendarConnections.findFirst({ where: eq(calendarConnections.storeId, storeId) });
  const values = {
    email: who.email ?? "your calendar",
    calendarId: "primary",
    accessTokenEnc: seal(tok.access_token),
    refreshTokenEnc: seal(tok.refresh_token),
    tokenExpiresAt: expiresAt,
    scope: tok.scope ?? null,
    provider: "google" as const,
  };
  if (existing) {
    const [row] = await db.update(calendarConnections).set({ ...values, updatedAt: new Date() }).where(eq(calendarConnections.storeId, storeId)).returning();
    return row;
  }
  const [row] = await db.insert(calendarConnections).values({ id: newId("cal"), storeId, ...values }).returning();
  return row;
}

export async function getCalendarConnection(storeId: string): Promise<CalendarConnection | null> {
  return (await db.query.calendarConnections.findFirst({ where: eq(calendarConnections.storeId, storeId) })) ?? null;
}

export async function disconnectGoogleCalendar(storeId: string): Promise<void> {
  const conn = await getCalendarConnection(storeId);
  if (!conn) return;
  // Best-effort revoke, then drop the row.
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(open(conn.refreshTokenEnc))}`, { method: "POST", signal: AbortSignal.timeout(8_000) });
  } catch {
    // ignore; we still remove our copy
  }
  await db.delete(calendarConnections).where(eq(calendarConnections.storeId, storeId));
}

/** A valid access token, refreshed and re-stored if it's within a minute of expiry. */
async function accessTokenFor(conn: CalendarConnection): Promise<string> {
  if (conn.tokenExpiresAt.getTime() - Date.now() > 60_000) return open(conn.accessTokenEnc);
  const tok = await tokenRequest({ grant_type: "refresh_token", refresh_token: open(conn.refreshTokenEnc) });
  const expiresAt = new Date(Date.now() + tok.expires_in * 1000);
  await db.update(calendarConnections).set({ accessTokenEnc: seal(tok.access_token), tokenExpiresAt: expiresAt, updatedAt: new Date() }).where(eq(calendarConnections.id, conn.id));
  return tok.access_token;
}

// ---------- free/busy + event creation ----------

/** Busy intervals on the connected calendar between two instants. Returns [] if not connected. */
export async function getBusy(storeId: string, timeMin: Date, timeMax: Date): Promise<BusyInterval[]> {
  const conn = await getCalendarConnection(storeId);
  if (!conn) return [];
  const token = await accessTokenFor(conn);
  const res = await fetch(`${CAL_BASE}/freeBusy`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString(), items: [{ id: conn.calendarId }] }),
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => null)) as { calendars?: Record<string, { busy?: { start: string; end: string }[] }> } | null;
  const busy = json?.calendars?.[conn.calendarId]?.busy ?? [];
  return busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
}

export type CalendarEventInput = {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  timezone: string;
  attendeeEmail: string;
  attendeeName?: string;
};

export type CalendarEventResult = { eventId: string; htmlLink?: string; meetUrl?: string };

/** Write the booking to the creator's calendar with a Google Meet link. Throws on failure (caller decides). */
export async function createCalendarEvent(storeId: string, input: CalendarEventInput): Promise<CalendarEventResult> {
  const conn = await getCalendarConnection(storeId);
  if (!conn) throw new Error("No calendar connected.");
  const token = await accessTokenFor(conn);
  const body = {
    summary: input.summary,
    description: input.description,
    start: { dateTime: input.start.toISOString(), timeZone: input.timezone },
    end: { dateTime: input.end.toISOString(), timeZone: input.timezone },
    attendees: [{ email: input.attendeeEmail, displayName: input.attendeeName }],
    conferenceData: { createRequest: { requestId: newId("meet"), conferenceSolutionKey: { type: "hangoutsMeet" } } },
    reminders: { useDefault: true },
  };
  const res = await fetch(`${CAL_BASE}/calendars/${encodeURIComponent(conn.calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });
  const json = (await res.json().catch(() => null)) as
    | { id?: string; htmlLink?: string; hangoutLink?: string; conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] }; error?: { message?: string } }
    | null;
  if (!res.ok || !json?.id) throw new Error(`Google event error: ${json?.error?.message ?? res.status}`);
  const meetUrl = json.hangoutLink ?? json.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri;
  return { eventId: json.id, htmlLink: json.htmlLink, meetUrl };
}

/** Best-effort cancel of a previously created event (e.g. when a booking is canceled). */
export async function deleteCalendarEvent(storeId: string, eventId: string): Promise<void> {
  const conn = await getCalendarConnection(storeId);
  if (!conn) return;
  try {
    const token = await accessTokenFor(conn);
    await fetch(`${CAL_BASE}/calendars/${encodeURIComponent(conn.calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // ignore
  }
}

export { googleCalendarConfigured };
