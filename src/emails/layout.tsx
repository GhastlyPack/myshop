import { Body, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

/**
 * Shared email shell: light, plain, readable in every client (Gmail whites out
 * dark themes). Store name in the header, visitmy.shop in the footer.
 */
export const emailStyles = {
  body: { backgroundColor: "#f4f4f5", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif", margin: 0, padding: "32px 12px" },
  container: { backgroundColor: "#ffffff", borderRadius: 16, padding: "36px 32px", maxWidth: 520, margin: "0 auto" },
  eyebrow: { fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "#6b7280", margin: "0 0 8px" },
  h1: { fontSize: 24, fontWeight: 600, color: "#111111", margin: "0 0 16px", lineHeight: 1.25 },
  p: { fontSize: 15, lineHeight: 1.6, color: "#27272a", margin: "0 0 14px" },
  muted: { fontSize: 13, lineHeight: 1.6, color: "#6b7280", margin: "0 0 8px" },
  button: {
    display: "inline-block",
    backgroundColor: "#111111",
    color: "#ffffff",
    fontSize: 15,
    fontWeight: 600,
    padding: "13px 22px",
    borderRadius: 10,
    textDecoration: "none",
  },
  fileRow: { padding: "12px 14px", border: "1px solid #e4e4e7", borderRadius: 10, marginBottom: 8 },
  link: { color: "#111111", textDecoration: "underline" },
  footer: { fontSize: 12, color: "#9ca3af", textAlign: "center" as const, margin: "24px 0 0" },
};

export function EmailLayout({ storeName, preview, children }: { storeName: string; preview: string; children: ReactNode }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={emailStyles.body}>
        <Container style={emailStyles.container}>
          <Text style={emailStyles.eyebrow}>{storeName}</Text>
          {children}
        </Container>
        <Section>
          <Text style={emailStyles.footer}>
            Sent by visitmy.shop on behalf of {storeName}.
          </Text>
        </Section>
      </Body>
    </Html>
  );
}
