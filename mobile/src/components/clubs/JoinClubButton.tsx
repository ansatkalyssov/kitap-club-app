import { useState } from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Colors, Spacing, Radius } from "@/constants/theme";

export default function JoinClubButton({
  clubId,
  userId,
  disabled,
  disabledReason,
  onJoined,
}: {
  clubId: string;
  userId: string;
  disabled?: boolean;
  disabledReason?: string;
  onJoined: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (disabled) {
      if (disabledReason) Alert.alert(disabledReason);
      return;
    }
    setLoading(true);

    const { error: joinError } = await supabase
      .from("club_members")
      .insert({ club_id: clubId, user_id: userId });

    if (joinError) {
      setLoading(false);
      Alert.alert("Қате", "Тіркелу сәтсіз болды");
      return;
    }

    const { data: plans } = await supabase
      .from("club_plans")
      .select("id, book_id, end_date, meeting_date, books(title, author, page_count)")
      .eq("club_id", clubId);

    if (plans && plans.length > 0) {
      const today = new Date().toISOString().split("T")[0];

      const { data: existingTrackers } = await supabase
        .from("book_trackers")
        .select("club_plan_id")
        .eq("user_id", userId);

      const existingPlanIds = new Set(
        (existingTrackers || []).map((t) => t.club_plan_id).filter(Boolean)
      );

      const trackersToInsert = (plans as unknown as {
        id: string;
        book_id: string | null;
        end_date: string | null;
        meeting_date: string | null;
        books: { title: string; author: string | null; page_count: number | null } | null;
      }[])
        .filter((plan) => plan.books?.page_count && !existingPlanIds.has(plan.id))
        .map((plan) => ({
          user_id: userId,
          book_id: plan.book_id || null,
          club_plan_id: plan.id,
          book_title: plan.books!.title,
          book_author: plan.books!.author || null,
          total_pages: plan.books!.page_count,
          current_page: 0,
          start_date: today,
          deadline: plan.end_date || plan.meeting_date || null,
        }))
        .filter((t) => t.deadline);

      if (trackersToInsert.length > 0) {
        await supabase.from("book_trackers").insert(trackersToInsert);
      }
    }

    setLoading(false);
    onJoined();
  }

  return (
    <TouchableOpacity onPress={handleJoin} disabled={loading} style={[styles.btn, disabled && styles.btnDisabled]}>
      {loading ? (
        <ActivityIndicator size="small" color={Colors.white} />
      ) : (
        <Feather name="user-plus" size={12} color={Colors.white} />
      )}
      <Text style={styles.text}>Тіркелу</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary600,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  btnDisabled: { opacity: 0.5 },
  text: { fontSize: 12, fontWeight: "600", color: Colors.white },
});
