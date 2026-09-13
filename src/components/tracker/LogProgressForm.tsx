"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { RefreshCw, BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import { ReadingProgress } from "@/lib/types";
import { kzDateStr } from "@/lib/utils";
import { syncTrackerProgressPoints, syncBookCompletedPoints } from "@/app/actions/points";
import { addReadingMinutes } from "@/app/actions/reading";
import { toastPoints } from "@/lib/pointsToast";

/** Ескертпенің ең үлкен ұзындығы. Дерекқорда шектеу жоқ (TEXT). */
const NOTE_MAX = 500;

interface Props {
  trackerId: string;
  currentPage: number;
  totalPages: number;
  todayProgress: ReadingProgress | null;
  /** Күнделікті мақсат, минут. 0 — мақсат қойылмаған */
  goalMinutes: number;
  /** Бүгін журналға жазылған минут */
  todayMinutes: number;
}

export default function LogProgressForm({
  trackerId,
  currentPage,
  totalPages,
  todayProgress,
  goalMinutes,
  todayMinutes,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  // Бүгін прогрес болса, сол бетке дейін; болмаса қазіргі бет
  const initialPage = todayProgress
    ? currentPage
    : currentPage;

  const [reachedPage, setReachedPage] = useState(initialPage.toString());
  const [note, setNote] = useState(todayProgress?.note || "");
  // Әдейі бос: әр сақтауда қосылады, сондықтан алдын ала толтырсақ
  // прогресті екінші рет түзеткенде уақыт қайта қосылып кетер еді.
  const [minutes, setMinutes] = useState("");

  const parsed = parseInt(reachedPage || "0");
  const progress = parsed > 0 ? Math.round((parsed / totalPages) * 100) : null;

  // Бүгін оқылған беттер
  const pagesBefore = todayProgress
    ? currentPage - todayProgress.pages_read
    : currentPage;
  const pagesReadToday = Math.max(0, parsed - pagesBefore);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed || parsed <= 0) {
      toast.error("Бет нөмірін енгізіңіз");
      return;
    }
    if (parsed > totalPages) {
      toast.error(`Максималды бет: ${totalPages}`);
      return;
    }
    if (parsed <= pagesBefore) {
      toast.error(`Ағымдағы беттен (${pagesBefore}) үлкен мән енгізіңіз`);
      return;
    }

    setLoading(true);
    const isCompleted = parsed >= totalPages;

    // reading_progress жазбасын жаңарту немесе жасау
    if (todayProgress) {
      const { error } = await supabase
        .from("reading_progress")
        .update({ pages_read: pagesReadToday, note: note.trim() || null })
        .eq("id", todayProgress.id);
      if (error) { toast.error("Сақталмады"); setLoading(false); return; }
    } else {
      const today = kzDateStr();
      const { error } = await supabase
        .from("reading_progress")
        .insert({ tracker_id: trackerId, date: today, pages_read: pagesReadToday, note: note.trim() || null });
      if (error) { toast.error("Сақталмады"); setLoading(false); return; }
    }

    // book_trackers.current_page жаңарту
    const { error: trackerError } = await supabase
      .from("book_trackers")
      .update({ current_page: parsed, is_completed: isCompleted })
      .eq("id", trackerId);

    setLoading(false);
    if (trackerError) { toast.error("Трекер жаңартылмады"); return; }

    toast.success(isCompleted ? "Кітапты аяқтадыңыз! 🎉" : "Прогрес сақталды!");

    let earned = await syncTrackerProgressPoints(trackerId);
    if (isCompleted) earned += await syncBookCompletedPoints(trackerId);

    // Оқу уақыты көрсетілсе — күнделікті журналға да қосамыз. Таймерді
    // қоспай, тек бет санын белгілейтіндердің оқығаны бұрын күнделікті
    // мақсатқа мүлдем есептелмейтін.
    const mins = parseInt(minutes || "0");
    if (mins > 0) {
      earned += await addReadingMinutes(mins);
      toast.success(`${mins} минут оқу уақытына қосылды`);
    }

    toastPoints(earned);

    router.push("/tracker");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      {todayProgress && (
        <div className="rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-700">
          Бүгін {todayProgress.pages_read} бет оқылды. Жаңарту үшін жаңа бет нөмірін енгізіңіз.
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Қай бетке жеттіңіз? <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={reachedPage}
            onChange={(e) => setReachedPage(e.target.value)}
            placeholder={`${currentPage + 1} – ${totalPages}`}
            min={pagesBefore + 1}
            max={totalPages}
            className="input"
            required
          />
          {progress !== null && (
            <div className="flex shrink-0 items-center rounded-xl bg-primary-50 px-3 text-sm font-medium text-primary-700">
              {progress}%
            </div>
          )}
        </div>
        {parsed > pagesBefore && parsed <= totalPages && (
          <p className="mt-1.5 text-xs text-gray-400">
            Бүгін +{pagesReadToday} бет · {parsed} / {totalPages} бет
          </p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Бүгін неше минут оқыдыңыз?{" "}
          <span className="font-normal text-gray-400">міндетті емес</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="0"
            min={0}
            max={600}
            className="input"
          />
          <span className="shrink-0 text-sm text-gray-500">минут</span>
        </div>
        <div className="mt-2 flex gap-2">
          {[15, 30, 45, 60].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutes(String(m))}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                minutes === String(m)
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {m} мин
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {goalMinutes > 0 ? (
            todayMinutes >= goalMinutes ? (
              <>Бүгінгі мақсат орындалды: {todayMinutes} / {goalMinutes} минут</>
            ) : (
              <>
                Күнделікті мақсатыңызға есептеледі. Бүгін: {todayMinutes} / {goalMinutes}{" "}
                минут
              </>
            )
          ) : (
            <>Таймерді қоспай-ақ, оқыған уақытыңызды осында жазып қоюға болады</>
          )}
        </p>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label className="block text-sm font-medium text-gray-700">Ескертпе</label>
          {/* Шекке жақындағанда ғана көрсетеміз — әйтпесе бос өрістің
              жанында «0/500» тұрғаны артық. */}
          {note.length > NOTE_MAX / 2 && (
            <span
              className={`text-xs tabular-nums ${
                note.length >= NOTE_MAX ? "font-semibold text-amber-600" : "text-gray-400"
              }`}
            >
              {note.length} / {NOTE_MAX}
            </span>
          )}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Бүгінгі оқу туралы..."
          className="input min-h-[84px] resize-y"
          rows={3}
          maxLength={NOTE_MAX}
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? <RefreshCw size={16} className="animate-spin" /> : <BookOpen size={16} />}
        {todayProgress ? "Жаңарту" : "Прогресті сақтау"}
      </button>
    </form>
  );
}
