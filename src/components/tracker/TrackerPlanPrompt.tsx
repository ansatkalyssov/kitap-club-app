"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Target, X } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  trackerId: string;
  userId: string;
  currentPage: number;
  totalPages: number;
  deadline: string;
}

export default function TrackerPlanPrompt({ trackerId, userId, currentPage, totalPages, deadline }: Props) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const daysLeft = Math.max(1, Math.round((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const pagesLeft = totalPages - currentPage;
  const dailyPages = Math.ceil(pagesLeft / daysLeft);

  useEffect(() => {
    const key = `tracker_plan_offered_${trackerId}`;
    if (!localStorage.getItem(key) && pagesLeft > 0 && daysLeft > 0) {
      setShow(true);
    }
  }, [trackerId, pagesLeft, daysLeft]);

  function dismiss() {
    localStorage.setItem(`tracker_plan_offered_${trackerId}`, "1");
    setShow(false);
  }

  async function handleYes() {
    setLoading(true);
    const { error } = await supabase.from("reading_goals").upsert(
      {
        user_id: userId,
        goal_type: "pages",
        daily_pages: dailyPages,
        reminder_enabled: false,
        reminder_time: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    setLoading(false);
    if (error) {
      toast.error("Сақталмады");
      return;
    }
    toast.success(`Күніне ${dailyPages} бет мақсат қойылды!`);
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="mb-5 rounded-2xl border border-primary-200 bg-primary-50 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target size={18} className="shrink-0 text-primary-600" />
          <p className="text-sm font-semibold text-primary-900">
            Бұл кітапты күнделікті оқу жоспарына енгізейік пе?
          </p>
        </div>
        <button onClick={dismiss} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <p className="mb-4 text-sm text-primary-700">
        Дедлайнға дейін <strong>{daysLeft} күн</strong>, <strong>{pagesLeft} бет</strong> қалды.
        Мақсат: күніне <strong>{dailyPages} бет</strong>.
      </p>

      <div className="flex gap-2">
        <button
          onClick={handleYes}
          disabled={loading}
          className="btn-primary flex-1 py-2 text-sm"
        >
          Иә, қосыңыз
        </button>
        <button
          onClick={dismiss}
          className="flex-1 rounded-xl border border-gray-200 bg-white py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          Жоқ
        </button>
      </div>
    </div>
  );
}
