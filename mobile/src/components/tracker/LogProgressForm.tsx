import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { ReadingProgress } from "@/lib/types";
import { Colors, Spacing, Radius } from "@/constants/theme";

interface Props {
  trackerId: string;
  currentPage: number;
  totalPages: number;
  todayProgress: ReadingProgress | null;
  onSaved: () => void;
}

export default function LogProgressForm({ trackerId, currentPage, totalPages, todayProgress, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [pagesRead, setPagesRead] = useState(todayProgress?.pages_read?.toString() || "");
  const [note, setNote] = useState(todayProgress?.note || "");

  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit() {
    const pages = parseInt(pagesRead, 10);
    if (!pages || pages <= 0) {
      Alert.alert("Қате", "Оқылған бет санын енгізіңіз");
      return;
    }

    setLoading(true);

    if (todayProgress) {
      const { error } = await supabase
        .from("reading_progress")
        .update({ pages_read: pages, note: note.trim() || null })
        .eq("id", todayProgress.id);
      if (error) {
        Alert.alert("Қате", "Сақталмады");
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.from("reading_progress").insert({
        tracker_id: trackerId,
        date: today,
        pages_read: pages,
        note: note.trim() || null,
      });
      if (error) {
        Alert.alert("Қате", "Сақталмады");
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    onSaved();
  }

  const newCurrentPage = Math.min(totalPages, currentPage + (parseInt(pagesRead || "0", 10) || 0));
  const newProgress = totalPages > 0 ? Math.round((newCurrentPage / totalPages) * 100) : 0;

  return (
    <View style={styles.card}>
      {todayProgress && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Бүгін {todayProgress.pages_read} бет оқылды. Жаңарту үшін енгізіңіз.
          </Text>
        </View>
      )}

      <View>
        <Text style={styles.label}>Оқылған бет саны *</Text>
        <View style={styles.row}>
          <TextInput
            value={pagesRead}
            onChangeText={setPagesRead}
            placeholder="Мысалы: 30"
            placeholderTextColor={Colors.gray400}
            keyboardType="number-pad"
            style={[styles.input, { flex: 1 }]}
          />
          {!!pagesRead && parseInt(pagesRead, 10) > 0 && (
            <View style={styles.percentBox}>
              <Text style={styles.percentText}>{newProgress}%</Text>
            </View>
          )}
        </View>
      </View>

      <View>
        <Text style={styles.label}>Ескертпе</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Бүгінгі оқу туралы қысқаша..."
          placeholderTextColor={Colors.gray400}
          maxLength={200}
          style={styles.input}
        />
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Feather name="book-open" size={16} color={Colors.white} />
            <Text style={styles.submitText}>{todayProgress ? "Жаңарту" : "Прогресті сақтау"}</Text>
          </>
        )}
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
  infoBox: { backgroundColor: Colors.primary50, borderRadius: Radius.lg, padding: Spacing.md },
  infoText: { fontSize: 13, color: Colors.primary700 },
  label: { fontSize: 13, fontWeight: "500", color: Colors.gray700, marginBottom: Spacing.sm },
  row: { flexDirection: "row", gap: Spacing.sm, alignItems: "stretch" },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.gray900,
  },
  percentBox: {
    justifyContent: "center",
    backgroundColor: Colors.primary50,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  percentText: { fontSize: 14, fontWeight: "700", color: Colors.primary700 },
  submitBtn: {
    flexDirection: "row",
    backgroundColor: Colors.primary600,
    borderRadius: Radius.md,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  submitText: { color: Colors.white, fontWeight: "700", fontSize: 14 },
});
