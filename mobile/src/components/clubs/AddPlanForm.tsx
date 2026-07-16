import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { MONTHS_KZ } from "@/lib/utils";
import DatePickerField from "@/components/ui/DatePickerField";
import { Colors, Spacing, Radius } from "@/constants/theme";

const MAX_PLANS_PER_MONTH = 4;

export default function AddPlanForm({ clubId }: { clubId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookPages, setBookPages] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [notes, setNotes] = useState("");

  const years = [now.getFullYear(), now.getFullYear() + 1];

  function handleEndDateChange(date: string) {
    setEndDate(date);
    if (date) setMeetingDate(date);
  }

  async function handleSubmit() {
    if (!bookTitle.trim()) {
      Alert.alert("Қате", "Кітап атын енгізіңіз");
      return;
    }

    setLoading(true);

    const { count: planCount } = await supabase
      .from("club_plans")
      .select("id", { count: "exact" })
      .eq("club_id", clubId)
      .eq("month", month)
      .eq("year", year);

    if ((planCount ?? 0) >= MAX_PLANS_PER_MONTH) {
      setLoading(false);
      Alert.alert("Қате", "Бір айға ең көп 4 кітап қосуға болады");
      return;
    }

    const { data: book, error: bookError } = await supabase
      .from("books")
      .insert({
        title: bookTitle.trim(),
        author: bookAuthor.trim() || null,
        page_count: bookPages ? parseInt(bookPages, 10) : null,
      })
      .select()
      .single();

    if (bookError || !book) {
      setLoading(false);
      Alert.alert("Қате", "Кітап сақталмады");
      return;
    }

    const { error: planError } = await supabase.from("club_plans").insert({
      club_id: clubId,
      book_id: book.id,
      month,
      year,
      start_date: startDate || null,
      end_date: endDate || null,
      meeting_date: meetingDate || null,
      meeting_location: meetingLocation.trim() || null,
      notes: notes.trim() || null,
    });

    setLoading(false);

    if (planError) {
      Alert.alert("Қате", "Жоспар сақталмады");
      return;
    }

    router.back();
  }

  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.label}>Ай *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {MONTHS_KZ.map((m, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.chip, month === i + 1 && styles.chipActive]}
              onPress={() => setMonth(i + 1)}
            >
              <Text style={[styles.chipText, month === i + 1 && styles.chipTextActive]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View>
        <Text style={styles.label}>Жыл *</Text>
        <View style={styles.chipRow}>
          {years.map((y) => (
            <TouchableOpacity
              key={y}
              style={[styles.chip, year === y && styles.chipActive]}
              onPress={() => setYear(y)}
            >
              <Text style={[styles.chipText, year === y && styles.chipTextActive]}>{y}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Кітап</Text>

      <View>
        <Text style={styles.label}>Кітап аты *</Text>
        <TextInput
          value={bookTitle}
          onChangeText={setBookTitle}
          placeholder="Кітаптың атауы"
          placeholderTextColor={Colors.gray400}
          style={styles.input}
        />
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Автор</Text>
          <TextInput
            value={bookAuthor}
            onChangeText={setBookAuthor}
            placeholder="Автор аты"
            placeholderTextColor={Colors.gray400}
            style={styles.input}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Беттер</Text>
          <TextInput
            value={bookPages}
            onChangeText={setBookPages}
            placeholder="300"
            placeholderTextColor={Colors.gray400}
            keyboardType="number-pad"
            style={styles.input}
          />
        </View>
      </View>

      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Мерзімдер</Text>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <DatePickerField label="Басталуы" value={startDate} onChange={setStartDate} />
        </View>
        <View style={{ flex: 1 }}>
          <DatePickerField label="Аяқталуы" value={endDate} onChange={handleEndDateChange} />
        </View>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <DatePickerField label="Талқы күні" value={meetingDate} onChange={setMeetingDate} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Орны</Text>
          <TextInput
            value={meetingLocation}
            onChangeText={setMeetingLocation}
            placeholder="Кездесу орны"
            placeholderTextColor={Colors.gray400}
            style={styles.input}
          />
        </View>
      </View>

      <View>
        <Text style={styles.label}>Ескертпе</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Қосымша ақпарат..."
          placeholderTextColor={Colors.gray400}
          style={[styles.input, styles.textarea]}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.noteBox}>
        <Feather name="info" size={13} color={Colors.gray500} />
        <Text style={styles.noteText}>
          Әр оқырман осы жоспарға арналған трекерді "Кітап трекері" бөлімінен өзі қосады.
        </Text>
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Feather name="calendar" size={16} color={Colors.white} />
            <Text style={styles.submitText}>Жоспарды сақтау</Text>
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
  textarea: { minHeight: 80, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.gray100 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.gray700 },
  chipRow: { flexDirection: "row", gap: Spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipActive: { backgroundColor: Colors.primary600, borderColor: Colors.primary600 },
  chipText: { fontSize: 12, fontWeight: "600", color: Colors.gray700 },
  chipTextActive: { color: Colors.white },
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    backgroundColor: Colors.gray50,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  noteText: { flex: 1, fontSize: 12, color: Colors.gray500, lineHeight: 17 },
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
