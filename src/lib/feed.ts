import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { kzDateStr, addDays } from "@/lib/utils";

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

  // 3. Жаңа мүшелер — клуб пен күн бойынша топталады, әйтпесе лента
  //    тек солармен толып кетеді
  const grouped = new Map<string, { club: string; day: string; n: number; at: string }>();
  (members ?? [])
    .filter((m) => m.user_id !== userId)
    .forEach((m) => {
      const day = m.joined_at.slice(0, 10);
      const key = `${m.club_id}:${day}`;
      const cur = grouped.get(key);
      if (cur) {
        cur.n++;
        if (m.joined_at > cur.at) cur.at = m.joined_at;
      } else {
        grouped.set(key, { club: m.club_id, day, n: 1, at: m.joined_at });
      }
    });

  grouped.forEach((g, key) => {
    items.push({
      id: `members:${key}`,
      icon: "👩‍🎓",
      lead: `«${clubs.get(g.club)?.name ?? "Клуб"}»`,
      rest: ` — ${g.n} жаңа оқырман қосылды`,
      href: `/clubs/${g.club}`,
      at: g.at,
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
          .select("id, title, content, parent_id, created_at")
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
    const grouped = new Map<string, { club: string; n: number; at: string }>();
    (members ?? []).forEach((m) => {
      const key = `${m.club_id}:${m.joined_at.slice(0, 10)}`;
      const cur = grouped.get(key);
      if (cur) {
        cur.n++;
        if (m.joined_at > cur.at) cur.at = m.joined_at;
      } else {
        grouped.set(key, { club: m.club_id, n: 1, at: m.joined_at });
      }
    });
    grouped.forEach((g, key) => {
      items.push({
        id: `app-members:${key}`,
        icon: "👩‍🎓",
        lead: `«${allClubs.get(g.club)?.name ?? "Клуб"}»`,
        rest: ` құрамына ${g.n} жаңа оқырман қосылды`,
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
    if (top) {
      items.push({
        id: `top-thread:${top.t.id}`,
        icon: "🔥",
        lead: "Ең көп талқыланған",
        rest: ` — ${teaser(top.t.title || top.t.content || "")} · ${top.n} жауап`,
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
 * Рейтиңдегі қозғалыс.
 *
 * Орындардың тарихы сақталмайды, бірақ оның қажеті де жоқ: ұпай журналы
 * толықтай сақтаулы әрі әр жазбаның күні бар. Сондықтан бір апта бұрынғы
 * ұпайды қосып, сол кездегі орынды есептеп шығарамыз.
 */
async function rankMoves(): Promise<FeedItem[]> {
  const admin = createAdminClient();
  const weekAgo = addDays(kzDateStr(), -7);

  const [{ data: events }, { data: profiles }] = await Promise.all([
    admin.from("point_events").select("user_id, points, event_date"),
    admin.from("profiles").select("id, name, email"),
  ]);

  const now = new Map<string, number>();
  const before = new Map<string, number>();
  (events ?? []).forEach((e) => {
    now.set(e.user_id, (now.get(e.user_id) ?? 0) + e.points);
    if (e.event_date < weekAgo) {
      before.set(e.user_id, (before.get(e.user_id) ?? 0) + e.points);
    }
  });

  const rank = (totals: Map<string, number>) => {
    const sorted = (profiles ?? [])
      .map((p) => ({ id: p.id, name: p.name ?? "", pts: totals.get(p.id) ?? 0 }))
      .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name));
    return new Map(sorted.map((r, i) => [r.id, i + 1]));
  };

  const rNow = rank(now);
  const rBefore = rank(before);
  const names = new Map((profiles ?? []).map((p) => [p.id, p]));
  const at = new Date().toISOString();
  const items: FeedItem[] = [];

  for (const [id, place] of Array.from(rNow.entries())) {
    const was = rBefore.get(id) ?? Infinity;
    const name = fmtName(names.get(id));
    const base = { id: `rank:${id}:${place}`, href: "/rating", at };

    if (place === 1) {
      items.push({ ...base, icon: "💯", lead: name, rest: " әлемдік рейтиңде көш бастап келе жатыр" });
    } else if (place <= 3 && was > 3) {
      items.push({ ...base, icon: "💥", lead: name, rest: " әлемдік рейтиңде үздік үштікке кірді" });
    } else if (place <= 10 && was > 10) {
      items.push({ ...base, icon: "🎆", lead: name, rest: " әлемдік рейтиңде үздік ондыққа кірді" });
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

  const { data: trackers } = trackerIds.length
    ? await admin
        .from("book_trackers")
        .select("id, book_title, start_date, created_at, club_plan_id")
        .in("id", trackerIds)
    : { data: [] };

  const byId = new Map((trackers ?? []).map((t) => [t.id, t]));
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

      const days = daysBetween(t.start_date ?? t.created_at, e.created_at);
      items.push({
        id: `book:${e.ref_id}`,
        icon: "🎉",
        lead: name,
        rest: ` «${t.book_title}» атты клуб кітабын ${days} күнде оқып бітірді`,
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
 * Жаңалықтар бетіне де, басты бетке де осы тізім барады — сондықтан
 * мұнда кең кесіп, қанша көрсетуді шақырған жер өзі шешеді.
 */
function sortTrim(items: FeedItem[]): FeedItem[] {
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
}
