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
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const next = searchParams.get("next") || "/dashboard";

  useEffect(() => {
    (async () => {
      // Токен хэште де, сұрау жолында да келуі мүмкін — екеуін де қараймыз
      const hash = window.location.hash.startsWith("#")
        ? new URLSearchParams(window.location.hash.slice(1))
        : new URLSearchParams();
      const query = new URLSearchParams(window.location.search);
      const pick = (k: string) => hash.get(k) ?? query.get(k);

      // 1. Supabase қатемен қайтарды ма
      const err = pick("error") ?? pick("error_code");
      if (err) {
        const code = pick("error_code") ?? pick("error") ?? "";
        const desc = pick("error_description");
        setReason(
          code.includes("expired")
            ? "Сілтеменің мерзімі өтті немесе ол бұрын пайдаланылған. Растау сілтемесі бір рет қана жұмыс істейді."
            : "Растау аяқталмады."
        );
        setDetail(desc ? decodeURIComponent(desc.replace(/\+/g, " ")) : code || null);
        setFailed(true);
        return;
      }

      // 2. Хэштегі токендер: #access_token=...&refresh_token=...
      const accessToken = pick("access_token");
      const refreshToken = pick("refresh_token");

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        window.history.replaceState(null, "", window.location.pathname);
      } else {
        // 3. token_hash түрінде келсе — клиентте растаймыз
        const tokenHash = pick("token_hash");
        const type = pick("type");
        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });
          if (error) {
            setReason("Растау сілтемесі жарамсыз болып шықты.");
            setDetail(error.message);
            setFailed(true);
            return;
          }
          window.history.replaceState(null, "", window.location.pathname);
        }
      }

      // 4. Сессия бар ма
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setReason(
          "Сілтеменің мерзімі өткен болуы мүмкін, немесе ол тіркелген браузерден басқа жерде ашылды."
        );
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
        <h1 className="text-lg font-bold text-gray-900">Растау аяқталмады</h1>
        <p className="mt-2 text-sm text-gray-500">
          {reason ?? "Сілтеме жарамсыз болып шықты."}
        </p>
        <p className="mt-3 text-sm text-gray-500">
          Кіру бетінен қайта тіркеліп, жаңа хат сұраңыз.
        </p>
        {detail && (
          <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-left text-xs text-gray-400">
            {detail}
          </p>
        )}
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
