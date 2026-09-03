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

  // Safari (iOS) JavaScript арқылы жазылған cookie-дің мерзімін 7 күнмен
  // шектейді (ITP). Supabase-тің браузер клиенті токенді жаңартқанда
  // cookie-ді дәл солай — document.cookie арқылы жазады. Сондықтан адам
  // қолданбаны бір апта ашпаса, cookie өшіп, сессия ұшып кетеді.
  //
  // HTTP Set-Cookie арқылы жазылған cookie бұл шектеуге түспейді. Сол үшін
  // әр сұраныста auth cookie-лерін серверден қайта жазып, мерзімін
  // жаңартып отырамыз.
  if (user) {
    const already = new Set(supabaseResponse.cookies.getAll().map((c) => c.name));
    for (const c of request.cookies.getAll()) {
      if (already.has(c.name)) continue;
      if (!/^sb-.+-auth-token(\.\d+)?$/.test(c.name)) continue;
      supabaseResponse.cookies.set(c.name, c.value, {
        path: "/",
        sameSite: "lax",
        httpOnly: false,
        secure: request.nextUrl.protocol === "https:",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
  }

  if (!user && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // manifest.json мен sw.js — кірмеген адамға да қолжетімді болуы керек,
    // әйтпесе PWA орнатылмайды және service worker тіркелмейді.
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
