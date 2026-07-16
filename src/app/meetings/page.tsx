import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";

export default async function MeetingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  const { data: memberships } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", user.id);

  // Жүргізуші болса — өз клубтарын да қос
  const { data: managedClubs } = await supabase
    .from("clubs")
    .select("id")
    .eq("facilitator_id", user.id);

  const allClubIds = Array.from(
    new Set([
      ...(memberships?.map((m) => m.club_id) || []),
      ...(managedClubs?.map((c) => c.id) || []),
    ])
  );

  const { data: upcoming } = allClubIds.length
    ? await supabase
        .from("club_plans")
        .select("id, meeting_date, meeting_location, notes, books(title, author), clubs(id, name)")
        .in("club_id", allClubIds)
        .gte("meeting_date", today)
        .order("meeting_date", { ascending: true })
    : { data: null };

  const { data: past } = allClubIds.length
    ? await supabase
        .from("club_plans")
        .select("id, meeting_date, meeting_location, books(title, author), clubs(id, name)")
        .in("club_id", allClubIds)
        .lt("meeting_date", today)
        .order("meeting_date", { ascending: false })
        .limit(10)
    : { data: null };

  return (
    <AppShell>
      <div className="page-container max-w-xl">
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={14} /> Басты бет
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100">
            <CalendarDays size={20} className="text-primary-600" />
          </div>
          <div>
            <h1>Талқылар</h1>
            <p className="text-sm text-gray-500">Барлық кездесулер</p>
          </div>
        </div>

        {/* Алдағы талқылар */}
        <section className="mb-8">
          <h2 className="mb-4 text-base font-semibold text-gray-700">Алдағы</h2>
          {upcoming && upcoming.length > 0 ? (
            <div className="space-y-3">
              {(upcoming as any[]).map((plan, i) => {
                const [py, pm, pd] = plan.meeting_date.split("-").map(Number);
                const d = new Date(py, pm - 1, pd);
                const day = d.getDate();
                const month = d.toLocaleDateString("kk-KZ", { month: "short" }).replace(".", "").toUpperCase();
                const weekday = d.toLocaleDateString("kk-KZ", { weekday: "long" });
                const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
                const diffDays = Math.round((d.getTime() - todayMid.getTime()) / (1000 * 60 * 60 * 24));
                const isClose = diffDays <= 3;
                const isNext = i === 0;

                return (
                  <Link key={plan.id} href={`/clubs/${plan.clubs?.id}`}
                    className={`flex items-center gap-4 rounded-2xl border p-4 shadow-sm hover:shadow-md transition ${
                      isNext ? "border-primary-200 bg-primary-50/30" : "border-gray-100 bg-white"
                    }`}
                  >
                    <div className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-xl py-2.5 ${
                      isClose ? "bg-primary-600 text-white" : isNext ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      <span className="text-2xl font-extrabold leading-none">{day}</span>
                      <span className="mt-0.5 text-xs font-semibold tracking-wide">{month}</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 line-clamp-1">
                        {plan.books?.title ?? "Кітап белгіленбеген"}
                      </p>
                      {plan.books?.author && (
                        <p className="text-xs text-gray-400">{plan.books.author}</p>
                      )}
                      <p className="mt-0.5 text-xs text-gray-500">{plan.clubs?.name}</p>
                      {plan.meeting_location && (
                        <p className="mt-1 text-xs text-primary-600">📍 {plan.meeting_location}</p>
                      )}
                      <p className="mt-0.5 text-xs text-gray-400 capitalize">{weekday}</p>
                    </div>

                    <span className={`shrink-0 text-xs font-semibold ${
                      diffDays === 0 ? "text-primary-600" : isClose ? "text-yellow-600" : "text-gray-400"
                    }`}>
                      {diffDays === 0 ? "Бүгін!" : diffDays === 1 ? "Ертең" : `${diffDays} күн`}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="card text-center py-10 text-gray-400 text-sm">
              Жоспарланған талқы жоқ
            </div>
          )}
        </section>

        {/* Өткен талқылар */}
        {past && past.length > 0 && (
          <section>
            <h2 className="mb-4 text-base font-semibold text-gray-400">Өткен</h2>
            <div className="space-y-2">
              {(past as any[]).map((plan) => {
                const d = new Date(plan.meeting_date);
                const day = d.getDate();
                const month = d.toLocaleDateString("kk-KZ", { month: "short" }).replace(".", "").toUpperCase();
                return (
                  <Link key={plan.id} href={`/clubs/${plan.clubs?.id}`}
                    className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-3 opacity-50 hover:opacity-80 transition"
                  >
                    <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-gray-100 py-2 text-gray-500">
                      <span className="text-lg font-bold leading-none">{day}</span>
                      <span className="text-[10px] font-medium">{month}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 line-clamp-1">
                        {plan.books?.title ?? "—"}
                      </p>
                      <p className="text-xs text-gray-400">{plan.clubs?.name}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
