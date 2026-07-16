import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Calendar, BookOpen, Trash2 } from "lucide-react";
import ProgressBar from "@/components/ui/ProgressBar";
import LogProgressForm from "@/components/tracker/LogProgressForm";
import DeleteTrackerButton from "@/components/tracker/DeleteTrackerButton";
import { calcProgress, calcDailyPages, daysUntil, formatDateKz } from "@/lib/utils";

export default async function TrackerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tracker } = await supabase
    .from("book_trackers")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!tracker) notFound();

  const { data: progressHistory } = await supabase
    .from("reading_progress")
    .select("*")
    .eq("tracker_id", id)
    .order("date", { ascending: false })
    .limit(30);

  const progress = calcProgress(tracker.current_page, tracker.total_pages);
  const dailyPages = calcDailyPages(tracker.current_page, tracker.total_pages, tracker.deadline);
  const daysLeft = daysUntil(tracker.deadline);

  // Today's progress
  const today = new Date().toISOString().split("T")[0];
  const todayProgress = progressHistory?.find((p) => p.date === today);

  return (
    <AppShell>
      <div className="page-container max-w-2xl">
        <Link href="/tracker" className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} /> Трекер
        </Link>

        {/* Book header */}
        <div className="card mb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100">
                <BookOpen size={20} className="text-primary-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{tracker.book_title}</h1>
                {tracker.book_author && (
                  <p className="text-sm text-gray-500">{tracker.book_author}</p>
                )}
              </div>
            </div>
            {tracker.is_completed && (
              <span className="flex items-center gap-1.5 rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-700">
                <CheckCircle2 size={14} /> Аяқталды
              </span>
            )}
          </div>

          {/* Progress */}
          <div className="mt-5">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-gray-600">{tracker.current_page} / {tracker.total_pages} бет</span>
              <span className="font-semibold text-primary-700">{progress}%</span>
            </div>
            <ProgressBar value={progress} showLabel={false} />
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-50 pt-4">
            <div className="text-center">
              <p className={`text-lg font-bold ${daysLeft < 0 ? "text-red-600" : daysLeft <= 7 ? "text-yellow-600" : "text-primary-600"}`}>
                {daysLeft < 0 ? `${Math.abs(daysLeft)}` : daysLeft}
              </p>
              <p className="text-xs text-gray-500">{daysLeft < 0 ? "күн кешікті" : "күн қалды"}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{tracker.total_pages - tracker.current_page}</p>
              <p className="text-xs text-gray-500">бет қалды</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary-600">{dailyPages > 0 ? dailyPages : "—"}</p>
              <p className="text-xs text-gray-500">бет/күн</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
            <Calendar size={12} />
            Дедлайн: {formatDateKz(tracker.deadline)}
          </div>
        </div>

        {/* Log progress */}
        {!tracker.is_completed && (
          <div className="mb-5">
            <h2 className="mb-3">Бүгінгі прогрес</h2>
            <LogProgressForm
              trackerId={id}
              currentPage={tracker.current_page}
              totalPages={tracker.total_pages}
              todayProgress={todayProgress || null}
            />
          </div>
        )}

        {/* Progress history */}
        {progressHistory && progressHistory.length > 0 && (
          <div className="mb-5">
            <h2 className="mb-3">Оқу тарихы</h2>
            <div className="card divide-y divide-gray-50">
              {progressHistory.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatDateKz(p.date)}</p>
                    {p.note && <p className="text-xs text-gray-500 mt-0.5">{p.note}</p>}
                  </div>
                  <span className="badge-green">+{p.pages_read} бет</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete */}
        <div className="flex justify-end">
          <DeleteTrackerButton trackerId={id} />
        </div>
      </div>
    </AppShell>
  );
}
