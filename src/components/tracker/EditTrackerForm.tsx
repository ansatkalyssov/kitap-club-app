"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Props {
  trackerId: string;
  existing: {
    book_title: string;
    book_author: string | null;
    total_pages: number;
    deadline: string;
  };
}

export default function EditTrackerForm({ trackerId, existing }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    book_title: existing.book_title,
    book_author: existing.book_author || "",
    total_pages: String(existing.total_pages),
    deadline: existing.deadline,
  });

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.book_title.trim()) {
      toast.error("Кітап атын енгізіңіз");
      return;
    }
    const pages = parseInt(form.total_pages);
    if (!pages || pages < 1) {
      toast.error("Бет санын дұрыс енгізіңіз");
      return;
    }
    if (!form.deadline) {
      toast.error("Дедлайнды енгізіңіз");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("book_trackers")
      .update({
        book_title: form.book_title.trim(),
        book_author: form.book_author.trim() || null,
        total_pages: pages,
        deadline: form.deadline,
      })
      .eq("id", trackerId);
    setLoading(false);

    if (error) {
      toast.error("Сақталмады");
      return;
    }
    toast.success("Трекер жаңартылды!");
    router.push(`/tracker/${trackerId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Кітап аты <span className="text-red-500">*</span>
        </label>
        <input
          value={form.book_title}
          onChange={(e) => set("book_title", e.target.value)}
          className="input"
          required
          maxLength={200}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Автор</label>
        <input
          value={form.book_author}
          onChange={(e) => set("book_author", e.target.value)}
          className="input"
          maxLength={100}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Беттер саны <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={form.total_pages}
          onChange={(e) => set("total_pages", e.target.value)}
          className="input"
          min={1}
          required
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Дедлайн <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          value={form.deadline}
          onChange={(e) => set("deadline", e.target.value)}
          className="input"
          required
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Link href={`/tracker/${trackerId}`} className="btn-secondary flex-1">
          <ArrowLeft size={16} /> Артқа
        </Link>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading && <RefreshCw size={16} className="animate-spin" />}
          Сақтау
        </button>
      </div>
    </form>
  );
}
