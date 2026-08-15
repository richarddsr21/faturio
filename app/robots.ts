import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard/",
        "/onboarding",
        "/pagamento/",
        "/definir-senha",
        "/esqueci-senha",
        "/auth/",
        "/api/",
      ],
    },
    sitemap: "https://faturio.com.br/sitemap.xml",
  };
}
