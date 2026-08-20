"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MONTHS_KZ } from "@/lib/constants";
import { RefreshCw, Trash2, ImagePlus, X } from "lucide-react";
import toast from "react-hot-toast";
import { updateBook } from "@/app/actions/books";

interface Props {
  clubId: string;
  plan: {
    id: string;
    month: number;
    year: number;
    start_date: string | null;
    end_date: string | null;
    meeting_date: string | null;
    meeting_location: string | null;
    notes: string | null;
    book_id: string;
    books: {
      id: string;
      title: string;
      author: string | null;
      page_count: number | null;
      cover_url: string | null;
    } | null;
  };
}

export default function EditPlanForm({ clubId, plan }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(plan.books?.cover_url ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCoverFile(file: File) {
    if (file.size > 3 * 1024 * 1024) { toast.error("Сурет 3MB-тан аспауы керек"); return; }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  const [form, setForm] = useState({
    month: String(plan.month),
    year: String(plan.year),
    book_title: plan.books?.title ?? "",
    book_author: plan.books?.author ?? "",
    book_pages: plan.books?.page_count ? String(plan.books.page_count) : "",
    start_date: plan.start_date ?? "",
    end_date: plan.end_date ?? "",
    meeting_date: plan.meeting_date ?? "",
    meeting_location: plan.meeting_location ?? "",
    notes: plan.notes ?? "",
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

    let coverUrl: string | null = plan.books?.cover_url ?? null;
    if (coverFile) {
      const { data: { user } } = await supabase.auth.getUser();
      const ext = coverFile.name.split(".").pop();
      const path = `${user?.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("books").upload(path, coverFile);
      if (uploadError) {
        toast.error("Мұқаба жүктелмеді: " + uploadError.message);
        setLoading(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("books").getPublicUrl(path);
      coverUrl = publicUrl;
    } else if (!coverPreview) {
      coverUrl = null;
    }

    try {
      await updateBook(plan.book_id, {
        title: form.book_title.trim(),
        author: form.book_author.trim() || null,
        page_count: form.book_pages ? parseInt(form.book_pages) : null,
        cover_url: coverUrl,
      });
    } catch {
      toast.error("Кітап жаңартылмады");
      setLoading(false);
      return;
    }

    const { error: planError } = await supabase
      .from("club_plans")
      .update({
        month: parseInt(form.month),
        year: parseInt(form.year),
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        meeting_date: form.meeting_date || null,
        meeting_location: form.meeting_location.trim() || null,
        notes: form.notes.trim() || null,
      })
      .eq("id", plan.id);

    if (planError) {
      toast.error("Жоспар жаңартылмады");
      setLoading(false);
      return;
    }

    toast.success("Жоспар жаңартылды!");
    setLoading(false);
    router.push(`/clubs/${clubId}`);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);

    const { error } = await supabase
      .from("club_plans")
      .delete()
      .eq("id", plan.id);

    if (error) {
      toast.error("Жоспар жойылмады");
      setDeleting(false);
      setConfirmDelete(false);
      return;
    }

    toast.success("Жоспар жойылды");
    router.push(`/clubs/${clubId}`);
    router.refresh();
  }

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

      {/* Cover image */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Мұқабасы</label>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverFile(f); }} />
        {coverPreview ? (
          <div className="relative w-24">
            <img src={coverPreview} alt="cover" className="h-36 w-24 rounded-xl object-cover border border-gray-200 shadow-sm" />
            <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(null); }}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-white hover:bg-red-600">
              <X size={10} />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition">
            <ImagePlus size={16} /> Сурет қосу
          </button>
        )}
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

      <button type="submit" disabled={loading || deleting} className="btn-primary w-full">
        {loading && <RefreshCw size={16} className="animate-spin" />}
        Сақтау
      </button>

      <button
        type="button"
        disabled={deleting || loading}
        onClick={handleDelete}
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
          confirmDelete
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-red-50 text-red-600 hover:bg-red-100"
        }`}
      >
        {deleting ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
        {confirmDelete ? "Растаңыз — жою" : "Жоспарды жою"}
      </button>

      {confirmDelete && (
        <button
          type="button"
          onClick={() => setConfirmDelete(false)}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
        >
          Болдырмау
        </button>
      )}
    </form>
  );
}
