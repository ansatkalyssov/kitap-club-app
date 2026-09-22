import { createAdminClient } from "@/lib/supabase/admin";
import { kzDateStr, addDays } from "@/lib/utils";

/**
 * Жұлдыз жолағы — оқырманның соңғы жеті күндегі тұрақтылығы.
 *
 * Жұлдыз ұпайға байланбаған: ол — әдеттің белгісі, марапат емес. Сол
 * себепті шарты да қарапайым: сол күні оқығанының ізі қалса, жұлдыз
 * жанады. Із екеу болуы мүмкін — трекерге енгізілген бет прогресі
 * немесе журналға жазылған оқу уақыты.
 *
 * Екеуін де санаймыз, себебі оқырман бетін белгілеуді ұмытып, тек
 * таймермен оқуы мүмкін. Ондайда ол күні оқығаны рас, бірақ жолағы бос
 * қалар еді. Күнделікті мақсаттың да, ұпайдың да бұған қатысы жоқ —
 * оларда өз ережесі бар.
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

  const [{ data: progress }, { data: logs }] = await Promise.all([
    ids.length
      ? admin.from("reading_progress").select("date").in("tracker_id", ids).gte("date", since)
      : Promise.resolve({ data: [] as { date: string }[] }),
    admin
      .from("reading_logs")
      .select("date, minutes_read")
      .eq("user_id", userId)
      .gt("minutes_read", 0)
      .gte("date", since),
  ]);

  const done = new Set<string>([
    ...(progress ?? []).map((p) => p.date),
    ...(logs ?? []).map((l) => l.date),
  ]);

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
