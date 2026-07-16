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
  const [pagesRead, setPagesRead] = useState(todayProgress?.pages_read?.toString() || "");
  const [note, setNote] = useState(todayProgress?.note || "");

  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pages = parseInt(pagesRead);
    if (!pages || pages <= 0) {
      toast.error("Оқылған бет санын енгізіңіз");
      return;
    }

    setLoading(true);

    if (todayProgress) {
      // Update existing
      const { error } = await supabase
        .from("reading_progress")
        .update({ pages_read: pages, note: note.trim() || null })
        .eq("id", todayProgress.id);
      if (error) {
        toast.error("Сақталмады");
        setLoading(false);
        return;
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from("reading_progress")
        .insert({
          tracker_id: trackerId,
          date: today,
          pages_read: pages,
          note: note.trim() || null,
        });
      if (error) {
        toast.error("Сақталмады");
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    toast.success("Прогрес сақталды!");
    router.push("/tracker");
    router.refresh();
  }

  const newCurrentPage = Math.min(totalPages, currentPage + parseInt(pagesRead || "0"));
  const newProgress = Math.round((newCurrentPage / totalPages) * 100);

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      {todayProgress && (
        <div className="rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-700">
          Бүгін {todayProgress.pages_read} бет оқылды. Жаңарту үшін енгізіңіз.
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Оқылған бет саны <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={pagesRead}
            onChange={(e) => setPagesRead(e.target.value)}
            placeholder="Мысалы: 30"
            min={1}
            max={totalPages}
            className="input"
            required
          />
          {pagesRead && parseInt(pagesRead) > 0 && (
            <div className="flex shrink-0 items-center rounded-xl bg-primary-50 px-3 text-sm font-medium text-primary-700">
              {newProgress}%
            </div>
          )}
        </div>
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
