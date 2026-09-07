import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

interface Step {
  label: string;
  hint: string;
  href: string;
  done: boolean;
}

interface Props {
  hasClub: boolean;
  hasGoal: boolean;
  hasRead: boolean;
  hasPush: boolean;
}

/**
 * Жаңа оқырманның алғашқы жолы.
 *
 * Модальді «экскурсия» емес, тізім: ол бір рет көрсетіліп жоғалып
 * кетпейді, әр кіргенде қай жерде тұрғаныңды көрсетеді және әр жолы
 * нақты әрекетке апарады. Бәрі орындалғанда тізім түгел жоғалады —
 * үйренген адамға артық орын алмас үшін.
 *
 * Ұпай берілмейді: онбординг ұпайлары негізгі экономиканы бұрмалайды.
 */
export default function StartChecklist({ hasClub, hasGoal, hasRead, hasPush }: Props) {
  const steps: Step[] = [
    {
      label: "Аккаунт ашылды",
      hint: "Қош келдіңіз!",
      href: "/profile",
      done: true,
    },
    {
      label: "Клубқа тіркелу",
      hint: "Бірге оқитын орта табыңыз",
      href: "/clubs",
      done: hasClub,
    },
    {
      label: "Күнделікті мақсат қою",
      hint: "Күніне неше минут оқисыз?",
      href: "/reading-plan",
      done: hasGoal,
    },
    {
      label: "Алғашқы рет оқу",
      hint: "Таймерді қосып, 15 минут оқып көріңіз",
      href: "/reading-plan",
      done: hasRead,
    },
    {
      label: "Басты экранға қосу",
      hint: "Еске салу хабарландыруы келуі үшін",
      href: "/ornatu",
      done: hasPush,
    },
  ];

  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;

  // Келесі әрекет — ерекшелеп тұрамыз, адам не істерін іздемесін
  const nextIndex = steps.findIndex((s) => !s.done);

  return (
    <section className="mb-6 rounded-2xl border border-primary-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold text-primary-900">Бастау жолы</h2>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-primary-600">
          {done} / {steps.length}
        </span>
      </div>

      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-primary-500 transition-all"
          style={{ width: `${(done / steps.length) * 100}%` }}
        />
      </div>

      <ol className="space-y-1">
        {steps.map((s, i) => {
          const isNext = i === nextIndex;

          if (s.done) {
            return (
              <li key={s.label} className="flex items-center gap-2.5 px-2 py-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                  <Check size={12} strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-gray-400 line-through">
                  {s.label}
                </span>
              </li>
            );
          }

          return (
            <li key={s.label}>
              <Link
                href={s.href}
                className={`flex items-center gap-2.5 rounded-xl px-2 py-2 transition ${
                  isNext ? "bg-primary-50" : "hover:bg-gray-50"
                }`}
              >
                <span
                  className={`h-5 w-5 shrink-0 rounded-full border-2 ${
                    isNext ? "border-primary-500" : "border-gray-200"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm ${
                      isNext ? "font-semibold text-gray-900" : "text-gray-700"
                    }`}
                  >
                    {s.label}
                  </span>
                  {isNext && (
                    <span className="block text-xs text-gray-500">{s.hint}</span>
                  )}
                </span>
                {isNext && (
                  <ArrowRight size={15} className="shrink-0 text-primary-600" />
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
