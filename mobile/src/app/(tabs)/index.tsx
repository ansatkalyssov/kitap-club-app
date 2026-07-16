import { useState, useCallback, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, SafeAreaView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import { ReadingGoal, ReadingLog } from "@/lib/types";
import { calcReadingStreak, formatDateKz } from "@/lib/utils";
import { Colors, Spacing, Radius } from "@/constants/theme";
import GoalForm from "@/components/reading-plan/GoalForm";
import ReadingTimer from "@/components/reading-plan/ReadingTimer";
import LogPagesForm from "@/components/reading-plan/LogPagesForm";

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

  async function handleSaved() {
    setEditingGoal(false);
    await fetchData();
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

  const today = new Date().toISOString().split("T")[0];
  const todayLog = logs.find((l) => l.date === today) || null;
  const target = goal ? (goal.goal_type === "time" ? goal.daily_minutes : goal.daily_pages) || 0 : 0;
  const streak = goal ? calcReadingStreak(logs, goal.goal_type, target) : 0;

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary600]} />}
      >
        <View style={styles.header}>
          <Text style={styles.h1}>Күнделікті оқу</Text>
          <Text style={styles.subtitle}>Жеке оқу жоспарыңызды бақылаңыз</Text>
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
                  <Text style={styles.summaryTitle}>
                    Күніне {goal.goal_type === "time" ? `${goal.daily_minutes} минут` : `${goal.daily_pages} бет`}
                  </Text>
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
            {goal.goal_type === "time" ? (
              <ReadingTimer
                userId={userId}
                date={today}
                todayMinutes={todayLog?.minutes_read || 0}
                todayPages={todayLog?.pages_read || 0}
                goalMinutes={goal.daily_minutes || 0}
                onSaved={fetchData}
              />
            ) : (
              <LogPagesForm
                userId={userId}
                date={today}
                todayPages={todayLog?.pages_read || 0}
                todayMinutes={todayLog?.minutes_read || 0}
                goalPages={goal.daily_pages || 0}
                onSaved={fetchData}
              />
            )}

            {/* History */}
            {logs.length > 0 && (
              <View>
                <Text style={styles.h2}>Соңғы күндер</Text>
                <View style={styles.card}>
                  {logs.slice(0, 7).map((l, i) => {
                    const value = goal.goal_type === "time" ? l.minutes_read : l.pages_read;
                    const met = target > 0 && value >= target;
                    return (
                      <View key={l.id} style={[styles.historyRow, i > 0 && styles.historyRowBorder]}>
                        <Text style={styles.historyDate}>{formatDateKz(l.date)}</Text>
                        <Text style={[styles.historyValue, met && styles.historyValueMet]}>
                          {goal.goal_type === "time" ? `${l.minutes_read} мин` : `${l.pages_read} бет`}
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
            {editingGoal && <GoalForm userId={userId} existingGoal={goal} onSaved={handleSaved} />}
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
});
