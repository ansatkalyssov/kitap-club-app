import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // OAuth (Google) немесе Magic Link кодын сессияға айырбастау
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  } else if (token_hash && type) {
    await supabase.auth.verifyOtp({ token_hash, type: type as any });
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Пароль ауыстыру flow — reset-password бетіне жібереміз
  if (type === "recovery" || next === "/auth/reset-password") {
    return NextResponse.redirect(`${origin}/auth/reset-password`);
  }

  // Профильді тексеру
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  if (!profile?.name) {
    // Google-дан аты бар ма — автоматты сақтау
    const googleName = user.user_metadata?.full_name || user.user_metadata?.name;
    if (googleName) {
      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email!,
        name: googleName,
      });
      return NextResponse.redirect(`${origin}/dashboard`);
    }
    // Аты жоқ — атын сұрайтын беттерге жіберу
    return NextResponse.redirect(`${origin}/login?step=name`);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
