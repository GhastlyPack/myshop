import { Button, Link, Section, Text, render } from "@react-email/components";
import { EmailLayout, emailStyles as s } from "./layout";

export type MagicLinkEmailProps = { url: string; email: string };

export function MagicLinkEmail({ url, email }: MagicLinkEmailProps) {
  return (
    <EmailLayout storeName="visitmy.shop" preview="Your sign-in link for your downloads">
      <Text style={s.h1}>Open your downloads</Text>
      <Text style={s.p}>Tap the button below to see everything you&apos;ve picked up on visitmy.shop. The link works once and expires in 15 minutes.</Text>
      <Section style={{ margin: "20px 0 24px" }}>
        <Button href={url} style={s.button}>
          Sign in as {email}
        </Button>
      </Section>
      <Text style={s.muted}>
        Or paste this into your browser:
        <br />
        <Link href={url} style={s.link}>
          {url}
        </Link>
      </Text>
      <Text style={s.muted}>If you didn&apos;t request this, you can ignore it.</Text>
    </EmailLayout>
  );
}

export async function renderMagicLinkEmail(props: MagicLinkEmailProps) {
  const element = <MagicLinkEmail {...props} />;
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject: "Your visitmy.shop sign-in link", html, text };
}
