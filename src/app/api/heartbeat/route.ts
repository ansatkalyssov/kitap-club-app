export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getUser } from "@/lib/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { kzDateStr } from "@/lib/utils";

/**
 * «Мен осындамын» белгісі.
 *
 * Қолданба ашық тұрғанда клиент осыны сирек шақырады. Екі нәрсе
 * жазылады: сол күнгі кіру белгісі (user_visits) және соңғы көрінген
 * уақыт (profiles.last_seen_at).
 *
 * Күн — Алматы уақыты бойынша, әйтпесе кешкі кіру келесі күнге
 * жазылып кетер еді.
 */
export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = createAdminClient();
  const today = kzDateStr();

  // Бір адамға бір күнде бір жол — құрама кілт қайталауға жол бермейді
  const [visit, profile] = await Promise.all([
    admin
      .from("user_visits")
      .upsert({ user_id: user.id, date: today }, { onConflict: "user_id,date" }),
    admin
      .from("profiles")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", user.id),
  ]);

  if (visit.error || profile.error) {
    // Статистика қолданбаның жұмысына әсер етпеуі керек — тыныш өтеміз
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
