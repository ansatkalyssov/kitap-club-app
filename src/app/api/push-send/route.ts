export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { kzDateStr } from "@/lib/utils";

// Жіберу нәтижесі жиналып отырады — әйтпесе қате үнсіз жоғалады да,
// жауап хабар жеткендей әсер қалдырады. Есеп әр сұрауда жаңадан
// жасалады: модуль деңгейінде тұрса, serverless данасы қайта
// пайдаланылғанда сандар жиналып кетер еді.
type Report = { attempted: number; delivered: number; errors: string[] };

async function sendToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
  report: Report
) {
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  for (const sub of subs || []) {
    report.attempted++;
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
      report.delivered++;
    } catch (e: any) {
      const status = e?.statusCode;
      report.errors.push(`${status ?? "?"}: ${e?.body || e?.message || "белгісіз"}`);

      // Тек шынымен өлген жазылымды өшіреміз. Бұрын кез келген қатеде
      // өшіріліп, жарамды жазылымдар да жоғалып кететін.
      if (status === 404 || status === 410) {
        await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
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

  const report: Report = { attempted: 0, delivered: 0, errors: [] };

  // Сынақ режимі: ?test=<user_id> — сүзгілерді айналып өтіп, сол адамға
  // бірден хабар жібереді. Жеткізу тізбегін тексеру үшін.
  const testUser = req.nextUrl.searchParams.get("test");
  if (testUser) {
    await sendToUser(
      testUser,
      {
        title: "Сынақ хабарламасы",
        body: "Хабарландыру жүйесі жұмыс істеп тұр",
        url: "/dashboard",
      },
      report
    );
    return NextResponse.json({ ok: true, mode: "test", ...report });
  }

  // Терезе режимі: ?window=<минут> — cron сол аралықпен шақырылады, ал код
  // уақыты дәл сол терезеге түскендерге ғана жібереді. Мысалы 15 минуттық
  // cron-да 19:50 қойған адам 19:45–20:00 шақыруында хабар алады.
  // ?mode=hourly — ескі баптаудың баламасы, 60 минуттық терезе.
  // Параметрсіз шақыру — күндік режим, бәріне бірдей.
  const sp = req.nextUrl.searchParams;
  const windowMin =
    Number(sp.get("window")) || (sp.get("mode") === "hourly" ? 60 : 0);

  const [nowH, nowM] = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Almaty",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .split(":")
    .map(Number);
  const nowMin = nowH * 60 + nowM;

  /** Белгіленген уақыт ағымдағы терезеге түсе ме (түн ортасынан өтуді ескереді) */
  const inWindow = (targetMin: number) =>
    (nowMin - targetMin + 1440) % 1440 < windowMin;

  // Талқы мен дедлайн хабарлары күнге байланған, уақытқа емес. Терезе
  // режимінде оларды тәулігіне бір рет — 19:00 терезесінде — жіберeміз,
  // әйтпесе әр шақыруда қайталанар еді.
  const sendDateBased = windowMin === 0 || inWindow(19 * 60);

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
  const { data: plans } = sendDateBased
    ? await admin
        .from("club_plans")
        .select("id, club_id, clubs(name), books(title)")
        .eq("meeting_date", tomorrowStr)
    : { data: null };

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
      }, report);
    }
  }

  // 2. Дедлайн 3 күн қалды.
  // Бір адамға бір хабар: бір күні бітетін бірнеше трекері болса,
  // бөлек-бөлек емес, жинақталып жіберіледі.
  const { data: trackers } = sendDateBased
    ? await admin
        .from("book_trackers")
        .select("id, user_id, book_title")
        .eq("is_completed", false)
        .eq("deadline", in3daysStr)
    : { data: null };

  const dueByUser = new Map<string, { id: string; title: string }[]>();
  for (const t of trackers || []) {
    const list = dueByUser.get(t.user_id) ?? [];
    list.push({ id: t.id, title: t.book_title });
    dueByUser.set(t.user_id, list);
  }

  for (const [userId, books] of Array.from(dueByUser.entries())) {
    await sendToUser(userId, {
      title: "Дедлайн жақындады",
      body:
        books.length === 1
          ? `«${books[0].title}» кітабын оқуға 3 күн қалды`
          : `${books.length} кітаптың дедлайнына 3 күн қалды`,
      // Бір кітап болса — сол трекерге, бірнешеу болса тізімге
      url: books.length === 1 ? `/tracker/${books[0].id}` : "/tracker",
    }, report);
  }

  // 3. Күнделікті еске салу — тек мақсатын әлі орындамағандарға.
  // Бүгін оқып қойған адамды мазалаудың қажеті жоқ.
  const todayStr = kzDateStr(today);

  const [{ data: goals }, { data: todayLogs }] = await Promise.all([
    admin
      .from("reading_goals")
      .select("user_id, daily_minutes, reminder_time")
      .eq("reminder_enabled", true),
    admin.from("reading_logs").select("user_id, minutes_read").eq("date", todayStr),
  ]);


  const minutesToday = new Map((todayLogs || []).map((l) => [l.user_id, l.minutes_read]));

  const notified = new Set<string>();
  for (const goal of goals || []) {
    const target = goal.daily_minutes ?? 0;
    if (!target) continue;
    if ((minutesToday.get(goal.user_id) ?? 0) >= target) continue;
    if (notified.has(goal.user_id)) continue;

    // Терезе режимінде тек уақыты дәл келгендерге. reminder_time — "19:50:00"
    if (windowMin > 0) {
      const [gh, gm] = String(goal.reminder_time ?? "")
        .split(":")
        .map(Number);
      if (!Number.isFinite(gh) || !Number.isFinite(gm)) continue;
      if (!inWindow(gh * 60 + gm)) continue;
    }

    notified.add(goal.user_id);
    await sendToUser(goal.user_id, {
      title: "Oqyrman",
      body: `Бүгінгі кітап оқу мақсатыңызды орындаңыз - ${target} минут`,
      url: "/reading-plan",
    }, report);
  }

  return NextResponse.json({
    ok: true,
    users: notified.size,
    attempted: report.attempted,
    delivered: report.delivered,
    errors: report.errors.slice(0, 5),
  });
}
