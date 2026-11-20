"use server";

import { getUser } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";

/** Клуб кітабы бойынша үлгерімдегі орын — прогресті сақтаған сәтте */
export type Standing = {
  /** Үлгерім тізімі тұрған жоспар беті */
  planUrl: string;
  /** Осы жолы басып озылған оқырман саны */
  overtaken: number;
  /** Алда тұрған ең жақын адамға дейінгі бет */
  next: { gap: number } | null;
  /** Осы жолы бірінші орынға шықты */
  first: boolean;
};

/**
 * Бет енгізілгеннен кейін оқырманның клубтағы орнын есептейді.
 *
 * Үлгерім тізімі бір кітапты оқитындарды бет саны бойынша ретке қояды
 * (бәрінде бет саны бірдей, сондықтан пайыз бен бет — бір рет). Басып
 * озу — бұрын беті сенікіндей не көп болған адамнан енді көп болу.
 *
 * Әлі бір бет те белгілемегендер саналмайды: әйтпесе алғаш бет енгізген
 * адам кітапты ашпаған бүкіл клубты «басып озып» шығар еді. Хабарламада
 * есім жазылмайды — тек сан.
 *
 * @param prevPage сақтамас бұрынғы бет — клиенттен келеді, бірақ одан
 *   ұпай не дерек өзгермейді: тек хабарламаның мәтіні.
 */
export async function getPlanStanding(
  trackerId: string,
  prevPage: number
): Promise<Standing | null> {
  const user = await getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: tracker } = await admin
    .from("book_trackers")
    .select("user_id, club_plan_id, current_page")
    .eq("id", trackerId)
    .single();
  if (!tracker || tracker.user_id !== user.id || !tracker.club_plan_id) return null;

  const { data: plan } = await admin
    .from("club_plans")
    .select("id, club_id")
    .eq("id", tracker.club_plan_id)
    .single();
  if (!plan) return null;

  // Тізімдегідей — тек клуб мүшелері
  const { data: members } = await admin
    .from("club_members")
    .select("user_id")
    .eq("club_id", plan.club_id);
  const memberIds = (members ?? []).map((m) => m.user_id).filter((id) => id !== user.id);

  const { data: others } = memberIds.length
    ? await admin
        .from("book_trackers")
        .select("user_id, current_page")
        .eq("club_plan_id", plan.id)
        .in("user_id", memberIds)
    : { data: [] as { user_id: string; current_page: number }[] };

  const now = tracker.current_page;
  const rows = others ?? [];

  const overtaken = rows.filter(
    (o) => o.current_page > 0 && o.current_page >= prevPage && o.current_page < now
  ).length;
  const nearest = rows
    .filter((o) => o.current_page > now)
    .reduce<number | null>((min, o) => (min === null || o.current_page < min ? o.current_page : min), null);

  // Бірінші орын — тек жаңа шыққан сәтте. Бұрын біреу алда не қатар
  // тұрса не адам енді ғана бастаса — бұл жаңалық; ал бұрын да жалғыз алда
  // болса, әр сақтаған сайын қайталанбайды.
  const wasBehind =
    prevPage === 0 || rows.some((o) => o.current_page > 0 && o.current_page >= prevPage);

  return {
    planUrl: `/clubs/${plan.club_id}/plan/${plan.id}`,
    overtaken,
    next: nearest !== null ? { gap: nearest - now } : null,
    first: nearest === null && now > 0 && wasBehind,
  };
}
