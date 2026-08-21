import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/queries";
import Link from "next/link";
import Image from "next/image";
import { Users, BookMarked, Plus, TrendingUp, Calendar } from "lucide-react";
import PushSubscribe from "@/components/PushSubscribe";
import ProgressBar from "@/components/ui/ProgressBar";
import { calcProgress, daysUntil, formatDateKz } from "@/lib/utils";
import { BookTracker } from "@/lib/types";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // Parallel: trackers + memberships + managedClubs
  const [{ data: trackers }, { data: memberships }, { data: managedClubs }] = await Promise.all([
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
  ]);

  // Алдағы талқылар (depends on memberships)
  const clubIds = memberships?.map((m) => m.club_id) || [];
  const { data: upcomingMeetings } = clubIds.length
    ? await supabase
        .from("club_plans")
        .select("id, meeting_date, meeting_location, books(title), clubs(id, name)")
        .in("club_id", clubIds)
        .gte("meeting_date", today)
        .order("meeting_date", { ascending: true })
        .limit(1)
    : { data: null };

  // Нақты оқылып жатқан трекерлер (current_page > 0)
  const inProgressTrackers = (trackers || []).filter((t) => t.current_page > 0);

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
      <Link
        href={`/clubs/${plan.clubs?.id}`}
        className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:border-primary-200 hover:shadow-md transition"
      >
        <div className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-xl py-2 ${isClose ? "bg-primary-600 text-white" : "bg-primary-50 text-primary-700"}`}>
          <span className="text-2xl font-extrabold leading-none">{day}</span>
          <span className="mt-0.5 text-xs font-medium tracking-wide">{month}</span>
          <span className={`mt-1 text-[10px] ${isClose ? "text-primary-100" : "text-primary-400"}`}>{weekday}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 line-clamp-1">
            {plan.books?.title ?? "Кітап белгіленбеген"}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">{plan.clubs?.name}</p>
          {plan.meeting_location && (
            <p className="mt-1 text-xs text-primary-600">📍 {plan.meeting_location}</p>
          )}
        </div>
        <span className={`shrink-0 text-xs font-semibold ${isClose ? "text-yellow-600" : "text-gray-400"}`}>
          {diffDays === 0 ? "Бүгін!" : diffDays === 1 ? "Ертең" : `${diffDays} күн`}
        </span>
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

      {/* Quick stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Клубтар", value: memberships?.length ?? 0, icon: Users, href: "/clubs", color: "text-blue-600 bg-blue-50" },
          { label: "Активті трекер", value: trackers?.length ?? 0, icon: BookMarked, href: "/tracker", color: "text-primary-600 bg-primary-50" },
          { label: "Талқылар", value: upcomingMeetings?.length ?? 0, icon: Calendar, href: "/clubs", color: "text-yellow-600 bg-yellow-50" },
          {
            label: "Прогрес",
            value: inProgressTrackers.length ? `${calcProgress(inProgressTrackers[0].current_page, inProgressTrackers[0].total_pages)}%` : "—",
            icon: TrendingUp,
            href: "/tracker",
            color: "text-purple-600 bg-purple-50",
          },
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
                    <span className="badge-green">{c.club_members?.[0]?.count ?? 0} мүше</span>
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
    </div>
  );
}
