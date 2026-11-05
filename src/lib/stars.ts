import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { kzDateStr, addDays } from "@/lib/utils";

/**
 * Жұлдыз жолағы және оның артындағы тізбек.
 *
 * Жұлдыз бен стрик — бір нәрсенің екі көрінісі: жолақтағы жанған жұлдыз
 * дәл сол тізбектің күні. Сондықтан екеуінің ережесі де осы файлда, бір
 * жерде тұр — әйтпесе экрандағы сан мен ұпай бір-бірінен ажырап кетер
 * еді.
 *
 * Ереже:
 *   1. Күнделікті мақсат қойылған болуы керек — бір реттік кіру билеті.
 *      Мақсаттың саны күннің есептелуіне әсер етпейді.
 *   2. Сол күні кемінде бір минут жазылса НЕМЕСЕ трекерге прогресс
 *      енгізілсе — күн есептеледі.
 *   3. Бүгінгі күн тізбекті үзбейді: із әлі қалмаса, санақ кешеден
 *      жүреді. Күн бітпейінше үлгеруге болады.
 *   4. Өткізіп алған күнді қордағы қатыру жабады: тізбек үзілмейді, бірақ
 *      саны да өспейді — оқылмаған күнге ұпай берілмеуі керек.
 */

export type StarDay = {
  date: string;
  /** Апта күнінің қысқа аты: Дс, Сс, … */
  label: string;
  lit: boolean;
  /** Оқылмаған, бірақ қатыру жапқан күн */
  frozen: boolean;
  isToday: boolean;
};

export type StarWeek = {
  days: StarDay[];
  streak: number;
  /** Қордағы қатыру саны */
  freezes: number;
  /** Мақсат қойылған ба — қойылмаса жұлдыз мүлдем жанбайды */
  hasGoal: boolean;
  /** Бұрын бірде-бір жұлдыз жаққан ба — жаңа оқырманға бөлек сөз үшін */
  everLit: boolean;
};

const WEEKDAYS = ["Жк", "Дс", "Сс", "Ср", "Бс", "Жм", "Сн"];

function labelFor(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** Тізбек есебіне жететін ең ұзын кезең */
const WINDOW_DAYS = 400;

/**
 * Оқырманның ізі қалған күндері.
 *
 * Мақсат қойылмаса бос жиын қайтады — сонда жолақ та, тізбек те бірдей
 * бос болады, екеуі ешқашан қайшы келмейді.
 *
 * cache() — бір сұраныстың ішінде бір рет қана есептеу үшін. Басты бетте
 * бұл функция екі жерден шақырылады (ұпай көрсеткіші мен жұлдыз жолағы),
 * ал оның әр жүрісі төрт сұрау жібереді.
 */
export const getActiveDays = cache(async (userId: string): Promise<Set<string>> => {
  const admin = createAdminClient();
  const since = addDays(kzDateStr(), -WINDOW_DAYS);

  const goal = await getGoalMinutes(userId);
  if (!goal) return new Set();

  const { data: trackers } = await admin
    .from("book_trackers")
    .select("id")
    .eq("user_id", userId);

  const ids = (trackers ?? []).map((t) => t.id);

  const [{ data: progress }, { data: logs }] = await Promise.all([
    ids.length
      ? admin.from("reading_progress").select("date").in("tracker_id", ids).gte("date", since)
      : Promise.resolve({ data: [] as { date: string }[] }),
    admin
      .from("reading_logs")
      .select("date")
      .eq("user_id", userId)
      .gt("minutes_read", 0)
      .gte("date", since),
  ]);

  return new Set<string>([
    ...(progress ?? []).map((p) => p.date),
    ...(logs ?? []).map((l) => l.date),
  ]);
});

/**
 * Күнделікті мақсаттың минуты. Бір сұраныста бірнеше жерден керек болады
 * (жұлдыз жолағы, тізбек, еске салғыш), сондықтан бір рет сұралады.
 */
export const getGoalMinutes = cache(async (userId: string): Promise<number> => {
  const admin = createAdminClient();
  const { data } = await admin
    .from("reading_goals")
    .select("daily_minutes")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.daily_minutes ?? 0;
});

/**
 * Қатыру іске қосылған күн. Одан бұрынғы үзілістер жабылмайды: ескі
 * тізбектер қалпына келсе, адамдар 30, 100 күндік ұпайды кенеттен алып,
 * рейтиң өзгеріп кетер еді.
 */
const FREEZE_START = "2026-11-05";
/** Іске қосылғанда әр оқырманға берілетін сыйлық */
const FREEZE_GIFT = 1;
/** Қорда тұратын ең көп қатыру */
const FREEZE_MAX = 2;
/** Неше күн оқығанда бір қатыру беріледі */
const FREEZE_EVERY = 7;

/**
 * Тізбекті, қатырылған күндерді және қорды белсенді күндерден есептейді.
 *
 * Ештеңе сақталмайды: FREEZE_START-тан бастап күн-күнмен қайта жүріп
 * шығамыз, сондықтан жаңа кесте де, түнгі тапсырма да керек емес.
 *
 * Үзіліс қордағы қатырудан ұзын болса, ештеңе жұмсалмайды: әйтпесе
 * тізбек бәрібір үзіліп, оқырман қатыруынан да айырылар еді. Сол себепті
 * үзіліс ұзарған сайын кешегі қатырылған күн қайта жай күнге айналуы мүмкін.
 */
export function resolveStreak(
  days: Set<string>,
  today: string
): { streak: number; frozen: Set<string>; freezes: number } {
  // Іске қосылғанға дейін жиналған тізбек сақталады
  let streak = 0;
  let cursor = addDays(FREEZE_START, -1);
  while (days.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  const frozen = new Set<string>();
  let freezes = FREEZE_GIFT;
  let sinceEarned = 0;

  for (let d = FREEZE_START; d <= today; d = addDays(d, 1)) {
    if (days.has(d)) {
      streak++;
      if (++sinceEarned === FREEZE_EVERY) {
        sinceEarned = 0;
        freezes = Math.min(FREEZE_MAX, freezes + 1);
      }
      continue;
    }

    // Бүгін әлі бітпеді — үлгеруге болады
    if (d === today) break;

    // Үзілістің басы. Бүкіл ұзындығын бірден табамыз, бүгін оған кірмейді.
    const gap: string[] = [];
    for (let g = d; g < today && !days.has(g); g = addDays(g, 1)) gap.push(g);

    if (streak > 0 && gap.length <= freezes) {
      freezes -= gap.length;
      gap.forEach((g) => frozen.add(g));
    } else {
      streak = 0;
      sinceEarned = 0;
    }
    d = gap[gap.length - 1];
  }

  return { streak, frozen, freezes };
}

/** Қатарынан неше күн — бүгіннен, із жоқ болса кешеден кері санайды */
export function streakFrom(days: Set<string>, today: string): number {
  return resolveStreak(days, today).streak;
}

export async function getStarWeek(userId: string): Promise<StarWeek> {
  const today = kzDateStr();
  const days = await getActiveDays(userId);

  // Мақсаты жоқ адамда жиын бос болады, бірақ оған жолақтың орнына
  // мақсат қоюға шақыру көрсетіледі — сол себепті бөлек белгі керек.
  // Сұрау қайталанбайды: cache() жоғарыдағы шақырудың жауабын береді.
  const goal = await getGoalMinutes(userId);
  const { streak, frozen, freezes } = resolveStreak(days, today);

  return {
    days: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i - 6);
      return {
        date,
        label: labelFor(date),
        lit: days.has(date),
        frozen: frozen.has(date),
        isToday: date === today,
      };
    }),
    streak,
    freezes,
    hasGoal: goal > 0,
    everLit: days.size > 0,
  };
}
