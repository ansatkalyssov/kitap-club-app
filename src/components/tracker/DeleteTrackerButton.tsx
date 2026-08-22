"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Trash2, RefreshCw } from "lucide-react";
import { deleteTracker } from "@/app/actions/trackers";

export default function DeleteTrackerButton({ trackerId }: { trackerId: string }) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
      return;
    }
    setLoading(true);
    const { error } = await deleteTracker(trackerId);
    setLoading(false);
    if (error) { toast.error(`Жойылмады: ${error}`); return; }
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
