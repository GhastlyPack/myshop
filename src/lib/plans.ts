/** Public pricing. Copy on the lander, /pricing, FAQ, and compare pages reads from here. */
export type Plan = {
  key: "basic" | "pro";
  name: string;
  monthly: number;
  annual: number;
  feePercent: number;
  tagline: string;
  features: string[];
  highlight?: boolean;
};

export const PLANS: Plan[] = [
  {
    key: "basic",
    name: "Basic",
    monthly: 9,
    annual: 90,
    feePercent: 5,
    tagline: "Everything you need to sell from your bio.",
    features: [
      "Storefront at visitmy.shop/yourname",
      "Unlimited digital products and links",
      "Lead magnets and email capture",
      "Instant delivery and a buyer download portal",
      "Preset themes",
      "Basic analytics",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    monthly: 49,
    annual: 490,
    feePercent: 0,
    tagline: "Everything in Basic, plus full control and a 0% fee.",
    highlight: true,
    features: [
      "Full design editor: fonts, colors, layout",
      "Remove visitmy.shop branding",
      "Instagram keyword auto-replies",
      "Discount codes, order bumps, limited quantity",
      "Custom checkout fields",
      "Pixel tracking: Meta, Google, TikTok",
      "Team access",
    ],
  },
];

/** Planned for Pro, not shipped. Always labelled coming soon. */
export const ROADMAP = ["Memberships and community access", "Courses", "Bookings", "Affiliate program"];

export const TRIAL = "14-day free trial with full Pro access. No card required.";

export const keepPercent = (p: Plan) => 100 - p.feePercent;
