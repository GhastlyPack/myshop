import { NextResponse } from "next/server";
import { connectGoogleCalendar, verifyCalendarState } from "@/lib/calendar";
import { env } from "@/lib/env";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/** Google redirects here with ?code&state. Exchange, store the connection, back to Settings. */
export async function GET(req: Request) {
  const settings = new URL("/app/settings", env.APP_BASE_URL);
  const { searchParams } = new URL(req.url);
  const error = searchParams.get("error");
  if (error) {
    settings.searchParams.set("cal_error", error === "access_denied" ? "denied" : error);
    return NextResponse.redirect(settings);
  }
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const verified = state ? await verifyCalendarState(state) : null;
  if (!code || !verified) {
    settings.searchParams.set("cal_error", "state");
    return NextResponse.redirect(settings);
  }
  try {
    await connectGoogleCalendar(verified.storeId, code);
    revalidatePath("/app/settings");
    settings.searchParams.set("connected", "calendar");
  } catch (e) {
    console.error("[calendar callback] failed", e);
    settings.searchParams.set("cal_error", "exchange");
  }
  return NextResponse.redirect(settings);
}
