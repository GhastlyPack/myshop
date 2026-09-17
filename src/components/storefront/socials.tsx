import { Globe, Mail } from "lucide-react";
import type { SocialLinks } from "@/db/schema";

type IconProps = { className?: string };
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/* Lucide dropped brand icons, so these are small inline strokes in the same style. */
function Instagram(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} {...p}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
    </svg>
  );
}
function TikTok(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} {...p}>
      <path d="M13.5 3v11.2a3.2 3.2 0 1 1-3.2-3.2" />
      <path d="M13.5 3c.4 2.6 2.2 4.4 4.8 4.8" />
    </svg>
  );
}
function YouTube(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} {...p}>
      <path d="M22 8.2a2.8 2.8 0 0 0-2-2C18.3 5.8 12 5.8 12 5.8s-6.3 0-7.9.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1.7 12a29 29 0 0 0 .4 3.8 2.8 2.8 0 0 0 2 2c1.6.4 7.9.4 7.9.4s6.3 0 7.9-.4a2.8 2.8 0 0 0 2-2 29 29 0 0 0 .4-3.8 29 29 0 0 0-.3-3.8z" />
      <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function XIcon(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} {...p}>
      <path d="M4 4l16 16" />
      <path d="M20 4L4 20" />
    </svg>
  );
}
function Threads(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} {...p}>
      <path d="M12 3c-5.2 0-8 3.6-8 9s2.8 9 8 9c4.4 0 7-2.4 7-5.4 0-2.6-2.1-4.2-4.8-4.2-2.4 0-4 1.2-4 2.9s1.5 2.5 3 2.5c2.1 0 3.4-1.4 3.6-4.1" />
      <path d="M8.6 9.6c.5-1.4 1.8-2.3 3.5-2.3 2 0 3.2 1 3.6 2.6" />
    </svg>
  );
}
function LinkedIn(p: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} {...p}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

const ORDER: (keyof SocialLinks)[] = ["instagram", "tiktok", "youtube", "x", "threads", "linkedin", "website", "email"];
const ICON: Record<keyof SocialLinks, (p: IconProps) => React.ReactNode> = {
  instagram: Instagram,
  tiktok: TikTok,
  youtube: YouTube,
  x: XIcon,
  threads: Threads,
  linkedin: LinkedIn,
  website: (p) => <Globe size={20} strokeWidth={1.8} {...p} />,
  email: (p) => <Mail size={20} strokeWidth={1.8} {...p} />,
};
/** Icons and labels, exported for the lander's mockups. */
export { ICON as SOCIAL_ICONS };
const LABEL: Record<keyof SocialLinks, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X",
  threads: "Threads",
  linkedin: "LinkedIn",
  website: "Website",
  email: "Email",
};

function hrefFor(key: keyof SocialLinks, value: string) {
  const v = value.trim();
  if (!v) return null;
  if (key === "email") return v.startsWith("mailto:") ? v : `mailto:${v}`;
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, "");
  switch (key) {
    case "instagram":
      return `https://instagram.com/${handle}`;
    case "tiktok":
      return `https://tiktok.com/@${handle}`;
    case "youtube":
      return `https://youtube.com/@${handle}`;
    case "x":
      return `https://x.com/${handle}`;
    case "threads":
      return `https://threads.net/@${handle}`;
    case "linkedin":
      return `https://linkedin.com/in/${handle}`;
    default:
      return `https://${v}`;
  }
}

/** Public profile URLs (no mailto), for schema.org sameAs. */
export function socialHrefs(socials: SocialLinks): string[] {
  return ORDER.map((k) => (socials[k] ? hrefFor(k, socials[k]!) : null)).filter((h): h is string => Boolean(h) && !h!.startsWith("mailto:"));
}

export function Socials({ socials }: { socials: SocialLinks }) {
  const items = ORDER.map((k) => ({ k, href: socials[k] ? hrefFor(k, socials[k]!) : null })).filter((i) => i.href);
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap items-center justify-center gap-2" aria-label="Social links">
      {items.map(({ k, href }) => {
        const Icon = ICON[k];
        return (
          <li key={k}>
            <a href={href!} target={k === "email" ? undefined : "_blank"} rel="me noopener" className="sf-social" aria-label={LABEL[k]} title={LABEL[k]}>
              <Icon />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
