import { env } from "@/lib/env";

/** Public identity of the platform, used by metadata, sitemap, and structured data. */
export const SITE = {
  name: "visitmy.shop",
  url: env.APP_BASE_URL.replace(/\/$/, ""),
  tagline: "Your bio link, but it actually sells.",
  description: "Sell digital products straight from your Instagram bio. Upload a file, drop one link, get paid to your own Stripe, delivered in seconds.",
  email: "hello@visitmy.shop",
  /** Official profiles, used as schema.org sameAs. Fill in as they are claimed. */
  profiles: ["https://www.instagram.com/visitmy.shop"] as string[],
  /** One real creator quote for the lander. Leave null until you have one; nothing fake is rendered. */
  testimonial: null as null | { text: string; name: string; username: string },
};

export const absoluteUrl = (path: string) => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
