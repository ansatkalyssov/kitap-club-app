"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RefreshCw, MailWarning } from "lucide-react";
import Link from "next/link";

// Сервердегі callback сессияны орната алмағанда осында түседі.
// Мұнда токен URL хэшінен алынады — оны тек браузер көреді.

function Finish() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [failed, setFailed] = useState(false);

  const next = searchParams.get("next") || "/dashboard";

  useEffect(() => {
    (async () => {
      // 1. Хэштегі токендер: #access_token=...&refresh_token=...
      const hash = window.location.hash.startsWith("#")
        ? new URLSearchParams(window.location.hash.slice(1))
        : null;

      const accessToken = hash?.get("access_token");
      const refreshToken = hash?.get("refresh_token");

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        // Хэшті URL-ден тазалаймыз — токен адрес жолағында қалмасын
        window.history.replaceState(null, "", window.location.pathname);
      }

      // 2. Сессия бар ма — жоғарыдағы қадамнан кейін немесе бұрыннан
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setFailed(true);
        return;
      }

      // 3. Профильде аты бар ма — жоқ болса атын сұраймыз
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.name) {
        const googleName = user.user_metadata?.full_name || user.user_metadata?.name;
        if (googleName) {
          await supabase.from("profiles").upsert({
            id: user.id,
            email: user.email!,
            name: googleName,
          });
          router.replace(next);
          return;
        }
        router.replace(`/login?step=name&next=${encodeURIComponent(next)}`);
        return;
      }

      router.replace(next);
    })();
  }, []);

  if (failed) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <MailWarning size={24} />
          </div>
        </div>
        <h1 className="text-lg font-bold text-gray-900">Сілтеме жарамсыз</h1>
        <p className="mt-2 text-sm text-gray-500">
          Сілтеменің мерзімі өткен болуы мүмкін, немесе ол тіркелген браузерден
          басқа жерде ашылды. Қайта кіріп көріңіз.
        </p>
        <Link href="/login" className="btn-primary mt-5 w-full">
          Кіру бетіне өту
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-gray-500">
      <RefreshCw size={22} className="animate-spin" />
      <p className="text-sm">Аккаунт расталуда...</p>
    </div>
  );
}

export default function AuthFinishPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Suspense fallback={<RefreshCw size={22} className="animate-spin text-gray-400" />}>
        <Finish />
      </Suspense>
    </main>
  );
}
