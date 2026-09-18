import { Button, Hr, Section, Text, render } from "@react-email/components";
import { EmailLayout, emailStyles as s } from "./layout";

/** Booking confirmation, sent to the buyer (and a heads-up to the creator). Carries an .ics attachment. */
export type BookingEmailProps = {
  storeName: string;
  /** Who this email is addressed to. */
  recipientName: string;
  /** The other party's name, shown in the body. */
  withName: string;
  productTitle: string;
  /** Preformatted date + time in the recipient's timezone, e.g. "Thursday, September 18, 2026 · 2:00–3:00 PM EDT". */
  whenText: string;
  meetUrl?: string;
  /** Creator copy is worded as an incoming booking; buyer copy as a confirmation. */
  forCreator?: boolean;
};

export function BookingEmail(p: BookingEmailProps) {
  const heading = p.forCreator ? `New booking: ${p.productTitle}` : `You're booked: ${p.productTitle}`;
  const lead = p.forCreator
    ? `${p.withName} booked ${p.productTitle} with you.`
    : `Your ${p.productTitle} with ${p.withName} is confirmed. We've attached a calendar invite.`;
  return (
    <EmailLayout storeName={p.storeName} preview={`${p.productTitle} — ${p.whenText}`}>
      <Text style={s.h1}>{heading}</Text>
      <Text style={s.p}>Hi {p.recipientName}, {lead}</Text>
      <Section style={{ padding: "16px 18px", border: "1px solid #DDE3EC", borderRadius: 12, backgroundColor: "#F1F4F8", margin: "0 0 18px" }}>
        <Text style={{ ...s.muted, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 1.2, fontSize: 11 }}>When</Text>
        <Text style={{ ...s.p, margin: 0, fontWeight: 600 }}>{p.whenText}</Text>
      </Section>
      {p.meetUrl && (
        <Section style={{ margin: "0 0 18px" }}>
          <Button href={p.meetUrl} style={s.button}>
            Join the call
          </Button>
          <Text style={s.muted}>Or paste this link at the time: {p.meetUrl}</Text>
        </Section>
      )}
      <Hr style={{ borderColor: "#DDE3EC", margin: "18px 0" }} />
      <Text style={s.muted}>The invite is attached as a calendar file, and it&apos;s on {p.forCreator ? "your" : "the host's"} Google Calendar too. Need to change it? Just reply to this email.</Text>
    </EmailLayout>
  );
}

export async function renderBookingEmail(props: BookingEmailProps) {
  const element = <BookingEmail {...props} />;
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  const subject = props.forCreator ? `New booking: ${props.productTitle} — ${props.whenText}` : `Confirmed: ${props.productTitle} — ${props.whenText}`;
  return { subject, html, text };
}
