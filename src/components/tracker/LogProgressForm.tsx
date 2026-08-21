"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { RefreshCw, BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import { ReadingProgress } from "@/lib/types";

interface Props {
  trackerId: string;
  currentPage: number;
  totalPages: number;
  todayProgress: ReadingProgress | null;
}

export default function LogProgressForm({ trackerId, currentPage, totalPages, todayProgress }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  // Бүгін прогрес болса, сол бетке дейін; болмаса қазіргі бет
  const initialPage = todayProgress
    ? currentPage
    : currentPage;

  const [reachedPage, setReachedPage] = useState(initialPage.toString());
  const [note, setNote] = useState(todayProgress?.note || "");

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
      const today = new Date().toISOString().split("T")[0];
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
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Ескертпе</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Бүгінгі оқу туралы қысқаша..."
          className="input"
          maxLength={200}
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? <RefreshCw size={16} className="animate-spin" /> : <BookOpen size={16} />}
        {todayProgress ? "Жаңарту" : "Прогресті сақтау"}
      </button>
    </form>
  );
}
