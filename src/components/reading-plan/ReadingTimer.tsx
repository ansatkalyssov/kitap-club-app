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
  goalMinutes: number;
}

// Таймер басталған уақытты localStorage-та сақтаймыз
const TIMER_KEY = "reading_timer_start_ts";

export default function ReadingTimer({ userId, date, todayMinutes, goalMinutes }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [running, setRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [saving, setSaving] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [clockTime, setClockTime] = useState("");

  // Tracker update modal
  const [showModal, setShowModal] = useState(false);
  const [trackers, setTrackers] = useState<any[]>([]);
  const [selectedTrackerId, setSelectedTrackerId] = useState("");
  const [newPage, setNewPage] = useState("");
  const [modalSaving, setModalSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<any>(null);
  // startTs = Date.now() - elapsedSec*1000 кезіндегі мән (pause ескеріледі)
  const startTsRef = useRef<number | null>(null);

  // Уақытты startTs-тен есептеп жаңарту
  function recalcElapsed() {
    if (startTsRef.current !== null) {
      setElapsedSec(Math.floor((Date.now() - startTsRef.current) / 1000));
    }
  }

  // Interval
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(recalcElapsed, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  // Қолданбаға оралғанда уақытты қайта есептеу
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible" && running) {
        recalcElapsed();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [running]);

  // Сағат
  useEffect(() => {
    function tick() {
      const now = new Date();
      setClockTime(now.toLocaleTimeString("kk-KZ", { hour: "2-digit", minute: "2-digit" }));
    }
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  const sessionMinutes = Math.floor(elapsedSec / 60);
  const mm = Math.floor(elapsedSec / 60).toString().padStart(2, "0");
  const ss = (elapsedSec % 60).toString().padStart(2, "0");
  const sessionDisplay = `${mm}:${ss}`;
  const totalMinutes = todayMinutes + sessionMinutes;
  const progress = goalMinutes > 0 ? Math.min(100, Math.round((totalMinutes / goalMinutes) * 100)) : 0;
  const goalReached = goalMinutes > 0 && totalMinutes >= goalMinutes;
  const minutesLeft = Math.max(0, goalMinutes - totalMinutes);

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

  function startTimer(currentElapsed: number) {
    // Adjusted start time to account for already-elapsed seconds
    startTsRef.current = Date.now() - currentElapsed * 1000;
    localStorage.setItem(TIMER_KEY, String(startTsRef.current));
    setRunning(true);
  }

  function pauseTimer() {
    startTsRef.current = null;
    localStorage.removeItem(TIMER_KEY);
    setRunning(false);
  }

  function clearTimer() {
    startTsRef.current = null;
    localStorage.removeItem(TIMER_KEY);
    setRunning(false);
    setElapsedSec(0);
  }

  async function enterFocusMode() {
    startTimer(elapsedSec);
    setFocusMode(true);
    await acquireWakeLock();
  }

  function exitFocusMode() {
    pauseTimer();
    setFocusMode(false);
    releaseWakeLock();
  }

  async function togglePause() {
    if (running) {
      pauseTimer();
      releaseWakeLock();
    } else {
      startTimer(elapsedSec);
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
        { user_id: userId, date, minutes_read: newMinutes },
        { onConflict: "user_id,date" }
      );
    setSaving(false);
    if (error) {
      toast.error("Сақталмады");
      return;
    }
    releaseWakeLock();
    clearTimer();
    setFocusMode(false);
    toast.success(`${sessionMinutes} минут сақталды!`);
    router.refresh();

    // Fetch active trackers for the update modal
    const { data: activeTrackers } = await supabase
      .from("book_trackers")
      .select("id, book_title, book_author, current_page, total_pages")
      .eq("user_id", userId)
      .eq("is_completed", false)
      .order("created_at", { ascending: false });

    if (activeTrackers && activeTrackers.length > 0) {
      setTrackers(activeTrackers);
      setSelectedTrackerId(activeTrackers[0].id);
      setNewPage(String(activeTrackers[0].current_page || ""));
      setShowModal(true);
    }
  }

  async function handleModalSave() {
    const page = parseInt(newPage);
    if (!selectedTrackerId || isNaN(page) || page < 0) {
      toast.error("Бетті дұрыс енгізіңіз");
      return;
    }
    const tracker = trackers.find((t) => t.id === selectedTrackerId);
    const isCompleted = tracker && tracker.total_pages > 0 && page >= tracker.total_pages;
    setModalSaving(true);
    const { error } = await supabase
      .from("book_trackers")
      .update({
        current_page: page,
        ...(isCompleted ? { is_completed: true } : {}),
      })
      .eq("id", selectedTrackerId);
    setModalSaving(false);
    if (error) {
      toast.error("Жаңартылмады");
      return;
    }
    toast.success(isCompleted ? "Кітап аяқталды! 🎉" : "Трекер жаңартылды!");
    setShowModal(false);
    router.refresh();
  }

  // Tracker update modal
  if (showModal) {
    const selectedTracker = trackers.find((t) => t.id === selectedTrackerId);
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
          <h2 className="mb-1 text-lg font-bold text-gray-900">Прогресті жаңарту</h2>
          <p className="mb-5 text-sm text-gray-500">Қай кітапты оқыдыңыз және қай бетке жеттіңіз?</p>

          {/* Book selector */}
          {trackers.length > 1 && (
            <div className="mb-4 space-y-2">
              {trackers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedTrackerId(t.id);
                    setNewPage(String(t.current_page || ""));
                  }}
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    selectedTrackerId === t.id
                      ? "border-primary-400 bg-primary-50"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1">{t.book_title}</p>
                  {t.book_author && <p className="text-xs text-gray-400">{t.book_author}</p>}
                </button>
              ))}
            </div>
          )}

          {trackers.length === 1 && (
            <div className="mb-4 rounded-2xl border border-primary-100 bg-primary-50 p-3">
              <p className="text-sm font-semibold text-gray-900">{trackers[0].book_title}</p>
              {trackers[0].book_author && <p className="text-xs text-gray-400">{trackers[0].book_author}</p>}
            </div>
          )}

          {/* Page input */}
          <div className="mb-5">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Қай бетке жеттіңіз?
              {selectedTracker?.total_pages > 0 && (
                <span className="ml-1 font-normal text-gray-400">
                  (барлығы {selectedTracker.total_pages} бет)
                </span>
              )}
            </label>
            <input
              type="number"
              value={newPage}
              onChange={(e) => setNewPage(e.target.value)}
              min={0}
              max={selectedTracker?.total_pages || undefined}
              className="input text-center text-lg font-semibold"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-secondary flex-1"
            >
              Өткізіп жіберу
            </button>
            <button
              type="button"
              onClick={handleModalSave}
              disabled={modalSaving}
              className="btn-primary flex-1"
            >
              {modalSaving ? <RefreshCw size={16} className="animate-spin" /> : null}
              Жаңарту
            </button>
          </div>
        </div>
      </div>
    );
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

        {goalReached ? (
          <p className="mt-3 text-sm font-semibold text-emerald-400">Мақсат орындалды ✓</p>
        ) : (
          goalMinutes > 0 && (
            <p className="mt-3 text-sm text-[#7a6245]">
              Мақсатқа дейін <span className="text-[#c9a96e] font-medium">{minutesLeft} мин</span> қалды
            </p>
          )
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
          {!goalReached && goalMinutes > 0 && ` (${minutesLeft} мин қалды)`}
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
