"use server";

import { getUser } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { onReadingLogged } from "@/lib/points";
import { kzDateStr } from "@/lib/utils";

/** Бір отырыста жазуға болатын ең үлкен уақыт — қате теруден сақтайды */
const MAX_MINUTES = 600;

/**
 * Бүгінгі оқу уақытына минут қосады.
 *
 * Бұрын күнделікті мақсат пен streak тек таймер арқылы толатын. Ал
 * көпшілік таймерді қоспай, тек трекерге бет санын белгілейді —
 * сондықтан олардың оқығаны мақсатқа мүлдем есептелмейтін.
 *
 * Уақыт қосылады, ауыстырылмайды: адам таймермен 10 минут оқып, кейін
 * қолмен 20 минут қосса, күнделігінде 30 минут тұруы керек.
 *
 * @returns берілген ұпай
 */
export async function addReadingMinutes(minutes: number): Promise<number> {
  const user = await getUser();
  if (!user) return 0;

  const value = Math.floor(minutes);
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value > MAX_MINUTES) return 0;

  const admin = createAdminClient();
  const date = kzDateStr();

  const { data: existing } = await admin
    .from("reading_logs")
    .select("minutes_read")
    .eq("user_id", user.id)
    .eq("date", date)
    .maybeSingle();

  const total = (existing?.minutes_read ?? 0) + value;

  const { error } = await admin
    .from("reading_logs")
    .upsert({ user_id: user.id, date, minutes_read: total }, { onConflict: "user_id,date" });
  if (error) return 0;

  // Мақсат орындалса — күндік ұпай мен streak марапаты
  try {
    return await onReadingLogged(user.id);
  } catch {
    return 0;
  }
}
