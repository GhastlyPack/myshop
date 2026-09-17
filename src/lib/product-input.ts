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
  type: z.enum(["download", "link"]),
  priceCents: z.number().int().min(0).max(100_000_000, "That price is too high."),
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
});
export type ProductInput = z.input<typeof productInputSchema>;

export function toSlug(s: string) {
  return slugify(s, { lower: true, strict: true, trim: true }).slice(0, 80);
}
