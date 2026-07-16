import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/queries";
import AppShell from "@/components/layout/AppShell";
import { Target, Flame } from "lucide-react";
import GoalForm from "@/components/reading-plan/GoalForm";
import ReadingTimer from "@/components/reading-plan/ReadingTimer";
import LogPagesForm from "@/components/reading-plan/LogPagesForm";
import { calcReadingStreak, formatDateKz } from "@/lib/utils";

export default async function ReadingPlanPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();

  const { data: goal } = await supabase
    .from("reading_goals")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const today = new Date().toISOString().split("T")[0];

  const { data: logs } = await supabase
    .from("reading_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(30);

  const todayLog = (logs || []).find((l) => l.date === today) || null;
  const target = goal ? (goal.goal_type === "time" ? goal.daily_minutes : goal.daily_pages) || 0 : 0;
  const streak = goal ? calcReadingStreak(logs || [], goal.goal_type, target) : 0;

  return (
    <AppShell>
      <div className="page-container max-w-xl">
        <div className="mb-6">
          <h1>Күнделікті оқу</h1>
          <p className="mt-0.5 text-sm text-gray-500">Жеке оқу жоспарыңызды бақылаңыз</p>
        </div>

        {!goal ? (
          <GoalForm userId={user.id} />
        ) : (
          <div className="space-y-5">
            {/* Goal summary + streak */}
            <div className="card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Target size={20} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    Күніне{" "}
                    {goal.goal_type === "time" ? `${goal.daily_minutes} минут` : `${goal.daily_pages} бет`}
                  </p>
                  <p className="text-xs text-gray-500">Жеке мақсат</p>
                </div>
              </div>
              {streak > 0 && (
                <div className="flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-600">
                  <Flame size={15} />
                  {streak} күн
                </div>
              )}
            </div>

            {/* Today's progress */}
            {goal.goal_type === "time" ? (
              <ReadingTimer
                userId={user.id}
                date={today}
                todayMinutes={todayLog?.minutes_read || 0}
                todayPages={todayLog?.pages_read || 0}
                goalMinutes={goal.daily_minutes || 0}
              />
            ) : (
              <LogPagesForm
                userId={user.id}
                date={today}
                todayPages={todayLog?.pages_read || 0}
                todayMinutes={todayLog?.minutes_read || 0}
                goalPages={goal.daily_pages || 0}
              />
            )}

            {/* History */}
            {logs && logs.length > 0 && (
              <div>
                <h2 className="mb-3">Соңғы күндер</h2>
                <div className="card divide-y divide-gray-50">
                  {logs.slice(0, 7).map((l) => {
                    const value = goal.goal_type === "time" ? l.minutes_read : l.pages_read;
                    const met = target > 0 && value >= target;
                    return (
                      <div key={l.id} className="flex items-center justify-between py-2.5">
                        <span className="text-sm text-gray-700">{formatDateKz(l.date)}</span>
                        <span className={`text-sm font-medium ${met ? "text-primary-600" : "text-gray-400"}`}>
                          {goal.goal_type === "time" ? `${l.minutes_read} мин` : `${l.pages_read} бет`}
                          {met && " ✓"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Edit goal */}
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-1 text-sm text-gray-500 select-none hover:text-gray-700">
                Мақсатты өзгерту
              </summary>
              <div className="mt-3">
                <GoalForm userId={user.id} existingGoal={goal} />
              </div>
            </details>
          </div>
        )}
      </div>
    </AppShell>
  );
}
