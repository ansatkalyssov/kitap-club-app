import Link from "next/link";
import { Timer, ArrowRight } from "lucide-react";

interface Props {
  /** Күнделікті мақсат, минут */
  target: number;
  /** Бүгін оқылған минут */
  todayMinutes: number;
}

/**
 * Бастау жолын аяқтаған адамға арналған күнделікті шақыру.
 * Мақсат орындалса — мүлдем шықпайды.
 */
export default function TodayNudge({ target, todayMinutes }: Props) {
  if (!target || todayMinutes >= target) return null;

  const left = target - todayMinutes;
  const started = todayMinutes > 0;

  return (
    <Link
      href="/reading-plan"
      className="mb-6 flex items-center gap-3 rounded-2xl border border-primary-100 bg-primary-50/60 p-4 transition hover:border-primary-300"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary-600">
        <Timer size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-gray-900">
          {started ? `Тағы ${left} минут қалды` : "Бүгін әлі оқыған жоқсыз"}
        </span>
        <span className="block text-sm text-gray-600">
          {started
            ? `Бүгінгі мақсат — ${target} минут`
            : `${target} минут оқып, серияңызды үзбеңіз`}
        </span>
      </span>
      <ArrowRight size={16} className="shrink-0 text-primary-600" />
    </Link>
  );
}
