"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Play, Pause, Square, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import ProgressBar from "@/components/ui/ProgressBar";

interface Props {
  userId: string;
  date: string;
  todayMinutes: number;
  todayPages: number;
  goalMinutes: number;
}

export default function ReadingTimer({ userId, date, todayMinutes, todayPages, goalMinutes }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [running, setRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const sessionMinutes = Math.floor(elapsedSec / 60);
  const sessionDisplay = `${Math.floor(elapsedSec / 60)
    .toString()
    .padStart(2, "0")}:${(elapsedSec % 60).toString().padStart(2, "0")}`;
  const totalMinutes = todayMinutes + sessionMinutes;
  const progress = goalMinutes > 0 ? Math.min(100, Math.round((totalMinutes / goalMinutes) * 100)) : 0;
  const goalReached = goalMinutes > 0 && totalMinutes >= goalMinutes;

  async function handleFinish() {
    if (sessionMinutes < 1) {
      toast.error("Кемінде 1 минут оқыңыз");
      return;
    }
    setSaving(true);
    const newMinutes = todayMinutes + sessionMinutes;
    const { error } = await supabase
      .from("reading_logs")
      .upsert(
        { user_id: userId, date, minutes_read: newMinutes, pages_read: todayPages },
        { onConflict: "user_id,date" }
      );
    setSaving(false);
    if (error) {
      toast.error("Сақталмады");
      return;
    }
    setRunning(false);
    setElapsedSec(0);
    toast.success(`${sessionMinutes} минут сақталды!`);
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3>Бүгінгі оқу уақыты</h3>
        {goalReached && <span className="badge-green">Мақсат орындалды ✓</span>}
      </div>

      <div className="text-center">
        <p className="text-4xl font-bold tabular-nums text-primary-700">{sessionDisplay}</p>
        <p className="mt-1 text-sm text-gray-500">
          Бүгін: {totalMinutes} / {goalMinutes} минут
        </p>
      </div>

      <ProgressBar value={progress} showLabel={false} />

      <div className="flex gap-2">
        {!running ? (
          <button type="button" onClick={() => setRunning(true)} className="btn-primary flex-1">
            <Play size={16} /> {elapsedSec > 0 ? "Жалғастыру" : "Бастау"}
          </button>
        ) : (
          <button type="button" onClick={() => setRunning(false)} className="btn-secondary flex-1">
            <Pause size={16} /> Кідірту
          </button>
        )}
        <button
          type="button"
          onClick={handleFinish}
          disabled={saving || elapsedSec === 0}
          className="btn-ghost flex-1"
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Square size={16} />}
          Аяқтау
        </button>
      </div>
    </div>
  );
}
