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
 */

export type StarDay = {
  date: string;
  /** Апта күнінің қысқа аты: Дс, Сс, … */
  label: string;
  lit: boolean;
  isToday: boolean;
};

export type StarWeek = {
  days: StarDay[];
  streak: number;
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
 */
export async function getActiveDays(userId: string): Promise<Set<string>> {
  const admin = createAdminClient();
  const since = addDays(kzDateStr(), -WINDOW_DAYS);

  const { data: goal } = await admin
    .from("reading_goals")
    .select("daily_minutes")
    .eq("user_id", userId)
    .maybeSingle();

  if (!goal?.daily_minutes) return new Set();

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
}

/** Қатарынан неше күн — бүгіннен, із жоқ болса кешеден кері санайды */
export function streakFrom(days: Set<string>, today: string): number {
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export async function getStarWeek(userId: string): Promise<StarWeek> {
  const today = kzDateStr();
  const days = await getActiveDays(userId);

  // Мақсаты жоқ адамда жиын бос болады, бірақ оған жолақтың орнына
  // мақсат қоюға шақыру көрсетіледі — сол себепті бөлек белгі керек
  const admin = createAdminClient();
  const { data: goal } = await admin
    .from("reading_goals")
    .select("daily_minutes")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    days: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i - 6);
      return { date, label: labelFor(date), lit: days.has(date), isToday: date === today };
    }),
    streak: streakFrom(days, today),
    hasGoal: Boolean(goal?.daily_minutes),
    everLit: days.size > 0,
  };
}
