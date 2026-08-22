"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
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
  const [minutes, setMinutes] = useState(existingGoal?.daily_minutes?.toString() || "30");
  const [reminderEnabled, setReminderEnabled] = useState(existingGoal?.reminder_enabled ?? true);
  const [reminderTime, setReminderTime] = useState(existingGoal?.reminder_time?.slice(0, 5) || "20:00");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const value = parseInt(minutes);
    if (!value || value <= 0) {
      toast.error("Мақсатты дұрыс енгізіңіз");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("reading_goals").upsert(
      {
        user_id: userId,
        goal_type: "time",
        daily_minutes: value,
        reminder_enabled: reminderEnabled,
        reminder_time: reminderTime,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    setLoading(false);

    if (error) {
      toast.error("Сақталмады: " + error.message);
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
