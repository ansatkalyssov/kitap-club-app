import { createAdminClient } from "@/lib/supabase/admin";
import { kzDateStr, addDays } from "@/lib/utils";

/**
 * Жұлдыз жолағы — оқырманның соңғы жеті күндегі тұрақтылығы.
 *
 * Жұлдыз ұпайға байланбаған: ол — әдеттің белгісі, марапат емес. Сол
 * себепті шарты да қарапайым: сол күні трекерге оқу прогресі түссе,
 * жұлдыз жанады. Күнделікті мақсаттың, минуттың, ұпайдың бұған қатысы
 * жоқ — оларда өз ережесі бар.
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
  /** Қатарынан неше күн — бүгіннен (әлі енгізбесе, кешеден) кері саналады */
  streak: number;
  /** Белсенді трекер бар ма — болмаса жұлдыз жағудың жолы жоқ */
  hasActiveTracker: boolean;
};

const WEEKDAYS = ["Жк", "Дс", "Сс", "Ср", "Бс", "Жм", "Сн"];

function labelFor(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export async function getStarWeek(userId: string): Promise<StarWeek> {
  const admin = createAdminClient();
  const today = kzDateStr();

  const { data: trackers } = await admin
    .from("book_trackers")
    .select("id, is_completed")
    .eq("user_id", userId);

  const ids = (trackers ?? []).map((t) => t.id);
  const hasActiveTracker = (trackers ?? []).some((t) => !t.is_completed);

  // Тізбек ұзын болуы мүмкін, сондықтан жолаққа керек жеті күннен әрі
  // қарай да аламыз. 400 күн — streak-тегі шекпен бірдей.
  const since = addDays(today, -400);

  const { data: progress } = ids.length
    ? await admin
        .from("reading_progress")
        .select("date")
        .in("tracker_id", ids)
        .gte("date", since)
    : { data: [] };

  const done = new Set((progress ?? []).map((p) => p.date));

  const days: StarDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    return { date, label: labelFor(date), lit: done.has(date), isToday: date === today };
  });

  // Бүгін әлі енгізбесе, тізбек үзілмейді — күн әлі бітпеді
  let cursor = done.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (done.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  return { days, streak, hasActiveTracker };
}
