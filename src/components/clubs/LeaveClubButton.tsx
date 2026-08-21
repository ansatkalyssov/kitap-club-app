"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { UserMinus, RefreshCw } from "lucide-react";

interface Props {
  clubId: string;
  userId: string;
}

export default function LeaveClubButton({ clubId, userId }: Props) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLeave() {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
      return;
    }
    setLoading(true);

    // 1. Пайдаланушының осы клубтағы трекерлерін табамыз
    //    (club_plans join арқылы — пайдаланушы өз трекерлерін оқи алады)
    const { data: trackers } = await supabase
      .from("book_trackers")
      .select("id, club_plans(club_id)")
      .eq("user_id", userId)
      .not("club_plan_id", "is", null);

    const trackerIds = (trackers || [])
      .filter((t: any) => t.club_plans?.club_id === clubId)
      .map((t: any) => t.id);

    // 2. Табылған трекерлерді жоямыз
    if (trackerIds.length > 0) {
      const { error: trackerError } = await supabase
        .from("book_trackers")
        .delete()
        .in("id", trackerIds);

      if (trackerError) {
        toast.error("Трекерлер жойылмады: " + trackerError.message);
        setLoading(false);
        return;
      }
    }

    // 3. Клуб мүшелігін жоямыз
    const { error } = await supabase
      .from("club_members")
      .delete()
      .eq("club_id", clubId)
      .eq("user_id", userId);

    setLoading(false);

    if (error) {
      toast.error("Клубтан шығу сәтсіз болды");
      return;
    }

    toast.success("Клубтан шықтыңыз");
    router.push("/clubs");
    router.refresh();
  }

  return (
    <button
      onClick={handleLeave}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
        confirm
          ? "bg-red-600 text-white hover:bg-red-700"
          : "border border-gray-200 text-gray-600 hover:bg-gray-100"
      }`}
    >
      {loading ? <RefreshCw size={12} className="animate-spin" /> : <UserMinus size={12} />}
      {confirm ? "Растаңыз" : "Клубтан шығу"}
    </button>
  );
}
