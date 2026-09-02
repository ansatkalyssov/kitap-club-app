"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { ReadingGoal } from "@/lib/types";
import {
  isPushSupported,
  requestPushPermission,
  subscribePush,
  type PushResult,
} from "@/lib/push";

interface Props {
  userId: string;
  existingGoal?: ReadingGoal | null;
  onSaved?: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

/**
 * Уақытты ең жақын ширекке келтіреді.
 * Хабарландыру cron-ы 15 минут сайын жүреді, сондықтан 19:50 деп қойған
 * адам бәрібір 20:00-де алады. Таңдауды сол қадамға сәйкестендіреміз.
 */
function snapTo15(time: string): string {
  const [h, m] = (time || "20:00").split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "20:00";
  const q = Math.round(m / 15) * 15;
  const hour = q === 60 ? (h + 1) % 24 : h;
  const min = q === 60 ? 0 : q;
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export default function GoalForm({ userId, existingGoal, onSaved }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [minutes, setMinutes] = useState(existingGoal?.daily_minutes?.toString() || "30");
  const [reminderEnabled, setReminderEnabled] = useState(existingGoal?.reminder_enabled ?? true);
  const [reminderTime, setReminderTime] = useState(
    snapTo15(existingGoal?.reminder_time?.slice(0, 5) || "20:00")
  );
  const [reminderHour, reminderMinute] = reminderTime.split(":");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const value = parseInt(minutes);
    if (!value || value <= 0) {
      toast.error("Мақсатты дұрыс енгізіңіз");
      return;
    }

    // Рұқсатты сақтаудан БҰРЫН сұраймыз: iOS рұқсатты тікелей басу
    // әрекетінен ғана береді, арасында await болса қабылданбайды.
    // Рұқсат бұрын берілген болса, функция бірден ok қайтарады.
    const pushAsked: PushResult | null =
      reminderEnabled && isPushSupported() ? await requestPushPermission() : null;

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

    // Рұқсат алынған соң жазылымды жасаймыз
    if (pushAsked?.ok) {
      const res = await subscribePush();
      if (res.ok) toast.success("Еске салғыш қосылды", { icon: "🔔" });
      else toast.error("Еске салғыш қосылмады: " + res.reason, { duration: 6000 });
    } else if (pushAsked && !pushAsked.ok) {
      toast.error(pushAsked.reason, { duration: 8000 });
    }

    onSaved?.();
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
            <p className="mt-0.5 text-xs text-gray-400">
              Мақсатты орындамасаңыз кешке хабарландыру келеді
            </p>
          </div>
          <input
            type="checkbox"
            checked={reminderEnabled}
            onChange={(e) => setReminderEnabled(e.target.checked)}
            className="h-5 w-5 rounded accent-primary-600"
          />
        </label>
        {reminderEnabled && (
          <div className="mt-3 flex items-center gap-2">
            <select
              value={reminderHour}
              onChange={(e) => setReminderTime(`${e.target.value}:${reminderMinute}`)}
              className="input flex-1"
              aria-label="Сағат"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>

            <span className="text-gray-400">:</span>

            <select
              value={reminderMinute}
              onChange={(e) => setReminderTime(`${reminderHour}:${e.target.value}`)}
              className="input flex-1"
              aria-label="Минут"
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading && <RefreshCw size={16} className="animate-spin" />}
        {existingGoal ? "Жаңарту" : "Жоспарды сақтау"}
      </button>
    </form>
  );
}
