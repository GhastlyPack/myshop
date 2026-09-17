import { createProduct } from "@/app/app/actions";

export const dynamic = "force-dynamic";

/** Direct navigation here creates a draft and lands in its editor. */
export default async function NewProductPage() {
  await createProduct();
  return null;
}
