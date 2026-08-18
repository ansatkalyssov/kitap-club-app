import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminToken } from "@/lib/adminAuth";
import { BookOpen, Lock, User } from "lucide-react";

async function loginAction(formData: FormData) {
  "use server";
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  const expectedU = process.env.ADMIN_USERNAME;
  const expectedP = process.env.ADMIN_PASSWORD;
  if (!expectedU || !expectedP) redirect("/admin-login?error=1");

  if (username === expectedU && password === expectedP) {
    const cookieStore = await cookies();
    cookieStore.set("admin_session", getAdminToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8,
      path: "/",
      sameSite: "lax",
    });
    redirect("/admin");
  }

  redirect("/admin-login?error=1");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg">
              <BookOpen size={28} className="text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Кітап Клубы</h1>
          <p className="mt-1 text-sm text-gray-400">Админ панелі</p>
        </div>

        <form action={loginAction} className="rounded-2xl bg-white p-6 shadow-xl space-y-4">
          {sp.error && (
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
              Логин немесе пароль қате
            </div>
          )}

          <div className="relative">
            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="username"
              type="text"
              placeholder="Логин"
              className="input pl-10"
              required
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              name="password"
              type="password"
              placeholder="Пароль"
              className="input pl-10"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            Кіру
          </button>
        </form>
      </div>
    </main>
  );
}
