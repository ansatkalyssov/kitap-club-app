import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { getUser } from "@/lib/queries";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Calendar, MapPin, BookOpen, Pencil, TrendingUp, MessageSquare } from "lucide-react";
import ThreadList from "@/components/analysis/ThreadList";
import ProgressBar from "@/components/ui/ProgressBar";
import { formatDateKz, formatMonthKz, kzDateStr, calcProgress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PlanDiscussionPage({
  params,
}: {
  params: Promise<{ id: string; planId: string }>;
}) {
  const { id, planId } = await params;
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const adminDb = createAdminClient();

  const [{ data: plan }, { data: club }, { data: membership }] = await Promise.all([
    adminDb
      .from("club_plans")
      .select("*, books(title, author, cover_url, page_count)")
      .eq("id", planId)
      .eq("club_id", id)
      .single(),
    adminDb.from("clubs").select("id, name, facilitator_id").eq("id", id).single(),
    supabase
      .from("club_members")
      .select("id")
      .eq("club_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!plan || !club) notFound();

  const isFacilitator = club.facilitator_id === user.id;
  const isMember = Boolean(membership);
  // Талқы бәріне ашық — қосылмаған оқырман да үлгерім мен пікірлерді көреді.
  // Жазу құқығы бұрынғыдай мүшелер мен жүргізушіде ғана.

  // Осы талқының пікірлері
  const { data: threads } = await supabase
    .from("book_analyses")
    .select("id, title, created_at, profiles(name)")
    .eq("club_plan_id", planId)
    .is("parent_id", null)
    .order("created_at", { ascending: false });

  const threadIds = (threads ?? []).map((t) => t.id);
  const replyCounts: Record<string, number> = {};
  if (threadIds.length) {
    const { data: replies } = await supabase
      .from("book_analyses")
      .select("parent_id")
      .in("parent_id", threadIds);
    (replies ?? []).forEach((r) => {
      if (r.parent_id) replyCounts[r.parent_id] = (replyCounts[r.parent_id] ?? 0) + 1;
    });
  }

  // Осы кітап бойынша оқырмандар үлгерімі
  const { data: members } = await adminDb
    .from("club_members")
    .select("user_id, profiles(name, email, avatar_url)")
    .eq("club_id", id);

  let membersWithProgress: any[] = [];
  if (members?.length) {
    const { data: trackers } = await adminDb
      .from("book_trackers")
      .select("user_id, current_page, total_pages, is_completed")
      .eq("club_plan_id", planId)
      .in("user_id", members.map((m) => m.user_id));

    const trackerMap = Object.fromEntries((trackers ?? []).map((t) => [t.user_id, t]));

    membersWithProgress = members
      .map((m) => {
        const t = trackerMap[m.user_id];
        return {
          ...m,
          progress: t ? calcProgress(t.current_page, t.total_pages) : null,
          currentPage: t?.current_page ?? 0,
          totalPages: t?.total_pages ?? 0,
        };
      })
      .sort((a, b) => (b.progress ?? -1) - (a.progress ?? -1));
  }

  const isPast = Boolean(plan.meeting_date && plan.meeting_date < kzDateStr());
  const book = plan.books as any;

  return (
    <div className="page-container max-w-2xl">
      <Link
        href={`/clubs/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> {club.name}
      </Link>

      {/* Талқы туралы */}
      <div className="card mb-5">
        <div className="flex items-start gap-4">
          {book?.cover_url ? (
            <Image
              src={book.cover_url}
              alt={book.title}
              width={52}
              height={76}
              className="h-[76px] w-13 shrink-0 rounded-lg border border-gray-200 object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-[76px] w-13 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-primary-50">
              <BookOpen size={20} className="text-primary-300" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-primary-600">
                  {formatMonthKz(plan.month, plan.year)}
                  {isPast && " · архив"}
                </p>
                <h1 className="mt-0.5 text-lg font-bold text-gray-900">
                  {book?.title ?? "Кітап белгіленбеген"}
                </h1>
                {book?.author && <p className="text-sm text-gray-500">{book.author}</p>}
              </div>
              {isFacilitator && (
                <Link
                  href={`/clubs/${id}/plan/${planId}/edit`}
                  className="inline-flex shrink-0 items-center gap-1 text-xs text-gray-500 hover:text-primary-600"
                >
                  <Pencil size={12} /> Өңдеу
                </Link>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
              {plan.meeting_date && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {formatDateKz(plan.meeting_date)}
                </span>
              )}
              {plan.meeting_location && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {plan.meeting_location}
                </span>
              )}
            </div>
          </div>
        </div>

        {plan.notes && (
          <p className="mt-4 border-t border-gray-50 pt-3 text-sm text-gray-600">{plan.notes}</p>
        )}
      </div>

      {/* Оқырмандар үлгерімі */}
      <div className="section-title">
        <h2 className="flex items-center gap-2">
          <TrendingUp size={16} className="text-primary-500" />
          Оқырмандар үлгерімі
        </h2>
        <Link
          href={`/clubs/${id}/progress`}
          className="text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          Толық көру →
        </Link>
      </div>

      {membersWithProgress.length > 0 ? (
        <div className="card mb-6 space-y-3">
          {membersWithProgress.map((m: any) => (
            <div key={m.user_id} className="flex items-center gap-3">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                {m.profiles?.avatar_url ? (
                  <Image
                    src={m.profiles.avatar_url}
                    alt={m.profiles.name || ""}
                    fill
                    className="object-cover"
                    sizes="32px"
                  />
                ) : (
                  (m.profiles?.name || m.profiles?.email || "?").charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm text-gray-800">
                    {m.profiles?.name || m.profiles?.email}
                  </p>
                  <span className="shrink-0 text-xs text-gray-400">
                    {m.progress !== null ? `${m.currentPage}/${m.totalPages} бет` : "—"}
                  </span>
                </div>
                {m.progress !== null ? (
                  <ProgressBar value={m.progress} size="sm" />
                ) : (
                  <p className="mt-0.5 text-xs text-gray-400">Трекер жоқ</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card mb-6 py-6 text-center text-sm text-gray-500">Оқырман жоқ</div>
      )}

      {/* Пікірлер */}
      <div className="section-title">
        <h2 className="flex items-center gap-2">
          <MessageSquare size={16} className="text-primary-500" />
          Пікір алмасу ({threads?.length ?? 0})
        </h2>
      </div>

      {!isFacilitator && !isMember && (
        <Link
          href={`/clubs/${id}`}
          className="mb-3 flex items-center justify-center gap-1.5 rounded-xl bg-primary-50 px-4 py-2.5 text-xs font-medium text-primary-700 transition hover:bg-primary-100"
        >
          Талқыға қатысу үшін клубқа қосылыңыз →
        </Link>
      )}

      <ThreadList
        threads={(threads ?? []) as any}
        replyCounts={replyCounts}
        newHref={isFacilitator ? `/analysis/new?club=${id}&plan=${planId}` : undefined}
        emptyText={
          isPast
            ? "Бұл талқыда пікір жазылмаған"
            : "Әзірге пікір жоқ. Кітапты оқып, ойыңызбен бөлісіңіз."
        }
      />
    </div>
  );
}
