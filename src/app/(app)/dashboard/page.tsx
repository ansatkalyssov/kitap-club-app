import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/queries";
import Link from "next/link";
import Image from "next/image";
import { Users, BookMarked, Plus, Star, Calendar, MessageSquare } from "lucide-react";
import PushSubscribe from "@/components/PushSubscribe";
import PushReminderHint from "@/components/PushReminderHint";
import ProgressBar from "@/components/ui/ProgressBar";
import { calcProgress, daysUntil, formatDateKz, kzDateStr, monthBounds } from "@/lib/utils";
import { getUserStats } from "@/lib/points";
import { BookTracker } from "@/lib/types";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const today = kzDateStr();

  // Parallel: trackers + memberships + managedClubs + total tracker count
  const [{ data: trackers }, { data: memberships }, { data: managedClubs }, { count: totalTrackerCount }] = await Promise.all([
    supabase
      .from("book_trackers")
      .select("*, club_plans(books(cover_url))")
      .eq("user_id", user.id)
      .eq("is_completed", false)
      .gte("deadline", today)
      .order("deadline", { ascending: true })
      .limit(5),
    supabase
      .from("club_members")
      .select("club_id, clubs(id, name, club_plans(*, books(*)))")
      .eq("user_id", user.id),
    profile.role !== "reader"
      ? supabase
          .from("clubs")
          .select("id, name, club_members(count)")
          .eq("facilitator_id", user.id)
          .eq("is_active", true)
      : Promise.resolve({ data: null }),
    supabase
      .from("book_trackers")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  // Алдағы талқылар (depends on memberships)
  const clubIds = memberships?.map((m) => m.club_id) || [];
  const { data: upcomingMeetings } = clubIds.length
    ? await supabase
        .from("club_plans")
        .select("id, meeting_date, meeting_location, books(title), clubs(id, name, emblem_url)")
        .in("club_id", clubIds)
        .gte("meeting_date", today)
        .order("meeting_date", { ascending: true })
        .limit(1)
    : { data: null };

  // Клубтардағы соңғы пікір белсенділігі.
  // Пікір енді жеке таб емес — талқының ішінде тұр, сондықтан жаңалықтан
  // хабардар ететін жалғыз орын осы лента.
  const { data: recentActivity } = clubIds.length
    ? await supabase
        .from("book_analyses")
        .select("id, title, parent_id, club_id, club_plan_id, created_at, profiles(name), clubs(name), club_plans(books(title))")
        .in("club_id", clubIds)
        .neq("author_id", user.id)
        .order("created_at", { ascending: false })
        .limit(4)
    : { data: null };

  // Нақты оқылып жатқан трекерлер (current_page > 0)
  const inProgressTrackers = (trackers || []).filter((t) => t.current_page > 0);

  const stats = await getUserStats(user.id, monthBounds().start);

  const { data: goal } = await supabase
    .from("reading_goals")
    .select("reminder_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  const isFacilitatorWithClubs =
    profile.role !== "reader" && managedClubs && managedClubs.length > 0;

  // Трекер картасы — қайта пайдалану үшін
  function TrackerCard({ t }: { t: BookTracker }) {
    const progress = calcProgress(t.current_page, t.total_pages);
    const days = daysUntil(t.deadline);
    return (
      <Link
        href={`/tracker/${t.id}`}
        className={`card block transition hover:border-primary-200 ${
          t.club_plan_id ? "border-l-4 border-l-primary-400" : "border-l-4 border-l-gray-200"
        }`}
      >
        <div className="mb-2 flex items-start gap-3">
          {(t.cover_url || (t.club_plans as any)?.books?.cover_url) ? (
            <Image
              src={t.cover_url || (t.club_plans as any).books.cover_url}
              alt={t.book_title}
              width={36}
              height={52}
              className="h-[52px] w-9 shrink-0 rounded-md object-cover border border-gray-200 shadow-sm"
            />
          ) : null}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 line-clamp-1">{t.book_title}</p>
                {t.book_author && <p className="text-xs text-gray-500">{t.book_author}</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`badge text-xs ${t.club_plan_id ? "badge-green" : "bg-gray-100 text-gray-500"}`}>
                  {t.club_plan_id ? "Клуб" : "Жеке"}
                </span>
                <span className={`badge shrink-0 ${days <= 7 ? "badge-yellow" : "badge-green"}`}>
                  {days === 0 ? "Бүгін" : `${days} күн`}
                </span>
              </div>
            </div>
          </div>
        </div>
        <ProgressBar value={progress} size="sm" />
        <p className="mt-1 text-xs text-gray-500">
          {t.current_page} / {t.total_pages} бет
        </p>
      </Link>
    );
  }

  // Келесі талқы карточкасы
  function MeetingCard({ plan }: { plan: any }) {
    const [py, pm, pd] = plan.meeting_date.split("-").map(Number);
    const d = new Date(py, pm - 1, pd);
    const day = d.getDate();
    const month = d.toLocaleDateString("kk-KZ", { month: "short" }).replace(".", "").toUpperCase();
    const weekday = d.toLocaleDateString("kk-KZ", { weekday: "short" });
    const todayMid = new Date();
    todayMid.setHours(0, 0, 0, 0);
    const diffDays = Math.round((d.getTime() - todayMid.getTime()) / (1000 * 60 * 60 * 24));
    const isClose = diffDays <= 3;

    return (
      // Билет тәрізді: сол жақта жыртылатын түбіртек, оң жақта шақыру
      <Link
        href={`/clubs/${plan.clubs?.id}`}
        className="flex overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-sm transition hover:border-primary-300 hover:shadow-md"
      >
        {/* Түбіртек — күні */}
        <div
          className={`flex w-[76px] shrink-0 flex-col items-center justify-center px-2 py-5 text-white ${
            isClose ? "bg-primary-600" : "bg-primary-500"
          }`}
        >
          <span className="text-3xl font-extrabold leading-none">{day}</span>
          <span className="mt-1 text-xs font-semibold uppercase tracking-wider">
            {month}
          </span>
          <span className="mt-0.5 text-[10px] text-primary-100">{weekday}</span>
        </div>

        {/* Шақыру */}
        <div className="min-w-0 flex-1 border-l-2 border-dashed border-primary-100 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary-500">
              Шақыру
            </span>
            <span
              className={`shrink-0 text-xs font-semibold ${
                isClose ? "text-yellow-600" : "text-gray-400"
              }`}
            >
              {diffDays === 0 ? "Бүгін!" : diffDays === 1 ? "Ертең" : `${diffDays} күн`}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            {plan.clubs?.emblem_url ? (
              <Image
                src={plan.clubs.emblem_url}
                alt={plan.clubs.name}
                width={24}
                height={24}
                className="h-6 w-6 shrink-0 rounded-md border border-gray-100 object-cover"
              />
            ) : (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary-100 text-[10px] font-bold text-primary-700">
                {(plan.clubs?.name ?? "?").charAt(0)}
              </div>
            )}
            <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-gray-900">
              {plan.clubs?.name}
            </p>
          </div>

          <p className="mt-2 font-medium leading-snug text-gray-900">
            {plan.books?.title ?? "Кітап белгіленбеген"}
          </p>

          {plan.meeting_location && (
            <p className="mt-1 text-xs leading-snug text-primary-600">
              📍 {plan.meeting_location}
            </p>
          )}
        </div>
      </Link>
    );
  }

  return (
    <div className="page-container">
      {/* Greeting */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">
            Сәлем, {profile.name || "Оқырман"} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {new Date().toLocaleDateString("kk-KZ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <PushSubscribe />
      </div>

      <PushReminderHint reminderEnabled={Boolean(goal?.reminder_enabled)} />

      {/* Quick stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Клубтар", value: memberships?.length ?? 0, icon: Users, href: "/clubs", color: "text-blue-600 bg-blue-50" },
          { label: "Трекерлер", value: totalTrackerCount ?? 0, icon: BookMarked, href: "/tracker", color: "text-primary-600 bg-primary-50" },
          { label: "Талқылар", value: upcomingMeetings?.length ?? 0, icon: Calendar, href: "/clubs", color: "text-yellow-600 bg-yellow-50" },
          { label: "Ұпай", value: stats.total, icon: Star, href: "/profile", color: "text-purple-600 bg-purple-50" },
        ].map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} href={href} className="card hover:border-primary-200 transition">
            <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl ${color}`}>
              <Icon size={18} />
            </div>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </Link>
        ))}
      </div>

      {isFacilitatorWithClubs ? (
        /* ── ЖҮРГІЗУШІ: трекерлер сол, клубтар оң ── */
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Трекерлер */}
          <section>
            <div className="section-title">
              <h2>Белсенді трекерлер</h2>
              <Link href="/tracker/new" className="btn-primary py-1.5 px-3 text-xs">
                <Plus size={14} /> Жаңа
              </Link>
            </div>
            {inProgressTrackers.length > 0 ? (
              <div className="space-y-3">
                {inProgressTrackers.map((t) => <TrackerCard key={t.id} t={t as BookTracker} />)}
                <Link href="/tracker" className="text-sm text-primary-600 hover:underline">Барлығын көру →</Link>
              </div>
            ) : (
              <div className="card text-center py-8 text-gray-500 text-sm">
                Оқылып жатқан кітап жоқ.{" "}
                <Link href="/tracker/new" className="text-primary-600 hover:underline">Трекер жасаңыз</Link>
              </div>
            )}
          </section>

          {/* Менің клубтарым */}
          <section>
            <div className="section-title">
              <h2>Менің клубтарым</h2>
              <Link href="/clubs/new" className="btn-primary py-1.5 px-3 text-xs">
                <Plus size={14} /> Клуб жасау
              </Link>
            </div>
            <div className="space-y-3">
              {(managedClubs as any[]).map((c) => (
                <Link key={c.id} href={`/clubs/${c.id}`} className="card block hover:border-primary-200 transition">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{c.name}</p>
                    <span className="badge-green">{c.club_members?.[0]?.count ?? 0} оқырман</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      ) : (
        /* ── ОҚЫРМАН: келесі талқы жоғарыда, трекерлер төменде ── */
        <div className="space-y-5">
          {/* Келесі талқы / Клубтар CTA */}
          <section>
            {clubIds.length === 0 ? (
              <>
                <div className="section-title">
                  <h2>Клубтар</h2>
                  <Link href="/clubs" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                    Толығырақ →
                  </Link>
                </div>
                <Link href="/clubs" className="card flex items-center gap-4 hover:border-primary-200 transition">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100">
                    <Users size={20} className="text-primary-600" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Клубқа тіркеліп, кітап талдайтын орта табыңыз
                  </p>
                </Link>
              </>
            ) : (
              <>
                <div className="section-title">
                  <h2>Келесі талқы</h2>
                  <Link href="/meetings" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                    Толығырақ →
                  </Link>
                </div>
                {upcomingMeetings && upcomingMeetings.length > 0 ? (
                  <div className="space-y-3">
                    {(upcomingMeetings as any[]).map((plan) => (
                      <MeetingCard key={plan.id} plan={plan} />
                    ))}
                  </div>
                ) : (
                  <div className="card text-center py-6 text-gray-500 text-sm">
                    Алдағы талқы жоспарланбаған
                  </div>
                )}
              </>
            )}
          </section>

          {/* Белсенді трекерлер — тек оқылып жатқандар */}
          <section>
            <div className="section-title">
              <h2>Белсенді трекерлер</h2>
              <Link href="/tracker/new" className="btn-primary py-1.5 px-3 text-xs">
                <Plus size={14} /> Жаңа
              </Link>
            </div>
            {inProgressTrackers.length > 0 ? (
              <div className="space-y-3">
                {inProgressTrackers.map((t) => <TrackerCard key={t.id} t={t as BookTracker} />)}
                <Link href="/tracker" className="text-sm text-primary-600 hover:underline">Барлығын көру →</Link>
              </div>
            ) : (
              <div className="card text-center py-8 text-gray-500 text-sm">
                Оқылып жатқан кітап жоқ.{" "}
                <Link href="/tracker/new" className="text-primary-600 hover:underline">Трекер жасаңыз</Link>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Клубтардағы соңғы белсенділік */}
      {recentActivity && recentActivity.length > 0 && (
        <section className="mt-5">
          <div className="section-title">
            <h2>Клубтарда не болып жатыр</h2>
          </div>
          <div className="space-y-2">
            {(recentActivity as any[]).map((a) => {
              const isReply = Boolean(a.parent_id);
              const bookTitle = a.club_plans?.books?.title;
              return (
                <Link
                  key={a.id}
                  href={`/analysis/${a.parent_id ?? a.id}`}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 transition hover:border-primary-200 hover:shadow-sm"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                    <MessageSquare size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm text-gray-900">
                      <span className="font-semibold">{a.profiles?.name ?? "Оқырман"}</span>{" "}
                      {isReply ? "пікір қалдырды" : `«${a.title}» талқысын ашты`}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {a.clubs?.name}
                      {bookTitle && ` · ${bookTitle}`}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
