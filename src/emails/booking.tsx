import { Button, Hr, Link, Section, Text, render } from "@react-email/components";
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
  /** Pre-call materials attached to the booking product (download links + external links). */
  downloads?: { name: string; url: string }[];
  links?: { label: string; url: string }[];
  /** When the creator set pre-call questions: where the buyer answers them (the booking page). */
  questionnaireUrl?: string;
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
      {!p.forCreator && ((p.downloads?.length ?? 0) > 0 || (p.links?.length ?? 0) > 0) && (
        <Section style={{ margin: "0 0 18px" }}>
          <Text style={{ ...s.muted, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1.2, fontSize: 11 }}>Before your call</Text>
          {p.downloads?.map((d) => (
            <div key={d.url} style={s.fileRow}>
              <Link href={d.url} style={{ ...s.link, fontWeight: 600, fontSize: 15 }}>
                {d.name}
              </Link>
            </div>
          ))}
          {p.links?.map((l) => (
            <div key={l.url} style={s.fileRow}>
              <Link href={l.url} style={{ ...s.link, fontWeight: 600, fontSize: 15 }}>
                {l.label}
              </Link>
            </div>
          ))}
        </Section>
      )}
      {!p.forCreator && p.questionnaireUrl && (
        <Section style={{ margin: "0 0 18px" }}>
          <Text style={{ ...s.p, margin: "0 0 10px" }}>To make the most of your time, answer a few quick questions before the call.</Text>
          <Button href={p.questionnaireUrl} style={s.buttonSecondary}>
            Answer the pre-call questions
          </Button>
        </Section>
      )}
      <Hr style={{ borderColor: "#DDE3EC", margin: "18px 0" }} />
      <Text style={s.muted}>The invite is attached as a calendar file, and it&apos;s on {p.forCreator ? "your" : "the host's"} Google Calendar too. Need to change it? Just reply to this email.</Text>
    </EmailLayout>
  );
}

/** Sent to the creator when a buyer submits the pre-call questionnaire. */
export type QuestionnaireEmailProps = {
  storeName: string;
  buyerName: string;
  buyerEmail: string;
  productTitle: string;
  whenText: string;
  answers: { label: string; value: string }[];
};

export function QuestionnaireEmail(p: QuestionnaireEmailProps) {
  return (
    <EmailLayout storeName={p.storeName} preview={`${p.buyerName} answered your pre-call questions`}>
      <Text style={s.h1}>Pre-call answers from {p.buyerName}</Text>
      <Text style={s.p}>
        For {p.productTitle} · {p.whenText}. Reply to this email to reach them at {p.buyerEmail}.
      </Text>
      {p.answers.map((a) => (
        <div key={a.label} style={s.fileRow}>
          <Text style={{ ...s.muted, margin: "0 0 4px", fontWeight: 600, color: "#111111" }}>{a.label}</Text>
          <Text style={{ ...s.p, margin: 0, whiteSpace: "pre-wrap" as const }}>{a.value || "—"}</Text>
        </div>
      ))}
    </EmailLayout>
  );
}

export async function renderQuestionnaireEmail(props: QuestionnaireEmailProps) {
  const element = <QuestionnaireEmail {...props} />;
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject: `Pre-call answers from ${props.buyerName} — ${props.productTitle}`, html, text };
}

export async function renderBookingEmail(props: BookingEmailProps) {
  const element = <BookingEmail {...props} />;
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  const subject = props.forCreator ? `New booking: ${props.productTitle} — ${props.whenText}` : `Confirmed: ${props.productTitle} — ${props.whenText}`;
  return { subject, html, text };
}
