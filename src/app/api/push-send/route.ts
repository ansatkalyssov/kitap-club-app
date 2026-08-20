export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

async function sendToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  for (const sub of subs || []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch {
      await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    }
  }
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const admin = createAdminClient();
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const in3days = new Date(today);
  in3days.setDate(in3days.getDate() + 3);
  const in3daysStr = in3days.toISOString().split("T")[0];

  // 1. Кездесу еске салу (ертең болатын)
  const { data: meetings } = await admin
    .from("meetings")
    .select("*, clubs(name), club_members(user_id)")
    .gte("meeting_date", tomorrowStr)
    .lt("meeting_date", tomorrowStr + "T23:59:59");

  for (const meeting of meetings || []) {
    for (const member of meeting.clubs?.club_members || []) {
      await sendToUser(member.user_id, {
        title: "📚 Кездесу ертең!",
        body: `"${meeting.clubs?.name}" клубының кездесуі ертең өтеді`,
        url: `/clubs/${meeting.club_id}`,
      });
    }
  }

  // 2. Дедлайн 3 күн қалды
  const { data: trackers } = await admin
    .from("book_trackers")
    .select("*")
    .eq("is_completed", false)
    .eq("deadline", in3daysStr);

  for (const tracker of trackers || []) {
    await sendToUser(tracker.user_id, {
      title: "⏰ Дедлайн жақындады!",
      body: `"${tracker.book_title}" кітабын оқуға 3 күн қалды`,
      url: `/tracker/${tracker.id}`,
    });
  }

  // 3. Күнделікті трекер еске салу (барлық белсенді оқырмандарға)
  const { data: activeTrackers } = await admin
    .from("book_trackers")
    .select("user_id, book_title")
    .eq("is_completed", false);

  const notified = new Set<string>();
  for (const t of activeTrackers || []) {
    if (notified.has(t.user_id)) continue;
    notified.add(t.user_id);
    await sendToUser(t.user_id, {
      title: "📖 Бүгін оқыдыңыз ба?",
      body: `"${t.book_title}" — бүгінгі прогресті жазуды ұмытпаңыз`,
      url: "/tracker",
    });
  }

  return NextResponse.json({ ok: true, sent: notified.size });
}
