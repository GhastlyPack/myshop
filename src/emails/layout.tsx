import { Body, Container, Head, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { env } from "@/lib/env";

/**
 * Branded email shell. Light blue-grey page, white card, the wordmark as a hosted PNG
 * (email clients can't load our fonts), ink text, orange primary button.
 * Light theme only on purpose: Gmail and Outlook rewrite dark themes badly.
 */
const ink = "#111111";
const muted = "#6B7280";
const orange = "#F4611E";
const tint = "#F1F4F8";
const border = "#DDE3EC";

export const emailStyles = {
  body: { backgroundColor: tint, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", margin: 0, padding: "40px 12px" },
  container: { backgroundColor: "#ffffff", borderRadius: 18, padding: "40px 36px", maxWidth: 540, margin: "0 auto", border: `1px solid ${border}` },
  eyebrow: { fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase" as const, color: muted, margin: "0 0 10px", fontWeight: 600 },
  h1: { fontSize: 26, fontWeight: 700, color: ink, margin: "0 0 16px", lineHeight: 1.2, letterSpacing: -0.4 },
  p: { fontSize: 16, lineHeight: 1.6, color: "#27272A", margin: "0 0 14px" },
  muted: { fontSize: 13, lineHeight: 1.6, color: muted, margin: "0 0 8px" },
  button: {
    display: "inline-block",
    backgroundColor: orange,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 600,
    padding: "14px 24px",
    borderRadius: 999,
    textDecoration: "none",
  },
  buttonSecondary: {
    display: "inline-block",
    backgroundColor: ink,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 600,
    padding: "13px 22px",
    borderRadius: 999,
    textDecoration: "none",
  },
  fileRow: { padding: "14px 16px", border: `1px solid ${border}`, borderRadius: 12, marginBottom: 8, backgroundColor: tint },
  link: { color: ink, textDecoration: "underline" },
  footer: { fontSize: 12, color: "#9CA3AF", textAlign: "center" as const, margin: "10px 0 0", lineHeight: 1.6 },
};

export function EmailLayout({ storeName, preview, children }: { storeName: string; preview: string; children: ReactNode }) {
  const base = env.APP_BASE_URL;
  const isPlatform = storeName.toLowerCase() === "visitmy.shop";
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={emailStyles.body}>
        <Section style={{ textAlign: "center", padding: "0 0 22px" }}>
          <Link href={base}>
            <Img src={`${base}/brand/wordmark`} width="140" height="28" alt="visitmy.shop" style={{ margin: "0 auto", display: "block" }} />
          </Link>
        </Section>
        <Container style={emailStyles.container}>
          {!isPlatform && <Text style={emailStyles.eyebrow}>{storeName}</Text>}
          {children}
        </Container>
        <Section style={{ textAlign: "center", padding: "22px 0 0" }}>
          <Text style={emailStyles.footer}>
            {isPlatform ? "Sent by visitmy.shop." : `Sent by visitmy.shop on behalf of ${storeName}.`}
            <br />
            <Link href={`${base}/me`} style={{ color: "#9CA3AF", textDecoration: "underline" }}>
              Your downloads
            </Link>
            {" · "}
            <Link href={base} style={{ color: "#9CA3AF", textDecoration: "underline" }}>
              Sell your own digital products
            </Link>
          </Text>
        </Section>
      </Body>
    </Html>
  );
}
