import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/admin", "/dev", "/api", "/d/", "/me", "/auth"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
