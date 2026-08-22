"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { City } from "@/lib/types";
import { RefreshCw, ArrowLeft, Upload, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";

interface Props {
  clubId: string;
  userId: string;
  cities: City[];
  existing: {
    name: string;
    description: string | null;
    city_id: number | null;
    emblem_url: string | null;
  };
}

export default function EditClubForm({ clubId, userId, cities, existing }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(existing.emblem_url);
  const [emblemRemoved, setEmblemRemoved] = useState(false);
  const [form, setForm] = useState({
    name: existing.name,
    description: existing.description || "",
    city_id: existing.city_id ? String(existing.city_id) : "",
  });

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      toast.error("Сурет 2MB-тан аспауы керек");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setEmblemRemoved(false);
  }

  function removeEmblem() {
    setFile(null);
    setPreview(null);
    setEmblemRemoved(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Клуб атын енгізіңіз");
      return;
    }
    setLoading(true);

    let emblem_url: string | null | undefined = undefined;

    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("clubs")
        .upload(path, file, { upsert: true });
      if (uploadError) {
        toast.error("Сурет жүктелмеді");
        setLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("clubs").getPublicUrl(path);
      emblem_url = urlData.publicUrl;
    } else if (emblemRemoved) {
      emblem_url = null;
    }

    const update: any = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      city_id: form.city_id ? parseInt(form.city_id) : null,
    };
    if (emblem_url !== undefined) update.emblem_url = emblem_url;

    const { error } = await supabase.from("clubs").update(update).eq("id", clubId);

    setLoading(false);
    if (error) {
      toast.error("Сақталмады: " + error.message);
      return;
    }

    toast.success("Клуб жаңартылды!");
    router.push(`/clubs/${clubId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      {/* Emblem */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Клуб эмблемасы</label>
        {preview ? (
          <div className="relative inline-block">
            <Image
              src={preview}
              alt="Эмблема"
              width={96}
              height={96}
              className="h-24 w-24 rounded-2xl object-cover border border-gray-200"
            />
            <button
              type="button"
              onClick={removeEmblem}
              className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-primary-300 hover:text-primary-500 transition"
          >
            <Upload size={20} />
            <span className="text-xs">Сурет қос</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <p className="mt-1 text-xs text-gray-400">PNG, JPG · максимум 2MB</p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Клуб аты <span className="text-red-500">*</span>
        </label>
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className="input"
          required
          maxLength={100}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Клуб туралы</label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          className="input min-h-[100px] resize-none"
          maxLength={500}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Қала</label>
        <select value={form.city_id} onChange={(e) => set("city_id", e.target.value)} className="input">
          <option value="">Қала таңдаңыз</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <Link href={`/clubs/${clubId}`} className="btn-secondary flex-1">
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
