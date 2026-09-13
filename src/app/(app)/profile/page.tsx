import { redirect } from "next/navigation";
import { getUser } from "@/lib/queries";
import { Star, Flame, TrendingUp } from "lucide-react";
import ProfileForm from "@/components/profile/ProfileForm";
import RestartTourButton from "@/components/tour/RestartTourButton";
import ProgressBar from "@/components/ui/ProgressBar";
import { getUserStats, getPointHistory } from "@/lib/points";
import { monthBounds, formatDateKz } from "@/lib/utils";

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const { start, label } = monthBounds();
  const [stats, history] = await Promise.all([
    getUserStats(user.id, start),
    getPointHistory(user.id, 30),
  ]);

  // Келесі деңгейге дейінгі жол
  const span = stats.nextLevel ? stats.nextLevel.min - stats.level.min : 0;
  const done = stats.total - stats.level.min;
  const toNext = stats.nextLevel ? stats.nextLevel.min - stats.total : 0;
  const levelProgress = span > 0 ? Math.min(100, Math.round((done / span) * 100)) : 100;

  return (
    <div className="page-container max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Профиль</h1>
        <p className="mt-1 text-sm text-gray-500">Жеке ақпаратыңыз бен нәтижеңіз</p>
      </div>

      {/* Ұпай мен деңгей */}
      <div className="card mb-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <Star size={20} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{stats.total} ұпай</p>
              <p className="text-xs font-medium text-primary-600">{stats.level.name}</p>
            </div>
          </div>
          {stats.streak > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-600">
              <Flame size={15} />
              {stats.streak} күн
            </div>
          )}
        </div>

        {stats.nextLevel ? (
          <>
            <ProgressBar value={levelProgress} size="sm" />
            <p className="mt-1.5 text-xs text-gray-500">
              «{stats.nextLevel.name}» деңгейіне {toNext} ұпай қалды
            </p>
          </>
        ) : (
          <p className="text-xs text-gray-500">Ең жоғары деңгейге жеттіңіз</p>
        )}
      </div>

      {/* Осы айдағы үлес */}
      <div className="card mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
          <TrendingUp size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{stats.monthPoints} ұпай</p>
          <p className="text-xs text-gray-500">{label} айында жиналды</p>
        </div>
      </div>

      {/* Ұпай тарихы — «не үшін ұпай алдым» деген сұраққа жауап */}
      {history.length > 0 && (
        <section className="mb-6">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-base font-bold text-primary-900">Ұпай тарихы</h2>
            <span className="text-xs text-gray-400">соңғы {history.length}</span>
          </div>

          <div className="card divide-y divide-gray-50 py-0">
            {history.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-snug text-gray-800">{e.label}</span>
                  <span className="block text-xs text-gray-400">{formatDateKz(e.date)}</span>
                </span>
                <span className="shrink-0 text-sm font-bold tabular-nums text-primary-600">
                  +{e.points}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <ProfileForm />

      <div className="mt-4">
        <RestartTourButton />
      </div>
    </div>
  );
}
