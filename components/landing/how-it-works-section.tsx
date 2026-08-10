import { PricingShowcase } from "./pricing-showcase";
import { StockShowcase } from "./stock-showcase";
import { SalesShowcase } from "./sales-showcase";
import { GoalShowcase } from "./goal-showcase";

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="border-t border-border bg-muted/40 py-20">
      <div className="mx-auto flex max-w-5xl flex-col gap-20 px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Como funciona
        </h2>
        <PricingShowcase />
        <StockShowcase />
        <SalesShowcase />
        <GoalShowcase />
      </div>
    </section>
  );
}
