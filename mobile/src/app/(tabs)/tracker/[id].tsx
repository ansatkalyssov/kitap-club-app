import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, SafeAreaView,
  Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Image,
} from "react-native";
import { useLocalSearchParams, useFocusEffect, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { supabase, supabaseUrl } from "@/lib/supabase";
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

  // Edit modal
  const [editVisible, setEditVisible] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editPages, setEditPages] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editCoverUri, setEditCoverUri] = useState<string | null>(null);

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
      return () => { active = false; };
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

  function openEdit() {
    setEditTitle(tracker!.book_title);
    setEditAuthor(tracker!.book_author || "");
    setEditPages(String(tracker!.total_pages));
    setEditDeadline(tracker!.deadline);
    setEditCoverUri(null);
    setEditVisible(true);
  }

  async function pickImage() {
    Alert.alert("Debug", "pickImage басылды");
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    Alert.alert("Debug", `Рұқсат: ${status}`);
    if (status !== "granted") {
      Alert.alert("Рұқсат қажет", "Галереяға рұқсат беріңіз");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.7,
    });
    Alert.alert("Debug", `Нәтиже: canceled=${result.canceled}, assets=${result.assets?.length}`);
    if (!result.canceled && result.assets[0]) {
      setEditCoverUri(result.assets[0].uri);
    }
  }

  async function handleEditSave() {
    if (!editTitle.trim()) { Alert.alert("Қате", "Кітап атын енгізіңіз"); return; }
    const pages = parseInt(editPages);
    if (!pages || pages < 1) { Alert.alert("Қате", "Бет санын дұрыс енгізіңіз"); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editDeadline)) {
      Alert.alert("Қате", "Дедлайнды ЖЖЖЖ-АА-КК форматында енгізіңіз");
      return;
    }

    setEditSaving(true);

    let coverUrl = tracker!.cover_url;

    if (editCoverUri) {
      const ext = editCoverUri.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
      const mime = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
      const path = `${userId}/${Date.now()}.${ext}`;

      const formData = new FormData();
      formData.append("file", { uri: editCoverUri, name: `photo.${ext}`, type: mime } as any);

      const { data: { session } } = await supabase.auth.getSession();
      const uploadRes = await fetch(
        `${supabaseUrl}/storage/v1/object/books/${path}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token}` },
          body: formData,
        }
      );

      if (!uploadRes.ok) {
        const txt = await uploadRes.text();
        setEditSaving(false);
        Alert.alert("Қате", `Сурет жүктелмеді: ${txt}`);
        return;
      }
      coverUrl = `${supabaseUrl}/storage/v1/object/public/books/${path}`;
    }

    const { error } = await supabase
      .from("book_trackers")
      .update({
        book_title: editTitle.trim(),
        book_author: editAuthor.trim() || null,
        total_pages: pages,
        deadline: editDeadline,
        cover_url: coverUrl,
      })
      .eq("id", id);
    setEditSaving(false);

    if (error) { Alert.alert("Қате", "Сақталмады"); return; }
    setEditVisible(false);
    await fetchData();
  }

  const progress = calcProgress(tracker.current_page, tracker.total_pages);
  const dailyPages = calcDailyPages(tracker.current_page, tracker.total_pages, tracker.deadline);
  const daysLeft = daysUntil(tracker.deadline);

  const today = new Date().toISOString().split("T")[0];
  const todayProgress = history.find((p) => p.date === today) || null;

  const coverUrl = tracker.cover_url;

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Book header */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              {coverUrl ? (
                <Image source={{ uri: coverUrl }} style={styles.coverImg} />
              ) : (
                <View style={styles.iconBox}>
                  <Feather name="book-open" size={20} color={Colors.primary600} />
                </View>
              )}
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
              <Text style={[styles.statValue, daysLeft < 0 ? styles.statRed : daysLeft <= 7 ? styles.statYellow : styles.statPrimary]}>
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

        {/* Edit / Delete row */}
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={openEdit} style={styles.editBtn}>
            <Feather name="edit-2" size={14} color={Colors.gray500} />
            <Text style={styles.editBtnText}>Өңдеу</Text>
          </TouchableOpacity>
          <DeleteTrackerButton trackerId={tracker.id} onDeleted={() => router.replace("/tracker")} />
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <ScrollView style={styles.modalSheet} contentContainerStyle={{ gap: Spacing.sm, paddingBottom: Spacing.xl }}>
            <Text style={styles.modalTitle}>Трекерді өңдеу</Text>

            {/* Cover picker */}
            <Text style={styles.label}>Мұқабасы</Text>
            <View style={styles.coverRow}>
              {(editCoverUri || coverUrl) ? (
                <Image
                  source={{ uri: editCoverUri || coverUrl! }}
                  style={styles.coverPickerImg}
                />
              ) : (
                <View style={styles.coverPickerEmpty}>
                  <Feather name="image" size={22} color={Colors.gray400} />
                </View>
              )}
              <TouchableOpacity onPress={pickImage} style={styles.coverChangeBtn}>
                <Feather name="camera" size={14} color={Colors.primary600} />
                <Text style={styles.coverChangeBtnText}>
                  {editCoverUri || coverUrl ? "Суретті өзгерту" : "Сурет қосу"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Кітап аты *</Text>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              style={styles.input}
              placeholder="Кітап аты"
              placeholderTextColor={Colors.gray400}
            />

            <Text style={styles.label}>Автор</Text>
            <TextInput
              value={editAuthor}
              onChangeText={setEditAuthor}
              style={styles.input}
              placeholder="Автор аты"
              placeholderTextColor={Colors.gray400}
            />

            <Text style={styles.label}>Беттер саны *</Text>
            <TextInput
              value={editPages}
              onChangeText={setEditPages}
              style={styles.input}
              keyboardType="number-pad"
              placeholder="300"
              placeholderTextColor={Colors.gray400}
            />

            <Text style={styles.label}>Дедлайн (ЖЖЖЖ-АА-КК) *</Text>
            <TextInput
              value={editDeadline}
              onChangeText={setEditDeadline}
              style={styles.input}
              placeholder="2025-12-31"
              placeholderTextColor={Colors.gray400}
              maxLength={10}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity
                onPress={() => setEditVisible(false)}
                style={[styles.modalBtn, styles.modalBtnCancel]}
              >
                <Text style={styles.modalBtnCancelText}>Болдырмау</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEditSave}
                disabled={editSaving}
                style={[styles.modalBtn, styles.modalBtnSave]}
              >
                {editSaving ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.modalBtnSaveText}>Сақтау</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
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
  coverImg: { width: 40, height: 56, borderRadius: Radius.md, resizeMode: "cover" },
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
  actionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  editBtnText: { fontSize: 13, fontWeight: "500", color: Colors.gray500 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    maxHeight: "90%",
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: Colors.gray900, marginBottom: Spacing.sm },
  label: { fontSize: 13, fontWeight: "500", color: Colors.gray700, marginTop: Spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: Colors.gray900,
  },
  coverRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  coverPickerImg: { width: 60, height: 84, borderRadius: Radius.md, resizeMode: "cover" },
  coverPickerEmpty: {
    width: 60,
    height: 84,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.gray50,
  },
  coverChangeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary600,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  coverChangeBtnText: { fontSize: 13, fontWeight: "600", color: Colors.primary600 },
  modalBtns: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.md },
  modalBtn: { flex: 1, borderRadius: Radius.md, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  modalBtnCancel: { borderWidth: 1, borderColor: Colors.gray200 },
  modalBtnCancelText: { fontSize: 14, fontWeight: "600", color: Colors.gray700 },
  modalBtnSave: { backgroundColor: Colors.primary600 },
  modalBtnSaveText: { fontSize: 14, fontWeight: "600", color: Colors.white },
});
