import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { calcDailyPages } from "@/lib/utils";
import { Colors, Spacing, Radius } from "@/constants/theme";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function CreateTrackerForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [currentPage, setCurrentPage] = useState("0");
  const [startDate, setStartDate] = useState(today);
  const [deadline, setDeadline] = useState("");

  const total = parseInt(totalPages, 10);
  const current = parseInt(currentPage || "0", 10);
  const dailyPages =
    total > 0 && deadline && DATE_RE.test(deadline) ? calcDailyPages(current || 0, total, deadline) : null;

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert("Қате", "Кітап атын енгізіңіз");
      return;
    }
    if (!total || total <= 0) {
      Alert.alert("Қате", "Парақ санын енгізіңіз");
      return;
    }
    if (!DATE_RE.test(startDate)) {
      Alert.alert("Қате", "Басталу күнін ЖЖЖЖ-АА-КК форматында енгізіңіз");
      return;
    }
    if (!deadline || !DATE_RE.test(deadline)) {
      Alert.alert("Қате", "Дедлайнды ЖЖЖЖ-АА-КК форматында енгізіңіз");
      return;
    }
    if (new Date(deadline) <= new Date(startDate)) {
      Alert.alert("Қате", "Дедлайн басталу күнінен кейін болуы керек");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("book_trackers").insert({
      user_id: userId,
      book_id: null,
      club_plan_id: null,
      book_title: title.trim(),
      book_author: author.trim() || null,
      total_pages: total,
      current_page: current || 0,
      start_date: startDate,
      deadline,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Қате", "Трекер жасалмады");
      return;
    }

    router.replace("/tracker");
  }

  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.label}>Кітап аты *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Кітаптың атауы"
          placeholderTextColor={Colors.gray400}
          style={styles.input}
        />
      </View>

      <View>
        <Text style={styles.label}>Автор</Text>
        <TextInput
          value={author}
          onChangeText={setAuthor}
          placeholder="Автор аты"
          placeholderTextColor={Colors.gray400}
          style={styles.input}
        />
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Барлық бет *</Text>
          <TextInput
            value={totalPages}
            onChangeText={setTotalPages}
            placeholder="300"
            placeholderTextColor={Colors.gray400}
            keyboardType="number-pad"
            style={styles.input}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Оқылған бет</Text>
          <TextInput
            value={currentPage}
            onChangeText={setCurrentPage}
            placeholder="0"
            placeholderTextColor={Colors.gray400}
            keyboardType="number-pad"
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Басталуы</Text>
          <TextInput
            value={startDate}
            onChangeText={setStartDate}
            placeholder="ЖЖЖЖ-АА-КК"
            placeholderTextColor={Colors.gray400}
            style={styles.input}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Дедлайн *</Text>
          <TextInput
            value={deadline}
            onChangeText={setDeadline}
            placeholder="ЖЖЖЖ-АА-КК"
            placeholderTextColor={Colors.gray400}
            style={styles.input}
          />
        </View>
      </View>

      {dailyPages !== null && dailyPages > 0 && (
        <View style={styles.previewBox}>
          <Text style={styles.previewText}>
            Мақсатыңызға жету үшін күнде <Text style={styles.previewBold}>{dailyPages} бет</Text> оқу керек
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Feather name="book-open" size={16} color={Colors.white} />
            <Text style={styles.submitText}>Трекер жасау</Text>
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
  label: { fontSize: 13, fontWeight: "500", color: Colors.gray700, marginBottom: Spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.gray900,
  },
  row: { flexDirection: "row", gap: Spacing.md },
  previewBox: { backgroundColor: Colors.primary50, borderRadius: Radius.lg, padding: Spacing.md },
  previewText: { fontSize: 13, color: Colors.primary700 },
  previewBold: { fontWeight: "700" },
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
