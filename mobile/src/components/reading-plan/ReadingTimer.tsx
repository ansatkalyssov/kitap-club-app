import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import ProgressBar from "@/components/ui/ProgressBar";
import { Colors, Spacing, Radius } from "@/constants/theme";

interface Props {
  userId: string;
  date: string;
  todayMinutes: number;
  todayPages: number;
  goalMinutes: number;
  onSaved: () => void;
}

export default function ReadingTimer({ userId, date, todayMinutes, todayPages, goalMinutes, onSaved }: Props) {
  const [running, setRunning] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const sessionMinutes = Math.floor(elapsedSec / 60);
  const sessionDisplay = `${Math.floor(elapsedSec / 60)
    .toString()
    .padStart(2, "0")}:${(elapsedSec % 60).toString().padStart(2, "0")}`;
  const totalMinutes = todayMinutes + sessionMinutes;
  const progress = goalMinutes > 0 ? Math.min(100, Math.round((totalMinutes / goalMinutes) * 100)) : 0;
  const goalReached = goalMinutes > 0 && totalMinutes >= goalMinutes;

  async function handleFinish() {
    if (sessionMinutes < 1) {
      Alert.alert("Қате", "Кемінде 1 минут оқыңыз");
      return;
    }
    setSaving(true);
    const newMinutes = todayMinutes + sessionMinutes;
    const { error } = await supabase
      .from("reading_logs")
      .upsert({ user_id: userId, date, minutes_read: newMinutes, pages_read: todayPages }, { onConflict: "user_id,date" });
    setSaving(false);
    if (error) {
      Alert.alert("Қате", "Сақталмады");
      return;
    }
    setRunning(false);
    setElapsedSec(0);
    onSaved();
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.h3}>Бүгінгі оқу уақыты</Text>
        {goalReached && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Мақсат орындалды ✓</Text>
          </View>
        )}
      </View>

      <View style={styles.timerWrap}>
        <Text style={styles.timerText}>{sessionDisplay}</Text>
        <Text style={styles.timerSub}>
          Бүгін: {totalMinutes} / {goalMinutes} минут
        </Text>
      </View>

      <ProgressBar value={progress} />

      <View style={styles.btnRow}>
        {!running ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setRunning(true)}>
            <Feather name="play" size={16} color={Colors.white} />
            <Text style={styles.primaryBtnText}>{elapsedSec > 0 ? "Жалғастыру" : "Бастау"}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setRunning(false)}>
            <Feather name="pause" size={16} color={Colors.gray700} />
            <Text style={styles.secondaryBtnText}>Кідірту</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.ghostBtn, (saving || elapsedSec === 0) && styles.btnDisabled]}
          onPress={handleFinish}
          disabled={saving || elapsedSec === 0}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.gray700} />
          ) : (
            <Feather name="square" size={16} color={Colors.gray700} />
          )}
          <Text style={styles.secondaryBtnText}>Аяқтау</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  h3: { fontSize: 16, fontWeight: "700", color: Colors.gray900 },
  badge: {
    backgroundColor: Colors.primary50,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: "600", color: Colors.primary700 },
  timerWrap: { alignItems: "center" },
  timerText: { fontSize: 40, fontWeight: "700", color: Colors.primary700, fontVariant: ["tabular-nums"] },
  timerSub: { marginTop: 4, fontSize: 13, color: Colors.gray500 },
  btnRow: { flexDirection: "row", gap: Spacing.sm },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: Colors.primary600,
    borderRadius: Radius.md,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  primaryBtnText: { color: Colors.white, fontWeight: "700", fontSize: 14 },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: Colors.gray100,
    borderRadius: Radius.md,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  secondaryBtnText: { color: Colors.gray700, fontWeight: "700", fontSize: 14 },
  ghostBtn: {
    flex: 1,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.md,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  btnDisabled: { opacity: 0.5 },
});
