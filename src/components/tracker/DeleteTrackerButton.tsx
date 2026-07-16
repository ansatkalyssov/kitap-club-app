"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Trash2, RefreshCw } from "lucide-react";

export default function DeleteTrackerButton({ trackerId }: { trackerId: string }) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleDelete() {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
      return;
    }
    setLoading(true);
    await supabase.from("book_trackers").delete().eq("id", trackerId);
    setLoading(false);
    toast.success("Трекер жойылды");
    router.push("/tracker");
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition ${
        confirm ? "bg-red-600 text-white" : "border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
      }`}
    >
      {loading ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
      {confirm ? "Расталсын ба?" : "Жою"}
    </button>
  );
}
