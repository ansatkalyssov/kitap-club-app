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

    // SQL функциясы RLS-ті айналып өтіп, трекерлер мен мүшелікті жояды
    const { error } = await supabase.rpc("leave_club", {
      p_club_id: clubId,
      p_user_id: userId,
    });

    setLoading(false);

    if (error) {
      toast.error("Клубтан шығу сәтсіз болды: " + error.message);
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
