"use client";

import { useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createProduct } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { ga } from "@/lib/ga";

export function NewProductButton({ variant = "default", label = "New product" }: { variant?: "default" | "outline"; label?: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant={variant}
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            ga("product_created");
            await createProduct();
          } catch (e) {
            // redirect() throws a control-flow error that Next handles; anything else is real.
            if (!(e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) toast.error("Could not create the product.");
            throw e;
          }
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
      {label}
    </Button>
  );
}
