import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getCurrentUser, loginPath } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-4">
        <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">visitmy.shop</p>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">Your bio link, but it actually sells.</h1>
        <p className="mx-auto max-w-xl text-lg text-muted-foreground">
          Upload a guide, a template, a preset pack. Drop one link in your Instagram bio. Get paid straight to your own
          Stripe or PayPal, delivered instantly.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {user ? (
          <Button asChild size="lg">
            <Link href="/app">Open dashboard</Link>
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link href={loginPath("/app")}>Claim your link</Link>
          </Button>
        )}
        <Button asChild variant="outline" size="lg">
          <Link href="/demo">See a demo store</Link>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">visitmy.shop/yourname</p>
    </main>
  );
}
