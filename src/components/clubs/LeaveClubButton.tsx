"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { leaveClub } from "@/app/actions/clubs";
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

  async function handleLeave() {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
      return;
    }
    setLoading(true);
    try {
      await leaveClub(clubId);
      toast.success("Клубтан шықтыңыз");
      router.push("/clubs");
    } catch {
      toast.error("Клубтан шығу сәтсіз болды");
      setLoading(false);
    }
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
