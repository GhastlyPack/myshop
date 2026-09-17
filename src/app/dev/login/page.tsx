import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { devSignIn } from "@/lib/auth";
import { auth0Configured, isProd } from "@/lib/env";

export const dynamic = "force-dynamic";

async function signIn(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "/app");
  if (!email.includes("@")) return;
  await devSignIn(email);
  redirect(returnTo.startsWith("/") ? returnTo : "/app");
}

export default async function DevLogin({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  if (isProd || auth0Configured) redirect("/");
  const { returnTo } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-semibold">Dev sign-in</h1>
        <p className="text-sm text-muted-foreground">Auth0 isn&apos;t configured, so any email works locally.</p>
      </div>
      <form action={signIn} className="space-y-4">
        <input type="hidden" name="returnTo" value={returnTo ?? "/app"} />
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required defaultValue="16croemer.stem@gmail.com" />
        </div>
        <Button type="submit" className="w-full">
          Continue
        </Button>
      </form>
    </main>
  );
}
