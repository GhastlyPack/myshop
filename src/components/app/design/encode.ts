/**
 * Theme <-> URL encoding for the live preview.
 * Standard base64url (RFC 4648 §5): "-" / "_" alphabet, no padding, UTF-8 JSON.
 * The storefront decodes the mirror with `Buffer.from(s, "base64url")`.
 * Dependency-free and safe in both the browser and Node.
 */
export function encodeTheme(theme: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(theme));
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeTheme(encoded: string): unknown | null {
  try {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const bin = atob(padded);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
