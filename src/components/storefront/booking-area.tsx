import type { Product, Store } from "@/db/schema";
import { getBookingSlots, hasOpenHours } from "@/lib/booking-slots";
import { BookingPicker } from "./booking-picker";

/** Storefront booking block: shows the creator's open times for this call, or a gentle empty state. */
export async function BookingArea({ store, product }: { store: Store; product: Product }) {
  if (!hasOpenHours(store) || !product.durationMinutes) {
    return (
      <div className="text-center">
        <h2 className="sf-heading text-[1.2rem]">Booking opens soon</h2>
        <p className="sf-muted mt-2 text-[0.95rem]">{store.displayName} hasn&apos;t opened times for this yet. Check back shortly.</p>
      </div>
    );
  }
  const slots = await getBookingSlots(store, product);
  return (
    <BookingPicker
      username={store.username}
      slug={product.slug}
      slotsIso={slots.map((s) => s.toISOString())}
      priceCents={product.priceCents}
      currency={product.currency}
      durationMinutes={product.durationMinutes}
      marketingOptIn={product.marketingOptIn}
      buttonText={product.buttonText}
    />
  );
}
