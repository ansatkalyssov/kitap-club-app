import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Link from "next/link";
import { Plus, BookMarked, CheckCircle2, Users, User } from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";
import EmptyState from "@/components/ui/EmptyState";
import { calcProgress, calcDailyPages, daysUntil, formatDateKz } from "@/lib/utils";

export default async function TrackerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trackers } = await supabase
    .from("book_trackers")
    .select("*, club_plans(club_id, clubs(name))")
    .eq("user_id", user.id)
    .order("deadline", { ascending: true });

  const today = new Date().toISOString().split("T")[0];

  const active = (trackers || []).filter(
    (t) => !t.is_completed && (!t.deadline || t.deadline >= today)
  );
  const completed = (trackers || []).filter(
    (t) => t.is_completed || (t.deadline && t.deadline < today)
  );

  // Белсенді трекерлерді топтастыру
  const groups: Record<string, { clubName: string | null; trackers: any[] }> = {};
  active.forEach((t) => {
    const clubName = (t.club_plans as any)?.clubs?.name || null;
    const key = clubName || "__personal__";
    if (!groups[key]) groups[key] = { clubName, trackers: [] };
    groups[key].trackers.push(t);
  });

  // Дедлайны ең жақын клуб жоғарыда, жекені соңға
  const sortedGroups = Object.entries(groups).sort(([aKey, aVal], [bKey, bVal]) => {
    if (aKey === "__personal__") return 1;
    if (bKey === "__personal__") return -1;
    const aMin = aVal.trackers.map((t) => t.deadline).filter(Boolean).sort()[0] || "";
    const bMin = bVal.trackers.map((t) => t.deadline).filter(Boolean).sort()[0] || "";
    return aMin.localeCompare(bMin);
  });

  return (
    <AppShell>
      <div className="page-container">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1>Кітап Трекері</h1>
            <p className="mt-0.5 text-sm text-gray-500">Оқу прогресіңізді бақылаңыз</p>
          </div>
          <Link href="/tracker/new" className="btn-primary">
            <Plus size={16} /> Жаңа трекер
          </Link>
        </div>

        {/* Active trackers */}
        <section className="mb-8">
          <h2 className="mb-4">Белсенді ({active.length})</h2>
          {active.length === 0 ? (
            <EmptyState
              icon={BookMarked}
              title="Белсенді трекер жоқ"
              description="Жаңа кітап трекері жасаңыз"
              action={
                <Link href="/tracker/new" className="btn-primary">
                  <Plus size={16} /> Жасаңыз
                </Link>
              }
            />
          ) : (
            <div className="space-y-6">
              {sortedGroups.map(([key, group]) => (
                <div key={key}>
                  {/* Топ тақырыбы */}
                  <div className="mb-3 flex items-center gap-2">
                    {group.clubName ? (
                      <>
                        <Users size={14} className="text-primary-500" />
                        <span className="text-sm font-semibold text-primary-700">
                          {group.clubName}
                        </span>
                      </>
                    ) : (
                      <>
                        <User size={14} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-500">
                          Жеке трекерлер
                        </span>
                      </>
                    )}
                    <div className="flex-1 border-t border-gray-100" />
                  </div>

                  {/* Трекер карточкалары */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {group.trackers.map((t) => {
                      const progress = calcProgress(t.current_page, t.total_pages);
                      const dailyPages = calcDailyPages(t.current_page, t.total_pages, t.deadline);
                      const days = daysUntil(t.deadline);
                      return (
                        <Link
                          key={t.id}
                          href={`/tracker/${t.id}`}
                          className={`card flex flex-col gap-3 hover:border-primary-200 transition ${
                            group.clubName
                              ? "border-l-4 border-l-primary-300"
                              : "border-l-4 border-l-gray-200"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 line-clamp-2">{t.book_title}</p>
                              {t.book_author && (
                                <p className="text-xs text-gray-500 mt-0.5">{t.book_author}</p>
                              )}
                            </div>
                            <span className={`badge shrink-0 ${
                              days <= 3 ? "badge-yellow" : "badge-green"
                            }`}>
                              {days === 0 ? "Бүгін" : `${days} күн`}
                            </span>
                          </div>

                          <ProgressBar value={progress} />

                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{t.current_page} / {t.total_pages} бет</span>
                            {progress < 100 && days > 0 && (
                              <span className="text-primary-600 font-medium">
                                Күнде {dailyPages} бет
                              </span>
                            )}
                          </div>

                          <div className="border-t border-gray-50 pt-2 text-xs text-gray-400">
                            Дедлайн: {formatDateKz(t.deadline)}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Тарих */}
        {completed.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-primary-500" />
              Тарих ({completed.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {completed.map((t: any) => {
                const isExpired = !t.is_completed && t.deadline && t.deadline < today;
                const clubName = (t.club_plans as any)?.clubs?.name || null;
                return (
                  <Link key={t.id} href={`/tracker/${t.id}`} className="card opacity-75 hover:opacity-100 transition">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={20} className={`shrink-0 ${isExpired ? "text-gray-400" : "text-primary-500"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 line-clamp-1">{t.book_title}</p>
                        <p className="text-xs text-gray-400">
                          {clubName || "Жеке"} · {formatDateKz(t.deadline)}
                        </p>
                      </div>
                      <span className={`badge shrink-0 ${isExpired ? "badge-gray" : "badge-green"}`}>
                        {isExpired ? "Аяқталды" : "✓"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
