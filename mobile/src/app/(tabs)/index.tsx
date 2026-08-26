import { useState, useCallback, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, SafeAreaView, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import { ReadingGoal, ReadingLog } from "@/lib/types";
import { calcReadingStreak, formatDateKz, kzDateStr } from "@/lib/utils";
import { Colors, Spacing, Radius } from "@/constants/theme";
import GoalForm from "@/components/reading-plan/GoalForm";
import ReadingTimer from "@/components/reading-plan/ReadingTimer";

export default function ReadingPlanScreen() {
  const { session } = useAuth();
  const userId = session!.user.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [goal, setGoal] = useState<ReadingGoal | null>(null);
  const [logs, setLogs] = useState<ReadingLog[]>([]);
  const [editingGoal, setEditingGoal] = useState(false);

  const fetchData = useCallback(async () => {
    const [{ data: goalData }, { data: logsData }] = await Promise.all([
      supabase.from("reading_goals").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("reading_logs").select("*").eq("user_id", userId).order("date", { ascending: false }).limit(30),
    ]);
    setGoal(goalData as ReadingGoal | null);
    setLogs((logsData as ReadingLog[]) || []);
  }, [userId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    })();
  }, [fetchData]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  function handleSaved() {
    setEditingGoal(false);
    fetchData().catch(() => {});
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.flex}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary600} />
        </View>
      </SafeAreaView>
    );
  }

  const today = kzDateStr();
  const todayLog = logs.find((l) => l.date === today) || null;
  const target = goal?.daily_minutes || 0;
  const streak = goal ? calcReadingStreak(logs, target) : 0;

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary600]} />}
      >
        <View style={styles.header}>
          <Text style={styles.h1}>Күнделікті оқу</Text>
          <Text style={styles.subtitle}>Мақсат қойып, кітап оқуды күнделікті дағдыға айналдырыңыз</Text>
        </View>

        {!goal ? (
          <GoalForm userId={userId} onSaved={handleSaved} />
        ) : (
          <View style={styles.section}>
            {/* Goal summary + streak */}
            <View style={[styles.card, styles.summaryRow]}>
              <View style={styles.summaryLeft}>
                <View style={styles.iconWrap}>
                  <Feather name="target" size={20} color={Colors.primary600} />
                </View>
                <View>
                  <Text style={styles.summaryTitle}>Күніне {goal.daily_minutes} минут</Text>
                  <Text style={styles.summarySub}>Жеке мақсат</Text>
                </View>
              </View>
              {streak > 0 && (
                <View style={styles.streakBadge}>
                  <Feather name="zap" size={14} color={Colors.orange600} />
                  <Text style={styles.streakText}>{streak} күн</Text>
                </View>
              )}
            </View>

            {/* Today's progress */}
            <ReadingTimer
              userId={userId}
              date={today}
              todayMinutes={todayLog?.minutes_read || 0}
              goalMinutes={goal.daily_minutes || 0}
              onSaved={fetchData}
            />

            {/* History */}
            {logs.length > 0 && (
              <View>
                <Text style={styles.h2}>Соңғы күндер</Text>
                <View style={styles.card}>
                  {logs.slice(0, 7).map((l, i) => {
                    const met = target > 0 && l.minutes_read >= target;
                    return (
                      <View key={l.id} style={[styles.historyRow, i > 0 && styles.historyRowBorder]}>
                        <Text style={styles.historyDate}>{formatDateKz(l.date)}</Text>
                        <Text style={[styles.historyValue, met && styles.historyValueMet]}>
                          {l.minutes_read} мин
                          {met && " ✓"}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Edit goal */}
            <TouchableOpacity style={styles.editToggle} onPress={() => setEditingGoal((v) => !v)}>
              <Text style={styles.editToggleText}>Мақсатты өзгерту</Text>
              <Feather name={editingGoal ? "chevron-up" : "chevron-down"} size={16} color={Colors.gray500} />
            </TouchableOpacity>

            <Modal
              visible={editingGoal}
              animationType="slide"
              transparent
              onRequestClose={() => setEditingGoal(false)}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.modalOverlay}
              >
                <View style={styles.modalSheet}>
                  <GoalForm userId={userId} existingGoal={goal} onSaved={handleSaved} />
                </View>
              </KeyboardAvoidingView>
            </Modal>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: Spacing.lg, gap: Spacing.lg },
  header: { gap: 2, marginBottom: Spacing.xs },
  h1: { fontSize: 22, fontWeight: "700", color: Colors.primary900 },
  subtitle: { fontSize: 13, color: Colors.gray500 },
  h2: { fontSize: 15, fontWeight: "700", color: Colors.gray900, marginBottom: Spacing.sm },
  section: { gap: Spacing.lg },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: Spacing.lg,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  summaryLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary50,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTitle: { fontSize: 14, fontWeight: "700", color: Colors.gray900 },
  summarySub: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.orange50,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  streakText: { fontSize: 13, fontWeight: "700", color: Colors.orange600 },
  historyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  historyRowBorder: { borderTopWidth: 1, borderTopColor: Colors.gray50 },
  historyDate: { fontSize: 13, color: Colors.gray700 },
  historyValue: { fontSize: 13, fontWeight: "500", color: Colors.gray400 },
  historyValueMet: { color: Colors.primary600 },
  editToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  editToggleText: { fontSize: 13, color: Colors.gray500 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingBottom: 36,
  },
});
