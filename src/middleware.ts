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

  // Auth callback & public routes — middleware-ді өткізіп жіберу
  if (
    pathname.startsWith("/auth") ||
    pathname === "/" ||
    pathname === "/login" ||
    /^\/clubs\/[^/]+$/.test(pathname)
  ) {
    return NextResponse.next({ request });
  }

  // Басқа маршруттар — Supabase auth тексеру
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

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
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
