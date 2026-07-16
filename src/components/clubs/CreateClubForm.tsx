"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { City } from "@/lib/types";
import { RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Props {
  userId: string;
  cities: City[];
}

export default function CreateClubForm({ userId, cities }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    city_id: "",
  });

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Клуб атын енгізіңіз");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("clubs")
      .insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        city_id: form.city_id ? parseInt(form.city_id) : null,
        facilitator_id: userId,
      })
      .select()
      .single();

    if (error) {
      setLoading(false);
      toast.error("Клуб жасалмады: " + error.message);
      return;
    }

    // Рөлді facilitator-ға ауыстыру
    await supabase
      .from("profiles")
      .update({ role: "facilitator" })
      .eq("id", userId);

    setLoading(false);
    toast.success("Клуб жасалды! Рөліңіз жүргізушіге өзгерді.");
    router.push(`/clubs/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Клуб аты <span className="text-red-500">*</span>
        </label>
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Мысалы: Алматы Кітап Клубы"
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
