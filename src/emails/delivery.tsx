import { Button, Hr, Link, Section, Text, render } from "@react-email/components";
import { EmailLayout, emailStyles as s } from "./layout";

/**
 * Delivery / confirmation email sent after a free claim or a paid order.
 * Package D reuses `renderDeliveryEmail` from the Stripe webhook.
 */
export type DeliveryEmailProps = {
  storeName: string;
  storeUsername: string;
  productTitle: string;
  buyerName: string;
  buyerEmail: string;
  /** Entitlement token → /d/<token>?f=<fileId> */
  token: string;
  files: { id: string; filename: string }[];
  links: { url: string; label: string }[];
  /** Absolute base, e.g. https://visitmy.shop */
  baseUrl: string;
  /** Creator's custom copy; {{name}} {{product}} {{store}} are substituted. */
  confirmationSubject?: string | null;
  confirmationBody?: string | null;
  isPaid?: boolean;
};

export function substitute(template: string, vars: { name: string; product: string; store: string }) {
  return template.replace(/\{\{\s*(name|product|store)\s*\}\}/g, (_, k: keyof typeof vars) => vars[k]);
}

export function deliverySubject(p: DeliveryEmailProps) {
  const vars = { name: p.buyerName, product: p.productTitle, store: p.storeName };
  const custom = p.confirmationSubject?.trim();
  return custom ? substitute(custom, vars) : `Your ${p.productTitle} from ${p.storeName}`;
}

export function DeliveryEmail(p: DeliveryEmailProps) {
  const vars = { name: p.buyerName, product: p.productTitle, store: p.storeName };
  const firstName = p.buyerName.split(" ")[0] || "there";
  const customBody = p.confirmationBody?.trim();
  const body = customBody
    ? substitute(customBody, vars)
    : p.isPaid
      ? `Thanks for your order, ${firstName}. Everything you bought is below and it's yours to keep.`
      : `Here's your ${p.productTitle}, ${firstName}. Everything's below and it's yours to keep.`;
  const me = `${p.baseUrl}/me`;
  return (
    <EmailLayout storeName={p.storeName} preview={`Your ${p.productTitle} is ready`}>
      <Text style={s.h1}>{p.productTitle}</Text>
      {body.split(/\n{2,}|\n/).map((para, i) => (
        <Text key={i} style={s.p}>
          {para}
        </Text>
      ))}
      {p.files.length > 0 && (
        <Section style={{ margin: "20px 0 8px" }}>
          <Text style={{ ...s.muted, margin: "0 0 10px" }}>Downloads</Text>
          {p.files.map((f) => (
            <Section key={f.id} style={s.fileRow}>
              <Link href={`${p.baseUrl}/d/${p.token}?f=${encodeURIComponent(f.id)}`} style={{ ...s.link, fontWeight: 600, fontSize: 15 }}>
                {f.filename}
              </Link>
            </Section>
          ))}
        </Section>
      )}
      {p.links.length > 0 && (
        <Section style={{ margin: "20px 0 8px" }}>
          <Text style={{ ...s.muted, margin: "0 0 10px" }}>Links</Text>
          {p.links.map((l, i) => (
            <Section key={i} style={{ marginBottom: 10 }}>
              <Button href={l.url} style={s.button}>
                {l.label}
              </Button>
            </Section>
          ))}
        </Section>
      )}
      <Hr style={{ borderColor: "#e4e4e7", margin: "24px 0 16px" }} />
      <Text style={s.muted}>
        Manage all your downloads any time at{" "}
        <Link href={me} style={s.link}>
          {me.replace(/^https?:\/\//, "")}
        </Link>
        . Just enter {p.buyerEmail} and we&apos;ll send you a sign-in link.
      </Text>
      <Text style={s.muted}>
        From{" "}
        <Link href={`${p.baseUrl}/${p.storeUsername}`} style={s.link}>
          {p.storeName}
        </Link>
      </Text>
    </EmailLayout>
  );
}

/** Subject + html + text, ready for `sendMail`. */
export async function renderDeliveryEmail(props: DeliveryEmailProps) {
  const element = <DeliveryEmail {...props} />;
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject: deliverySubject(props), html, text };
}
