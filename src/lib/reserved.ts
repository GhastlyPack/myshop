/** Usernames that can never be claimed (routes, brand, abuse). */
const RESERVED = new Set([
  "app", "admin", "me", "d", "api", "auth", "dev", "login", "logout", "signup", "signin", "register",
  "pricing", "blog", "help", "support", "terms", "privacy", "legal", "about", "contact", "careers", "jobs",
  "static", "_next", "public", "assets", "img", "images", "cdn", "files", "download", "downloads",
  "visitmyshop", "visitmy", "myshop", "shop", "store", "stan", "official", "team", "staff", "mod", "moderator",
  "root", "system", "null", "undefined", "www", "mail", "email", "ftp", "test", "demo", "example",
  "checkout", "cart", "order", "orders", "billing", "settings", "dashboard", "account", "accounts", "profile",
  "webhooks", "webhook", "stripe", "paypal", "instagram", "tiktok", "youtube", "facebook", "meta",
  "fuck", "shit", "cunt", "nigger", "nigga", "faggot", "retard", "porn", "sex", "xxx", "nude", "nudes",
]);

export const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._]{1,28}[a-z0-9])?$/;

export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

export function usernameError(raw: string): string | null {
  const u = normalizeUsername(raw);
  if (u.length < 3) return "At least 3 characters.";
  if (u.length > 30) return "At most 30 characters.";
  if (!USERNAME_RE.test(u)) return "Letters, numbers, dots and underscores only. Must start and end with a letter or number.";
  if (u.includes("..") || u.includes("__") || u.includes("._") || u.includes("_.")) return "No consecutive dots or underscores.";
  if (RESERVED.has(u)) return "That name is reserved.";
  return null;
}
