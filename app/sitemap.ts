import type { MetadataRoute } from "next";

const BASE_URL = "https://faturio.com.br";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/planos`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/politica-de-privacidade`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE_URL}/termos-de-uso`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
