import { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, SafeAreaView } from "react-native";
import { useLocalSearchParams, useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import { BookTracker, ReadingProgress } from "@/lib/types";
import { calcProgress, calcDailyPages, daysUntil, formatDateKz } from "@/lib/utils";
import { Colors, Spacing, Radius } from "@/constants/theme";
import ProgressBar from "@/components/ui/ProgressBar";
import LogProgressForm from "@/components/tracker/LogProgressForm";
import DeleteTrackerButton from "@/components/tracker/DeleteTrackerButton";

export default function TrackerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session!.user.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [tracker, setTracker] = useState<BookTracker | null>(null);
  const [history, setHistory] = useState<ReadingProgress[]>([]);

  const fetchData = useCallback(async () => {
    const { data: trackerData } = await supabase
      .from("book_trackers")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    setTracker((trackerData as unknown as BookTracker) || null);

    const { data: historyData } = await supabase
      .from("reading_progress")
      .select("*")
      .eq("tracker_id", id)
      .order("date", { ascending: false })
      .limit(30);
    setHistory((historyData as unknown as ReadingProgress[]) || []);
  }, [id, userId]);

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

  if (!tracker) {
    return (
      <SafeAreaView style={styles.flex}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Трекер табылмады</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progress = calcProgress(tracker.current_page, tracker.total_pages);
  const dailyPages = calcDailyPages(tracker.current_page, tracker.total_pages, tracker.deadline);
  const daysLeft = daysUntil(tracker.deadline);

  const today = new Date().toISOString().split("T")[0];
  const todayProgress = history.find((p) => p.date === today) || null;

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Book header */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBox}>
                <Feather name="book-open" size={20} color={Colors.primary600} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bookTitle}>{tracker.book_title}</Text>
                {tracker.book_author && <Text style={styles.bookAuthor}>{tracker.book_author}</Text>}
              </View>
            </View>
            {tracker.is_completed && (
              <View style={styles.doneBadge}>
                <Feather name="check-circle" size={14} color={Colors.primary700} />
                <Text style={styles.doneBadgeText}>Аяқталды</Text>
              </View>
            )}
          </View>

          <View style={styles.progressBlock}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>{tracker.current_page} / {tracker.total_pages} бет</Text>
              <Text style={styles.progressPercent}>{progress}%</Text>
            </View>
            <ProgressBar value={progress} />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  daysLeft < 0 ? styles.statRed : daysLeft <= 7 ? styles.statYellow : styles.statPrimary,
                ]}
              >
                {daysLeft < 0 ? Math.abs(daysLeft) : daysLeft}
              </Text>
              <Text style={styles.statLabel}>{daysLeft < 0 ? "күн кешікті" : "күн қалды"}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{tracker.total_pages - tracker.current_page}</Text>
              <Text style={styles.statLabel}>бет қалды</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.statPrimary]}>{dailyPages > 0 ? dailyPages : "—"}</Text>
              <Text style={styles.statLabel}>бет/күн</Text>
            </View>
          </View>

          <View style={styles.deadlineRow}>
            <Feather name="calendar" size={12} color={Colors.gray400} />
            <Text style={styles.deadlineText}>Дедлайн: {formatDateKz(tracker.deadline)}</Text>
          </View>
        </View>

        {/* Log progress */}
        {!tracker.is_completed && (
          <View style={styles.section}>
            <Text style={styles.h2}>Бүгінгі прогрес</Text>
            <LogProgressForm
              trackerId={tracker.id}
              currentPage={tracker.current_page}
              totalPages={tracker.total_pages}
              todayProgress={todayProgress}
              onSaved={fetchData}
            />
          </View>
        )}

        {/* Progress history */}
        {history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.h2}>Оқу тарихы</Text>
            <View style={styles.historyCard}>
              {history.map((p, i) => (
                <View key={p.id} style={[styles.historyRow, i > 0 && styles.historyRowBorder]}>
                  <View>
                    <Text style={styles.historyDate}>{formatDateKz(p.date)}</Text>
                    {p.note && <Text style={styles.historyNote}>{p.note}</Text>}
                  </View>
                  <View style={styles.badgeGreen}>
                    <Text style={styles.badgeGreenText}>+{p.pages_read} бет</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <DeleteTrackerButton trackerId={tracker.id} onDeleted={() => router.replace("/tracker")} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: Spacing.lg, gap: Spacing.lg },
  emptyText: { fontSize: 14, color: Colors.gray500 },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: Spacing.sm },
  headerLeft: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md, flex: 1 },
  iconBox: {
    width: 40,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  bookTitle: { fontSize: 16, fontWeight: "700", color: Colors.gray900 },
  bookAuthor: { fontSize: 13, color: Colors.gray500, marginTop: 2 },
  doneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary100,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  doneBadgeText: { fontSize: 12, fontWeight: "600", color: Colors.primary700 },
  progressBlock: { gap: 4 },
  progressLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 13, color: Colors.gray700 },
  progressPercent: { fontSize: 13, fontWeight: "700", color: Colors.primary700 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: Colors.gray50,
    paddingTop: Spacing.md,
  },
  statItem: { alignItems: "center", flex: 1 },
  statValue: { fontSize: 18, fontWeight: "700", color: Colors.gray900 },
  statLabel: { fontSize: 11, color: Colors.gray500, marginTop: 2 },
  statRed: { color: Colors.red500 },
  statYellow: { color: "#a16207" },
  statPrimary: { color: Colors.primary600 },
  deadlineRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  deadlineText: { fontSize: 11, color: Colors.gray400 },
  section: { gap: Spacing.sm },
  h2: { fontSize: 15, fontWeight: "700", color: Colors.gray900 },
  historyCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray100,
    paddingHorizontal: Spacing.lg,
  },
  historyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: Spacing.md },
  historyRowBorder: { borderTopWidth: 1, borderTopColor: Colors.gray50 },
  historyDate: { fontSize: 13, fontWeight: "600", color: Colors.gray900 },
  historyNote: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
  badgeGreen: { backgroundColor: Colors.primary50, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  badgeGreenText: { fontSize: 11, fontWeight: "700", color: Colors.primary700 },
});
