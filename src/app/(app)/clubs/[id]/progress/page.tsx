import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { getUser } from "@/lib/queries";
import Link from "next/link";
import { ArrowLeft, Calendar, BookOpen, TrendingUp } from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";
import { calcProgress, formatDateKz } from "@/lib/utils";

export default async function ClubProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();

  // Клуб ақпараты
  const { data: club } = await supabase
    .from("clubs")
    .select("id, name, facilitator_id")
    .eq("id", id)
    .single();

  if (!club) notFound();

  // Тек жүргізуші немесе мүше кіре алады
  const { data: membership } = await supabase
    .from("club_members")
    .select("id")
    .eq("club_id", id)
    .eq("user_id", user.id)
    .single();

  const isFacilitator = club.facilitator_id === user.id;
  const isMember = !!membership;

  if (!isFacilitator && !isMember) redirect(`/clubs/${id}`);

  const adminDb = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  // Барлық жоспарлар
  const { data: plans } = await adminDb
    .from("club_plans")
    .select("*, books(*)")
    .eq("club_id", id)
    .order("end_date", { ascending: true });

  // Дедлайны ең жақын белсенді жоспар
  const nearestPlan = (plans || []).find(
    (p) => p.end_date && p.end_date >= today
  );

  // Клуб мүшелері
  const { data: members } = await adminDb
    .from("club_members")
    .select("user_id, profiles(name, email)")
    .eq("club_id", id);

  // Әр мүшенің прогресі
  const membersProgress = await Promise.all(
    (members || []).map(async (m: any) => {
      if (!nearestPlan) return { ...m, progress: null, currentPage: 0, totalPages: 0 };

      const { data: tracker } = await adminDb
        .from("book_trackers")
        .select("current_page, total_pages, is_completed")
        .eq("user_id", m.user_id)
        .eq("club_plan_id", nearestPlan.id)
        .single();

      const progress = tracker
        ? calcProgress(tracker.current_page, tracker.total_pages)
        : null;

      return {
        ...m,
        progress,
        currentPage: tracker?.current_page ?? 0,
        totalPages: tracker?.total_pages ?? nearestPlan.books?.page_count ?? 0,
        isCompleted: tracker?.is_completed ?? false,
      };
    })
  );

  // Прогресі барларды алдымен, жоқтарын соңға
  const sorted = [...membersProgress].sort((a, b) => {
    if (a.progress === null && b.progress !== null) return 1;
    if (a.progress !== null && b.progress === null) return -1;
    return (b.progress ?? 0) - (a.progress ?? 0);
  });

  const withTracker = sorted.filter((m) => m.progress !== null);
  const withoutTracker = sorted.filter((m) => m.progress === null);

  return (
      <div className="page-container max-w-2xl">
        {/* Артқа */}
        <Link
          href={`/clubs/${id}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={14} /> {club.name}
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
            <TrendingUp size={20} className="text-primary-600" />
          </div>
          <div>
            <h1>Оқырмандар үлгерімі</h1>
            <p className="text-sm text-gray-500">{club.name}</p>
          </div>
        </div>

        {/* Ең жақын жоспар */}
        {nearestPlan ? (
          <div className="mb-6 card border-primary-100 bg-primary-50/40">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100">
                  <BookOpen size={18} className="text-primary-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {nearestPlan.books?.title ?? "Кітап белгіленбеген"}
                  </p>
                  {nearestPlan.books?.author && (
                    <p className="text-sm text-gray-500">{nearestPlan.books.author}</p>
                  )}
                </div>
              </div>
              {nearestPlan.books?.page_count && (
                <span className="badge-gray shrink-0">{nearestPlan.books.page_count} бет</span>
              )}
            </div>
            {nearestPlan.end_date && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-primary-600">
                <Calendar size={14} />
                Дедлайн: {formatDateKz(nearestPlan.end_date)}
              </p>
            )}
          </div>
        ) : (
          <div className="mb-6 card text-center py-8 text-gray-400 text-sm">
            Белсенді жоспар жоқ
          </div>
        )}

        {/* Оқырмандар тізімі */}
        <div className="space-y-3">
          {withTracker.map((m: any) => {
            const initials = (m.profiles?.name || m.profiles?.email || "?")
              .charAt(0)
              .toUpperCase();
            return (
              <div key={m.user_id} className="card">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-semibold">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {m.profiles?.name || m.profiles?.email}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-500">
                          {m.currentPage} / {m.totalPages} бет
                        </span>
                        {m.isCompleted ? (
                          <span className="badge-green text-xs">✓ Аяқтады</span>
                        ) : (
                          <span className="text-xs font-semibold text-primary-600">
                            {m.progress}%
                          </span>
                        )}
                      </div>
                    </div>
                    <ProgressBar value={m.progress ?? 0} size="sm" showLabel={false} />
                  </div>
                </div>
              </div>
            );
          })}

          {withoutTracker.length > 0 && (
            <>
              {withTracker.length > 0 && (
                <p className="pt-2 text-xs text-gray-400">Трекер жоқ</p>
              )}
              {withoutTracker.map((m: any) => {
                const initials = (m.profiles?.name || m.profiles?.email || "?")
                  .charAt(0)
                  .toUpperCase();
                return (
                  <div key={m.user_id} className="card opacity-50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 font-semibold">
                        {initials}
                      </div>
                      <p className="text-sm text-gray-500">
                        {m.profiles?.name || m.profiles?.email}
                      </p>
                      <span className="ml-auto badge-gray text-xs">Трекер жоқ</span>
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {members?.length === 0 && (
            <div className="card text-center py-10 text-gray-400 text-sm">
              Клубта мүше жоқ
            </div>
          )}
        </div>
      </div>
  );
}
