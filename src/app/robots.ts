import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/cabang", "/akun", "/checkout", "/booking", "/api"] }], sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://rentalaja.co.id"}/sitemap.xml` };
}
