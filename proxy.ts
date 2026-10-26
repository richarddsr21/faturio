import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { effectivePlan } from "@/lib/plans";
import { loadSubscriptions } from "@/lib/subscriptions";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginResponse = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.getAll().forEach(cookie => {
      loginResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return loginResponse;
  }

  // /admin só exige login aqui. A checagem de role acontece em cada página e Server Action
  // (lib/admin/require-admin.ts); a conta admin não precisa de assinatura nem onboarding.
  if (request.nextUrl.pathname.startsWith("/admin")) {
    return response;
  }

  // Vitalício ativo, ou mensal dentro do período pago (mesmo cancelada ou com cobrança
  // falhando). Assinatura autorizada que ainda espera o primeiro pagamento vai para a
  // tela de pagamento pendente; sem nada, para os planos.
  const subscriptions = await loadSubscriptions(supabase, user.id);

  if (!effectivePlan(subscriptions, new Date())) {
    const awaitingPayment = subscriptions.some((s) => s.status === "pending");
    const planosResponse = NextResponse.redirect(
      new URL(awaitingPayment ? "/pagamento/pendente" : "/planos", request.url)
    );
    response.cookies.getAll().forEach(cookie => {
      planosResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return planosResponse;
  }

  const { data: settings } = await supabase
    .from("settings")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!settings?.onboarding_completed) {
    const onboardingResponse = NextResponse.redirect(new URL("/onboarding", request.url));
    response.cookies.getAll().forEach(cookie => {
      onboardingResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return onboardingResponse;
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
