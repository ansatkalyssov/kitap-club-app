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
  analysis_write: { points: 60, capped: true, countsForClub: true, limit: { count: 3, period: "week" } },
  analysis_reply: { points: 15, capped: true, countsForClub: true, limit: { count: 3, period: "day" } },
  analysis_got_reply: { points: 10, capped: true, countsForClub: true, limit: { count: 5, period: "day" } },

  // Оқиға — шектен тыс, бірақ әрқайсысының өз қақпасы бар
  book_done: { points: 60, capped: false, countsForClub: true },
  book_done_medium: { points: 40, capped: false, countsForClub: true },
  book_done_long: { points: 50, capped: false, countsForClub: true },
  club_book_ontime: { points: 50, capped: false, countsForClub: true },
  club_join: { points: 25, capped: false, countsForClub: false, limit: { count: 3, period: "all" } },

  // Streak
  streak_week: { points: 25, capped: false, countsForClub: true },
  streak_7: { points: 50, capped: false, countsForClub: true },
  streak_30: { points: 250, capped: false, countsForClub: true },
  streak_100: { points: 1000, capped: false, countsForClub: true },
  streak_365: { points: 5000, capped: false, countsForClub: true },
} satisfies Record<string, Rule>;

export type PointCode = keyof typeof POINT_RULES;

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
  refId: string
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
  let points = rule.points;
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

  const { count } = await admin
    .from("reading_progress")
    .select("*", { count: "exact", head: true })
    .eq("tracker_id", trackerId)
    .eq("date", today);

  if (!count) return 0;

  return awardPoints(userId, "tracker_progress", `${trackerId}:${today}`);
}

/**
 * Кітап аяқталды. Қақпалар:
 *   - трекер жасалғаннан кейін ≥3 күн өтуі керек
 *   - прогресс кемінде N бөлек күні енгізілуі керек (бет санына қарай)
 * Бір отырыста трекер ашып "бітірдім" басу ұпай әкелмейді.
 */
export async function onBookCompleted(userId: string, trackerId: string): Promise<number> {
  const admin = createAdminClient();

  const { data: tracker } = await admin
    .from("book_trackers")
    .select("id, user_id, total_pages, deadline, club_plan_id, created_at, is_completed")
    .eq("id", trackerId)
    .single();

  if (!tracker || tracker.user_id !== userId) return 0;
  // Кітап шынымен аяқталған күйде тұруы керек
  if (!tracker.is_completed) return 0;

  // Трекердің жасы
  const ageDays = Math.floor(
    (Date.now() - new Date(tracker.created_at).getTime()) / 86_400_000
  );
  if (ageDays < 3) return 0;

  // Прогресс енгізілген бөлек күндер саны
  const { data: progress } = await admin
    .from("reading_progress")
    .select("date")
    .eq("tracker_id", trackerId);

  const distinctDays = new Set((progress ?? []).map((p) => p.date)).size;
  if (distinctDays < 3) return 0;

  let total = await awardPoints(userId, "book_done", trackerId);

  const pages = tracker.total_pages ?? 0;
  if (pages >= 200 && distinctDays >= 5) {
    total += await awardPoints(userId, "book_done_medium", trackerId);
  }
  if (pages >= 400 && distinctDays >= 7) {
    total += await awardPoints(userId, "book_done_long", trackerId);
  }

  // Клуб кітабын дедлайнға дейін бітіру
  if (tracker.club_plan_id && tracker.deadline && kzDateStr() <= tracker.deadline) {
    total += await awardPoints(userId, "club_book_ontime", trackerId);
  }

  return total;
}

/** Талдау ұпайы берілу үшін мазмұнның ең аз ұзындығы */
export const MIN_ANALYSIS_LENGTH = 200;

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

  const isReply = Boolean(row.parent_id);

  if (isReply) {
    const total = await awardPoints(userId, "analysis_reply", analysisId);

    const { data: parent } = await admin
      .from("book_analyses")
      .select("author_id")
      .eq("id", row.parent_id)
      .single();

    // Өзіңе өзің жауап берсең — бонус жоқ
    if (parent?.author_id && parent.author_id !== userId) {
      await awardPoints(parent.author_id, "analysis_got_reply", analysisId);
    }
    return total;
  }

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
