import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch, Alert, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";
import { ReadingGoal } from "@/lib/types";
import { Colors, Spacing, Radius } from "@/constants/theme";
import { setDailyReminder, cancelDailyReminder } from "@/lib/notifications";

interface Props {
  userId: string;
  existingGoal?: ReadingGoal | null;
  onSaved: () => void;
}

export default function GoalForm({ userId, existingGoal, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [minutes, setMinutes] = useState(existingGoal?.daily_minutes?.toString() || "30");
  const [reminderEnabled, setReminderEnabled] = useState(existingGoal?.reminder_enabled ?? true);
  const [reminderTime, setReminderTime] = useState(existingGoal?.reminder_time?.slice(0, 5) || "20:00");

  async function handleSubmit() {
    const value = parseInt(minutes, 10);
    if (!value || value <= 0) {
      Alert.alert("Қате", "Мақсатты дұрыс енгізіңіз");
      return;
    }

    if (reminderEnabled && !/^\d{2}:\d{2}$/.test(reminderTime)) {
      Alert.alert("Қате", "Уақытты СС:ММ форматында енгізіңіз (мысалы 20:00)");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("reading_goals").upsert(
      {
        user_id: userId,
        daily_minutes: value,
        reminder_enabled: reminderEnabled,
        reminder_time: reminderTime,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    setLoading(false);

    if (error) {
      Alert.alert("Қате", "Сақталмады");
      return;
    }

    // Формды бірден жабу
    onSaved();

    // Хабарландыру формадан тыс орнатылады
    try {
      if (reminderEnabled) {
        const granted = await setDailyReminder(reminderTime);
        if (!granted) {
          Alert.alert(
            "Хабарландыру рұқсаты жоқ",
            "Жоспар сақталды, бірақ еске салғыш жұмыс істеуі үшін хабарландыруға рұқсат беріңіз"
          );
        }
      } else {
        await cancelDailyReminder();
      }
    } catch {}
  }

  return (
    <View style={styles.card}>
      {!existingGoal && (
        <View style={styles.intro}>
          <Text style={styles.h3}>Оқу мақсатыңызды таңдаңыз</Text>
          <Text style={styles.subtitle}>Күн сайын кітап оқу әдетін қалыптастыруға көмектесеміз</Text>
        </View>
      )}

      <View>
        <Text style={styles.label}>Күніне неше минут оқисыз?</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={minutes}
            onChangeText={setMinutes}
            keyboardType="number-pad"
            style={[styles.input, { flex: 1 }]}
          />
          <Text style={styles.unit}>минут</Text>
        </View>
        <View style={styles.presetRow}>
          {[15, 30, 60].map((m) => (
            <TouchableOpacity key={m} style={styles.presetBtn} onPress={() => setMinutes(m.toString())}>
              <Text style={styles.presetText}>{m} мин</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Reminder */}
      <View style={styles.reminderCard}>
        <View style={styles.reminderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Еске салғыш</Text>
            <Text style={styles.subtitle}>Бүгін оқымасаңыз хабарландыру жібереміз</Text>
          </View>
          <Switch
            value={reminderEnabled}
            onValueChange={setReminderEnabled}
            trackColor={{ true: Colors.primary400, false: Colors.gray200 }}
          />
        </View>
        {reminderEnabled && (
          <TextInput
            value={reminderTime}
            onChangeText={setReminderTime}
            placeholder="20:00"
            placeholderTextColor={Colors.gray400}
            style={[styles.input, { marginTop: Spacing.md }]}
          />
        )}
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading && <ActivityIndicator color={Colors.white} style={{ marginRight: 8 }} />}
        <Text style={styles.submitText}>{existingGoal ? "Жаңарту" : "Жоспарды сақтау"}</Text>
      </TouchableOpacity>
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
  intro: { gap: 4 },
  h3: { fontSize: 16, fontWeight: "700", color: Colors.gray900 },
  subtitle: { fontSize: 12, color: Colors.gray500 },
  label: { fontSize: 13, fontWeight: "500", color: Colors.gray700, marginBottom: Spacing.sm },
  inputRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.gray900,
  },
  unit: { fontSize: 13, color: Colors.gray500 },
  presetRow: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
  presetBtn: {
    backgroundColor: Colors.gray100,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  presetText: { fontSize: 12, fontWeight: "500", color: Colors.gray700 },
  reminderCard: {
    borderWidth: 1,
    borderColor: Colors.gray100,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  reminderRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  submitBtn: {
    flexDirection: "row",
    backgroundColor: Colors.primary600,
    borderRadius: Radius.md,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: { color: Colors.white, fontWeight: "700", fontSize: 14 },
});
