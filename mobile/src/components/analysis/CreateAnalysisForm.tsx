import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { formatMonthKz } from "@/lib/utils";
import { ClubPlan } from "@/lib/types";
import { Colors, Spacing, Radius } from "@/constants/theme";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function CreateAnalysisForm({ clubId, userId }: { clubId: string; userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<ClubPlan[]>([]);

  const [planId, setPlanId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [insightsText, setInsightsText] = useState("");

  useEffect(() => {
    supabase
      .from("club_plans")
      .select("*, books(title)")
      .eq("club_id", clubId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .then(({ data }) => setPlans((data as unknown as ClubPlan[]) || []));
  }, [clubId]);

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert("Қате", "Талқы тақырыбын енгізіңіз");
      return;
    }
    if (meetingDate && !DATE_RE.test(meetingDate)) {
      Alert.alert("Қате", "Талқы күнін ЖЖЖЖ-АА-КК форматында енгізіңіз");
      return;
    }

    setLoading(true);

    const insights = insightsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const { data, error } = await supabase
      .from("book_analyses")
      .insert({
        club_id: clubId,
        club_plan_id: planId,
        author_id: userId,
        title: title.trim(),
        content: content.trim() || null,
        key_insights: insights.length > 0 ? insights : null,
        meeting_date: meetingDate || null,
      })
      .select()
      .single();

    setLoading(false);

    if (error || !data) {
      Alert.alert("Қате", "Пікір ашылмады");
      return;
    }

    router.replace(`/clubs/analysis/${data.id}`);
  }

  return (
    <View style={styles.card}>
      {plans.length > 0 && (
        <View>
          <Text style={styles.label}>Кітап жоспары</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {plans.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.chip, planId === p.id && styles.chipActive]}
                onPress={() => setPlanId(planId === p.id ? null : p.id)}
              >
                <Text style={[styles.chipText, planId === p.id && styles.chipTextActive]} numberOfLines={1}>
                  {formatMonthKz(p.month, p.year)} — {p.books?.title ?? "Кітап белгіленбеген"}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View>
        <Text style={styles.label}>Талқы тақырыбы *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder='Мысалы: «Алхимик» — бүгінгі талқы'
          placeholderTextColor={Colors.gray400}
          style={styles.input}
          maxLength={200}
        />
      </View>

      <View>
        <Text style={styles.label}>Талқы күні</Text>
        <TextInput
          value={meetingDate}
          onChangeText={setMeetingDate}
          placeholder="ЖЖЖЖ-АА-КК"
          placeholderTextColor={Colors.gray400}
          style={styles.input}
        />
      </View>

      <View>
        <Text style={styles.label}>Негізгі мазмұн</Text>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Кітап туралы талқы нәтижесі, маңызды ойлар, пікірлер..."
          placeholderTextColor={Colors.gray400}
          style={[styles.input, styles.textarea]}
          multiline
          numberOfLines={5}
        />
      </View>

      <View>
        <Text style={styles.label}>Маңызды инсайттар</Text>
        <TextInput
          value={insightsText}
          onChangeText={setInsightsText}
          placeholder={"Әр инсайтты жаңа жолдан жазыңыз"}
          placeholderTextColor={Colors.gray400}
          style={[styles.input, styles.textarea]}
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Feather name="message-square" size={16} color={Colors.white} />
            <Text style={styles.submitText}>Пікір ашу</Text>
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
  textarea: { minHeight: 90, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", gap: Spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxWidth: 220,
  },
  chipActive: { backgroundColor: Colors.primary600, borderColor: Colors.primary600 },
  chipText: { fontSize: 12, fontWeight: "600", color: Colors.gray700 },
  chipTextActive: { color: Colors.white },
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
