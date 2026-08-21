"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { RefreshCw, BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import ProgressBar from "@/components/ui/ProgressBar";

interface Tracker {
  id: string;
  book_title: string;
  current_page: number;
  total_pages: number;
}

interface Props {
  userId: string;
  date: string;
  todayPages: number;
  todayMinutes: number;
  goalPages: number;
  trackers: Tracker[];
}

export default function LogPagesForm({ userId, date, todayPages, todayMinutes, goalPages, trackers }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState("");
  const [selectedTrackerId, setSelectedTrackerId] = useState(trackers[0]?.id || "");

  const goalReached = goalPages > 0 && todayPages >= goalPages;
  const progress = goalPages > 0 ? Math.min(100, Math.round((todayPages / goalPages) * 100)) : 0;

  const selectedTracker = trackers.find((t) => t.id === selectedTrackerId) || null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseInt(pages);
    if (!value || value <= 0) {
      toast.error("Оқылған бет санын енгізіңіз");
      return;
    }
    setLoading(true);

    // 1. Күнделікті оқу журналын жаңарту (жинақтайды)
    const newTotal = todayPages + value;
    const { error: logError } = await supabase
      .from("reading_logs")
      .upsert(
        { user_id: userId, date, pages_read: newTotal, minutes_read: todayMinutes },
        { onConflict: "user_id,date" }
      );
    if (logError) { toast.error("Сақталмады"); setLoading(false); return; }

    // 2. Таңдалған трекердің прогресін жаңарту
    if (selectedTracker) {
      const newPage = Math.min(selectedTracker.total_pages, selectedTracker.current_page + value);
      const isCompleted = newPage >= selectedTracker.total_pages;

      await supabase
        .from("book_trackers")
        .update({ current_page: newPage, is_completed: isCompleted })
        .eq("id", selectedTracker.id);

      // reading_progress жазбасы
      await supabase.from("reading_progress").insert({
        tracker_id: selectedTracker.id,
        date,
        pages_read: value,
        note: null,
      });
    }

    setLoading(false);
    toast.success(`+${value} бет сақталды!`);
    setPages("");
    router.refresh();
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3>Бүгін оқыдыңыз ба?</h3>
        {goalReached && <span className="badge-green">Мақсат орындалды ✓</span>}
      </div>

      <div>
        <ProgressBar value={progress} showLabel={false} />
        <p className="mt-1 text-sm text-gray-500">
          Бүгін барлығы: <strong>{todayPages}</strong> / {goalPages} бет
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Кітап таңдау */}
        {trackers.length > 0 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Қай кітаптан?</label>
            <select
              value={selectedTrackerId}
              onChange={(e) => setSelectedTrackerId(e.target.value)}
              className="input"
            >
              <option value="">— Трекерге жазбау —</option>
              {trackers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.book_title} ({t.current_page}/{t.total_pages} бет)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="number"
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            placeholder="Қанша бет оқыдыңыз?"
            min={1}
            className="input"
            required
          />
          <button type="submit" disabled={loading} className="btn-primary shrink-0">
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <BookOpen size={16} />}
            Қосу
          </button>
        </div>

        {selectedTracker && pages && parseInt(pages) > 0 && (
          <p className="text-xs text-gray-400">
            «{selectedTracker.book_title}»: {selectedTracker.current_page} → {Math.min(selectedTracker.total_pages, selectedTracker.current_page + parseInt(pages))} бет
          </p>
        )}
      </form>
    </div>
  );
}
