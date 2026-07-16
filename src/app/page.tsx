import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Users, BarChart3, BookMarked, ArrowRight } from "lucide-react";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const sp = await searchParams;

  // Google OAuth code осында келсе — /auth/callback-ке жіберу
  if (sp.code) {
    redirect(`/auth/callback?code=${sp.code}`);
  }

  const features = [
    {
      icon: Users,
      title: "Кітап клубы",
      desc: "Клуб жасаңыз немесе бар клубқа тіркеліңіз",
    },
    {
      icon: BookMarked,
      title: "Кітап трекері",
      desc: "Оқу прогресін күн сайын бақылаңыз",
    },
    {
      icon: BarChart3,
      title: "Пікір алмасу",
      desc: "Талқыдан кейін пікірлеріңізбен бөлісіңіз",
    },
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-primary-800 px-6 py-20 text-center text-white sm:py-32">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/5" />
        <div className="relative mx-auto max-w-2xl">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
              <BookOpen size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl">
            Кітап Клубы
          </h1>
          <p className="mt-4 text-lg text-primary-100">
            Кітап оқудың дағдысын қалыптастырыңыз.
            <br />
            Бірге оқып, бірге өсейік.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3 font-semibold text-primary-700 shadow-lg transition hover:bg-primary-50"
            >
              Бастау <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">
          Не мүмкіндік бар?
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
                  <Icon size={24} className="text-primary-600" />
                </div>
              </div>
              <h3 className="mb-2 font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary-50 px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-primary-900">Бүгін бастаңыз</h2>
        <p className="mt-2 text-gray-600">Email немесе Google арқылы тіркеліңіз</p>
        <Link href="/login" className="btn-primary mt-6 inline-flex">
          Кіру / Тіркелу
        </Link>
      </section>

      <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Кітап Клубы
      </footer>
    </main>
  );
}
