export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { kzDateStr } from "@/lib/utils";

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
  // Vercel Cron "Authorization: Bearer <CRON_SECRET>" жібереді.
  // x-cron-secret қолмен тексеру үшін қалдырылған.
  const expected = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  const custom = req.headers.get("x-cron-secret");

  if (!expected || (bearer !== expected && custom !== expected)) {
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
  const tomorrowStr = kzDateStr(tomorrow);
  const in3days = new Date(today);
  in3days.setDate(in3days.getDate() + 3);
  const in3daysStr = kzDateStr(in3days);

  // 1. Талқы еске салу (ертең болатын).
  // Талқы күні бөлек кесте емес, club_plans.meeting_date бағанында тұр.
  const { data: plans } = await admin
    .from("club_plans")
    .select("id, club_id, clubs(name), books(title)")
    .eq("meeting_date", tomorrowStr);

  for (const plan of plans || []) {
    const { data: members } = await admin
      .from("club_members")
      .select("user_id")
      .eq("club_id", plan.club_id);

    const bookTitle = (plan.books as any)?.title;
    for (const member of members || []) {
      await sendToUser(member.user_id, {
        title: "Талқы ертең",
        body: bookTitle
          ? `«${bookTitle}» — ${(plan.clubs as any)?.name} клубында ертең талқыланады`
          : `${(plan.clubs as any)?.name} клубының талқысы ертең өтеді`,
        url: `/clubs/${plan.club_id}/plan/${plan.id}`,
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
      title: "Дедлайн жақындады",
      body: `«${tracker.book_title}» кітабын оқуға 3 күн қалды`,
      url: `/tracker/${tracker.id}`,
    });
  }

  // 3. Күнделікті еске салу — тек мақсатын әлі орындамағандарға.
  // Бүгін оқып қойған адамға «Бүгін оқыдыңыз ба?» деп жіберу — қажетсіз шу.
  const todayStr = kzDateStr(today);

  const [{ data: goals }, { data: todayLogs }, { data: activeTrackers }] = await Promise.all([
    admin.from("reading_goals").select("user_id, daily_minutes").eq("reminder_enabled", true),
    admin.from("reading_logs").select("user_id, minutes_read").eq("date", todayStr),
    admin.from("book_trackers").select("user_id, book_title").eq("is_completed", false),
  ]);

  const minutesToday = new Map((todayLogs || []).map((l) => [l.user_id, l.minutes_read]));
  const bookByUser = new Map<string, string>();
  for (const t of activeTrackers || []) {
    if (!bookByUser.has(t.user_id)) bookByUser.set(t.user_id, t.book_title);
  }

  const notified = new Set<string>();
  for (const goal of goals || []) {
    const target = goal.daily_minutes ?? 0;
    if (!target) continue;
    if ((minutesToday.get(goal.user_id) ?? 0) >= target) continue;
    if (notified.has(goal.user_id)) continue;

    notified.add(goal.user_id);
    const book = bookByUser.get(goal.user_id);
    await sendToUser(goal.user_id, {
      title: "Бүгін оқыдыңыз ба?",
      body: book
        ? `«${book}» сізді күтіп тұр. Бүгінгі мақсат — ${target} минут.`
        : `Бүгінгі мақсат — ${target} минут.`,
      url: "/reading-plan",
    });
  }

  return NextResponse.json({ ok: true, sent: notified.size });
}
