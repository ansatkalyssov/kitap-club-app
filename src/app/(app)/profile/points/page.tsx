import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { getUser } from "@/lib/queries";
import {
  getUserStats,
  getPointHistory,
  BOOK_TIERS,
  LEVELS,
  MIN_ANALYSIS_LENGTH,
} from "@/lib/points";
import { monthBounds, formatDateKz } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Қолданбадағы ұпай ережелері — оқырманға арналған тізім */
const RULES: { label: string; points: string; limit: string }[] = [
  { label: "Күндік мақсатты орындау", points: "+10", limit: "күніне 1 рет" },
  { label: "Трекерге прогресс енгізу", points: "+2", limit: "күніне 3 ретке дейін" },
  { label: "Ескертпе жазу", points: "+3", limit: "күніне 1 рет" },
  {
    label: `Талқыға пікір жазу (кемінде ${MIN_ANALYSIS_LENGTH} таңба)`,
    points: "+15",
    limit: "аптасына 1 рет",
  },
  { label: "Клуб кітабын мерзімінде бітіру", points: "+50", limit: "әр кітап" },
  { label: "Бірінші клубқа тіркелу", points: "+25", limit: "бір рет" },
];

const STREAKS = [
  { label: "Бір апта қатарынан оқу", points: "+25", limit: "әр 7 күн сайын" },
  { label: "7 күн қатарынан", points: "+50", limit: "бір рет" },
  { label: "30 күн қатарынан", points: "+250", limit: "бір рет" },
  { label: "100 күн қатарынан", points: "+1 000", limit: "бір рет" },
  { label: "365 күн қатарынан", points: "+5 000", limit: "бір рет" },
];

function Row({
  label,
  points,
  limit,
  muted,
}: {
  label: string;
  points: string;
  limit: string;
  /** Ережесі жойылған ұпай — жасыл емес, сұр */
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3 py-2.5">
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm leading-snug ${muted ? "text-gray-500" : "text-gray-800"}`}
        >
          {label}
        </span>
        <span className="block text-xs text-gray-400">{limit}</span>
      </span>
      <span
        className={`shrink-0 text-sm font-bold tabular-nums ${
          muted ? "text-gray-400" : "text-primary-600"
        }`}
      >
        {points}
      </span>
    </div>
  );
}

export default async function PointsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const { start } = monthBounds();
  const [stats, history] = await Promise.all([
    getUserStats(user.id, start),
    getPointHistory(user.id, 100),
  ]);

  return (
    <div className="page-container max-w-md">
      <Link
        href="/profile"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> Профиль
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ұпайлар</h1>
        <p className="mt-1 text-sm text-gray-500">
          Қалай жиналады және сіз не үшін алдыңыз
        </p>
      </div>

      {/* Жиынтық */}
      <div className="card mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Star size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold text-gray-900">{stats.total} ұпай</p>
          <p className="text-xs font-medium text-primary-600">{stats.level.name}</p>
        </div>
      </div>

      {/* Тарих */}
      {history.length > 0 && (
        <section className="mb-5">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="text-base font-bold text-primary-900">Тарих</h2>
            <span className="text-xs text-gray-400">соңғы {history.length}</span>
          </div>
          <div className="card divide-y divide-gray-50 py-0">
            {history.map((e) => (
              <Row
                key={e.id}
                label={e.label}
                limit={
                  e.retired
                    ? `${formatDateKz(e.date)} · ескі ереже`
                    : formatDateKz(e.date)
                }
                points={`+${e.points}`}
                muted={e.retired}
              />
            ))}
          </div>
        </section>
      )}

      {/* Ережелер */}
      <section className="mb-5">
        <h2 className="mb-2 text-base font-bold text-primary-900">Ұпай қалай жиналады</h2>
        <div className="card divide-y divide-gray-50 py-0">
          {RULES.map((r) => (
            <Row key={r.label} {...r} />
          ))}
        </div>
      </section>

      <section className="mb-5">
        <h2 className="mb-2 text-base font-bold text-primary-900">Кітапты оқып бітіру</h2>
        <p className="mb-2 text-xs text-gray-500">
          Кітаптың көлеміне қарай. Тұрақты бөлік әрқашан беріледі, ал прогресті
          бірнеше күнге бөліп енгізсеңіз — үстіне бонус. Күніне бір кітап
          есептеледі.
        </p>
        <div className="card divide-y divide-gray-50 py-0">
          {[...BOOK_TIERS]
            .slice()
            .reverse()
            .map((t, i, arr) => {
              const next = arr[i + 1];
              const range = next
                ? `${t.minPages}–${next.minPages - 1} бет`
                : `${t.minPages} беттен көп`;
              const label = t.minPages === 0 ? "100 беттен аз" : range;
              return (
                <Row
                  key={t.minPages}
                  label={label}
                  limit={`${t.days} бөлек күні енгізсеңіз +${t.bonus}`}
                  points={`+${t.base}`}
                />
              );
            })}
        </div>
      </section>

      <section className="mb-5">
        <h2 className="mb-2 text-base font-bold text-primary-900">Қатарынан оқу</h2>
        <div className="card divide-y divide-gray-50 py-0">
          {STREAKS.map((r) => (
            <Row key={r.label} {...r} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-base font-bold text-primary-900">Деңгейлер</h2>
        <div className="card divide-y divide-gray-50 py-0">
          {LEVELS.map((l) => (
            <div key={l.name} className="flex items-baseline justify-between gap-3 py-2.5">
              <span
                className={`text-sm ${
                  l.name === stats.level.name
                    ? "font-bold text-primary-700"
                    : "text-gray-800"
                }`}
              >
                {l.name}
              </span>
              <span className="shrink-0 text-sm tabular-nums text-gray-500">
                {l.min.toLocaleString("kk-KZ")} ұпай
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
