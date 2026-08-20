"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RefreshCw, User } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();
      setName(profile?.name ?? "");
      setFetching(false);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Атыңызды енгізіңіз");
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim() })
      .eq("id", user.id);

    if (error) {
      toast.error("Сақталмады");
    } else {
      toast.success("Профиль жаңартылды!");
      router.refresh();
    }
    setLoading(false);
  }

  if (fetching) {
    return (
      <div className="page-container flex items-center justify-center py-20">
        <RefreshCw size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="page-container max-w-md">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Профиль</h1>
        <p className="mt-1 text-sm text-gray-500">Жеке ақпаратыңызды өзгертіңіз</p>
      </div>

      <div className="mb-4 flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xl font-bold">
          {name ? name.charAt(0).toUpperCase() : <User size={24} />}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{name || "Аты жоқ"}</p>
          <p className="text-sm text-gray-500">{email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="card space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Аты-жөні *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Аты-жөніңізді енгізіңіз"
            className="input"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
          <input
            value={email}
            disabled
            className="input bg-gray-50 text-gray-400 cursor-not-allowed"
          />
          <p className="mt-1 text-xs text-gray-400">Email өзгертілмейді</p>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading && <RefreshCw size={16} className="animate-spin" />}
          Сақтау
        </button>
      </form>
    </div>
  );
}
