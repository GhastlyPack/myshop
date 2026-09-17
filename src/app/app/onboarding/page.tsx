import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/app/onboarding-form";
import { getCurrentStore, requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Claim your store" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ username?: string | string[] }> }) {
  const [user, { username: claimed }] = await Promise.all([requireUser(), searchParams]);
  if (await getCurrentStore()) redirect("/app");
  // The lander's "claim your link" box passes the name the visitor typed; fall back to their profile.
  const raw = (typeof claimed === "string" && claimed) || user.name || user.email.split("@")[0] || "";
  const suggested = raw
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, "")
    .slice(0, 30);
  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Claim your store</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick the link you will put in your bio. You can change everything else later.</p>
      </div>
      <OnboardingForm suggestedUsername={suggested} suggestedName={user.name ?? ""} />
    </div>
  );
}
