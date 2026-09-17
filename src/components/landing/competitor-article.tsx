import Link from "next/link";
import { Article } from "@/components/landing/shell";
import { COMPARED_ON, COMPETITORS, MATRIX, type CompetitorKey } from "@/lib/compare";

/** Deep-dive page body for a competitor that doesn't have hand-written copy: table, strengths, gaps, verdict. */
export function CompetitorArticle({ competitor }: { competitor: CompetitorKey }) {
  const c = COMPETITORS[competitor];
  return (
    <Article title={`visitmy.shop vs ${c.name}.`} intro={c.verdict} updated={COMPARED_ON}>
      <table>
        <thead>
          <tr>
            <th />
            <th>visitmy.shop</th>
            <th>{c.name}</th>
          </tr>
        </thead>
        <tbody>
          {MATRIX.map((r) => (
            <tr key={r.label}>
              <td>{r.label}</td>
              <td>{r.us}</td>
              <td>{r[competitor]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Where {c.name} is stronger</h2>
      <ul>
        {c.strengths.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <p>
        <strong>Best for:</strong> {c.bestFor}
      </p>
      <h2>Where visitmy.shop is stronger</h2>
      <ul>
        {c.gaps.map((g) => (
          <li key={g}>{g}</li>
        ))}
      </ul>
      <p>
        visitmy.shop is a store that is the bio link: product pages with clean URLs, a two-field checkout, instant delivery, a buyer library, reviews you
        approve, and Instagram keyword replies. Basic is $9 a month with a 5% fee; Pro is $49 with none, and every account starts with 7 days of Pro.
      </p>
      <p>
        <Link href="/">Claim your link</Link>, see <Link href="/pricing">pricing</Link>, or go back to <Link href="/compare">all comparisons</Link>. Compared
        against {c.name}’s published plans in {COMPARED_ON}. Email hello@visitmy.shop if something changed.
      </p>
    </Article>
  );
}
