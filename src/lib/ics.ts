/** Minimal iCalendar (.ics) builder for a single booking, so any email client adds it to a calendar. */

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export type IcsInput = {
  uid: string;
  start: Date;
  end: Date;
  title: string;
  description?: string;
  location?: string;
  organizerName: string;
  organizerEmail: string;
  attendeeName: string;
  attendeeEmail: string;
  /** "REQUEST" for a new invite, "CANCEL" to withdraw it. */
  method?: "REQUEST" | "CANCEL";
  status?: "CONFIRMED" | "CANCELLED";
};

export function buildIcs(input: IcsInput): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//visitmy.shop//bookings//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${input.method ?? "REQUEST"}`,
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(input.start)}`,
    `DTEND:${icsDate(input.end)}`,
    `SUMMARY:${esc(input.title)}`,
    ...(input.description ? [`DESCRIPTION:${esc(input.description)}`] : []),
    ...(input.location ? [`LOCATION:${esc(input.location)}`] : []),
    `ORGANIZER;CN=${esc(input.organizerName)}:mailto:${input.organizerEmail}`,
    `ATTENDEE;CN=${esc(input.attendeeName)};RSVP=TRUE:mailto:${input.attendeeEmail}`,
    `STATUS:${input.status ?? "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
