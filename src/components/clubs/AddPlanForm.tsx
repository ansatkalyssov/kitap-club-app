"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MONTHS_KZ } from "@/lib/constants";
import { RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { createTrackersForMembers } from "@/app/actions/trackers";

interface Props {
  clubId: string;
}

export default function AddPlanForm({ clubId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [form, setForm] = useState({
    month: String(currentMonth),
    year: String(currentYear),
    book_title: "",
    book_author: "",
    book_pages: "",
    start_date: "",
    end_date: "",
    meeting_date: "",
    meeting_location: "",
    notes: "",
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
    setLoading(true);

    // Бұл айда қанша жоспар бар екенін тексеру (макс 4)
    const { count: planCount } = await supabase
      .from("club_plans")
      .select("id", { count: "exact" })
      .eq("club_id", clubId)
      .eq("month", parseInt(form.month))
      .eq("year", parseInt(form.year));

    if ((planCount ?? 0) >= 4) {
      toast.error("Бір айға ең көп 4 кітап қосуға болады");
      setLoading(false);
      return;
    }

    // Create book first
    const { data: book, error: bookError } = await supabase
      .from("books")
      .insert({
        title: form.book_title.trim(),
        author: form.book_author.trim() || null,
        page_count: form.book_pages ? parseInt(form.book_pages) : null,
      })
      .select()
      .single();

    if (bookError) {
      toast.error("Кітап сақталмады");
      setLoading(false);
      return;
    }

    // Create plan
    const { data: plan, error: planError } = await supabase
      .from("club_plans")
      .insert({
        club_id: clubId,
        book_id: book.id,
        month: parseInt(form.month),
        year: parseInt(form.year),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        meeting_date: form.meeting_date || null,
        meeting_location: form.meeting_location.trim() || null,
        notes: form.notes.trim() || null,
      })
      .select()
      .single();

    if (planError) {
      setLoading(false);
      toast.error("Жоспар сақталмады");
      return;
    }

    // Дедлайнды анықтау
    const deadline = form.end_date || form.meeting_date || null;
    const today = new Date().toISOString().split("T")[0];
    const deadlineValid = deadline && deadline >= today;

    // Дедлайн бітпесе — server action арқылы мүшелерге трекер жасау
    if (deadlineValid && form.book_pages) {
      try {
        const { count } = await createTrackersForMembers({
          clubId,
          planId: plan.id,
          bookId: book.id,
          bookTitle: book.title,
          bookAuthor: book.author || null,
          totalPages: parseInt(form.book_pages),
          startDate: form.start_date || today,
          deadline: deadline,
        });

        if (count > 0) {
          toast.success(`Жоспар қосылды! ${count} оқырманға трекер автоматты жасалды.`);
        } else {
          toast.success("Жоспар қосылды!");
        }
      } catch {
        toast.success("Жоспар қосылды!");
      }
    } else {
      toast.success("Жоспар қосылды!");
    }

    setLoading(false);
    router.push(`/clubs/${clubId}`);
    router.refresh();
  }

  const years = [currentYear, currentYear + 1];

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      {/* Month/Year */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Ай *</label>
          <select value={form.month} onChange={(e) => set("month", e.target.value)} className="input">
            {MONTHS_KZ.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Жыл *</label>
          <select value={form.year} onChange={(e) => set("year", e.target.value)} className="input">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <hr className="border-gray-100" />
      <p className="text-sm font-semibold text-gray-700">Кітап</p>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Кітап аты *</label>
        <input
          value={form.book_title}
          onChange={(e) => set("book_title", e.target.value)}
          placeholder="Кітап атауы"
          className="input"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Автор</label>
          <input
            value={form.book_author}
            onChange={(e) => set("book_author", e.target.value)}
            placeholder="Автор аты"
            className="input"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Беттер</label>
          <input
            type="number"
            value={form.book_pages}
            onChange={(e) => set("book_pages", e.target.value)}
            placeholder="300"
            min={1}
            className="input"
          />
        </div>
      </div>

      <hr className="border-gray-100" />
      <p className="text-sm font-semibold text-gray-700">Мерзімдер</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Басталуы</label>
          <input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Аяқталуы</label>
          <input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} className="input" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Талқы күні</label>
          <input type="date" value={form.meeting_date} onChange={(e) => set("meeting_date", e.target.value)} className="input" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Орны</label>
          <input
            value={form.meeting_location}
            onChange={(e) => set("meeting_location", e.target.value)}
            placeholder="Кездесу орны"
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Ескертпе</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Қосымша ақпарат..."
          className="input min-h-[80px] resize-none"
        />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading && <RefreshCw size={16} className="animate-spin" />}
        Жоспарды сақтау
      </button>
    </form>
  );
}
