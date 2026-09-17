import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Toaster } from "@/components/ui/sonner";
import { env, isProd } from "@/lib/env";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "visitmy.shop", template: "%s · visitmy.shop" },
  description: "Sell digital products straight from your Instagram bio.",
  metadataBase: new URL(env.APP_BASE_URL),
  applicationName: "visitmy.shop",
  verification: env.GOOGLE_SITE_VERIFICATION ? { google: env.GOOGLE_SITE_VERIFICATION } : undefined,
};

export const viewport: Viewport = { themeColor: "#f4611e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        {children}
        <Toaster richColors position="top-center" />
      </body>
      {/* GA4 site-wide. Skipped in dev so local clicks don't land in the report; set GA_MEASUREMENT_ID to override the id. */}
      {isProd && <GoogleAnalytics gaId={env.GA_MEASUREMENT_ID} />}
    </html>
  );
}
