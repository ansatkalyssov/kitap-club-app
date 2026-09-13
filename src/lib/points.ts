import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { kzDateStr, addDays, calcReadingStreak } from "@/lib/utils";

// =============================================
// Ұпай ережелері
// =============================================
// Ұпай журналға (point_events) жазылады. Жазуды тек сервер service_role
// кілтімен істейді — клиенттің RLS-те INSERT рұқсаты жоқ, әйтпесе кез
// келген қолданушы браузерден өзіне ұпай қоса алар еді.

export const DAILY_CAP = 150;

type Period = "day" | "week" | "all";

type Rule = {
  points: number;
  /** Күндік 150 шегіне кіре ме */
  capped: boolean;
  /** Клуб айлық рейтингіне қосыла ма */
  countsForClub: boolean;
  /** Осы кодтың бір кезеңде неше рет төленуі */
  limit?: { count: number; period: Period };
};

export const POINT_RULES = {
  // Күнделікті — күніне 150-мен шектелген
  daily_goal: { points: 10, capped: true, countsForClub: true, limit: { count: 1, period: "day" } },
  tracker_progress: { points: 2, capped: true, countsForClub: true, limit: { count: 3, period: "day" } },
  // Ескертпе — прогресс белгілеудің үстіндегі ерікті әрекет. Күніне бір
  // рет: әйтпесе бірнеше трекері бар адам бірдей жазып, ұпай жинар еді.
  progress_note: { points: 3, capped: true, countsForClub: true, limit: { count: 1, period: "day" } },
  analysis_write: { points: 15, capped: true, countsForClub: true, limit: { count: 1, period: "week" } },
  // Жауап беру мен жауап алу үшін ұпай берілмейді. Жауапта ұзындық
  // шегі болмағандықтан, «иә», «келісемін» деп жазу ең арзан ұпай
  // көзіне айналатын еді — оқығаннан гөрі тиімді.

  // Оқиға — шектен тыс, бірақ әрқайсысының өз қақпасы бар.
  //
  // Кітап бітіру екі бөліктен тұрады: тұрақты бөлік әрқашан беріледі,
  // ал бонус прогресс жеткілікті күні енгізілсе қосылады. Екеуінің де
  // саны кітаптың бет санына қарай өзгереді — BOOK_TIERS-ті қараңыз.
  // Күніне бір кітаптан артық есептелмейді.
  book_done: { points: 10, capped: false, countsForClub: true, limit: { count: 1, period: "day" } },
  book_done_bonus: { points: 20, capped: false, countsForClub: true, limit: { count: 1, period: "day" } },
  // Ескі жазбалар үшін қалдырылған — енді берілмейді
  book_done_medium: { points: 40, capped: false, countsForClub: true },
  book_done_long: { points: 50, capped: false, countsForClub: true },
  club_book_ontime: { points: 50, capped: false, countsForClub: true },
  // Тек ең бірінші клубқа тіркелгені үшін. Бұрын үшеуіне дейін берілетін
  // де, ұпай үшін бірнеше клубқа кіріп шығуға түрткі болатын.
  club_join: { points: 25, capped: false, countsForClub: false, limit: { count: 1, period: "all" } },

  // Streak
  streak_week: { points: 25, capped: false, countsForClub: true },
  streak_7: { points: 50, capped: false, countsForClub: true },
  streak_30: { points: 250, capped: false, countsForClub: true },
  streak_100: { points: 1000, capped: false, countsForClub: true },
  streak_365: { points: 5000, capped: false, countsForClub: true },
} satisfies Record<string, Rule>;

export type PointCode = keyof typeof POINT_RULES;

/**
 * Оқырманға көрсетілетін атаулар. Админ панеліндегі қысқа белгілерден
 * бөлек: мұнда адамның не істегені айтылады.
 */
export const POINT_LABELS: Record<string, string> = {
  daily_goal: "Күндік мақсатты орындадыңыз",
  tracker_progress: "Трекерге прогресс енгіздіңіз",
  progress_note: "Ескертпе жаздыңыз",
  analysis_write: "Талқыға пікір жаздыңыз",
  analysis_reply: "Пікірге жауап бердіңіз",
  analysis_got_reply: "Пікіріңізге жауап келді",
  book_done: "Кітапты оқып бітірдіңіз",
  book_done_bonus: "Күн сайын оқығаныңыз үшін бонус",
  book_done_medium: "Кітаптың көлемі үшін бонус",
  book_done_long: "Кітаптың көлемі үшін бонус",
  club_book_ontime: "Клуб кітабын мерзімінде бітірдіңіз",
  club_join: "Клубқа тіркелдіңіз",
  streak_week: "Бір апта қатарынан оқыдыңыз",
  streak_7: "7 күн қатарынан оқыдыңыз",
  streak_30: "30 күн қатарынан оқыдыңыз",
  streak_100: "100 күн қатарынан оқыдыңыз",
  streak_365: "365 күн қатарынан оқыдыңыз",
};

/**
 * Кітап бітіргендегі марапат — бет санына қарай.
 *
 * `base` әрқашан беріледі: бұрын үш күндік жасырын қақпа тұрған да,
 * кітапты тез оқыған адам мүлдем ұпайсыз қалатын әрі себебін
 * білмейтін. Енді қақпа қабырға емес, бонус: жайлап, бірнеше күнде
 * оқыса — үстіне қосылады.
 */
export const BOOK_TIERS = [
  { minPages: 500, base: 50, days: 10, bonus: 100 },
  { minPages: 300, base: 40, days: 7, bonus: 70 },
  { minPages: 200, base: 30, days: 5, bonus: 50 },
  { minPages: 100, base: 20, days: 3, bonus: 30 },
  { minPages: 0, base: 10, days: 2, bonus: 20 },
] as const;

export function bookTier(pages: number) {
  return BOOK_TIERS.find((t) => pages >= t.minPages) ?? BOOK_TIERS[BOOK_TIERS.length - 1];
}

// =============================================
// Негізгі беру функциясы
// =============================================

/**
 * Ұпай береді. Идемпоттық: (user_id, code, ref_id) бірегей индексі бар,
 * сондықтан бір оқиға екі рет төленбейді — қайта шақыру қауіпсіз.
 *
 * @returns нақты берілген ұпай (шек толса 0 болуы мүмкін)
 */
export async function awardPoints(
  userId: string,
  code: PointCode,
  refId: string,
  /** Ереженің орнына нақты сан. Кітап бітіру бет санына қарай өзгереді. */
  amount?: number
): Promise<number> {
  const rule: Rule = POINT_RULES[code];
  const admin = createAdminClient();
  const today = kzDateStr();

  // 1. Кезеңдік шектеу (мыс. аптасына 3 талдау)
  if (rule.limit) {
    const used = await countInPeriod(userId, code, today, rule.limit.period);
    if (used >= rule.limit.count) return 0;
  }

  // 2. Күндік шек
  let points = amount ?? rule.points;
  if (rule.capped) {
    const usedToday = await sumCappedToday(userId, today);
    const remaining = DAILY_CAP - usedToday;
    if (remaining <= 0) return 0;
    points = Math.min(points, remaining);
  }

  // 3. Жазу. Бірегей индекс бұзылса (23505) — бұл оқиға бұрын төленген,
  //    қате емес, тыныш өтеміз.
  const { error } = await admin.from("point_events").insert({
    user_id: userId,
    code,
    points,
    ref_id: refId,
    event_date: today,
    capped: rule.capped,
    counts_for_club: rule.countsForClub,
  });

  if (error) {
    if (error.code === "23505") return 0;
    throw error;
  }

  return points;
}

async function countInPeriod(
  userId: string,
  code: PointCode,
  today: string,
  period: Period
): Promise<number> {
  const admin = createAdminClient();
  let q = admin
    .from("point_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("code", code);

  if (period === "day") q = q.eq("event_date", today);
  else if (period === "week") q = q.gte("event_date", addDays(today, -6));

  const { count } = await q;
  return count ?? 0;
}

async function sumCappedToday(userId: string, today: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("point_events")
    .select("points")
    .eq("user_id", userId)
    .eq("event_date", today)
    .eq("capped", true);

  return (data ?? []).reduce((sum, r) => sum + r.points, 0);
}

// =============================================
// Оқиға деңгейіндегі функциялар
// =============================================

/** Күндік мақсат орындалды ма — тексеріп, орындалса ұпай береді */
export async function onReadingLogged(userId: string): Promise<number> {
  const admin = createAdminClient();
  const today = kzDateStr();

  const [{ data: goal }, { data: log }] = await Promise.all([
    admin.from("reading_goals").select("daily_minutes").eq("user_id", userId).maybeSingle(),
    admin.from("reading_logs").select("minutes_read").eq("user_id", userId).eq("date", today).maybeSingle(),
  ]);

  const target = goal?.daily_minutes ?? 0;
  if (!target || !log || log.minutes_read < target) return 0;

  const earned = await awardPoints(userId, "daily_goal", today);
  const streakEarned = await syncStreak(userId);
  return earned + streakEarned;
}

/**
 * Трекерге прогресс енгізілді.
 * Клиенттің сөзіне сенбейміз — трекердің иесі және бүгінгі прогресс
 * жазбасының бар-жоғы дерекқордан тексеріледі.
 */
export async function onTrackerProgress(userId: string, trackerId: string): Promise<number> {
  const admin = createAdminClient();
  const today = kzDateStr();

  const { data: tracker } = await admin
    .from("book_trackers")
    .select("user_id")
    .eq("id", trackerId)
    .single();

  if (!tracker || tracker.user_id !== userId) return 0;

  const { data: todayRows } = await admin
    .from("reading_progress")
    .select("note")
    .eq("tracker_id", trackerId)
    .eq("date", today);

  if (!todayRows?.length) return 0;

  let total = await awardPoints(userId, "tracker_progress", `${trackerId}:${today}`);

  // Ескертпе жазғаны үшін — күніне бір рет. ref_id күнге байланған,
  // сондықтан жазбаны қайта сақтаса да екінші рет төленбейді.
  if (todayRows.some((r) => (r.note ?? "").trim().length > 0)) {
    total += await awardPoints(userId, "progress_note", today);
  }

  return total;
}

/**
 * Кітап аяқталды. Қақпалар:
 *   - трекер жасалғаннан кейін ≥3 күн өтуі керек
 *   - прогресс кемінде N бөлек күні енгізілуі керек (бет санына қарай)
 * Бір отырыста трекер ашып "бітірдім" басу ұпай әкелмейді.
 */
export type BookDoneResult = {
  points: number;
  /** Бүгін бір кітап бітіріп қойған — ұпай берілмеді */
  dailyLimit?: boolean;
  /** Прогресс енгізілген бөлек күндер саны */
  days?: number;
  /** Бонус алу үшін қажет күн саны */
  needDays?: number;
};

export async function onBookCompleted(
  userId: string,
  trackerId: string
): Promise<BookDoneResult> {
  const admin = createAdminClient();

  const { data: tracker } = await admin
    .from("book_trackers")
    .select("id, user_id, total_pages, deadline, club_plan_id, created_at, is_completed")
    .eq("id", trackerId)
    .single();

  if (!tracker || tracker.user_id !== userId) return { points: 0 };
  // Кітап шынымен аяқталған күйде тұруы керек
  if (!tracker.is_completed) return { points: 0 };

  // Күніне бір кітап. Бұны алдын ала тексереміз, себебі оқырманға
  // «неге ұпай келмеді» дегенді айту керек — үнсіз нөл қайтару
  // бұрынғы жасырын қақпалармен бірдей болып қалар еді.
  const doneToday = await countInPeriod(userId, "book_done", kzDateStr(), "day");
  if (doneToday >= 1) return { points: 0, dailyLimit: true };

  const pages = tracker.total_pages ?? 0;
  const tier = bookTier(pages);

  const { data: progress } = await admin
    .from("reading_progress")
    .select("date")
    .eq("tracker_id", trackerId);

  const distinctDays = new Set((progress ?? []).map((p) => p.date)).size;

  // Тұрақты бөлік — әрқашан
  let total = await awardPoints(userId, "book_done", trackerId, tier.base);

  // Бонус — прогресс жеткілікті күні енгізілсе
  if (distinctDays >= tier.days) {
    total += await awardPoints(userId, "book_done_bonus", trackerId, tier.bonus);
  }

  // Клуб кітабын дедлайнға дейін бітіру
  if (tracker.club_plan_id && tracker.deadline && kzDateStr() <= tracker.deadline) {
    total += await awardPoints(userId, "club_book_ontime", trackerId);
  }

  return { points: total, days: distinctDays, needDays: tier.days };
}

/** Талдау ұпайы берілу үшін мазмұнның ең аз ұзындығы */
export const MIN_ANALYSIS_LENGTH = 150;

/**
 * Пікір немесе жауап жазылды.
 * Жазбаның авторы, түрі (жіп па, жауап па) және ата-пікірдің авторы —
 * бәрі дерекқордан алынады, клиенттен емес.
 */
export async function onAnalysisCreated(userId: string, analysisId: string): Promise<number> {
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("book_analyses")
    .select("id, author_id, parent_id, content")
    .eq("id", analysisId)
    .single();

  if (!row || row.author_id !== userId) return 0;

  // Жауап үшін ұпай берілмейді
  if (row.parent_id) return 0;

  // Толық талдау — мазмұн шегі
  if ((row.content ?? "").trim().length < MIN_ANALYSIS_LENGTH) return 0;

  return awardPoints(userId, "analysis_write", analysisId);
}

/** Клубқа қосылды — мүшелік жазбасы шынымен бар ма, тексеріледі */
export async function onClubJoined(userId: string, clubId: string): Promise<number> {
  const admin = createAdminClient();

  const { count } = await admin
    .from("club_members")
    .select("*", { count: "exact", head: true })
    .eq("club_id", clubId)
    .eq("user_id", userId);

  if (!count) return 0;

  return awardPoints(userId, "club_join", clubId);
}

// =============================================
// Streak
// =============================================

/**
 * Ағымдағы streak-ті есептеп, әлі төленбеген марапаттарды береді.
 * Идемпоттық ref_id арқылы қамтамасыз етіледі, сондықтан күніне
 * бірнеше рет шақырса да артық ұпай кетпейді.
 */
export async function syncStreak(userId: string): Promise<number> {
  const admin = createAdminClient();

  const [{ data: goal }, { data: logs }] = await Promise.all([
    admin.from("reading_goals").select("daily_minutes").eq("user_id", userId).maybeSingle(),
    admin
      .from("reading_logs")
      .select("date, minutes_read")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(400),
  ]);

  const target = goal?.daily_minutes ?? 0;
  if (!target) return 0;

  const streak = calcReadingStreak(logs ?? [], target);
  if (streak < 7) return 0;

  let total = 0;

  // Қайталанатын қабат: әр 7 күн сайын. ref_id — тізбек толған күн,
  // сондықтан тізбек үзіліп қайта басталса, қайтадан төленеді.
  if (streak % 7 === 0) {
    total += await awardPoints(userId, "streak_week", kzDateStr());
  }

  // Бір реттік межелер: ref_id = 'once' — өмірде бір рет
  const milestones: [number, PointCode][] = [
    [7, "streak_7"],
    [30, "streak_30"],
    [100, "streak_100"],
    [365, "streak_365"],
  ];
  for (const [days, code] of milestones) {
    if (streak >= days) {
      total += await awardPoints(userId, code, "once");
    }
  }

  return total;
}

// =============================================
// Оқу
// =============================================

export async function getPointsTotal(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin.from("point_events").select("points").eq("user_id", userId);
  return (data ?? []).reduce((sum, r) => sum + r.points, 0);
}

export type PointEntry = {
  id: string;
  code: string;
  label: string;
  points: number;
  date: string;
};

/**
 * Оқырманның ұпай тарихы — «не үшін ұпай алдым» деген сұраққа жауап.
 * Жаңасынан ескісіне қарай.
 */
export async function getPointHistory(
  userId: string,
  limit = 30
): Promise<PointEntry[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("point_events")
    .select("id, code, points, event_date, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((e) => ({
    id: e.id,
    code: e.code,
    label: POINT_LABELS[e.code] ?? e.code,
    points: e.points,
    date: e.event_date,
  }));
}

export type UserStats = {
  total: number;
  monthPoints: number;
  streak: number;
  level: Level;
  nextLevel: Level | null;
};

/** Профильде көрсетілетін жеке көрсеткіштер */
export async function getUserStats(userId: string, monthStart: string): Promise<UserStats> {
  const admin = createAdminClient();

  const [{ data: events }, { data: goal }, { data: logs }] = await Promise.all([
    admin.from("point_events").select("points, event_date").eq("user_id", userId),
    admin.from("reading_goals").select("daily_minutes").eq("user_id", userId).maybeSingle(),
    admin
      .from("reading_logs")
      .select("date, minutes_read")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(400),
  ]);

  const rows = events ?? [];
  const total = rows.reduce((s, r) => s + r.points, 0);
  const monthPoints = rows
    .filter((r) => r.event_date >= monthStart)
    .reduce((s, r) => s + r.points, 0);

  const streak = calcReadingStreak(logs ?? [], goal?.daily_minutes ?? 0);
  const { current, next } = levelFor(total);

  return { total, monthPoints, streak, level: current, nextLevel: next };
}

export type ReaderRow = {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  role: string;
  total_points: number;
  finished_books: number;
  active_books: number;
  clubs: number;
  current_book: string | null;
  current_author: string | null;
  current_cover: string | null;
  current_progress: number | null;
};

/**
 * Барлық оқырман — кім не оқып жатқанымен.
 * SECURITY DEFINER функциясы тек рұқсат етілген өрістерді қайтарады:
 * жеке ескертпелер мен күнделікті журнал сұрауға кірмейді.
 */
export async function getReaders(): Promise<ReaderRow[]> {
  // Қолданушы клиентімен шақырылады: функция ішінде auth.uid() тексеріледі,
  // ал service_role кілтінде ол бос болады да, ештеңе қайтпайды.
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("readers_directory");
  if (error) return [];

  // Функцияда да ORDER BY бар, бірақ PostgreSQL оны сыртқы сұрауда
  // сақтауға кепілдік бермейді — сондықтан ретті осында бекітеміз.
  return ((data ?? []) as ReaderRow[]).sort(
    (a, b) =>
      b.total_points - a.total_points ||
      b.finished_books - a.finished_books ||
      (a.name ?? "").localeCompare(b.name ?? "")
  );
}

export type ReaderBook = {
  tracker_id: string;
  book_title: string;
  book_author: string | null;
  cover_url: string | null;
  total_pages: number;
  current_page: number;
  progress: number;
  is_completed: boolean;
  deadline: string | null;
  club_name: string | null;
};

/** Бір оқырманның сөресі — оқыған және оқып жатқан кітаптары */
export async function getReaderBooks(userId: string): Promise<ReaderBook[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("reader_books", { target: userId });
  if (error) return [];
  return (data ?? []) as ReaderBook[];
}

export type ClubReader = {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  total_points: number;
  finished_books: number;
};

/** Клуб мүшелері — жалпы ұпай бойынша сұрыпталған */
export async function getClubReaders(clubId: string): Promise<ClubReader[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("club_readers", { target_club: clubId });
  if (error) return [];

  return ((data ?? []) as ClubReader[]).sort(
    (a, b) =>
      b.total_points - a.total_points ||
      b.finished_books - a.finished_books ||
      (a.name ?? "").localeCompare(b.name ?? "")
  );
}

export type ClubRankRow = {
  club_id: string;
  club_name: string;
  emblem_url: string | null;
  member_count: number;
  total_points: number;
  avg_points: number;
};

/**
 * Клубтардың айлық рейтингі.
 * RLS басқа адамның ұпайын оқуға жол бермейді, сондықтан жиынтық
 * SECURITY DEFINER функциясы арқылы алынады — жеке ұпайлар сыртқа шықпайды.
 */
export async function getClubLeaderboard(start: string, end: string): Promise<ClubRankRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("club_leaderboard", {
    period_start: start,
    period_end: end,
  });
  if (error) return [];
  return (data ?? []) as ClubRankRow[];
}

export type Level = { name: string; min: number };

export const LEVELS: Level[] = [
  { name: "Оқырман", min: 0 },
  { name: "Кітапқұмар", min: 500 },
  { name: "Білгір", min: 2000 },
  { name: "Абыз", min: 6000 },
  { name: "Шежіреші", min: 15000 },
];

export function levelFor(points: number): { current: Level; next: Level | null } {
  let current = LEVELS[0];
  let next: Level | null = LEVELS[1] ?? null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (points >= LEVELS[i].min) {
      current = LEVELS[i];
      next = LEVELS[i + 1] ?? null;
    }
  }
  return { current, next };
}
