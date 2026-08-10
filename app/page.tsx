import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { ControlSection } from "@/components/landing/control-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { PricingCTA } from "@/components/landing/pricing-cta";
import { FAQSection } from "@/components/landing/faq-section";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <>
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
