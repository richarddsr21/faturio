import { redirect } from "next/navigation";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { isRecurringPlan } from "@/lib/plans";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { plano } = await searchParams;
  // Sem plano (links antigos para /checkout) ou com um plano que não existe: escolher primeiro.
  if (!isRecurringPlan(plano)) redirect("/planos");

  return <CheckoutForm plan={plano} />;
}
