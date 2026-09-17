import { requireStore } from "@/lib/auth";

// Placeholder — replaced by the products dashboard in M2.
export default async function AppHome() {
  const { store } = await requireStore();
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">{store.displayName}</h1>
      <p className="text-sm text-muted-foreground">Your store is live at /{store.username}. Products dashboard coming up.</p>
    </div>
  );
}
