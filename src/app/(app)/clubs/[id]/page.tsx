import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import { getUser } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adminDb = createAdminClient();
  const { data: club } = await adminDb
    .from("clubs")
    .select("name, description, emblem_url, cities(name)")
    .eq("id", id)
    .single();

  if (!club) return {};

  const title = club.name;
  const description = club.description || `Кітап клубы — ${(club.cities as any)?.name ?? ""}`;
  const image = club.emblem_url || null;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(image ? { images: [{ url: image, width: 400, height: 400 }] } : {}),
      type: "website",
    },
    twitter: {
      card: image ? "summary" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

import Link from "next/link";
import Image from "next/image";
import { MapPin, Users, Calendar, BookOpen, Plus, ArrowLeft, TrendingUp, MessageSquare, Pencil, ChevronRight } from "lucide-react";
import { formatDateKz, formatMonthKz, calcProgress, kzDateStr } from "@/lib/utils";
import ProgressBar from "@/components/ui/ProgressBar";
import LeaveClubButton from "@/components/clubs/LeaveClubButton";
import JoinClubButton from "@/components/clubs/JoinClubButton";
import ShareClubButton from "@/components/clubs/ShareClubButton";
import ThreadList from "@/components/analysis/ThreadList";

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getUser();
  const supabase = await createClient();
  const adminDb = createAdminClient();

  // Тіркелмеген пайдаланушы — публичный view
  if (!user) {
    const [{ data: club }, { count: memberCount }, { data: plans }] = await Promise.all([
      adminDb.from("clubs").select("*, cities(name), profiles(name)").eq("id", id).single(),
      adminDb.from("club_members").select("id", { count: "exact" }).eq("club_id", id),
      adminDb.from("club_plans").select("*, books(title, cover_url, author)").eq("club_id", id).order("meeting_date", { ascending: true, nullsFirst: false }).limit(3),
    ]);
    if (!club) notFound();
    const today = kzDateStr();
    const nearestPlan = (plans || []).find((p) => !p.meeting_date || p.meeting_date >= today) ?? null;
    return (
      <div className="page-container max-w-lg">
        <div className="card mb-5">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 text-2xl font-bold">
              {club.emblem_url ? (
                <Image src={club.emblem_url} alt={club.name} width={64} height={64} className="h-16 w-16 rounded-2xl object-cover" />
              ) : club.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900">{club.name}</h1>
              <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
                {club.cities && <span className="flex items-center gap-1"><MapPin size={13} /> {(club.cities as any).name}</span>}
                <span className="flex items-center gap-1"><Users size={13} /> {memberCount} оқырман</span>
              </div>
              {club.description && <p className="mt-2 text-sm text-gray-600">{club.description}</p>}
            </div>
          </div>
          {nearestPlan?.books && (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-primary-50 p-3">
              {nearestPlan.books.cover_url && (
                <Image src={nearestPlan.books.cover_url} alt={nearestPlan.books.title} width={36} height={52} className="h-13 w-9 rounded-lg object-cover border border-gray-200" />
              )}
              <div>
                <p className="text-xs text-primary-600 font-medium">Қазіргі кітап</p>
                <p className="text-sm font-semibold text-gray-900 line-clamp-1">{nearestPlan.books.title}</p>
                {nearestPlan.books.author && <p className="text-xs text-gray-500">{nearestPlan.books.author}</p>}
              </div>
            </div>
          )}
          <div className="mt-4">
            <Link href={`/login?next=/clubs/${id}`} className="btn-primary w-full justify-center">
              Клубқа қосылу үшін кіріңіз
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Parallel: club + plans + membership + memberCount + userClubCount
  const [
    { data: club },
    { data: plans },
    { data: membership },
    { count: memberCount },
    { count: userClubCount },
  ] = await Promise.all([
    supabase.from("clubs").select("*, cities(name), profiles(name, email)").eq("id", id).single(),
    supabase.from("club_plans").select("*, books(*)").eq("club_id", id).order("meeting_date", { ascending: true, nullsFirst: false }).order("year", { ascending: true }).order("month", { ascending: true }),
    supabase.from("club_members").select("id").eq("club_id", id).eq("user_id", user.id).single(),
    adminDb.from("club_members").select("id", { count: "exact" }).eq("club_id", id),
    supabase.from("club_members").select("id", { count: "exact" }).eq("user_id", user.id),
  ]);

  if (!club) notFound();

  const isFacilitator = club.facilitator_id === user.id;
  const isMember = !!membership;

  const today = kzDateStr();
  const activePlans = (plans || []).filter((p) => !p.meeting_date || p.meeting_date >= today);
  const pastPlans = (plans || []).filter((p) => p.meeting_date && p.meeting_date < today).reverse();
  const nearestPlan = activePlans[0] ?? null;

  // Facilitator OR member: get members with their progress (adminDb — RLS айналып өтеді)
  let membersWithProgress: any[] = [];
  if (isFacilitator || isMember) {
    const { data: members } = await adminDb
      .from("club_members")
      .select("user_id, profiles(name, email, avatar_url)")
      .eq("club_id", id);

    if (members && members.length > 0) {
      const memberIds = members.map((m) => m.user_id);
      let trackerMap: Record<string, any> = {};

      if (nearestPlan) {
        const { data: trackers } = await adminDb
          .from("book_trackers")
          .select("user_id, current_page, total_pages, is_completed")
          .eq("club_plan_id", nearestPlan.id)
          .in("user_id", memberIds);
        trackerMap = Object.fromEntries((trackers || []).map((t) => [t.user_id, t]));
      }

      membersWithProgress = members
        .map((m) => {
          const tracker = trackerMap[m.user_id];
          return {
            ...m,
            progress: tracker ? calcProgress(tracker.current_page, tracker.total_pages) : null,
            currentPage: tracker?.current_page ?? 0,
            totalPages: tracker?.total_pages ?? 0,
          };
        })
        .sort((a, b) => (b.progress ?? -1) - (a.progress ?? -1));
    }
  }

  // Пікірлер талқы (жоспар) бойынша топталады
  const { data: analyses } = await supabase
    .from("book_analyses")
    .select("id, title, created_at, club_plan_id, profiles(name)")
    .eq("club_id", id)
    .is("parent_id", null)
    .order("created_at", { ascending: false });

  const threadsByPlan: Record<string, any[]> = {};
  (analyses || []).forEach((a) => {
    if (!a.club_plan_id) return;
    (threadsByPlan[a.club_plan_id] ||= []).push(a);
  });

  // Reply counts per thread
  const threadIds = (analyses || []).map((a) => a.id);
  const replyCountMap: Record<string, number> = {};
  if (threadIds.length) {
    const { data: repliesData } = await supabase
      .from("book_analyses")
      .select("parent_id")
      .in("parent_id", threadIds);
    (repliesData || []).forEach((r) => {
      if (r.parent_id) replyCountMap[r.parent_id] = (replyCountMap[r.parent_id] || 0) + 1;
    });
  }

  return (
      <div className="page-container">
        {/* Back */}
        <Link href="/clubs" className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} /> Клубтар
        </Link>

        {/* Club header */}
        <div className="mb-6 card">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 text-2xl font-bold">
              {club.emblem_url ? (
                <Image src={club.emblem_url} alt={club.name} width={64} height={64} className="h-16 w-16 rounded-2xl object-cover border border-gray-800" />
              ) : (
                club.name.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900">{club.name}</h1>
              <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
                {club.cities && (
                  <span className="flex items-center gap-1">
                    <MapPin size={13} /> {(club.cities as any).name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users size={13} /> {memberCount} оқырман
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen size={13} /> Жүргізуші: {(club.profiles as any)?.name || "—"}
                </span>
              </div>
              {club.description && (
                <p className="mt-2 text-sm text-gray-600">{club.description}</p>
              )}
            </div>
          </div>

          {/* Join/Leave + Share */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {(isFacilitator || isMember) && (
                <ShareClubButton clubId={id} clubName={club.name} />
              )}
              {isFacilitator && (
                <Link
                  href={`/clubs/${id}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
                >
                  <Pencil size={13} /> Өңдеу
                </Link>
              )}
            </div>
            {!isFacilitator && (
              <div>
                {isMember ? (
                  <LeaveClubButton clubId={id} userId={user.id} />
                ) : (
                  <JoinClubButton
                    clubId={id}
                    userId={user.id}
                    disabled={(userClubCount || 0) >= 3}
                    disabledReason="Ең көп 3 клубқа тіркелуге болады"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Club plans */}
          <section>
            <div className="section-title">
              <h2>Кітап жоспары</h2>
              {isFacilitator && (
                <Link href={`/clubs/${id}/plan/new`} className="btn-primary py-1.5 px-3 text-xs">
                  <Plus size={14} /> Жоспар қосу
                </Link>
              )}
            </div>

            {/* Nearest upcoming meeting */}
            {nearestPlan?.meeting_date && (() => {
              // Parse as local date to avoid UTC timezone offset shifting the day
              const [py, pm, pd] = nearestPlan.meeting_date.split("-").map(Number);
              const d = new Date(py, pm - 1, pd);
              const day = d.getDate();
              const month = d.toLocaleDateString("kk-KZ", { month: "short" }).replace(".", "").toUpperCase();
              const weekday = d.toLocaleDateString("kk-KZ", { weekday: "short" });
              const todayMidnight = new Date();
              todayMidnight.setHours(0, 0, 0, 0);
              const diffDays = Math.round((d.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
              const isClose = diffDays <= 3;
              const countdownLabel =
                diffDays === 0 ? "Бүгін!" :
                diffDays === 1 ? "Ертең" :
                `${diffDays} күн`;
              const planThreads = threadsByPlan[nearestPlan.id] ?? [];
              const canOpen = isFacilitator || isMember;

              const card = (
                <>
                  {/* Талқы туралы */}
                  <div className="flex items-center gap-3 p-4">
                    {/* Date block */}
                    <div className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-xl py-2.5 ${
                      isClose ? "bg-primary-600 text-white" : "bg-primary-50 text-primary-700"
                    }`}>
                      <span className="text-2xl font-extrabold leading-none">{day}</span>
                      <span className="mt-0.5 text-[10px] font-semibold tracking-wide uppercase">{month}</span>
                      <span className={`text-[9px] mt-0.5 ${isClose ? "text-primary-200" : "text-primary-400"}`}>{weekday}</span>
                    </div>
                    {/* Cover */}
                    {nearestPlan.books?.cover_url && (
                      <Image src={nearestPlan.books.cover_url} alt={nearestPlan.books.title} width={44} height={64} className="h-16 w-11 shrink-0 rounded-lg object-cover border border-gray-200 shadow-sm" />
                    )}
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Ең жақын талқы</p>
                      <p className="font-semibold text-gray-900 text-sm line-clamp-1">
                        {nearestPlan.books?.title ?? "Кітап белгіленбеген"}
                      </p>
                      {nearestPlan.meeting_location && (
                        <p className="mt-0.5 text-xs text-primary-600">📍 {nearestPlan.meeting_location}</p>
                      )}
                    </div>
                    {/* Countdown */}
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`text-xs font-bold ${
                        diffDays === 0 ? "text-primary-600" : isClose ? "text-yellow-600" : "text-gray-400"
                      }`}>
                        {countdownLabel}
                      </span>
                      {canOpen && <ChevronRight size={16} className="text-gray-300" />}
                    </div>
                  </div>

                  {/* Ішінде не бар — қысқа қорытынды */}
                  {canOpen && (
                    <div className="flex items-center gap-4 border-t border-gray-100 bg-white/70 px-4 py-2.5">
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <TrendingUp size={13} className="text-primary-500" />
                        {membersWithProgress.length} оқырман
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MessageSquare size={13} className="text-primary-500" />
                        {planThreads.length} пікір
                      </span>
                      <span className="ml-auto text-xs font-medium text-primary-600">Ашу →</span>
                    </div>
                  )}
                </>
              );

              const shell = `mb-4 block overflow-hidden rounded-2xl border shadow-sm transition ${
                isClose ? "border-primary-200 bg-primary-50/50" : "border-gray-100 bg-white"
              } ${canOpen ? "hover:border-primary-300 hover:shadow-md" : ""}`;

              return canOpen ? (
                <Link href={`/clubs/${id}/plan/${nearestPlan.id}`} className={shell}>
                  {card}
                </Link>
              ) : (
                <div className={shell}>{card}</div>
              );
            })()}

            {/* Collapsible full plan list */}
            {plans && plans.length > 0 ? (
              <details className="group">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition select-none">
                    <span className="flex-1 border-t border-gray-100" />
                    <span className="flex items-center gap-1 shrink-0">
                      Толық жоспар
                      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                        {activePlans.filter((p: any) => p.id !== nearestPlan?.id).length + pastPlans.length}
                      </span>
                      <svg className="h-3.5 w-3.5 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                    <span className="flex-1 border-t border-gray-100" />
                  </div>
                </summary>

                <div className="mt-2 space-y-2">
                  {[...activePlans]
                  .filter((p: any) => p.id !== nearestPlan?.id)
                  .sort((a: any, b: any) => {
                    const ak = a.meeting_date ?? `${a.year}-${String(a.month).padStart(2,"0")}-99`;
                    const bk = b.meeting_date ?? `${b.year}-${String(b.month).padStart(2,"0")}-99`;
                    return ak.localeCompare(bk);
                  })
                  .map((plan: any) => (
                    <div key={plan.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3">
                      {plan.books?.cover_url && (
                        <Image src={plan.books.cover_url} alt={plan.books.title} width={44} height={64} className="h-16 w-11 shrink-0 rounded-lg object-cover border border-gray-200 shadow-sm" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-600">
                            {formatMonthKz(plan.month, plan.year)}
                          </span>
                          {plan.books?.page_count && (
                            <span className="text-xs text-gray-400">{plan.books.page_count} бет</span>
                          )}
                        </div>
                        <p className="font-semibold text-gray-900 text-sm line-clamp-1">
                          {plan.books?.title ?? "Кітап белгіленбеген"}
                        </p>
                        {plan.books?.author && (
                          <p className="text-xs text-gray-400">{plan.books.author}</p>
                        )}
                        {plan.meeting_date && (
                          <p className="mt-0.5 text-xs text-primary-600">
                            📅 {formatDateKz(plan.meeting_date)}
                            {plan.meeting_location && ` — ${plan.meeting_location}`}
                          </p>
                        )}
                        {plan.notes && (
                          <p className="mt-0.5 text-xs text-gray-400 italic">{plan.notes}</p>
                        )}
                      </div>
                      {(isFacilitator || isMember) && (
                        <Link
                          href={`/clubs/${id}/plan/${plan.id}`}
                          className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-gray-400 transition hover:bg-gray-100 hover:text-primary-600"
                        >
                          <MessageSquare size={12} />
                          {(threadsByPlan[plan.id] ?? []).length}
                        </Link>
                      )}
                      {isFacilitator && (
                        <Link
                          href={`/clubs/${id}/plan/${plan.id}/edit`}
                          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </Link>
                      )}
                    </div>
                  ))}

                  {pastPlans.length > 0 && (
                    <div className="pt-1">
                      <p className="mb-2 flex items-center gap-2 text-xs text-gray-400">
                        <span className="flex-1 border-t border-gray-100" />
                        Тарих ({pastPlans.length})
                        <span className="flex-1 border-t border-gray-100" />
                      </p>
                      {pastPlans.map((plan: any) => {
                        const count = (threadsByPlan[plan.id] ?? []).length;
                        const row = (
                          <>
                            {plan.books?.cover_url && (
                              <Image src={plan.books.cover_url} alt={plan.books.title} width={32} height={48} className="h-12 w-8 shrink-0 rounded-md object-cover border border-gray-200" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-700 text-sm line-clamp-1">
                                {plan.books?.title ?? "—"}
                              </p>
                              {plan.meeting_date && (
                                <p className="text-xs text-gray-400">{formatDateKz(plan.meeting_date)}</p>
                              )}
                            </div>
                            {count > 0 && (
                              <span className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
                                <MessageSquare size={11} />
                                {count}
                              </span>
                            )}
                          </>
                        );

                        // Мүше архивтегі талқыны ашып, пікірлерін оқи алады
                        return isFacilitator || isMember ? (
                          <Link
                            key={plan.id}
                            href={`/clubs/${id}/plan/${plan.id}`}
                            className="mb-2 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 transition hover:border-primary-200 hover:bg-white"
                          >
                            {row}
                          </Link>
                        ) : (
                          <div key={plan.id} className="mb-2 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 opacity-60">
                            {row}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </details>
            ) : (
              <div className="card text-center py-8 text-sm text-gray-500">
                Жоспар жоқ
              </div>
            )}
          </section>

          {/* Клубқа қосылмағандарға */}
          {!isFacilitator && !isMember && (
            <section>
              <div className="card py-8 text-center text-sm text-gray-500">
                Талқыны және оқырмандар үлгерімін көру үшін клубқа қосылыңыз
              </div>
            </section>
          )}
        </div>
      </div>
  );
}

// Жоспар картасы — белсенді және тарихи
function PlanCard({
  plan,
  clubId,
  isMember,
  isFacilitator,
  isPast,
}: {
  plan: any;
  clubId: string;
  isMember: boolean;
  isFacilitator: boolean;
  isPast: boolean;
}) {
  return (
    <div className={`card ${isPast ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className={`mb-2 inline-block ${isPast ? "badge-gray" : "badge-green"}`}>
            {formatMonthKz(plan.month, plan.year)}
          </span>
          <p className="font-semibold text-gray-900">
            {plan.books?.title ?? "Кітап белгіленбеген"}
          </p>
          {plan.books?.author && (
            <p className="text-xs text-gray-500">{plan.books.author}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {plan.books?.page_count && (
            <span className="badge-gray">{plan.books.page_count} бет</span>
          )}
          {isPast && <span className="badge-gray text-xs">Аяқталды</span>}
        </div>
      </div>

      {plan.meeting_date && (
        <p className="mt-2 text-xs text-primary-600">
          <Calendar size={12} className="inline mr-1" />
          Талқы: {formatDateKz(plan.meeting_date)}
          {plan.meeting_location && ` — ${plan.meeting_location}`}
        </p>
      )}

      {plan.notes && (
        <p className="mt-2 text-xs text-gray-500 italic">{plan.notes}</p>
      )}

    </div>
  );
}
