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
  userId: string;
  cities: City[];
}

export default function CreateClubForm({ userId, cities }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ name: "", description: "", city_id: "" });

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
  }

  function removeFile() {
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Клуб атын енгізіңіз");
      return;
    }
    setLoading(true);

    let emblem_url: string | null = null;

    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("clubs")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        toast.error("Сурет жүктелмеді: " + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("clubs").getPublicUrl(path);
      emblem_url = urlData.publicUrl;
    }

    const { data, error } = await supabase
      .from("clubs")
      .insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        city_id: form.city_id ? parseInt(form.city_id) : null,
        facilitator_id: userId,
        emblem_url,
      })
      .select()
      .single();

    if (error) {
      setLoading(false);
      toast.error("Клуб жасалмады: " + error.message);
      return;
    }

    await supabase.from("profiles").update({ role: "facilitator" }).eq("id", userId);

    setLoading(false);
    toast.success("Клуб жасалды! Рөліңіз жүргізушіге өзгерді.");
    router.push(`/clubs/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      {/* Emblem upload */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Клуб эмблемасы
        </label>
        {preview ? (
          <div className="relative inline-block">
            <Image
              src={preview}
              alt="Эмблема"
              width={96}
              height={96}
              className="h-24 w-24 rounded-2xl object-cover border border-gray-100"
            />
            <button
              type="button"
              onClick={removeFile}
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
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
        <p className="mt-1 text-xs text-gray-400">PNG, JPG · максимум 2MB</p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Клуб аты <span className="text-red-500">*</span>
        </label>
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Мысалы: Алматы Oqyrman"
          className="input"
          required
          maxLength={100}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Клуб туралы
        </label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Клуб туралы қысқаша мағлұмат..."
          className="input min-h-[100px] resize-none"
          maxLength={500}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Қала
        </label>
        <select
          value={form.city_id}
          onChange={(e) => set("city_id", e.target.value)}
          className="input"
        >
          <option value="">Қала таңдаңыз</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-2">
        <Link href="/clubs" className="btn-secondary flex-1">
          <ArrowLeft size={16} /> Артқа
        </Link>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading && <RefreshCw size={16} className="animate-spin" />}
          Жасау
        </button>
      </div>
    </form>
  );
}
