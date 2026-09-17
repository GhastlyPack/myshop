import type { Metadata } from "next";
import Link from "next/link";
import { Article, MarketingShell } from "@/components/landing/shell";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "How to sell digital products from your Instagram bio",
  description: "A practical guide to selling guides, templates, and presets from one link in your Instagram bio: what to sell, how to price it, the product page, the DM keyword, and delivery.",
  alternates: { canonical: "/guides/sell-digital-products-from-instagram-bio" },
};

export default function GuidePage() {
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How to sell digital products from your Instagram bio",
    description: metadata.description,
    url: absoluteUrl("/guides/sell-digital-products-from-instagram-bio"),
    datePublished: "2026-09-17",
    dateModified: "2026-09-17",
    author: { "@type": "Organization", name: "visitmy.shop", url: absoluteUrl("/") },
    publisher: { "@type": "Organization", name: "visitmy.shop", url: absoluteUrl("/") },
  };
  return (
    <MarketingShell>
      <JsonLd data={articleLd} />
      <Article
        title="How to sell digital products from your Instagram bio."
        intro="You get one link. Here is how to make it earn: what to sell, what to charge, what the page needs, and how to get people from a comment to a download without leaving Instagram."
        updated="September 2026"
      >
        <h2>1. Pick something you already answer questions about</h2>
        <p>
          The best first product is the thing people DM you about. A checklist, a template, a preset, a swipe file, a mini guide. If you have answered
          the same question three times, that is a product. Keep it small. A 12-page PDF that solves one problem outsells a 90-page course you never finish.
        </p>
        <p>Formats that sell well from a bio link: PDF guides and checklists, Notion and Canva templates, Lightroom presets, CapCut templates, sample packs, and short video walkthroughs.</p>

        <h2>2. Make the first one free</h2>
        <p>
          A free download is the fastest way to learn whether anyone wants what you make. It also builds the email list you will sell the paid product to.
          Ask for a name and an email, nothing else. Every extra field costs you finishers.
        </p>

        <h2>3. Price the paid one like a coffee, not a course</h2>
        <p>
          $9 to $39 is the range where people buy without thinking. Under $9 feels like it might be junk. Over $50 needs a sales page, testimonials, and
          a reason to trust you. Start at $19 and adjust. You can add a discount code for launch week and a limited quantity if you want urgency that is real.
        </p>

        <h2>4. Build the store, not just a link</h2>
        <p>
          A link page sends people somewhere else to buy. A store lets them buy where they landed. On <Link href="/">visitmy.shop</Link> you claim a
          link like visitmy.shop/you, upload the file, set a price or make it free, and pick a theme. Your product page has its own URL, for example
          visitmy.shop/you/launch-checklist, which you can paste into captions and DMs.
        </p>
        <p>What the product page needs:</p>
        <ul>
          <li>A title that says the outcome. “The 7-Day Launch Checklist”, not “My PDF”.</li>
          <li>One line under it that says who it is for.</li>
          <li>A short description with three bullets of what is inside.</li>
          <li>A cover image. A phone screenshot of the first page works.</li>
          <li>The price, visible before the button.</li>
        </ul>

        <h2>5. Put the link in your bio and on your pinned post</h2>
        <p>
          Your bio link should go to the store, not to a link page that goes to the store. Then pin a post that shows the product and ends with the
          link. Instagram does not make captions clickable, so the pinned post’s job is to make people tap the bio.
        </p>

        <h2>6. Use a DM keyword so they never have to find the link</h2>
        <p>
          The highest-converting move on Instagram right now is “comment GUIDE and I will send it to you.” When someone comments the word, they get a DM
          with the link. On visitmy.shop every product can have a keyword, and the reply goes out automatically with a message you write. Use one word,
          all caps, easy to spell.
        </p>
        <p>A caption that works: say what the product does in one line, say who it is for, then “Comment GUIDE and I’ll DM it to you.”</p>

        <h2>7. Deliver instantly, and let them find it again</h2>
        <p>
          The file should arrive by email the moment the order clears. It should also live somewhere the buyer can return to. visitmy.shop gives every
          buyer a library at visitmy.shop/me with everything they have ever bought, so “can you resend the file” stops being a DM you get.
        </p>

        <h2>8. Ask for the review after the download</h2>
        <p>
          A review request right after delivery gets answered. A week later, it does not. Show three or four real reviews on the product page and the
          next buyer needs less convincing. You approve each one before it appears.
        </p>

        <h2>9. Look at the numbers once a week</h2>
        <p>
          Views, clicks on each product card, conversions, and where the traffic came from. If a card gets views and no clicks, the title is the problem.
          If it gets clicks and no sales, the page is the problem. Fix one thing at a time.
        </p>

        <h2>The checklist</h2>
        <ol>
          <li>Pick the thing you keep getting asked about.</li>
          <li>Make a free version and a paid version.</li>
          <li>Claim your link and upload both.</li>
          <li>Write the page: outcome title, who it is for, three bullets, cover, price.</li>
          <li>Put the link in your bio and pin a post.</li>
          <li>Set a DM keyword and post “comment WORD”.</li>
          <li>Ask for the review after delivery.</li>
          <li>Check the numbers weekly and fix one thing.</li>
        </ol>
        <p>
          <Link href="/">Claim your link</Link> and you can be live before you finish your coffee. See a real store at{" "}
          <Link href="/demo">visitmy.shop/demo</Link>.
        </p>
      </Article>
    </MarketingShell>
  );
}
