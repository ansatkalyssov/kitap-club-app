import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { BookOpen, Shield, LogOut } from "lucide-react";
import AdminTabs from "@/components/admin/AdminTabs";
import { getClubLeaderboard, levelFor } from "@/lib/points";
import { monthBounds, kzDateStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function logoutAction() {
  "use server";
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
  redirect("/admin-login");
}

export default async function AdminPage() {
  const adminDb = createAdminClient();
  const today = kzDateStr();
  const { start, end, label: monthLabel } = monthBounds();

  const [
    { data: profiles },
    { data: clubs },
    { data: trackers },
    { data: analyses },
    { data: members },
    { data: plans },
    { data: events },
    { data: logs },
    rating,
  ] = await Promise.all([
    adminDb.from("profiles").select("*").order("created_at", { ascending: false }),
    adminDb.from("clubs").select("*, cities(name)").order("created_at", { ascending: false }),
    adminDb.from("book_trackers").select("id, user_id, is_completed, club_plan_id"),
    adminDb
      .from("book_analyses")
      .select("id, title, parent_id, author_id, club_id, club_plan_id, created_at")
      .order("created_at", { ascending: false }),
    adminDb.from("club_members").select("club_id, user_id"),
    adminDb.from("club_plans").select("id, club_id, book_id, meeting_date, books(title)"),
    adminDb
      .from("point_events")
      .select("id, user_id, code, points, event_date, created_at")
      .order("created_at", { ascending: false }),
    adminDb.from("reading_logs").select("user_id, date, minutes_read"),
    getClubLeaderboard(start, end),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const clubMap = new Map((clubs ?? []).map((c) => [c.id, c]));
  const planMap = new Map((plans ?? []).map((p) => [p.id, p]));

  // Ұпайды пайдаланушы бойынша жинақтау
  const pointsByUser = new Map<string, number>();
  const monthPointsByUser = new Map<string, number>();
  (events ?? []).forEach((e) => {
    pointsByUser.set(e.user_id, (pointsByUser.get(e.user_id) ?? 0) + e.points);
    if (e.event_date >= start) {
      monthPointsByUser.set(e.user_id, (monthPointsByUser.get(e.user_id) ?? 0) + e.points);
    }
  });

  // Соңғы белсенділік — streak есептеуден әлдеқайда арзан, әрі әкімге пайдалырақ
  const lastActive = new Map<string, string>();
  (logs ?? []).forEach((l) => {
    const cur = lastActive.get(l.user_id);
    if (!cur || l.date > cur) lastActive.set(l.user_id, l.date);
  });

  const clubsByUser = new Map<string, number>();
  const membersByClub = new Map<string, number>();
  (members ?? []).forEach((m) => {
    clubsByUser.set(m.user_id, (clubsByUser.get(m.user_id) ?? 0) + 1);
    membersByClub.set(m.club_id, (membersByClub.get(m.club_id) ?? 0) + 1);
  });

  const trackersByUser = new Map<string, { total: number; done: number }>();
  (trackers ?? []).forEach((t) => {
    const cur = trackersByUser.get(t.user_id) ?? { total: 0, done: 0 };
    cur.total++;
    if (t.is_completed) cur.done++;
    trackersByUser.set(t.user_id, cur);
  });

  const threadsAll = (analyses ?? []).filter((a) => !a.parent_id);
  const repliesAll = (analyses ?? []).filter((a) => a.parent_id);

  const replyCount = new Map<string, number>();
  repliesAll.forEach((r) => {
    if (r.parent_id) replyCount.set(r.parent_id, (replyCount.get(r.parent_id) ?? 0) + 1);
  });

  const threadsByClub = new Map<string, number>();
  threadsAll.forEach((t) => {
    if (t.club_id) threadsByClub.set(t.club_id, (threadsByClub.get(t.club_id) ?? 0) + 1);
  });

  const plansByClub = new Map<string, number>();
  (plans ?? []).forEach((p) => {
    if (p.club_id) plansByClub.set(p.club_id, (plansByClub.get(p.club_id) ?? 0) + 1);
  });

  // Клуб бойынша айлық ұпай — рейтингтен алынады
  const clubMonthPoints = new Map(rating.map((r) => [r.club_id, r.total_points]));

  const readers = (profiles ?? []).map((p) => {
    const tr = trackersByUser.get(p.id) ?? { total: 0, done: 0 };
    const points = pointsByUser.get(p.id) ?? 0;
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role,
      points,
      monthPoints: monthPointsByUser.get(p.id) ?? 0,
      level: levelFor(points).current.name,
      clubs: clubsByUser.get(p.id) ?? 0,
      trackers: tr.total,
      completed: tr.done,
      lastActive: lastActive.get(p.id) ?? null,
      createdAt: p.created_at,
    };
  });

  const facilitators = (profiles ?? [])
    .filter((p) => p.role === "facilitator" || p.role === "admin")
    .map((p) => {
      const own = (clubs ?? []).filter((c) => c.facilitator_id === p.id);
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        role: p.role,
        points: pointsByUser.get(p.id) ?? 0,
        clubs: own.map((c) => ({
          id: c.id,
          name: c.name,
          members: membersByClub.get(c.id) ?? 0,
          active: c.is_active,
        })),
      };
    });

  const clubRows = (clubs ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    city: (c.cities as any)?.name ?? null,
    facilitator: c.facilitator_id ? profileMap.get(c.facilitator_id)?.name ?? "—" : "—",
    members: membersByClub.get(c.id) ?? 0,
    plans: plansByClub.get(c.id) ?? 0,
    threads: threadsByClub.get(c.id) ?? 0,
    monthPoints: clubMonthPoints.get(c.id) ?? 0,
    active: c.is_active,
  }));

  const threadRows = threadsAll.slice(0, 100).map((t) => ({
    id: t.id,
    title: t.title,
    author: t.author_id ? profileMap.get(t.author_id)?.name ?? "—" : "—",
    club: t.club_id ? clubMap.get(t.club_id)?.name ?? "—" : "—",
    book: t.club_plan_id ? ((planMap.get(t.club_plan_id)?.books as any)?.title ?? "—") : "—",
    replies: replyCount.get(t.id) ?? 0,
    createdAt: t.created_at,
  }));

  const eventRows = (events ?? []).slice(0, 150).map((e) => ({
    id: e.id,
    user: profileMap.get(e.user_id)?.name ?? profileMap.get(e.user_id)?.email ?? "—",
    code: e.code,
    points: e.points,
    date: e.event_date,
  }));

  const stats = {
    users: profiles?.length ?? 0,
    readers: (profiles ?? []).filter((p) => p.role === "reader").length,
    facilitators: (profiles ?? []).filter((p) => p.role === "facilitator").length,
    admins: (profiles ?? []).filter((p) => p.role === "admin").length,
    clubs: (clubs ?? []).filter((c) => c.is_active).length,
    trackers: trackers?.length ?? 0,
    trackersDone: (trackers ?? []).filter((t) => t.is_completed).length,
    threads: threadsAll.length,
    replies: repliesAll.length,
    totalPoints: (events ?? []).reduce((s, e) => s + e.points, 0),
    monthPoints: (events ?? []).filter((e) => e.event_date >= start).reduce((s, e) => s + e.points, 0),
    activeToday: (logs ?? []).filter((l) => l.date === today).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-100 bg-white px-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
            <BookOpen size={16} className="text-white" />
          </div>
          <span className="text-sm font-bold text-primary-900">Oqyrman</span>
          <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
            Админ
          </span>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-gray-600 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={14} />
            Шығу
          </button>
        </form>
      </header>

      <div className="page-container">
        <div className="mb-6 flex items-center gap-3 pt-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1>Админ панелі</h1>
            <p className="text-sm text-gray-500">{monthLabel} · барлық дерек</p>
          </div>
        </div>

        <AdminTabs
          stats={stats}
          readers={readers}
          facilitators={facilitators}
          clubs={clubRows}
          threads={threadRows}
          rating={rating}
          events={eventRows}
          profiles={profiles ?? []}
        />
      </div>
    </div>
  );
}
