"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { UserPlus, RefreshCw } from "lucide-react";

interface Props {
  clubId: string;
  userId: string;
  disabled?: boolean;
  disabledReason?: string;
}

export default function JoinClubButton({ clubId, userId, disabled, disabledReason }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleJoin() {
    if (disabled) {
      if (disabledReason) toast.error(disabledReason);
      return;
    }
    setLoading(true);

    // 1. Клубқа тіркелу
    const { error: joinError } = await supabase
      .from("club_members")
      .insert({ club_id: clubId, user_id: userId });

    if (joinError) {
      setLoading(false);
      toast.error("Тіркелу сәтсіз болды");
      return;
    }

    // 2. Клубтың жоспарларын алу
    const { data: plans } = await supabase
      .from("club_plans")
      .select("id, book_id, end_date, meeting_date, books(title, author, page_count)")
      .eq("club_id", clubId);

    if (plans && plans.length > 0) {
      const today = new Date().toISOString().split("T")[0];

      // 3. Бар трекерлерді тексеру (дубликат болмасын)
      const { data: existingTrackers } = await supabase
        .from("book_trackers")
        .select("club_plan_id")
        .eq("user_id", userId);

      const existingPlanIds = new Set(
        (existingTrackers || []).map((t) => t.club_plan_id).filter(Boolean)
      );

      // 4. Әр жоспар үшін трекер жасау
      const trackersToInsert = (plans as any[])
        .filter((plan) => {
          // Кітап жоқ болса өткізіп жіберу
          if (!plan.books || !plan.books.page_count) return false;
          // Трекер бар болса өткізіп жіберу
          if (existingPlanIds.has(plan.id)) return false;
          return true;
        })
        .map((plan) => {
          const deadline = plan.end_date || plan.meeting_date || null;
          return {
            user_id: userId,
            book_id: plan.book_id || null,
            club_plan_id: plan.id,
            book_title: plan.books.title,
            book_author: plan.books.author || null,
            total_pages: plan.books.page_count,
            current_page: 0,
            start_date: today,
            deadline: deadline,
          };
        })
        .filter((t) => t.deadline); // Дедлайн жоқ болса қоспаймыз

      if (trackersToInsert.length > 0) {
        await supabase.from("book_trackers").insert(trackersToInsert);
        toast.success(
          `Клубқа тіркелдіңіз! ${trackersToInsert.length} трекер автоматты қосылды.`
        );
      } else {
        toast.success("Клубқа тіркелдіңіз!");
      }
    } else {
      toast.success("Клубқа тіркелдіңіз!");
    }

    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleJoin}
      disabled={loading || disabled}
      className="btn-primary py-1.5 px-3 text-xs"
    >
      {loading ? <RefreshCw size={12} className="animate-spin" /> : <UserPlus size={12} />}
      Тіркелу
    </button>
  );
}
