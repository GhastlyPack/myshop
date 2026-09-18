import slugify from "slugify";
import { z } from "zod";

/** Product editor form contract, shared by the client form and the save action. */
export const linkSchema = z.object({
  url: z.string().trim().url("Enter a full URL, including https://").max(2000),
  label: z.string().trim().min(1, "Give the link a label.").max(120),
});

export const fieldSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().trim().min(1, "Every field needs a label.").max(120),
  type: z.enum(["text", "phone", "select", "checkbox", "multiselect"]),
  required: z.boolean(),
  options: z.array(z.string().trim().max(120)).max(50).optional(),
});

export const productInputSchema = z.object({
  title: z.string().trim().max(140, "Keep the title under 140 characters."),
  subtitle: z.string().trim().max(200, "Keep the subtitle under 200 characters."),
  slug: z.string().trim().max(80, "Keep the slug under 80 characters."),
  description: z.string().max(20000, "Description is too long."),
  type: z.enum(["download", "link", "booking"]),
  priceCents: z.number().int().min(0).max(100_000_000, "That price is too high."),
  /** Booking products: call length in minutes. Null for non-booking products. */
  durationMinutes: z.number().int().min(5).max(600).nullable().default(null),
  /** Booking products: plain-text agenda pushed to the calendar event and invite. Required to publish a booking. */
  meetingDescription: z.string().trim().max(2000, "Keep the meeting description under 2000 characters.").default(""),
  cardStyle: z.enum(["button", "callout", "preview"]),
  buttonText: z.string().trim().min(1, "Add button text.").max(40, "Keep button text short."),
  thumbnailKey: z.string().nullable(),
  bannerKey: z.string().nullable(),
  sectionId: z.string().nullable(),
  links: z.array(linkSchema).max(50),
  fields: z.array(fieldSchema).max(30),
  marketingOptIn: z.boolean(),
  confirmationSubject: z.string().trim().max(200),
  confirmationBody: z.string().max(10000),
  listed: z.boolean(),
  dmKeyword: z.string().trim().max(40, "Keep the keyword under 40 characters."),
  dmReplyText: z.string().trim().max(600, "Keep the reply under 600 characters."),
  /** Limited quantity; null = unlimited. */
  quantityLimit: z.number().int().min(1, "Limit must be at least 1.").max(1_000_000).nullable(),
  /** Order bump: another paid product from the same store. */
  bumpProductId: z.string().max(64).nullable(),
  bumpHeadline: z.string().trim().max(120, "Keep the headline under 120 characters."),
  bumpDiscountPercent: z.number().int().min(0).max(100, "Enter 0 to 100."),
});

/** Discount code form, shared by the editor and its server actions. */
export const discountCodeInputSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Codes need at least 2 characters.")
    .max(32, "Keep codes under 32 characters.")
    .regex(/^[A-Z0-9_-]+$/, "Letters, numbers, dashes and underscores only."),
  kind: z.enum(["percent", "amount"]),
  /** Percent (1..100) or cents, depending on `kind`. */
  value: z.number().int().min(1, "Enter a value."),
  maxUses: z.number().int().min(1).max(1_000_000).nullable(),
  /** ISO date (yyyy-mm-dd) or null. */
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.").nullable(),
});
export type DiscountCodeInput = z.input<typeof discountCodeInputSchema>;
export type ProductInput = z.input<typeof productInputSchema>;

export function toSlug(s: string) {
  return slugify(s, { lower: true, strict: true, trim: true }).slice(0, 80);
}
