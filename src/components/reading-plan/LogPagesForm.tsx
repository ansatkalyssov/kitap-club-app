"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { RefreshCw, BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import ProgressBar from "@/components/ui/ProgressBar";

interface Props {
  userId: string;
  date: string;
  todayPages: number;
  todayMinutes: number;
  goalPages: number;
}

export default function LogPagesForm({ userId, date, todayPages, todayMinutes, goalPages }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState(todayPages > 0 ? todayPages.toString() : "");

  const goalReached = goalPages > 0 && todayPages >= goalPages;
  const progress = goalPages > 0 ? Math.min(100, Math.round((todayPages / goalPages) * 100)) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseInt(pages);
    if (!value || value <= 0) {
      toast.error("Оқылған бет санын енгізіңіз");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("reading_logs")
      .upsert(
        { user_id: userId, date, pages_read: value, minutes_read: todayMinutes },
        { onConflict: "user_id,date" }
      );
    setLoading(false);
    if (error) {
      toast.error("Сақталмады");
      return;
    }
    toast.success("Сақталды!");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3>Бүгін оқыдыңыз ба?</h3>
        {goalReached && <span className="badge-green">Мақсат орындалды ✓</span>}
      </div>

      <div>
        <ProgressBar value={progress} showLabel={false} />
        <p className="mt-1 text-sm text-gray-500">
          Бүгін: {todayPages} / {goalPages} бет
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          value={pages}
          onChange={(e) => setPages(e.target.value)}
          placeholder={`Мысалы: ${goalPages}`}
          min={1}
          className="input"
          required
        />
        <button type="submit" disabled={loading} className="btn-primary shrink-0">
          {loading ? <RefreshCw size={16} className="animate-spin" /> : <BookOpen size={16} />}
          Сақтау
        </button>
      </div>
    </form>
  );
}
