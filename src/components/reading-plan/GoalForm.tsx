"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { RefreshCw, Clock, BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import { ReadingGoal } from "@/lib/types";

interface Props {
  userId: string;
  existingGoal?: ReadingGoal | null;
}

export default function GoalForm({ userId, existingGoal }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [goalType, setGoalType] = useState<"time" | "pages">(existingGoal?.goal_type || "time");
  const [minutes, setMinutes] = useState(existingGoal?.daily_minutes?.toString() || "30");
  const [pages, setPages] = useState(existingGoal?.daily_pages?.toString() || "30");
  const [reminderEnabled, setReminderEnabled] = useState(existingGoal?.reminder_enabled ?? true);
  const [reminderTime, setReminderTime] = useState(existingGoal?.reminder_time?.slice(0, 5) || "20:00");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const value = goalType === "time" ? parseInt(minutes) : parseInt(pages);
    if (!value || value <= 0) {
      toast.error("Мақсатты дұрыс енгізіңіз");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("reading_goals").upsert(
      {
        user_id: userId,
        goal_type: goalType,
        daily_minutes: goalType === "time" ? value : existingGoal?.daily_minutes ?? null,
        daily_pages: goalType === "pages" ? value : existingGoal?.daily_pages ?? null,
        reminder_enabled: reminderEnabled,
        reminder_time: reminderTime,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    setLoading(false);

    if (error) {
      toast.error("Сақталмады");
      return;
    }

    toast.success("Жоспар сақталды!");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5">
      {!existingGoal && (
        <div>
          <h3 className="mb-1">Оқу мақсатыңызды таңдаңыз</h3>
          <p className="text-sm text-gray-500">
            Күн сайын кітап оқу әдетін қалыптастыруға көмектесеміз
          </p>
        </div>
      )}

      {/* Goal type selector */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setGoalType("time")}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition ${
            goalType === "time" ? "border-primary-500 bg-primary-50" : "border-gray-100 hover:border-gray-200"
          }`}
        >
          <Clock size={22} className={goalType === "time" ? "text-primary-600" : "text-gray-400"} />
          <span className={`text-sm font-semibold ${goalType === "time" ? "text-primary-700" : "text-gray-600"}`}>
            Уақыт бойынша
          </span>
        </button>
        <button
          type="button"
          onClick={() => setGoalType("pages")}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition ${
            goalType === "pages" ? "border-primary-500 bg-primary-50" : "border-gray-100 hover:border-gray-200"
          }`}
        >
          <BookOpen size={22} className={goalType === "pages" ? "text-primary-600" : "text-gray-400"} />
          <span className={`text-sm font-semibold ${goalType === "pages" ? "text-primary-700" : "text-gray-600"}`}>
            Бет саны бойынша
          </span>
        </button>
      </div>

      {/* Value input */}
      {goalType === "time" ? (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Күніне неше минут оқисыз? <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              min={5}
              step={5}
              className="input"
              required
            />
            <span className="shrink-0 text-sm text-gray-500">минут</span>
          </div>
          <div className="mt-2 flex gap-2">
            {[15, 30, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m.toString())}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
              >
                {m} мин
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Күніне неше бет оқисыз? <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={pages}
              onChange={(e) => setPages(e.target.value)}
              min={1}
              className="input"
              required
            />
            <span className="shrink-0 text-sm text-gray-500">бет</span>
          </div>
          <div className="mt-2 flex gap-2">
            {[10, 20, 30, 50].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPages(p.toString())}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
              >
                {p} бет
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reminder */}
      <div className="rounded-xl border border-gray-100 p-4">
        <label className="flex cursor-pointer items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Еске салғыш</p>
            <p className="mt-0.5 text-xs text-gray-400">Мобильді қосымша шыққанда іске қосылады</p>
          </div>
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
            className="h-5 w-5 rounded accent-primary-600"
          />
        </label>
        {reminderEnabled && (
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className="input mt-3"
          />
        )}
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading && <RefreshCw size={16} className="animate-spin" />}
        {existingGoal ? "Жаңарту" : "Жоспарды сақтау"}
      </button>
    </form>
  );
}
