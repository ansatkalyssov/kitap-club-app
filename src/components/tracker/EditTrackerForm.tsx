"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, RefreshCw, ImagePlus, X } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import Image from "next/image";
import { updateTracker } from "@/app/actions/trackers";

interface Props {
  trackerId: string;
  existing: {
    book_title: string;
    book_author: string | null;
    total_pages: number;
    deadline: string;
    cover_url: string | null;
  };
}

export default function EditTrackerForm({ trackerId, existing }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(existing.cover_url);
  const [removeCover, setRemoveCover] = useState(false);
  const [form, setForm] = useState({
    book_title: existing.book_title,
    book_author: existing.book_author || "",
    total_pages: String(existing.total_pages),
    deadline: existing.deadline,
  });

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleCoverFile(file: File) {
    if (file.size > 3 * 1024 * 1024) { toast.error("Сурет 3MB-тан аспауы керек"); return; }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setRemoveCover(false);
  }

  function handleRemoveCover() {
    setCoverFile(null);
    setCoverPreview(null);
    setRemoveCover(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.book_title.trim()) { toast.error("Кітап атын енгізіңіз"); return; }
    const pages = parseInt(form.total_pages);
    if (!pages || pages < 1) { toast.error("Бет санын дұрыс енгізіңіз"); return; }
    if (!form.deadline) { toast.error("Дедлайнды енгізіңіз"); return; }

    setLoading(true);

    let coverUrl: string | null = existing.cover_url;

    if (coverFile) {
      const { data: { user } } = await supabase.auth.getUser();
      const ext = coverFile.name.split(".").pop();
      const path = `${user?.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("books").upload(path, coverFile);
      if (uploadError) {
        toast.error("Сурет жүктелмеді");
        setLoading(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("books").getPublicUrl(path);
      coverUrl = publicUrl;
    } else if (removeCover) {
      coverUrl = null;
    }

    const { error } = await updateTracker(trackerId, {
      book_title: form.book_title.trim(),
      book_author: form.book_author.trim() || null,
      total_pages: pages,
      deadline: form.deadline,
      cover_url: coverUrl,
    });
    setLoading(false);

    if (error) { toast.error(`Сақталмады: ${error}`); return; }
    toast.success("Трекер жаңартылды!");
    router.push(`/tracker/${trackerId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      {/* Cover */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Мұқабасы</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverFile(f); }}
        />
        {coverPreview ? (
          <div className="relative w-24">
            <Image
              src={coverPreview}
              alt="cover"
              width={96}
              height={136}
              className="h-34 w-24 rounded-xl object-cover border border-gray-200 shadow-sm"
              unoptimized
            />
            <button
              type="button"
              onClick={handleRemoveCover}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-800 text-white hover:bg-red-600"
            >
              <X size={10} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition"
          >
            <ImagePlus size={16} /> Сурет қосу
          </button>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Кітап аты <span className="text-red-500">*</span>
        </label>
        <input value={form.book_title} onChange={(e) => set("book_title", e.target.value)}
          className="input" required maxLength={200} />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Автор</label>
        <input value={form.book_author} onChange={(e) => set("book_author", e.target.value)}
          className="input" maxLength={100} />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Беттер саны <span className="text-red-500">*</span>
        </label>
        <input type="number" value={form.total_pages} onChange={(e) => set("total_pages", e.target.value)}
          className="input" min={1} required />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Дедлайн <span className="text-red-500">*</span>
        </label>
        <input type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)}
          className="input" required />
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
