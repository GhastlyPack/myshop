import { NextResponse } from "next/server";
import { getCurrentStore, loginPath } from "@/lib/auth";
import { canUseBookings } from "@/lib/bookings-access";
import { calendarAuthorizeUrl, signCalendarState } from "@/lib/calendar";
import { env, googleCalendarConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Creator-only: start the Google Calendar OAuth flow (offline, for a refresh token). */
export async function GET() {
  if (!googleCalendarConfigured) return NextResponse.redirect(new URL("/app/settings?cal_error=not_configured", env.APP_BASE_URL));
  const store = await getCurrentStore();
  if (!store) return NextResponse.redirect(new URL(loginPath("/app/settings"), env.APP_BASE_URL));
  if (!(await canUseBookings(store))) return NextResponse.redirect(new URL("/app/settings?cal_error=beta", env.APP_BASE_URL));
  const state = await signCalendarState(store.id);
  return NextResponse.redirect(calendarAuthorizeUrl(state));
}
