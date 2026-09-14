"use server";

import { getUser } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOUR_VERSION } from "@/lib/tour";

/**
 * Тур бірінші қадамнан басталды деп белгілейді.
 *
 * Мерзімі бір рет қана жазылады: турды қайта көрген адамның алғашқы
 * мерзімі сақталып қалады. Сол үшін is("tour_started_at", null) сүзгісі.
 */
export async function beginTour(): Promise<void> {
  const user = await getUser();
  if (!user) return;

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ tour_started_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("tour_started_at", null);
}

/**
 * Тур көрілді деп белгілейді. Аяқтағанда да, «Керек емес» деп жапқанда да
 * шақырылады — екеуінде де қайта көрсетудің қажеті жоқ.
 *
 * @param finished соңғы қадамға дейін өтті ме. Жапқанда false — сонда
 *   статистикада «көрді» мен «аяқтады» бөлек тұрады.
 */
export async function completeTour(finished = false): Promise<void> {
  const user = await getUser();
  if (!user) return;

  const admin = createAdminClient();
  const patch: Record<string, unknown> = { tour_version: TOUR_VERSION };
  if (finished) patch.tour_completed_at = new Date().toISOString();

  await admin.from("profiles").update(patch).eq("id", user.id);
}

/** Профильден «қайта көру» — келесі бет жүктелгенде тур қайта басталады */
export async function restartTour(): Promise<void> {
  const user = await getUser();
  if (!user) return;

  const admin = createAdminClient();
  await admin.from("profiles").update({ tour_version: 0 }).eq("id", user.id);
}
