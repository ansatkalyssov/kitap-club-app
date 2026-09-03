import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isValidAdminCookie } from "@/lib/adminAuth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin маршруттары — cookie арқылы тексеріледі, Supabase талап етілмейді
  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin-login") {
      return NextResponse.next({ request });
    }
    const adminCookie = request.cookies.get("admin_session")?.value;
    if (!isValidAdminCookie(adminCookie)) {
      return NextResponse.redirect(new URL("/admin-login", request.url));
    }
    return NextResponse.next({ request });
  }

  // /api және /auth — Supabase-ке мүлдем тиіспейміз.
  // /api маршруттары өз авторизациясын өзі жасайды (push-send CRON_SECRET
  // тексереді, push-subscribe getUser() шақырады), ал /auth/callback
  // сессияны өзі орнатады — оған араласу ағынды бұзады.
  if (pathname.startsWith("/api") || pathname.startsWith("/auth")) {
    return NextResponse.next({ request });
  }

  // Ашық беттер: кірмеген адам да көре алады.
  const isPublic =
    pathname === "/" ||
    pathname === "/login" ||
    /^\/clubs\/[^/]+$/.test(pathname) ||
    /^\/c\/[^/]+$/.test(pathname);

  // Ашық болса да Supabase клиентін жасаймыз. Себебі токенді жаңартатын
  // жалғыз орын — осы. Бұрын ашық беттер клиентсіз өтетін де, адам бас
  // беттен немесе клуб бетінен кірсе, токен жаңармай ескіріп қалатын.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Бұл шақыру екі жұмыс істейді: токенді тексереді және мерзімі
  // жақындаса жаңартады. Жаңа cookie жоғарыдағы setAll арқылы
  // supabaseResponse ішіне жазылады.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
