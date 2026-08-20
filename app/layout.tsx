import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Faturio — Precificação, estoque e vendas em um só lugar";
const description =
  "Saiba quanto vender, quanto lucrar e quanto falta para atingir sua meta. Controle preços, produtos, estoque e vendas no Faturio.";

export const metadata: Metadata = {
  metadataBase: new URL("https://faturio.com.br"),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "https://faturio.com.br",
    siteName: "Faturio",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  verification: {
    google: "HOCTKzHd-H-NirYfQdS7OfCx7hlJAyHAdSGFoO154o8",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
