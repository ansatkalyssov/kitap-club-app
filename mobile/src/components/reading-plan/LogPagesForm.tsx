import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import ProgressBar from "@/components/ui/ProgressBar";
import { Colors, Spacing, Radius } from "@/constants/theme";

interface Props {
  userId: string;
  date: string;
  todayPages: number;
  todayMinutes: number;
  goalPages: number;
  onSaved: () => void;
}

export default function LogPagesForm({ userId, date, todayPages, todayMinutes, goalPages, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState(todayPages > 0 ? todayPages.toString() : "");

  const goalReached = goalPages > 0 && todayPages >= goalPages;
  const progress = goalPages > 0 ? Math.min(100, Math.round((todayPages / goalPages) * 100)) : 0;

  async function handleSubmit() {
    const value = parseInt(pages, 10);
    if (!value || value <= 0) {
      Alert.alert("Қате", "Оқылған бет санын енгізіңіз");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("reading_logs")
      .upsert({ user_id: userId, date, pages_read: value, minutes_read: todayMinutes }, { onConflict: "user_id,date" });
    setLoading(false);
    if (error) {
      Alert.alert("Қате", "Сақталмады");
      return;
    }
    onSaved();
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.h3}>Бүгін оқыдыңыз ба?</Text>
        {goalReached && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Мақсат орындалды ✓</Text>
          </View>
        )}
      </View>

      <View>
        <ProgressBar value={progress} />
        <Text style={styles.subText}>
          Бүгін: {todayPages} / {goalPages} бет
        </Text>
      </View>

      <View style={styles.inputRow}>
        <TextInput
          value={pages}
          onChangeText={setPages}
          placeholder={`Мысалы: ${goalPages}`}
          placeholderTextColor={Colors.gray400}
          keyboardType="number-pad"
          style={[styles.input, { flex: 1 }]}
        />
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Feather name="book-open" size={16} color={Colors.white} />
          )}
          <Text style={styles.submitText}>Сақтау</Text>
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
  subText: { marginTop: Spacing.sm, fontSize: 13, color: Colors.gray500 },
  inputRow: { flexDirection: "row", gap: Spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.gray900,
  },
  submitBtn: {
    flexDirection: "row",
    backgroundColor: Colors.primary600,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  submitText: { color: Colors.white, fontWeight: "700", fontSize: 14 },
});
