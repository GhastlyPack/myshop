import type { Metadata } from "next";
import { DesignEditor } from "@/components/app/design/editor";
import { requireStore } from "@/lib/auth";
import { requirePlan } from "@/lib/billing";
import { env } from "@/lib/env";
import { publicUrl } from "@/lib/storage";
import { resolveTheme } from "@/lib/theme";

export const metadata: Metadata = { title: "Design" };

export default async function DesignPage() {
  const { store } = await requireStore();
  await requirePlan(store, "pro"); // the design editor is a Pro feature
  const theme = resolveTheme(store.theme);
  const base = env.APP_BASE_URL.replace(/\/+$/, "");
  return <DesignEditor username={store.username} storeUrl={`${base}/${store.username}`} initialTheme={theme} initialBgImageUrl={publicUrl(theme.bgImageKey)} />;
}
