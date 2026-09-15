import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { BookOpen, Shield, LogOut } from "lucide-react";
import AdminTabs from "@/components/admin/AdminTabs";
import { getClubLeaderboard, levelFor } from "@/lib/points";
import { TOUR_STEPS, TOUR_VERSION } from "@/lib/tour";
import { monthBounds, kzDateStr, addDays } from "@/lib/utils";

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
    { data: progressRows },
    { data: goals },
    { data: pushSubs },
    { data: visits },
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
    // Дэшборд үшін: трекер прогресі тікелей user_id ұстамайды, трекер
    // арқылы байланады.
    adminDb.from("reading_progress").select("date, book_trackers(user_id)"),
    adminDb.from("reading_goals").select("user_id"),
    adminDb.from("push_subscriptions").select("user_id"),
    adminDb.from("user_visits").select("user_id, date").gte("date", addDays(today, -29)),
  ]);

  // Прогресті пайдаланушыға байлап аламыз
  const progress = (progressRows ?? [])
    .map((r: any) => ({ date: r.date as string, userId: r.book_trackers?.user_id as string }))
    .filter((r) => Boolean(r.userId));

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

  // ---------- Дэшборд ----------
  // «Белсенді» = із қалдырған адам. Қолданбада «кірді» деген оқиға
  // жазылмайтындықтан, қарап шыққандар бұл санға кірмейді.
  const dayKeys = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));

  const windowStart = dayKeys[0];

  const freqBuckets = [
    { label: "Мүлдем белсенді емес", min: 0, max: 0 },
    { label: "1 күн", min: 1, max: 1 },
    { label: "2–6 күн", min: 2, max: 6 },
    { label: "7–14 күн", min: 7, max: 14 },
    { label: "15 күн және одан көп", min: 15, max: 99 },
  ];

  /**
   * Дэшбордты берілген адамдар тобы бойынша есептейді.
   *
   * Бүкіл есеп осы функцияның ішінде тұр, себебі оны рөл бойынша бөліп
   * көрсету керек: жүргізушілердің әдеті оқырмандардікінен мүлдем бөлек,
   * ал екеуін араластырса көрсеткіш бұлыңғыр болып шығады.
   */
  const buildAnalytics = (people: any[]) => {
    const scope = new Set(people.map((p) => p.id));
    const mine = (id: string | null | undefined) => Boolean(id && scope.has(id));

    const activeByDay = new Map<string, Set<string>>(dayKeys.map((d) => [d, new Set<string>()]));
    const touch = (date: string | null | undefined, userId: string) => {
      if (!date || !mine(userId)) return;
      const d = date.slice(0, 10);
      activeByDay.get(d)?.add(userId);
    };
    (logs ?? []).forEach((l) => touch(l.date, l.user_id));
    (progress ?? []).forEach((p) => touch(p.date, p.userId));
    // club_join — тіркелу белгісі, әрекет емес. Оны қосса, клубқа кірген
    // әркім автоматты «белсенді» болып шығады да, көрсеткіш мағынасын
    // жоғалтады: барлық клубта 100% көрінетін.
    (events ?? [])
      .filter((e) => e.code !== "club_join")
      .forEach((e) => touch(e.event_date, e.user_id));
    (analyses ?? []).forEach((a) => touch(a.created_at, a.author_id));

    const daysActiveByUser = new Map<string, number>();
    activeByDay.forEach((set) => {
      set.forEach((u) => daysActiveByUser.set(u, (daysActiveByUser.get(u) ?? 0) + 1));
    });

    // Әрекет түрлері бойынша — соңғы 30 күнде сол әрекетті жасаған адамдар
    const usersDoing = (rows: { u?: string | null; d?: string | null }[]) =>
      new Set(
        rows
          .filter((r) => mine(r.u) && r.d && r.d.slice(0, 10) >= windowStart)
          .map((r) => r.u as string)
      );

    const timerUsers = usersDoing((logs ?? []).map((l) => ({ u: l.user_id, d: l.date })));
    const progressUsers = usersDoing(progress.map((p) => ({ u: p.userId, d: p.date })));
    const doneUsers = usersDoing(
      (events ?? [])
        .filter((e) => e.code === "book_done")
        .map((e) => ({ u: e.user_id, d: e.event_date }))
    );
    const commentUsers = usersDoing(
      (analyses ?? []).map((a) => ({ u: a.author_id, d: a.created_at }))
    );
    const goalUsers = usersDoing(
      (events ?? [])
        .filter((e) => e.code === "daily_goal")
        .map((e) => ({ u: e.user_id, d: e.event_date }))
    );

    const activeSince = (from: string) =>
      new Set(
        dayKeys.filter((d) => d >= from).flatMap((d) => Array.from(activeByDay.get(d) ?? []))
      ).size;

    // Әрекет түрлері бойынша күнделікті график. Адам саны саналады, оқиға
    // саны емес: бір адам күніне бірнеше рет прогресс енгізсе де — бір.
    const timerByDay = new Map<string, Set<string>>(dayKeys.map((d) => [d, new Set<string>()]));
    (logs ?? []).forEach((l) => {
      if (mine(l.user_id)) timerByDay.get(l.date)?.add(l.user_id);
    });

    const progressByDay = new Map<string, Set<string>>(dayKeys.map((d) => [d, new Set<string>()]));
    progress.forEach((p) => {
      if (mine(p.userId)) progressByDay.get(p.date.slice(0, 10))?.add(p.userId);
    });

    const signupByDay = new Map<string, number>(dayKeys.map((d) => [d, 0]));
    people.forEach((p) => {
      const d = (p.created_at ?? "").slice(0, 10);
      if (signupByDay.has(d)) signupByDay.set(d, (signupByDay.get(d) ?? 0) + 1);
    });

    const only = (ids: (string | null | undefined)[]) =>
      new Set(ids.filter((id) => mine(id)) as string[]);

    const withClub = only((members ?? []).map((m) => m.user_id));
    const withGoal = only((goals ?? []).map((g) => g.user_id));
    const withTimer = only((logs ?? []).map((l) => l.user_id));
    const withProgress = only((progress ?? []).map((p) => p.userId));
    const withThread = only((analyses ?? []).map((a) => a.author_id));
    const withPush = only((pushSubs ?? []).map((s) => s.user_id));

    // Кіру белгісі. Баған жаңа қосылғандықтан, алғашқы күндері бос болады —
    // сол себепті график тек дерек пайда болғанда көрсетіледі.
    const myVisits = (visits ?? []).filter((v) => mine(v.user_id));
    const visitByDay = new Map<string, Set<string>>(dayKeys.map((d) => [d, new Set<string>()]));
    myVisits.forEach((v) => visitByDay.get(v.date)?.add(v.user_id));

    // Есеп басталған күн. Одан бұрынғы күндерді графикке қоспаймыз:
    // нөлдік бағандар «ешкім кірмеген» дегендей көрініп, жаңылыстырады.
    const visitStart = myVisits.reduce<string | null>(
      (min, v) => (!min || v.date < min ? v.date : min),
      null
    );
    const visitDays = visitStart ? dayKeys.filter((d) => d >= visitStart) : [];

    // Танысу туры.
    //
    // tour_version турдың қалай біткеніне қарамайды: соңына дейін өтсе де,
    // бірінші қадамда жауып кетсе де бірдей жазылады. Сондықтан «аяқтады»
    // деген санды жаңа tour_completed_at бағанынан аламыз. Ол бағандар
    // кейін қосылғандықтан, бұрын көріп қойғандар бөлек саналады.
    const tourStarted = people.filter((p) => p.tour_started_at).length;
    const tourFinished = people.filter((p) => p.tour_completed_at).length;
    const tourClosed = people.filter(
      (p) => p.tour_started_at && !p.tour_completed_at && (p.tour_version ?? 0) >= TOUR_VERSION
    ).length;

    // Қадам бойынша воронка: әр қадамға жеткен адам саны. Көрші екі жолдың
    // айырмасы — сол жерде тоқтап қалғандар.
    const tourTracked = people.filter((p) => p.tour_started_at);

    return {
      totalUsers: people.length,
      tour: {
        reach: TOUR_STEPS.map((s, i) => ({
          label: `${i + 1}. ${s.title} · ${s.path}`,
          count: tourTracked.filter((p) => (p.tour_last_step ?? 0) >= i).length,
        })),
        started: tourStarted,
        finished: tourFinished,
        closed: tourClosed,
        // Басталған, бірақ әлі жабылмаған да, аяқталмаған да емес —
        // адам турды ортасында тастап, бетті жауып кеткен
        dropped: Math.max(0, tourStarted - tourFinished - tourClosed),
        before: people.filter(
          (p) => !p.tour_started_at && (p.tour_version ?? 0) >= TOUR_VERSION
        ).length,
        notYet: people.filter((p) => (p.tour_version ?? 0) < TOUR_VERSION).length,
      },
      visitsToday: visitByDay.get(today)?.size ?? 0,
      hasVisitData: myVisits.length > 0,
      visits: visitDays.map((d) => ({ date: d, count: visitByDay.get(d)?.size ?? 0 })),
      visitStart,
      activeToday: activeByDay.get(today)?.size ?? 0,
      active7: activeSince(addDays(today, -6)),
      active30: activeSince(dayKeys[0]),
      noClub: people.length - withClub.size,
      pushUsers: withPush.size,
      daily: dayKeys.map((d) => ({ date: d, count: activeByDay.get(d)?.size ?? 0 })),
      timerDaily: dayKeys.map((d) => ({ date: d, count: timerByDay.get(d)?.size ?? 0 })),
      progressDaily: dayKeys.map((d) => ({ date: d, count: progressByDay.get(d)?.size ?? 0 })),
      signups: dayKeys.map((d) => ({ date: d, count: signupByDay.get(d) ?? 0 })),
      funnel: [
        { label: "Тіркелген", count: people.length },
        { label: "Клубқа кірген", count: withClub.size },
        { label: "Күнделікті мақсат қойған", count: withGoal.size },
        { label: "Хабарландыруға жазылған", count: withPush.size },
        { label: "Трекерге прогресс енгізген", count: withProgress.size },
        { label: "Таймерді қолданған", count: withTimer.size },
        { label: "Пікір жазған", count: withThread.size },
      ],
      frequency: freqBuckets.map((b) => ({
        label: b.label,
        count: people.filter((p) => {
          const n = daysActiveByUser.get(p.id) ?? 0;
          return n >= b.min && n <= b.max;
        }).length,
      })),
      noClubDetail: (() => {
        const inClub = new Set((members ?? []).map((m) => m.user_id));
        const soloTrackers = new Set(
          (trackers ?? []).filter((t) => !t.club_plan_id).map((t) => t.user_id)
        );
        const anyGoal = new Set((goals ?? []).map((g) => g.user_id));
        const anyTimer = new Set((logs ?? []).map((l) => l.user_id));
        const anyProgress = new Set(progress.map((p) => p.userId));
        const anyPush = new Set((pushSubs ?? []).map((s) => s.user_id));

        const outside = people.filter((p) => !inClub.has(p.id));
        const rows = outside
          .map((p) => ({
            name: p.name ?? p.email ?? "—",
            createdAt: p.created_at as string,
            goal: anyGoal.has(p.id),
            tracker: soloTrackers.has(p.id),
            timer: anyTimer.has(p.id),
            progress: anyProgress.has(p.id),
            push: anyPush.has(p.id),
          }))
          .map((r) => ({
            ...r,
            any: r.goal || r.tracker || r.timer || r.progress || r.push,
          }));

        return {
          total: outside.length,
          nothing: rows.filter((r) => !r.any).length,
          // Бірдеңе істегендер ғана — солармен сөйлесудің мәні бар
          rows: rows
            .filter((r) => r.any)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        };
      })(),

      clubs: (clubs ?? [])
        .filter((c) => c.is_active)
        .map((c) => {
          const ids = (members ?? [])
            .filter((m) => m.club_id === c.id && mine(m.user_id))
            .map((m) => m.user_id);
          const inSet = (s: Set<string>) => ids.filter((u) => s.has(u)).length;
          return {
            name: c.name,
            members: ids.length,
            active: ids.filter((u) => (daysActiveByUser.get(u) ?? 0) > 0).length,
            timer: inSet(timerUsers),
            progress: inSet(progressUsers),
            done: inSet(doneUsers),
            comment: inSet(commentUsers),
            goal: inSet(goalUsers),
          };
        })
        .sort((a, b) => b.members - a.members),
    };
  };

  // Жүргізушіге админ де кіреді: екеуі де клуб жүргізеді, әрі саны аз
  // болғандықтан бөлек көрсеткіштің мәні жоқ. Сонда екі топтың қосындысы
  // барлық тіркелгенге тең болып шығады.
  const isHost = (p: any) => p.role === "facilitator" || p.role === "admin";

  const analytics = {
    all: buildAnalytics(profiles ?? []),
    readers: buildAnalytics((profiles ?? []).filter((p) => !isHost(p))),
    hosts: buildAnalytics((profiles ?? []).filter(isHost)),
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
          analytics={analytics}
        />
      </div>
    </div>
  );
}
