import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { kzDateStr, addDays } from "@/lib/utils";
import { levelFor } from "@/lib/points";

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
   * Оқиғаның түрі. Басты бетте түрлерін араластыру үшін керек — әйтпесе
   * лента бір түрдегі оқиғалармен толып қалады.
   */
  kind: "book" | "streak" | "members" | "plan" | "club" | "thread" | "rank" | "level";
  /**
   * Оқиға қай клубқа қатысты. Жалпы лентадан оқырманның өз клубының
   * жаңалығын алып тастау үшін керек — ол оны жоғарыдан онсыз да көреді.
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
      kind: "members",
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
      kind: "plan",
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
        kind: "thread",
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
        kind: "club",
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
        kind: "members",
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
        kind: "plan",
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
        id: `top-thread:${top.t.id}`,
        kind: "thread",
        icon: "💬",
        lead: fmtName(author.get(top.t.author_id)),
        rest: ` ${teaser(top.t.content || top.t.title || "")}`,
        href: `/analysis/${top.t.id}`,
        at: top.t.created_at,
      });
    }

    // 1-3. Рейтиңдегі қозғалыс
    items.push(...(await rankMoves()));

    return sortTrim(items);
  },
  ["app-feed"],
  { revalidate: 300 }
);

/**
 * Рейтиңдегі қозғалыс пен деңгей көтерілу.
 *
 * Орындардың да, деңгейлердің де тарихы сақталмайды, бірақ оның қажеті
 * жоқ: ұпай журналы толықтай сақтаулы әрі әр жазбаның күні бар. Сондықтан
 * екі апта бұрынғы ұпайды қосып, сол кездегі орын мен деңгейді есептеп
 * шығарамыз — айырмасы болса, бұл шынымен болған оқиға.
 */
async function rankMoves(): Promise<FeedItem[]> {
  const admin = createAdminClient();
  const today = kzDateStr();
  const windowDays = Array.from({ length: WINDOW + 1 }, (_, i) => addDays(today, i - WINDOW));

  const [{ data: events }, { data: profiles }] = await Promise.all([
    admin.from("point_events").select("user_id, points, event_date"),
    admin.from("profiles").select("id, name, email"),
  ]);

  const names = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Журналды алдын ала күн бойынша да, адам бойынша да бөліп аламыз —
  // әйтпесе әр оқырман үшін бүкіл тізімді қайта сүзіп шығар едік
  const byDay = new Map<string, { user_id: string; points: number }[]>();
  const byUser = new Map<string, { event_date: string; points: number }[]>();
  (events ?? []).forEach((e) => {
    if (!byDay.has(e.event_date)) byDay.set(e.event_date, []);
    byDay.get(e.event_date)!.push(e);
    if (!byUser.has(e.user_id)) byUser.set(e.user_id, []);
    byUser.get(e.user_id)!.push(e);
  });

  const rank = (totals: Map<string, number>) => {
    const sorted = (profiles ?? [])
      .map((p) => ({ id: p.id, name: p.name ?? "", pts: totals.get(p.id) ?? 0 }))
      .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name));
    return new Map(sorted.map((r, i) => [r.id, i + 1]));
  };

  // Күн-күнмен бүкіл тарихты шолып өтеміз. Терезедегі күндердің ретін
  // сақтаймыз (кім қашан үштікке кіргенін табу үшін), ал көшбасшының
  // ауысуын одан да әріден іздейміз: ол терезеден бұрын да басталуы
  // мүмкін, бірақ «қашаннан бері» деген сұрақтың жауабы керек.
  const allDays = Array.from(byDay.keys()).sort();
  const start = allDays[0] ?? windowDays[0];
  const snapFrom = addDays(windowDays[0], -1);

  const totals = new Map<string, number>();
  const snaps: { date: string; totals: Map<string, number>; rank: Map<string, number> }[] = [];
  let leaderId: string | null = null;
  let leaderSince: string | null = null;

  for (let d = start; d <= kzDateStr(); d = addDays(d, 1)) {
    (byDay.get(d) ?? []).forEach((e) =>
      totals.set(e.user_id, (totals.get(e.user_id) ?? 0) + e.points)
    );

    // Көшбасшы — ең көп ұпайлы адам. Тең болса, аты бойынша: рейтиң
    // бетіндегі ретпен бірдей болуы керек.
    let top: { id: string; pts: number; name: string } | null = null;
    for (const p of profiles ?? []) {
      const pts = totals.get(p.id) ?? 0;
      const name = p.name ?? "";
      if (!top || pts > top.pts || (pts === top.pts && name.localeCompare(top.name) < 0)) {
        top = { id: p.id, pts, name };
      }
    }
    if (top && top.pts > 0 && top.id !== leaderId) {
      leaderId = top.id;
      leaderSince = d;
    }

    if (d >= snapFrom) snaps.push({ date: d, totals: new Map(totals), rank: rank(totals) });
  }

  const last = snaps[snaps.length - 1];
  const items: FeedItem[] = [];

  for (const p of profiles ?? []) {
    const id = p.id;
    const name = fmtName(names.get(id));

    // Көш бастау. Мәтіні осы шақта тұр, ал күні — қашан бастағаны.
    if (last.rank.get(id) === 1) {
      items.push({
        id: `rank-lead:${id}`,
        kind: "rank",
        icon: "💯",
        lead: name,
        rest: " әлемдік рейтиңде көш бастап келе жатыр!",
        href: "/rating",
        at: `${leaderSince ?? today}T12:00:00`,
      });
    }

    // Үштікке, ондыққа кіру — нақты қай күні болғанын табамыз
    for (const [limit, icon, label] of [
      [3, "💥", "үздік үштікке"],
      [10, "🎆", "үздік ондыққа"],
    ] as const) {
      for (let i = 1; i < snaps.length; i++) {
        const now = snaps[i].rank.get(id) ?? Infinity;
        const prev = snaps[i - 1].rank.get(id) ?? Infinity;
        if (now <= limit && prev > limit) {
          items.push({
            id: `rank:${id}:${limit}`,
            kind: "rank",
            icon,
            lead: name,
            rest: ` әлемдік рейтиңде ${label} кірді!`,
            href: "/rating",
            at: `${snaps[i].date}T12:00:00`,
          });
          break;
        }
      }
    }

    // Деңгей көтерілу — адамның өз журналы бойынша, қай жазбада асып
    // түскені нақты белгілі
    let run = snaps[0].totals.get(id) ?? 0;
    const own = (byUser.get(id) ?? [])
      .filter((e) => e.event_date >= windowDays[0])
      .sort((a, b) => a.event_date.localeCompare(b.event_date));

    for (const e of own) {
      const was = levelFor(run).current.name;
      run += e.points;
      const became = levelFor(run).current.name;
      if (became !== was) {
        items.push({
          id: `level:${id}:${became}`,
          kind: "level",
          icon: "🔥",
          lead: name,
          rest: ` ${run} ұпай жинап «${became}» деңгейіне өтті`,
          href: `/readers/${id}`,
          at: `${e.event_date}T12:00:00`,
        });
      }
    }
  }

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
        kind: "book",
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
      kind: "streak",
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
 * Басты бетке әр түрлі оқиға шығатындай етіп таңдайды.
 *
 * Жай ғана ең жаңаларын алсақ, лента бір клубтың немесе бір түрдегі
 * оқиғалармен толып қалады — ал қолданбада басқа да тірлік болып жатыр.
 * Сондықтан алдымен әр түрден, әр клубтан біреуден аламыз, содан кейін
 * орын қалса қалғанымен толтырамыз.
 */
export function pickVaried(items: FeedItem[], count: number): FeedItem[] {
  const picked: FeedItem[] = [];
  const kinds = new Set<string>();
  const clubs = new Set<string>();

  for (const it of items) {
    if (picked.length >= count) break;
    if (kinds.has(it.kind)) continue;
    if (it.clubId && clubs.has(it.clubId)) continue;
    picked.push(it);
    kinds.add(it.kind);
    if (it.clubId) clubs.add(it.clubId);
  }

  for (const it of items) {
    if (picked.length >= count) break;
    if (!picked.includes(it)) picked.push(it);
  }

  return picked;
}

/**
 * Жаңалықтар бетіне де, басты бетке де осы тізім барады — сондықтан
 * мұнда кең кесіп, қанша көрсетуді шақырған жер өзі шешеді.
 */
function sortTrim(items: FeedItem[]): FeedItem[] {
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
}
