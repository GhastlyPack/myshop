import { Button, Hr, Link, Section, Text, render } from "@react-email/components";
import { EmailLayout, emailStyles as s } from "./layout";

/**
 * Delivery / confirmation email sent after a free claim or a paid order.
 * Package D reuses `renderDeliveryEmail` from the Stripe webhook.
 *
 * One order can deliver more than one product (order bump), so the template
 * takes a `products` array; `DeliveryEmailProps` keeps the original
 * single-product shape and is adapted by `renderDeliveryEmail`.
 */
export type DeliveredProduct = {
  title: string;
  /** Entitlement token → /d/<token>?f=<fileId> */
  token: string;
  files: { id: string; filename: string }[];
  links: { url: string; label: string }[];
};

export type DeliveryEmailBase = {
  storeName: string;
  storeUsername: string;
  buyerName: string;
  buyerEmail: string;
  /** Absolute base, e.g. https://visitmy.shop */
  baseUrl: string;
  /** Creator's custom copy (from the main product); {{name}} {{product}} {{store}} are substituted. */
  confirmationSubject?: string | null;
  confirmationBody?: string | null;
  isPaid?: boolean;
};

/** Single product (original signature). */
export type DeliveryEmailProps = DeliveryEmailBase & { productTitle: string } & DeliveredProduct;

/** One or more products; the first is the main product and drives the subject/copy. */
export type DeliveryEmailProductsProps = DeliveryEmailBase & { products: DeliveredProduct[] };

export function substitute(template: string, vars: { name: string; product: string; store: string }) {
  return template.replace(/\{\{\s*(name|product|store)\s*\}\}/g, (_, k: keyof typeof vars) => vars[k]);
}

function mainTitle(p: DeliveryEmailProductsProps) {
  return p.products[0]?.title ?? "Your order";
}

export function deliverySubject(p: DeliveryEmailProps | DeliveryEmailProductsProps) {
  const title = "products" in p ? mainTitle(p) : p.productTitle;
  const vars = { name: p.buyerName, product: title, store: p.storeName };
  const custom = p.confirmationSubject?.trim();
  return custom ? substitute(custom, vars) : `Your ${title} from ${p.storeName}`;
}

function ProductBlock({ product, baseUrl, heading }: { product: DeliveredProduct; baseUrl: string; heading: boolean }) {
  return (
    <>
      {heading && <Text style={{ ...s.p, fontWeight: 600, margin: "24px 0 0" }}>{product.title}</Text>}
      {product.files.length > 0 && (
        <Section style={{ margin: "20px 0 8px" }}>
          <Text style={{ ...s.muted, margin: "0 0 10px" }}>Downloads</Text>
          {product.files.map((f) => (
            <Section key={f.id} style={s.fileRow}>
              <Link href={`${baseUrl}/d/${product.token}?f=${encodeURIComponent(f.id)}`} style={{ ...s.link, fontWeight: 600, fontSize: 15 }}>
                {f.filename}
              </Link>
            </Section>
          ))}
        </Section>
      )}
      {product.links.length > 0 && (
        <Section style={{ margin: "20px 0 8px" }}>
          <Text style={{ ...s.muted, margin: "0 0 10px" }}>Links</Text>
          {product.links.map((l, i) => (
            <Section key={i} style={{ marginBottom: 10 }}>
              <Button href={l.url} style={s.button}>
                {l.label}
              </Button>
            </Section>
          ))}
        </Section>
      )}
    </>
  );
}

export function DeliveryEmail(p: DeliveryEmailProductsProps) {
  const title = mainTitle(p);
  const vars = { name: p.buyerName, product: title, store: p.storeName };
  const firstName = p.buyerName.split(" ")[0] || "there";
  const customBody = p.confirmationBody?.trim();
  const body = customBody
    ? substitute(customBody, vars)
    : p.isPaid
      ? `Thanks for your order, ${firstName}. Everything you bought is below and it's yours to keep.`
      : `Here's your ${title}, ${firstName}. Everything's below and it's yours to keep.`;
  const me = `${p.baseUrl}/me`;
  const multi = p.products.length > 1;
  return (
    <EmailLayout storeName={p.storeName} preview={`Your ${title} is ready`}>
      <Text style={s.h1}>{title}</Text>
      {body.split(/\n{2,}|\n/).map((para, i) => (
        <Text key={i} style={s.p}>
          {para}
        </Text>
      ))}
      {p.products.map((product, i) => (
        <ProductBlock key={i} product={product} baseUrl={p.baseUrl} heading={multi} />
      ))}
      <Hr style={{ borderColor: "#e4e4e7", margin: "24px 0 16px" }} />
      <Text style={s.muted}>
        Manage all your downloads any time at{" "}
        <Link href={me} style={s.link}>
          {me.replace(/^https?:\/\//, "")}
        </Link>
        . Just enter {p.buyerEmail} and we&apos;ll send you a sign-in link.
      </Text>
      <Text style={s.muted}>
        From{" "}
        <Link href={`${p.baseUrl}/${p.storeUsername}`} style={s.link}>
          {p.storeName}
        </Link>
      </Text>
    </EmailLayout>
  );
}

/** Subject + html + text for one or more products, ready for `sendMail`. */
export async function renderDeliveryEmailProducts(props: DeliveryEmailProductsProps) {
  const element = <DeliveryEmail {...props} />;
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject: deliverySubject(props), html, text };
}

/** Single-product wrapper (original signature). */
export async function renderDeliveryEmail(props: DeliveryEmailProps) {
  const { productTitle, token, files, links, ...base } = props;
  return renderDeliveryEmailProducts({ ...base, products: [{ title: productTitle, token, files, links }] });
}
