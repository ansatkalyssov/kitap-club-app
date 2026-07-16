"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { calcDailyPages } from "@/lib/utils";
import { RefreshCw, BookOpen } from "lucide-react";
import toast from "react-hot-toast";

interface Prefill {
  planId?: string;
  bookId?: string;
  title?: string;
  pages?: string;
  author?: string;
  deadline?: string;
}

interface Props {
  userId: string;
  prefill?: Prefill;
}

export default function CreateTrackerForm({ userId, prefill }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    book_title: prefill?.title || "",
    book_author: prefill?.author || "",
    total_pages: prefill?.pages || "",
    current_page: "0",
    start_date: today,
    deadline: prefill?.deadline || "",
  });

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const dailyPages = form.total_pages && form.current_page && form.deadline
    ? calcDailyPages(parseInt(form.current_page || "0"), parseInt(form.total_pages), form.deadline)
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.book_title.trim()) {
      toast.error("Кітап атын енгізіңіз");
      return;
    }
    if (!form.total_pages || parseInt(form.total_pages) <= 0) {
      toast.error("Парақ санын енгізіңіз");
      return;
    }
    if (!form.deadline) {
      toast.error("Дедлайнды енгізіңіз");
      return;
    }
    if (new Date(form.deadline) <= new Date(form.start_date)) {
      toast.error("Дедлайн басталу күнінен кейін болуы керек");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("book_trackers").insert({
      user_id: userId,
      book_id: prefill?.bookId || null,
      club_plan_id: prefill?.planId || null,
      book_title: form.book_title.trim(),
      book_author: form.book_author.trim() || null,
      total_pages: parseInt(form.total_pages),
      current_page: parseInt(form.current_page || "0"),
      start_date: form.start_date,
      deadline: form.deadline,
    });
    setLoading(false);

    if (error) {
      toast.error("Трекер жасалмады: " + error.message);
      return;
    }
    toast.success("Трекер жасалды!");
    router.push("/tracker");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      {prefill?.planId && (
        <div className="flex items-center gap-2 rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-700">
          <BookOpen size={16} />
          Клуб жоспарынан жасалуда
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Кітап аты <span className="text-red-500">*</span>
        </label>
        <input
          value={form.book_title}
          onChange={(e) => set("book_title", e.target.value)}
          placeholder="Кітаптың атауы"
          className="input"
          required
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Автор</label>
        <input
          value={form.book_author}
          onChange={(e) => set("book_author", e.target.value)}
          placeholder="Автор аты"
          className="input"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Барлық бет <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={form.total_pages}
            onChange={(e) => set("total_pages", e.target.value)}
            placeholder="300"
            min={1}
            className="input"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Оқылған бет
          </label>
          <input
            type="number"
            value={form.current_page}
            onChange={(e) => set("current_page", e.target.value)}
            placeholder="0"
            min={0}
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Басталуы</label>
          <input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Дедлайн <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => set("deadline", e.target.value)}
            min={today}
            className="input"
            required
          />
        </div>
      </div>

      {/* Daily pages preview */}
      {dailyPages !== null && dailyPages > 0 && (
        <div className="rounded-xl bg-primary-50 px-4 py-3">
          <p className="text-sm text-primary-700">
            Мақсатыңызға жету үшін күнде <strong>{dailyPages} бет</strong> оқу керек
          </p>
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading && <RefreshCw size={16} className="animate-spin" />}
        Трекер жасау
      </button>
    </form>
  );
}
