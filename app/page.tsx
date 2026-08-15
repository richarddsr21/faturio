import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { ControlSection } from "@/components/landing/control-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { PricingCTA } from "@/components/landing/pricing-cta";
import { FAQSection } from "@/components/landing/faq-section";
import { Footer } from "@/components/landing/footer";

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Faturio",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Saiba quanto vender, quanto lucrar e quanto falta para atingir sua meta. Controle preços, produtos, estoque e vendas no Faturio.",
  url: "https://faturio.com.br",
  offers: {
    "@type": "Offer",
    price: "129.90",
    priceCurrency: "BRL",
  },
};

export default function Home() {
  return (
    <>
      {/* Conteúdo estático (sem input do usuário) — dangerouslySetInnerHTML é o
          jeito padrão do Next para JSON-LD, sem risco de XSS aqui. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
      />
      <Navbar />
      <main>
        <Hero />
        <ControlSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingCTA />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
