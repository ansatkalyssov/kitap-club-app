"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Play, Pause, Square, RefreshCw, X } from "lucide-react";
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
  const [focusMode, setFocusMode] = useState(false);
  const [clockTime, setClockTime] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<any>(null);

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

  useEffect(() => {
    function tick() {
      const now = new Date();
      setClockTime(
        now.toLocaleTimeString("kk-KZ", { hour: "2-digit", minute: "2-digit" })
      );
    }
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  const sessionMinutes = Math.floor(elapsedSec / 60);
  const sessionDisplay = `${Math.floor(elapsedSec / 60).toString().padStart(2, "0")}:${(elapsedSec % 60).toString().padStart(2, "0")}`;
  const totalMinutes = todayMinutes + sessionMinutes;
  const progress = goalMinutes > 0 ? Math.min(100, Math.round((totalMinutes / goalMinutes) * 100)) : 0;
  const goalReached = goalMinutes > 0 && totalMinutes >= goalMinutes;

  async function acquireWakeLock() {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
      }
    } catch {}
  }

  function releaseWakeLock() {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }

  async function enterFocusMode() {
    setRunning(true);
    setFocusMode(true);
    await acquireWakeLock();
  }

  function exitFocusMode() {
    setRunning(false);
    setFocusMode(false);
    releaseWakeLock();
  }

  async function togglePause() {
    if (running) {
      setRunning(false);
      releaseWakeLock();
    } else {
      setRunning(true);
      await acquireWakeLock();
    }
  }

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
    releaseWakeLock();
    setRunning(false);
    setElapsedSec(0);
    setFocusMode(false);
    toast.success(`${sessionMinutes} минут сақталды!`);
    router.refresh();
  }

  if (focusMode) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#18120c]">
        <button
          onClick={exitFocusMode}
          className="absolute right-5 top-5 rounded-full p-2 text-[#7a6245] transition hover:text-[#c9a96e]"
          aria-label="Фокус режимінен шығу"
        >
          <X size={22} />
        </button>

        <p className="mb-10 font-medium tabular-nums text-[#7a6245] text-xl">{clockTime}</p>

        <p className="text-7xl font-bold tabular-nums text-[#f0d8a0] tracking-tight">
          {sessionDisplay}
        </p>

        <p className="mt-4 text-sm text-[#7a6245]">
          Бүгін барлығы:{" "}
          <span className="text-[#c9a96e] font-medium">{totalMinutes} мин</span>
          {goalMinutes > 0 && <span> / {goalMinutes} мин</span>}
        </p>

        {goalReached && (
          <p className="mt-3 text-sm font-semibold text-emerald-400">Мақсат орындалды ✓</p>
        )}

        <div className="mt-16 flex gap-4">
          <button
            onClick={togglePause}
            className="flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-semibold text-[#18120c] transition active:scale-95"
            style={{ backgroundColor: running ? "#c9a96e" : "#f0d8a0" }}
          >
            {running ? <Pause size={18} /> : <Play size={18} />}
            {running ? "Кідірту" : "Жалғастыру"}
          </button>

          <button
            onClick={handleFinish}
            disabled={saving}
            className="flex items-center gap-2 rounded-2xl border border-[#3a2e1e] px-8 py-4 text-base font-semibold text-[#c9a96e] transition hover:border-[#c9a96e] active:scale-95"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Square size={18} />}
            Аяқтау
          </button>
        </div>
      </div>
    );
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
        <button type="button" onClick={enterFocusMode} className="btn-primary flex-1">
          <Play size={16} /> {elapsedSec > 0 ? "Жалғастыру" : "Бастау"}
        </button>
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
