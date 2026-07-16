import { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, SafeAreaView } from "react-native";
import { useLocalSearchParams, useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import ProgressBar from "@/components/ui/ProgressBar";
import { calcProgress, formatDateKz } from "@/lib/utils";
import { Colors, Spacing, Radius } from "@/constants/theme";

interface PlanRow {
  id: string;
  end_date: string | null;
  books: { title: string; author: string | null; page_count: number | null } | null;
}

interface MemberRow {
  user_id: string;
  profiles: { name: string | null; email: string } | null;
}

interface MemberProgress {
  user_id: string;
  name: string;
  progress: number | null;
  currentPage: number;
  totalPages: number;
  isCompleted: boolean;
}

export default function ClubProgressScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session!.user.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [nearestPlan, setNearestPlan] = useState<PlanRow | null>(null);
  const [members, setMembers] = useState<MemberProgress[]>([]);

  const fetchData = useCallback(async () => {
    const { data: club } = await supabase
      .from("clubs")
      .select("name, facilitator_id")
      .eq("id", id)
      .single();

    if (!club) return;

    const isFacilitator = club.facilitator_id === userId;
    if (!isFacilitator) {
      const { data: membership } = await supabase
        .from("club_members")
        .select("id")
        .eq("club_id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!membership) {
        router.replace(`/clubs/${id}`);
        return;
      }
    }

    const today = new Date().toISOString().split("T")[0];
    const { data: plans } = await supabase
      .from("club_plans")
      .select("id, end_date, books(title, author, page_count)")
      .eq("club_id", id)
      .order("end_date", { ascending: true });

    const plan = ((plans as unknown as PlanRow[]) || []).find((p) => p.end_date && p.end_date >= today) || null;
    setNearestPlan(plan);

    const { data: clubMembers } = await supabase
      .from("club_members")
      .select("user_id, profiles(name, email)")
      .eq("club_id", id);

    const memberRows = (clubMembers as unknown as MemberRow[]) || [];

    if (!plan) {
      setMembers(
        memberRows.map((m) => ({
          user_id: m.user_id,
          name: m.profiles?.name || m.profiles?.email || "?",
          progress: null,
          currentPage: 0,
          totalPages: 0,
          isCompleted: false,
        }))
      );
      return;
    }

    const withProgress = await Promise.all(
      memberRows.map(async (m) => {
        const { data: tracker } = await supabase
          .from("book_trackers")
          .select("current_page, total_pages, is_completed")
          .eq("user_id", m.user_id)
          .eq("club_plan_id", plan.id)
          .maybeSingle();

        return {
          user_id: m.user_id,
          name: m.profiles?.name || m.profiles?.email || "?",
          progress: tracker ? calcProgress(tracker.current_page, tracker.total_pages) : null,
          currentPage: tracker?.current_page ?? 0,
          totalPages: tracker?.total_pages ?? plan.books?.page_count ?? 0,
          isCompleted: tracker?.is_completed ?? false,
        };
      })
    );

    const sorted = [...withProgress].sort((a, b) => {
      if (a.progress === null && b.progress !== null) return 1;
      if (a.progress !== null && b.progress === null) return -1;
      return (b.progress ?? 0) - (a.progress ?? 0);
    });

    setMembers(sorted);
  }, [id, userId, router]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        await fetchData();
        if (active) setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [fetchData])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.flex}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary600} />
        </View>
      </SafeAreaView>
    );
  }

  const withTracker = members.filter((m) => m.progress !== null);
  const withoutTracker = members.filter((m) => m.progress === null);

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        {nearestPlan ? (
          <View style={styles.planCard}>
            <View style={styles.planTopRow}>
              <View style={styles.planIcon}>
                <Feather name="book-open" size={18} color={Colors.primary600} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.planTitle}>{nearestPlan.books?.title ?? "Кітап белгіленбеген"}</Text>
                {nearestPlan.books?.author && <Text style={styles.planAuthor}>{nearestPlan.books.author}</Text>}
              </View>
              {nearestPlan.books?.page_count && (
                <View style={styles.pagesBadge}>
                  <Text style={styles.pagesBadgeText}>{nearestPlan.books.page_count} бет</Text>
                </View>
              )}
            </View>
            {nearestPlan.end_date && (
              <View style={styles.deadlineRow}>
                <Feather name="calendar" size={13} color={Colors.primary600} />
                <Text style={styles.deadlineText}>Дедлайн: {formatDateKz(nearestPlan.end_date)}</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>Белсенді жоспар жоқ</Text>
          </View>
        )}

        <View style={styles.list}>
          {withTracker.map((m) => (
            <View key={m.user_id} style={styles.memberCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{m.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.memberTopRow}>
                  <Text style={styles.memberName} numberOfLines={1}>{m.name}</Text>
                  <View style={styles.memberStats}>
                    <Text style={styles.pagesText}>{m.currentPage} / {m.totalPages} бет</Text>
                    {m.isCompleted ? (
                      <View style={styles.doneBadge}>
                        <Text style={styles.doneBadgeText}>✓ Аяқтады</Text>
                      </View>
                    ) : (
                      <Text style={styles.percentText}>{m.progress}%</Text>
                    )}
                  </View>
                </View>
                <ProgressBar value={m.progress ?? 0} />
              </View>
            </View>
          ))}

          {withoutTracker.length > 0 && (
            <>
              {withTracker.length > 0 && <Text style={styles.noTrackerLabel}>Трекер жоқ</Text>}
              {withoutTracker.map((m) => (
                <View key={m.user_id} style={[styles.memberCard, styles.memberCardMuted]}>
                  <View style={[styles.avatar, styles.avatarMuted]}>
                    <Text style={[styles.avatarText, styles.avatarTextMuted]}>{m.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.memberNameMuted} numberOfLines={1}>{m.name}</Text>
                  <View style={styles.noTrackerBadge}>
                    <Text style={styles.noTrackerBadgeText}>Трекер жоқ</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {members.length === 0 && (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>Клубта мүше жоқ</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: Spacing.lg, gap: Spacing.lg },
  planCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.primary100,
    backgroundColor: Colors.primary50,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  planTopRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  planIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  planTitle: { fontSize: 14, fontWeight: "700", color: Colors.gray900 },
  planAuthor: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
  pagesBadge: { backgroundColor: Colors.white, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  pagesBadgeText: { fontSize: 11, fontWeight: "600", color: Colors.gray500 },
  deadlineRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  deadlineText: { fontSize: 13, color: Colors.primary700, fontWeight: "600" },
  emptyCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray100,
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  emptyCardText: { fontSize: 13, color: Colors.gray500 },
  list: { gap: Spacing.sm },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: Spacing.md,
  },
  memberCardMuted: { opacity: 0.6 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMuted: { backgroundColor: Colors.gray100 },
  avatarText: { fontSize: 15, fontWeight: "700", color: Colors.primary700 },
  avatarTextMuted: { color: Colors.gray500 },
  memberTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm, marginBottom: 6 },
  memberName: { flex: 1, fontSize: 13, fontWeight: "600", color: Colors.gray900 },
  memberNameMuted: { flex: 1, fontSize: 13, color: Colors.gray500 },
  memberStats: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  pagesText: { fontSize: 11, color: Colors.gray500 },
  percentText: { fontSize: 12, fontWeight: "700", color: Colors.primary600 },
  doneBadge: { backgroundColor: Colors.primary100, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  doneBadgeText: { fontSize: 10, fontWeight: "700", color: Colors.primary700 },
  noTrackerLabel: { fontSize: 11, color: Colors.gray400, paddingTop: Spacing.sm },
  noTrackerBadge: { backgroundColor: Colors.gray100, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  noTrackerBadgeText: { fontSize: 10, fontWeight: "600", color: Colors.gray500 },
});
