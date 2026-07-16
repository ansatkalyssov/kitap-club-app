"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BookOpen, Mail, Lock, Eye, EyeOff, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

type Mode = "login" | "register";
type Step = "auth" | "verify-email" | "name";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [step, setStep] = useState<Step>(
    searchParams.get("step") === "name" ? "name" : "auth"
  );
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Google арқылы кіру
  async function handleGoogle() {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      toast.error("Google қатесі: " + error.message);
      setGoogleLoading(false);
    }
  }

  // Кіру
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Email немесе пароль қате");
      } else {
        toast.error(error.message);
      }
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  // Тіркелу
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    if (password.length < 6) {
      toast.error("Пароль кемінде 6 таңба болуы керек");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("Бұл email тіркелген. Кіруге көріңіз");
        setMode("login");
      } else {
        toast.error(error.message);
      }
      return;
    }
    if (data.user) {
      if (data.session) {
        // Email растауы өшірілген — сессия бірден ашылады
        setStep("name");
      } else {
        // Email растауы қосылған — поштаны күтеміз
        setStep("verify-email");
        startResendCooldown();
      }
    }
  }

  function startResendCooldown() {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) { clearInterval(timer); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  async function handleResendEmail() {
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Хат қайта жіберілді");
      startResendCooldown();
    }
  }

  // Парольді ұмыттым
  async function handleResetPassword() {
    if (!email.includes("@")) {
      toast.error("Алдымен email-іңізді енгізіңіз");
      return;
    }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setResetSent(true);
    toast.success("Пароль орнату сілтемесі жіберілді");
  }

  // Атын сақтау
  async function handleSetName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Атыңызды енгізіңіз");
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const fullName = lastName.trim()
      ? `${name.trim()} ${lastName.trim()}`
      : name.trim();

    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email!,
      name: fullName,
    });
    setLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-white px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg shadow-primary-200">
              <BookOpen size={28} className="text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-primary-900">Кітап Клубы</h1>
          <p className="mt-1 text-sm text-gray-500">
            {step === "name" ? "Атыңызды енгізіңіз" : step === "verify-email" ? "Дайын болды!" : mode === "login" ? "Қош келдіңіз" : "Жаңа аккаунт"}
          </p>
        </div>

        <div className="card animate-fade-in">
          {/* Auth step */}
          {step === "auth" && (
            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex rounded-xl bg-gray-100 p-1">
                {(["login", "register"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                      mode === m
                        ? "bg-white text-primary-700 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {m === "login" ? "Кіру" : "Тіркелу"}
                  </button>
                ))}
              </div>

              {/* Google */}
              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95 disabled:opacity-60"
              >
                {googleLoading
                  ? <RefreshCw size={16} className="animate-spin text-gray-400" />
                  : <GoogleIcon />
                }
                Google арқылы {mode === "login" ? "кіру" : "тіркелу"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-gray-100" />
                <span className="text-xs text-gray-400">немесе</span>
                <div className="flex-1 border-t border-gray-100" />
              </div>

              {/* Email + Password form */}
              <form
                onSubmit={mode === "login" ? handleLogin : handleRegister}
                className="space-y-3"
              >
                {/* Email */}
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                    autoComplete="email"
                    required
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10 pr-10"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {mode === "register" && (
                  <p className="text-xs text-gray-400">
                    Пароль кемінде 6 таңба болуы керек
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading && <RefreshCw size={16} className="animate-spin" />}
                  {mode === "login" ? "Кіру" : "Тіркелу"}
                </button>

                {mode === "login" && (
                  <div className="text-center">
                    {resetSent ? (
                      <p className="text-xs text-primary-600">
                        ✓ Пароль орнату сілтемесі жіберілді. Поштаңызды тексеріңіз.
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResetPassword}
                        disabled={loading}
                        className="text-xs text-gray-400 hover:text-primary-600 transition"
                      >
                        Парольді ұмыттым?
                      </button>
                    )}
                  </div>
                )}
              </form>
            </div>
          )}

          {/* Verify email step */}
          {step === "verify-email" && (
            <div className="space-y-5 text-center">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
                  <Mail size={32} className="text-primary-600" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Поштаңызды тексеріңіз</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Растау хаты жіберілді:
                </p>
                <p className="mt-0.5 text-sm font-semibold text-primary-700">{email}</p>
              </div>
              <div className="rounded-xl bg-primary-50 p-4 text-left space-y-2">
                <p className="text-xs font-semibold text-primary-800">Не жасау керек:</p>
                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-200 text-[10px] font-bold text-primary-800">1</span>
                  <span>Поштаңызды ашыңыз (Spam/Жарнама қалтасын да тексеріңіз)</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-200 text-[10px] font-bold text-primary-800">2</span>
                  <span>«Электрондық поштаны растау» сілтемесін басыңыз</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary-200 text-[10px] font-bold text-primary-800">3</span>
                  <span>Атыңызды енгізіп, қолданбаны пайдалана бастаңыз</span>
                </div>
              </div>
              <div className="space-y-2">
                <button
                  onClick={handleResendEmail}
                  disabled={loading || resendCooldown > 0}
                  className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  {loading
                    ? <RefreshCw size={14} className="inline animate-spin mr-1" />
                    : null}
                  {resendCooldown > 0
                    ? `Қайта жіберу (${resendCooldown}с)`
                    : "Хат келмеді ме? Қайта жіберу"}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep("auth"); setMode("register"); }}
                  className="text-xs text-gray-400 hover:text-gray-600 transition"
                >
                  ← Басқа email-мен тіркелу
                </button>
              </div>
            </div>
          )}

          {/* Name step */}
          {step === "name" && (
            <form onSubmit={handleSetName} className="space-y-3">
              <p className="text-sm text-gray-500">
                Қолданбада қалай аталғыңызды енгізіңіз
              </p>
              <input
                type="text"
                placeholder="Аты — Мысалы: Айгүл"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                autoFocus
                required
              />
              <input
                type="text"
                placeholder="Тегі — Мысалы: Қасымова"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input"
              />
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading && <RefreshCw size={16} className="animate-spin" />}
                Бастау
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
