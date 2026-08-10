import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);

  if (!subscriptions || subscriptions.length === 0) {
    const checkoutResponse = NextResponse.redirect(new URL("/checkout", request.url));
    response.cookies.getAll().forEach(cookie => {
      checkoutResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return checkoutResponse;
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
  matcher: ["/dashboard/:path*"],
};
