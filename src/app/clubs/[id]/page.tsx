import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Link from "next/link";
import { MapPin, Users, Calendar, BookOpen, Plus, ArrowLeft, TrendingUp, MessageSquare } from "lucide-react";
import { formatDateKz, formatMonthKz, calcProgress } from "@/lib/utils";
import ProgressBar from "@/components/ui/ProgressBar";
import LeaveClubButton from "@/components/clubs/LeaveClubButton";
import JoinClubButton from "@/components/clubs/JoinClubButton";
import ShareClubButton from "@/components/clubs/ShareClubButton";

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const { data: club } = await supabase
    .from("clubs")
    .select("*, cities(name), profiles(name, email)")
    .eq("id", id)
    .single();

  if (!club) notFound();

  const isFacilitator = club.facilitator_id === user.id;

  // Club plans
  const { data: plans } = await supabase
    .from("club_plans")
    .select("*, books(*)")
    .eq("club_id", id)
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  const today = new Date().toISOString().split("T")[0];
  const activePlans = (plans || []).filter(
    (p) => !p.end_date || p.end_date >= today
  );
  const pastPlans = (plans || []).filter(
    (p) => p.end_date && p.end_date < today
  );
  // Дедлайны ең жақын белсенді жоспар
  const nearestPlan = activePlans
    .filter((p) => p.end_date)
    .sort((a, b) => a.end_date.localeCompare(b.end_date))[0] || activePlans[0] || null;

  // Membership check
  const { data: membership } = await supabase
    .from("club_members")
    .select("id")
    .eq("club_id", id)
    .eq("user_id", user.id)
    .single();

  const isMember = !!membership;

  // Members count
  const { count: memberCount } = await supabase
    .from("club_members")
    .select("id", { count: "exact" })
    .eq("club_id", id);

  // If facilitator: get members with their progress (adminDb — RLS айналып өтеді)
  let membersWithProgress: any[] = [];
  if (isFacilitator) {
    const adminDb = createAdminClient();
    const { data: members } = await adminDb
      .from("club_members")
      .select("user_id, profiles(name, email)")
      .eq("club_id", id);

    if (members) {
      const todayStr = new Date().toISOString().split("T")[0];

      // Дедлайн бойынша ең жақын белсенді жоспар
      const nearestPlan = (plans || [])
        .filter((p) => p.end_date && p.end_date >= todayStr)
        .sort((a, b) => a.end_date.localeCompare(b.end_date))[0];

      for (const m of members) {
        let progress = null;
        let currentPage = 0;
        let totalPages = 0;

        if (nearestPlan) {
          const { data: tracker } = await adminDb
            .from("book_trackers")
            .select("current_page, total_pages, is_completed")
            .eq("user_id", m.user_id)
            .eq("club_plan_id", nearestPlan.id)
            .single();
          if (tracker) {
            progress = calcProgress(tracker.current_page, tracker.total_pages);
            currentPage = tracker.current_page;
            totalPages = tracker.total_pages;
          }
        }
        membersWithProgress.push({ ...m, progress, currentPage, totalPages });
      }
      // Үздіктерді жоғары шығару
      membersWithProgress.sort((a, b) => (b.progress ?? -1) - (a.progress ?? -1));
    }
  }

  // Discussion threads for this club (parent_id IS NULL = top-level threads)
  const { data: analyses } = await supabase
    .from("book_analyses")
    .select("*, club_plans(books(title)), profiles(name)")
    .eq("club_id", id)
    .is("parent_id", null)
    .order("created_at", { ascending: false })
    .limit(5);

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

  // Check how many clubs user has joined
  const { count: userClubCount } = await supabase
    .from("club_members")
    .select("id", { count: "exact" })
    .eq("user_id", user.id);

  return (
    <AppShell>
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
                <img src={club.emblem_url} alt={club.name} className="h-16 w-16 rounded-2xl object-cover" />
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
                  <Users size={13} /> {memberCount} мүше
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
            {isFacilitator ? (
              <ShareClubButton clubId={id} clubName={club.name} />
            ) : (
              <div />
            )}
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
              return (
                <div className={`mb-4 flex items-center gap-3 rounded-2xl border p-4 shadow-sm ${
                  isClose ? "border-primary-200 bg-primary-50/50" : "border-gray-100 bg-white"
                }`}>
                  {/* Date block */}
                  <div className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-xl py-2.5 ${
                    isClose ? "bg-primary-600 text-white" : "bg-primary-50 text-primary-700"
                  }`}>
                    <span className="text-2xl font-extrabold leading-none">{day}</span>
                    <span className="mt-0.5 text-[10px] font-semibold tracking-wide uppercase">{month}</span>
                    <span className={`text-[9px] mt-0.5 ${isClose ? "text-primary-200" : "text-primary-400"}`}>{weekday}</span>
                  </div>
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
                  <span className={`shrink-0 text-xs font-bold ${
                    diffDays === 0 ? "text-primary-600" : isClose ? "text-yellow-600" : "text-gray-400"
                  }`}>
                    {countdownLabel}
                  </span>
                </div>
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
                  {activePlans.filter((p: any) => p.id !== nearestPlan?.id).map((plan: any) => (
                    <div key={plan.id} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3">
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
                    </div>
                  ))}

                  {pastPlans.length > 0 && (
                    <div className="pt-1">
                      <p className="mb-2 flex items-center gap-2 text-xs text-gray-400">
                        <span className="flex-1 border-t border-gray-100" />
                        Тарих ({pastPlans.length})
                        <span className="flex-1 border-t border-gray-100" />
                      </p>
                      {pastPlans.map((plan: any) => (
                        <div key={plan.id} className="mb-2 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 opacity-60">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-700 text-sm line-clamp-1">
                              {plan.books?.title ?? "—"}
                            </p>
                            {plan.meeting_date && (
                              <p className="text-xs text-gray-400">{formatDateKz(plan.meeting_date)}</p>
                            )}
                          </div>
                        </div>
                      ))}
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

          {/* Members progress (facilitator) OR Analyses */}
          <section>
            {isFacilitator ? (
              <>
                <div className="section-title">
                  <h2>Оқырмандар үлгерімі</h2>
                  <Link
                    href={`/clubs/${id}/progress`}
                    className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    <TrendingUp size={14} /> Толық көру
                  </Link>
                </div>

                {/* Қай кітап бойынша */}
                {nearestPlan && (
                  <div className="mb-3 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                    <BookOpen size={13} className="shrink-0 text-primary-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-700">
                        {nearestPlan.books?.title}
                      </p>
                    </div>
                    {nearestPlan.end_date && (
                      <span className="shrink-0 text-xs text-gray-400">
                        {formatDateKz(nearestPlan.end_date)}
                      </span>
                    )}
                  </div>
                )}

                {membersWithProgress.length > 0 ? (
                  <div className="space-y-3">
                    {membersWithProgress.map((m: any) => (
                      <div key={m.user_id} className="card">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-sm font-semibold">
                            {(m.profiles?.name || m.profiles?.email || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-gray-900 text-sm truncate">
                                {m.profiles?.name || m.profiles?.email}
                              </p>
                              {m.progress !== null && (
                                <span className="text-xs text-gray-500 shrink-0 ml-2">
                                  {m.currentPage}/{m.totalPages} бет
                                </span>
                              )}
                            </div>
                            {m.progress !== null ? (
                              <ProgressBar value={m.progress} size="sm" />
                            ) : (
                              <p className="text-xs text-gray-400 mt-1">Трекер жоқ</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="card text-center py-8 text-sm text-gray-500">Мүше жоқ</div>
                )}
              </>
            ) : (
              <>
                <div className="section-title">
                  <h2>Пікір алмасу</h2>
                </div>
                {analyses && analyses.length > 0 ? (
                  <div className="space-y-2">
                    {analyses.map((a: any) => (
                      <Link key={a.id} href={`/analysis/${a.id}`}
                        className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 hover:border-primary-200 hover:shadow-sm transition"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm line-clamp-1">{a.title}</p>
                          {a.club_plans?.books?.title && (
                            <p className="text-xs text-gray-400 mt-0.5">{a.club_plans.books.title}</p>
                          )}
                        </div>
                        <span className="shrink-0 flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <MessageSquare size={11} />
                          {replyCountMap[a.id] || 0}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="card text-center py-8 text-sm text-gray-500">
                    Пікір жоқ. Жүргізуші ашқаннан кейін пікір қалдыра аласыз.
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        {/* Threads section for facilitator view */}
        {isFacilitator && (
          <div className="mt-5">
            <div className="section-title">
              <h2>Пікір алмасу</h2>
              <Link href={`/analysis/new?club=${id}`} className="btn-primary py-1.5 px-3 text-xs">
                <Plus size={14} /> Пікір ашу
              </Link>
            </div>
            {analyses && analyses.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {analyses.map((a: any) => (
                  <Link key={a.id} href={`/analysis/${a.id}`}
                    className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-4 hover:border-primary-200 hover:shadow-sm transition"
                  >
                    <p className="font-semibold text-gray-900 text-sm line-clamp-2">{a.title}</p>
                    {a.club_plans?.books?.title && (
                      <p className="text-xs text-gray-400">{a.club_plans.books.title}</p>
                    )}
                    {a.meeting_date && (
                      <p className="text-xs text-primary-600">{formatDateKz(a.meeting_date)}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-auto pt-1 border-t border-gray-50">
                      <MessageSquare size={11} />
                      <span>{replyCountMap[a.id] || 0} пікір</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="card text-center py-8 text-sm text-gray-500">
                Пікір жоқ. Кітап талқысынан кейін пікір ашыңыз.
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
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
