import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/db";
import { adminInvites, stores, users, type Store, type User } from "@/db/schema";
import { adminEmails, auth0Configured, env, isProd, ownerEmail } from "@/lib/env";
import { newId } from "@/lib/ids";
import { auth0 } from "./auth0";
import { withDeadline } from "@/lib/watchdog";

export type Identity = { sub: string; email: string; name?: string | null; picture?: string | null };

const DEV_COOKIE = "myshop_dev_session";
const secret = new TextEncoder().encode(env.SESSION_SECRET);

/** Raw identity from Auth0 (prod) or the dev cookie (local). Null if signed out. */
export async function getIdentity(): Promise<Identity | null> {
  if (auth0Configured && auth0) {
    const session = await withDeadline("auth0.getSession", auth0.getSession());
    if (!session?.user?.sub) return null;
    const u = session.user;
    return { sub: u.sub, email: (u.email ?? "").toLowerCase(), name: u.name, picture: u.picture };
  }
  if (isProd) return null;
  const jar = await cookies();
  const token = jar.get(DEV_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return { sub: String(payload.sub), email: String(payload.email), name: (payload.name as string) ?? null };
  } catch {
    return null;
  }
}

/** Dev-only: mint a session cookie for an arbitrary email. Used by /dev/login. */
export async function devSignIn(email: string, name?: string) {
  if (isProd || auth0Configured) throw new Error("dev sign-in disabled");
  const e = email.trim().toLowerCase();
  const token = await new SignJWT({ email: e, name: name ?? e.split("@")[0] })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(`dev|${e}`)
    .setExpirationTime("30d")
    .sign(secret);
  const jar = await cookies();
  jar.set(DEV_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function devSignOut() {
  const jar = await cookies();
  jar.delete(DEV_COOKIE);
}

/** Upsert the users row for the current identity. Null if signed out. */
export async function getCurrentUser(): Promise<User | null> {
  const ident = await getIdentity();
  if (!ident) return null;
  const existing = await withDeadline("users.lookup", db.query.users.findFirst({ where: eq(users.auth0Sub, ident.sub) }));
  const role = await withDeadline("users.resolveRole", resolveRole(ident.email, existing?.role ?? null));
  if (existing) {
    if (existing.role !== role || (ident.name && existing.name !== ident.name)) {
      const [u] = await db.update(users).set({ role, name: ident.name ?? existing.name }).where(eq(users.id, existing.id)).returning();
      return u;
    }
    return existing;
  }
  const [created] = await db
    .insert(users)
    .values({ id: newId("usr"), auth0Sub: ident.sub, email: ident.email, name: ident.name ?? null, role })
    .onConflictDoNothing()
    .returning();
  return created ?? (await db.query.users.findFirst({ where: eq(users.auth0Sub, ident.sub) })) ?? null;
}

/** Owner from env; admins from env, from /admin/team invites, or already stored. Never demotes. */
async function resolveRole(email: string, current: User["role"] | null): Promise<User["role"]> {
  if (ownerEmail && email === ownerEmail) return "owner";
  if (current === "owner") return "admin"; // owner email changed; keep them admin
  if (current === "admin" || adminEmails.includes(email)) return "admin";
  const invite = await db.query.adminInvites.findFirst({ where: eq(adminInvites.email, email), columns: { id: true } });
  return invite ? "admin" : (current ?? "creator");
}

export function isAdmin(user: Pick<User, "role"> | null | undefined) {
  return user?.role === "admin" || user?.role === "owner";
}

export async function getCurrentStore(): Promise<Store | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return (await db.query.stores.findFirst({ where: eq(stores.userId, user.id) })) ?? null;
}

/** For /app pages: redirects to login when signed out, to onboarding when no store yet. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(loginPath("/app"));
  return user;
}

export async function requireStore(): Promise<{ user: User; store: Store }> {
  const user = await requireUser();
  const store = await db.query.stores.findFirst({ where: eq(stores.userId, user.id) });
  if (!store) redirect("/app/onboarding");
  return { user, store };
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!isAdmin(user)) redirect("/app");
  return user;
}

export function loginPath(returnTo = "/app") {
  return auth0Configured ? `/auth/login?returnTo=${encodeURIComponent(returnTo)}` : `/dev/login?returnTo=${encodeURIComponent(returnTo)}`;
}
export function logoutPath() {
  return auth0Configured ? "/auth/logout" : "/dev/logout";
}
