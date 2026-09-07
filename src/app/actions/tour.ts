"use server";

import { getUser } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOUR_VERSION } from "@/lib/tour";

/**
 * Тур көрілді деп белгілейді. Аяқтағанда да, «Керек емес» деп жапқанда да
 * шақырылады — екеуінде де қайта көрсетудің қажеті жоқ.
 */
export async function completeTour(): Promise<void> {
  const user = await getUser();
  if (!user) return;

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ tour_version: TOUR_VERSION })
    .eq("id", user.id);
}

/** Профильден «қайта көру» — келесі бет жүктелгенде тур қайта басталады */
export async function restartTour(): Promise<void> {
  const user = await getUser();
  if (!user) return;

  const admin = createAdminClient();
  await admin.from("profiles").update({ tour_version: 0 }).eq("id", user.id);
}
