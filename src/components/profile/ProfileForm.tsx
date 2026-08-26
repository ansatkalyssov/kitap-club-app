"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RefreshCw, Camera } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/actions/profile";

export default function ProfileForm() {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      setUserId(user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", user.id)
        .single();
      setName(profile?.name ?? "");
      setAvatarUrl(profile?.avatar_url ?? null);
      setFetching(false);
    }
    load();
  }, []);

  function handleAvatarFile(file: File) {
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Сурет 3MB-тан аспауы керек");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Атыңызды енгізіңіз");
      return;
    }
    setLoading(true);

    let newAvatarUrl = avatarUrl;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });

      if (uploadError) {
        toast.error("Сурет жүктелмеді: " + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      newAvatarUrl = publicUrl;
    }

    try {
      await updateProfile({ name: name.trim(), avatar_url: newAvatarUrl });
      toast.success("Профиль жаңартылды!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Сақталмады");
    }
    setLoading(false);
  }

  const displayAvatar = avatarPreview || avatarUrl;
  const initials = name ? name.charAt(0).toUpperCase() : "?";

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      {/* Avatar section */}
      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-primary-700"
          >
            {displayAvatar ? (
              <Image
                src={displayAvatar}
                alt={name}
                fill
                className="object-cover"
                sizes="96px"
              />
            ) : (
              <span className="text-3xl font-bold">{initials}</span>
            )}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
              <Camera size={22} className="text-white" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleAvatarFile(f);
            }}
          />
        </div>
        <p className="text-xs text-gray-400">Суретті өзгерту үшін басыңыз</p>
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
