import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { kzDateStr, addDays } from "@/lib/utils";
import { levelFor } from "@/lib/points";
import { fetchAll } from "@/lib/supabase/fetchAll";

/**
 * Басты беттегі жаңалықтар лентасы.
 *
 * Екі қайнар көзі бар. Клубтағы жаңалықтар — оқырман тіркелген клубтарда
 * болған нәрселер, ол тек мүшелерге көрінеді. Oqyrman жаңалықтары —
 * бүкіл қолданба бойынша, оны бәрі көреді.
 *
 * Клубсыз оқырман (325-тің 132-сі) бұрын бұл жерде мүлдем ештеңе
 * көрмейтін. Енді ол жалпы лентаны көреді.
 */

export type FeedItem = {
  id: string;
  icon: string;
  /** Қалың жазылатын бөлігі — әдетте адамның немесе клубтың аты */
  lead: string;
  /** Қалған мәтін */
  rest: string;
  href: string;
  /** Сұрыптау үшін */
  at: string;
  /**
   * Оқиға қай клубқа қатысты. Жалпы лентадан оқырманның өз клубының
   * жаңалығын алып тастау үшін керек — ол клуб лентасында онсыз да бар.
   */
  clubId?: string;
};

/**
 * «кеше», «3 күн бұрын» — оқиғаның қашан болғаны.
 *
 * Жазбалар UTC-мен сақталады, ал күн Алматы уақытымен ауысады. Екеуін
 * араластырсақ, кешкі оқиға бір күн бұрынғы болып шығады — сондықтан
 * алдымен белдеуге келтіреміз.
 */
/**
 * Клубқа қосылғандарды бір оқиғаға жинайды.
 *
 * Бұрын күн бойынша топталатын, сондықтан бір клубқа бірнеше күн
 * қатарынан адам қосылса, лента сол бір хабармен толып кететін. Енді
 * бүкіл терезе бойынша бір жол шығады.
 */
function groupJoins(
  rows: { club_id: string; joined_at: string }[]
): { club: string; n: number; at: string; from: string }[] {
  const byClub = new Map<string, { n: number; at: string; from: string }>();
  rows.forEach((m) => {
    const cur = byClub.get(m.club_id);
    if (!cur) {
      byClub.set(m.club_id, { n: 1, at: m.joined_at, from: m.joined_at });
      return;
    }
    cur.n++;
    if (m.joined_at > cur.at) cur.at = m.joined_at;
    if (m.joined_at < cur.from) cur.from = m.joined_at;
  });

  return Array.from(byClub.entries()).map(([club, v]) => ({ club, ...v }));
}

/** «соңғы бір аптада», «соңғы екі аптада» — топталған оқиғаның мерзімі */
function spanLabel(from: string): string {
  const days = Math.round(
    (new Date(kzDateStr()).getTime() - new Date(from.slice(0, 10)).getTime()) / 86400000
  );
  return days <= 7 ? "соңғы бір аптада" : "соңғы екі аптада";
}

function joinIcon(key: string): string {
  // Кезектесіп тұрады — лента бір ғана эмодзимен қайталанбас үшін. Кілт
  // бойынша таңдалады, сондықтан бір оқиға әр жүктегенде құбылмайды.
  let sum = 0;
  for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
  return sum % 2 === 0 ? "👨‍🎓" : "👩‍🎓";
}

export function timeAgo(iso: string): string {
  const kz = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Almaty" });
  const day = (s: string) => new Date(s + "T00:00:00Z").getTime();
  const days = Math.round((day(kzDateStr()) - day(kz.format(new Date(iso)))) / 86400000);

  if (days <= 0) return "бүгін";
  if (days === 1) return "кеше";
  if (days < 7) return `${days} күн бұрын`;
  if (days < 30) return `${Math.floor(days / 7)} апта бұрын`;
  return `${Math.floor(days / 30)} ай бұрын`;
}

/** Лента қанша күн артқа қарайды */
const WINDOW = 14;

/**
 * Қолданбаның өз хабарламалары. Басқа оқиғалар сияқты күні бойынша
 * сұрыпталады да, WINDOW өткен соң лентадан өзі шығады.
 */
const ANNOUNCEMENTS: FeedItem[] = [
  {
    id: "announce:freeze",
    icon: "❄️",
    lead: "Oqyrman.kz:",
    rest: " енді кітапты оқымаған күннің өзінде тізбегіңіз үзілмей, бір күнге қатырылады",
    href: "/dashboard",
    at: "2026-11-05T19:00:00+00:00",
  },
];
/** Бір сұраудан алынатын ең көп жазба */
const LIMIT = 40;

const fmtName = (p: { name?: string | null; email?: string | null } | undefined) =>
  p?.name || p?.email || "Оқырман";

/** «2 күнде», «бір күнде» — кітапқа кеткен уақыт */
function daysBetween(from: string | null, to: string): number {
  if (!from) return 0;
  const a = new Date(from.slice(0, 10) + "T00:00:00Z").getTime();
  const b = new Date(to.slice(0, 10) + "T00:00:00Z").getTime();
  return Math.max(1, Math.round((b - a) / 86400000));
}

/** Пікірдің басы — қызық жерінде үзіледі, адам ашып оқығысы келсін */
function teaser(text: string, max = 70): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return `«${clean}»`;
  return `«${clean.slice(0, max).trimEnd()}…`;
}

// =============================================
// Клуб жаңалықтары
// =============================================

export async function getClubFeed(userId: string, clubIds: string[]): Promise<FeedItem[]> {
  if (clubIds.length === 0) return [];

  const admin = createAdminClient();
  const since = addDays(kzDateStr(), -WINDOW);
  const sinceTs = `${since}T00:00:00`;

  const [{ data: members }, { data: events }, { data: plans }, { data: threads }] =
    await Promise.all([
      admin
        .from("club_members")
        .select("club_id, user_id, joined_at")
        .in("club_id", clubIds)
        .gte("joined_at", sinceTs),
      admin
        .from("point_events")
        .select("id, user_id, code, ref_id, created_at")
        .in("code", ["club_book_ontime", "book_done", "streak_7", "streak_30", "streak_365"])
        .gte("created_at", sinceTs),
      admin
        .from("club_plans")
        .select("id, club_id, created_at, books(title)")
        .in("club_id", clubIds)
        .gte("created_at", sinceTs),
      admin
        .from("book_analyses")
        .select("id, title, content, author_id, club_id, created_at")
        .in("club_id", clubIds)
        .is("parent_id", null)
        .gte("created_at", sinceTs)
        .order("created_at", { ascending: false })
        .limit(LIMIT),
    ]);

  // Клубтастар ғана — басқа клубтың оқиғасы бұл лентаға кірмейді
  const { data: mates } = await admin
    .from("club_members")
    .select("user_id")
    .in("club_id", clubIds);
  const mateIds = new Set((mates ?? []).map((m) => m.user_id));

  const names = await namesOf([
    ...(members ?? []).map((m) => m.user_id),
    ...(events ?? []).map((e) => e.user_id),
    ...(threads ?? []).map((t) => t.author_id),
  ]);
  const clubs = await clubsOf(clubIds);

  const items: FeedItem[] = [];

  // 1 мен 2 — ұпай журналынан
  items.push(...(await fromPointEvents(events ?? [], names, (u) => mateIds.has(u) && u !== userId)));

  // 3. Жаңа мүшелер — клуб бойынша бір жолға жиналады
  groupJoins((members ?? []).filter((m) => m.user_id !== userId)).forEach((g) => {
    items.push({
      id: `members:${g.club}`,
      icon: joinIcon(g.club),
      lead: `«${clubs.get(g.club)?.name ?? "Клуб"}»`,
      rest:
        g.n === 1
          ? " құрамына жаңа оқырман қосылды"
          : ` құрамына ${spanLabel(g.from)} ${g.n} адам қосылды`,
      href: `/clubs/${g.club}`,
      at: g.at,
      clubId: g.club,
    });
  });

  // 4. Жаңа жоспар
  (plans ?? []).forEach((p: any) => {
    items.push({
      id: `plan:${p.id}`,
      icon: "📜",
      lead: `«${clubs.get(p.club_id)?.name ?? "Клуб"}»`,
      rest: ` жүргізушісі жаңа жоспар жариялады${p.books?.title ? `: «${p.books.title}»` : ""}`,
      href: `/clubs/${p.club_id}/plan/${p.id}`,
      at: p.created_at,
    });
  });

  // 5. Талқы — аты емес, мәтіннің басы көрінеді
  (threads ?? [])
    .filter((t) => t.author_id !== userId)
    .forEach((t) => {
      items.push({
        id: `thread:${t.id}`,
        icon: "💬",
        lead: fmtName(names.get(t.author_id!)),
        rest: ` ${teaser(t.content || t.title || "")}`,
        href: `/analysis/${t.id}`,
        at: t.created_at,
      });
    });

  return sortTrim(items);
}

// =============================================
// Oqyrman жаңалықтары — бәріне ортақ, сондықтан кэштеледі
// =============================================

export const getAppFeed = unstable_cache(
  async (): Promise<FeedItem[]> => {
    const admin = createAdminClient();
    const since = addDays(kzDateStr(), -WINDOW);
    const sinceTs = `${since}T00:00:00`;

    const [{ data: clubsNew }, { data: members }, { data: plans }, { data: replies }] =
      await Promise.all([
        admin
          .from("clubs")
          .select("id, name, created_at, cities(name)")
          .eq("is_active", true)
          .gte("created_at", sinceTs),
        admin.from("club_members").select("club_id, user_id, joined_at").gte("joined_at", sinceTs),
        admin.from("club_plans").select("id, club_id, created_at, books(title)").gte("created_at", sinceTs),
        admin
          .from("book_analyses")
          .select("id, title, content, parent_id, author_id, created_at")
          .gte("created_at", addDays(kzDateStr(), -60) + "T00:00:00"),
      ]);

    const items: FeedItem[] = [];
    const clubNames = new Map<string, string>();
    (clubsNew ?? []).forEach((c: any) => clubNames.set(c.id, c.name));

    // 4. Жаңа клуб
    (clubsNew ?? []).forEach((c: any) => {
      const city = c.cities?.name;
      items.push({
        id: `club:${c.id}`,
        icon: "📗",
        lead: city ? `${city} қаласында` : "Қолданбада",
        rest: ` су жаңа «${c.name}» атты кітап клубы құрылды`,
        href: `/clubs/${c.id}`,
        at: c.created_at,
      });
    });

    // 5. Жаңа мүшелер
    const allClubs = await clubsOf(Array.from(new Set((members ?? []).map((m) => m.club_id))));
    groupJoins(members ?? []).forEach((g) => {
      items.push({
        id: `app-members:${g.club}`,
        icon: joinIcon(g.club),
        lead: `«${allClubs.get(g.club)?.name ?? "Клуб"}»`,
        rest:
          g.n === 1
            ? " құрамына жаңа оқырман қосылды"
            : ` құрамына ${spanLabel(g.from)} ${g.n} адам қосылды`,
        href: `/clubs/${g.club}`,
        at: g.at,
        clubId: g.club,
      });
    });

    // 6. Жаңа жоспар
    (plans ?? []).forEach((p: any) => {
      items.push({
        id: `app-plan:${p.id}`,
        icon: "📜",
        lead: `«${allClubs.get(p.club_id)?.name ?? "Клуб"}»`,
        rest: ` жүргізушісі жаңа жоспар жариялады${p.books?.title ? `: «${p.books.title}»` : ""}`,
        href: `/clubs/${p.club_id}/plan/${p.id}`,
        at: p.created_at,
        clubId: p.club_id,
      });
    });

    // 7. Ең танымал талқы — жауабы ең көп
    const threads = (replies ?? []).filter((a) => !a.parent_id);
    const counts = new Map<string, number>();
    (replies ?? []).forEach((a) => {
      if (a.parent_id) counts.set(a.parent_id, (counts.get(a.parent_id) ?? 0) + 1);
    });
    const top = threads
      .map((t) => ({ t, n: counts.get(t.id) ?? 0 }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)[0];
    // Таңдауы «ең көп талқыланған» бойынша, ал көрінісі клубтағы пікір
    // сияқты: автордың аты мен сөзінің басы. Оқырманға «мынаны ең көп
    // талқылады» дегеннен гөрі, сөздің өзі қызығырақ.
    if (top) {
      const author = await namesOf([top.t.author_id]);
      items.push({
        // Клуб лентасындағы id-мен бірдей: бір пікір екі рет шықпасын
        id: `thread:${top.t.id}`,
        icon: "💬",
        lead: fmtName(author.get(top.t.author_id)),
        rest: ` ${teaser(top.t.content || top.t.title || "")}`,
        href: `/analysis/${top.t.id}`,
        at: top.t.created_at,
      });
    }

    // 1-3. Апталық рейтиң мен деңгей көтерілу
    items.push(...(await pointNews()));

    // 8. Қолданбаның хабарламалары
    items.push(...ANNOUNCEMENTS.filter((a) => a.at >= sinceTs));

    return sortTrim(items);
  },
  ["app-feed"],
  { revalidate: 300 }
);

/** Апталық рейтиң жарияланатын сәт: жұма (getUTCDay бойынша 5), 15:00 */
const WEEKLY_DAY = 5;
const WEEKLY_HOUR = 15;
/** Алматы — UTC+5, жазғы уақыт жоқ */
const KZ_OFFSET = 5;

const MEDALS = ["🥇", "🥈", "🥉"];

/**
 * Ең соңғы өткен жұма, 15:00 (Алматы) — UTC уақыт белгісімен. Жұманың
 * өзінде 15:00-ге дейін алдыңғы жұма қайтады.
 */
export function lastWeeklyCutoff(now: Date = new Date()): string {
  const kz = new Date(now.getTime() + KZ_OFFSET * 3_600_000);
  let back = (kz.getUTCDay() - WEEKLY_DAY + 7) % 7;
  if (back === 0 && kz.getUTCHours() < WEEKLY_HOUR) back = 7;
  const day = addDays(kz.toISOString().slice(0, 10), -back);
  const hour = String(WEEKLY_HOUR - KZ_OFFSET).padStart(2, "0");
  return `${day}T${hour}:00:00.000Z`;
}

/**
 * Апталық рейтиң мен деңгей көтерілу.
 *
 * Рейтиң аптасына бір рет — жұма, 15:00-де жаңалыққа шығады: сол сәтке
 * дейін жазылған ұпай бойынша алғашқы үшеуі. Бұрын көшбасшының әр
 * ауысуын іздейтінбіз, бірақ ауысу жиі болғанда лента бір хабармен
 * толатын, сирек болғанда ескі күнімен төменге түсіп жоғалатын.
 *
 * Деңгейлердің тарихы сақталмайды, бірақ оның қажеті жоқ: ұпай журналы
 * толық сақтаулы. Екі апта бұрынғы ұпайдан бастап адамның өз жазбаларын
 * ретімен қосып шығамыз — деңгей ауысса, бұл шынымен болған оқиға.
 *
 * Журнал fetchAll арқылы түгел оқылады: 1000 жолдан кейін Supabase
 * қалғанын үнсіз тастайды, ал жартылай журналдан рейтиң қате шығады.
 */
async function pointNews(): Promise<FeedItem[]> {
  const admin = createAdminClient();
  const windowStart = addDays(kzDateStr(), -WINDOW);
  const cutoff = lastWeeklyCutoff();
  const cutoffMs = Date.parse(cutoff);

  const [{ data: events }, { data: profiles }] = await Promise.all([
    fetchAll<{ user_id: string; points: number; event_date: string; created_at: string }>(() =>
      admin.from("point_events").select("user_id, points, event_date, created_at").order("id")
    ),
    fetchAll<{ id: string; name: string | null; email: string | null }>(() =>
      admin.from("profiles").select("id, name, email").order("id")
    ),
  ]);

  const names = new Map(profiles.map((p) => [p.id, p]));
  const items: FeedItem[] = [];

  // Апталық топ-3. Реті рейтиң бетіндегідей: ұпай, тең болса аты.
  const weekly = new Map<string, number>();
  events.forEach((e) => {
    if (Date.parse(e.created_at) <= cutoffMs) {
      weekly.set(e.user_id, (weekly.get(e.user_id) ?? 0) + e.points);
    }
  });
  const top = profiles
    .map((p) => ({ id: p.id, name: p.name ?? "", pts: weekly.get(p.id) ?? 0 }))
    .filter((r) => r.pts > 0)
    .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name))
    .slice(0, 3);

  if (top.length > 0) {
    items.push({
      id: `weekly-top:${cutoff.slice(0, 10)}`,
      icon: "🏆",
      lead: "Апталық рейтиң:",
      rest: ` ${top.map((r, i) => `${MEDALS[i]} ${fmtName(names.get(r.id))}`).join(" · ")}`,
      href: "/rating",
      at: cutoff,
    });
  }

  // Деңгей көтерілу
  const before = new Map<string, number>();
  const recent = new Map<string, { event_date: string; points: number }[]>();
  events.forEach((e) => {
    if (e.event_date < windowStart) {
      before.set(e.user_id, (before.get(e.user_id) ?? 0) + e.points);
    } else {
      if (!recent.has(e.user_id)) recent.set(e.user_id, []);
      recent.get(e.user_id)!.push(e);
    }
  });

  recent.forEach((own, id) => {
    let run = before.get(id) ?? 0;
    own.sort((a, b) => a.event_date.localeCompare(b.event_date));
    for (const e of own) {
      const was = levelFor(run).current.name;
      run += e.points;
      const became = levelFor(run).current.name;
      if (became !== was) {
        items.push({
          id: `level:${id}:${became}`,
          icon: "🔥",
          lead: fmtName(names.get(id)),
          rest: ` ${run} ұпай жинап «${became}» деңгейіне өтті`,
          href: `/readers/${id}`,
          at: `${e.event_date}T12:00:00`,
        });
      }
    }
  });

  return items;
}

// =============================================
// Ортақ көмекшілер
// =============================================

async function fromPointEvents(
  events: { id: string; user_id: string; code: string; ref_id: string; created_at: string }[],
  names: Map<string, { name?: string | null; email?: string | null }>,
  keep: (userId: string) => boolean
): Promise<FeedItem[]> {
  const admin = createAdminClient();
  const mine = events.filter((e) => keep(e.user_id));
  if (mine.length === 0) return [];

  const trackerIds = mine
    .filter((e) => e.code === "club_book_ontime" || e.code === "book_done")
    .map((e) => e.ref_id);

  const [{ data: trackers }, { data: progress }] = trackerIds.length
    ? await Promise.all([
        admin
          .from("book_trackers")
          .select("id, book_title, club_plan_id")
          .in("id", trackerIds),
        admin.from("reading_progress").select("tracker_id, date").in("tracker_id", trackerIds),
      ])
    : [{ data: [] }, { data: [] }];

  const byId = new Map((trackers ?? []).map((t) => [t.id, t]));

  // Оқуға кеткен уақыт трекердің жасалған күнінен емес, бірінші прогрестен
  // саналады. Клуб кітабының трекерін жүргізуші жоспар жариялағанда бүкіл
  // мүшеге бірден ашады — сондықтан трекердің жасы «қанша күнде оқыды»
  // дегенді мүлдем көрсетпейді: 38 күн деп тұрғаны шын мәнінде жоспардың
  // жасы болып шығады.
  const firstProgress = new Map<string, string>();
  (progress ?? []).forEach((p) => {
    const cur = firstProgress.get(p.tracker_id);
    if (!cur || p.date < cur) firstProgress.set(p.tracker_id, p.date);
  });
  const items: FeedItem[] = [];
  const seenBook = new Set<string>();

  for (const e of mine) {
    const name = fmtName(names.get(e.user_id));

    if (e.code === "club_book_ontime" || e.code === "book_done") {
      const t = byId.get(e.ref_id);
      // Клуб кітабы ғана. club_book_ontime мен book_done бір кітапқа қатар
      // келуі мүмкін, сондықтан біреуін ғана аламыз.
      if (!t || !t.club_plan_id || seenBook.has(e.ref_id)) continue;
      seenBook.add(e.ref_id);

      // Прогресс мүлдем енгізілмесе, күн санын жазбаймыз — ойдан шыққан
      // сан жазғаннан гөрі, оны мүлдем айтпаған дұрыс
      const first = firstProgress.get(e.ref_id);
      const days = first ? daysBetween(first, e.created_at) : null;

      items.push({
        id: `book:${e.ref_id}`,
        icon: "🎉",
        lead: name,
        rest: ` «${t.book_title}» атты клуб кітабын ${days ? `${days} күнде ` : ""}оқып бітірді`,
        href: `/readers/${e.user_id}`,
        at: e.created_at,
      });
      continue;
    }

    const days = e.code === "streak_7" ? 7 : e.code === "streak_30" ? 30 : 365;
    items.push({
      id: `streak:${e.id}`,
      icon: "👏",
      lead: name,
      rest: ` ${days} күн қатарынан кітап оқып жүр`,
      href: `/readers/${e.user_id}`,
      at: e.created_at,
    });
  }

  return items;
}

async function namesOf(ids: (string | null)[]) {
  const admin = createAdminClient();
  const unique = Array.from(new Set(ids.filter(Boolean) as string[]));
  if (unique.length === 0) return new Map();
  const { data } = await admin.from("profiles").select("id, name, email").in("id", unique);
  return new Map((data ?? []).map((p) => [p.id, p]));
}

async function clubsOf(ids: string[]) {
  const admin = createAdminClient();
  if (ids.length === 0) return new Map<string, { name: string }>();
  const { data } = await admin.from("clubs").select("id, name").in("id", ids);
  return new Map((data ?? []).map((c) => [c.id, { name: c.name }]));
}

/**
 * Екі лентаны бір тізімге біріктіреді, ең жаңасы жоғарыда.
 *
 * Жалпы лентадан оқырманның өз клубының оқиғалары алынады — олар клуб
 * лентасында бар. Id бірдей болса, бір оқиға деп есептеледі.
 */
export function mergeFeeds(club: FeedItem[], app: FeedItem[], clubIds: string[]): FeedItem[] {
  const seen = new Set(club.map((c) => c.id));
  const rest = app.filter((a) => !seen.has(a.id) && (!a.clubId || !clubIds.includes(a.clubId)));
  return [...club, ...rest].sort((a, b) => b.at.localeCompare(a.at));
}

/**
 * Жаңалықтар бетіне де, басты бетке де осы тізім барады — сондықтан
 * мұнда кең кесіп, қанша көрсетуді шақырған жер өзі шешеді.
 */
function sortTrim(items: FeedItem[]): FeedItem[] {
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
}
