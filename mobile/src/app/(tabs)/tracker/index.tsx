import { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, SafeAreaView } from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import { BookTracker } from "@/lib/types";
import { calcProgress, calcDailyPages, daysUntil, formatDateKz } from "@/lib/utils";
import { Colors, Spacing, Radius } from "@/constants/theme";
import ProgressBar from "@/components/ui/ProgressBar";

export default function TrackerListScreen() {
  const { session } = useAuth();
  const userId = session!.user.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trackers, setTrackers] = useState<BookTracker[]>([]);

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from("book_trackers")
      .select("*, club_plans(club_id, clubs(name))")
      .eq("user_id", userId)
      .order("deadline", { ascending: true });
    setTrackers((data as unknown as BookTracker[]) || []);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        await fetchData();
        if (active) setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [fetchData])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
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
  const active = trackers.filter((t) => !t.is_completed && (!t.deadline || t.deadline >= today));
  const completed = trackers.filter((t) => t.is_completed || (t.deadline && t.deadline < today));

  const groups: Record<string, { clubName: string | null; items: BookTracker[] }> = {};
  active.forEach((t) => {
    const clubName = t.club_plans?.clubs?.name || null;
    const key = clubName || "__personal__";
    if (!groups[key]) groups[key] = { clubName, items: [] };
    groups[key].items.push(t);
  });
  const sortedGroups = Object.entries(groups).sort(([aKey, aVal], [bKey, bVal]) => {
    if (aKey === "__personal__") return 1;
    if (bKey === "__personal__") return -1;
    const aMin = aVal.items.map((t) => t.deadline).filter(Boolean).sort()[0] || "";
    const bMin = bVal.items.map((t) => t.deadline).filter(Boolean).sort()[0] || "";
    return aMin.localeCompare(bMin);
  });

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary600]} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.h1}>Кітап Трекері</Text>
            <Text style={styles.subtitle}>Оқу прогресіңізді бақылаңыз</Text>
          </View>
          <Link href="/tracker/new" asChild>
            <TouchableOpacity style={styles.addBtn}>
              <Feather name="plus" size={16} color={Colors.white} />
              <Text style={styles.addBtnText}>Жаңа</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Active */}
        <View style={styles.section}>
          <Text style={styles.h2}>Белсенді ({active.length})</Text>
          {active.length === 0 ? (
            <View style={styles.emptyCard}>
              <Feather name="bookmark" size={28} color={Colors.gray300} />
              <Text style={styles.emptyTitle}>Белсенді трекер жоқ</Text>
              <Text style={styles.emptyDesc}>Жаңа кітап трекері жасаңыз</Text>
              <Link href="/tracker/new" asChild>
                <TouchableOpacity style={styles.addBtn}>
                  <Feather name="plus" size={16} color={Colors.white} />
                  <Text style={styles.addBtnText}>Жасаңыз</Text>
                </TouchableOpacity>
              </Link>
            </View>
          ) : (
            sortedGroups.map(([key, group]) => (
              <View key={key} style={styles.group}>
                <View style={styles.groupHeader}>
                  <Feather
                    name={group.clubName ? "users" : "user"}
                    size={13}
                    color={group.clubName ? Colors.primary500 : Colors.gray400}
                  />
                  <Text style={[styles.groupLabel, group.clubName && styles.groupLabelClub]}>
                    {group.clubName || "Жеке трекерлер"}
                  </Text>
                  <View style={styles.groupLine} />
                </View>
                <View style={styles.cardList}>
                  {group.items.map((t) => {
                    const progress = calcProgress(t.current_page, t.total_pages);
                    const dailyPages = calcDailyPages(t.current_page, t.total_pages, t.deadline);
                    const days = daysUntil(t.deadline);
                    return (
                      <Link key={t.id} href={`/tracker/${t.id}`} asChild>
                        <TouchableOpacity
                          style={[styles.card, group.clubName ? styles.cardClub : styles.cardPersonal]}
                        >
                          <View style={styles.cardTop}>
                            <View style={{ flex: 1, marginRight: Spacing.sm }}>
                              <Text style={styles.bookTitle} numberOfLines={2}>{t.book_title}</Text>
                              {t.book_author && <Text style={styles.bookAuthor}>{t.book_author}</Text>}
                            </View>
                            <View style={[styles.badge, days <= 3 ? styles.badgeYellow : styles.badgeGreen]}>
                              <Text style={[styles.badgeText, days <= 3 ? styles.badgeTextYellow : styles.badgeTextGreen]}>
                                {days === 0 ? "Бүгін" : `${days} күн`}
                              </Text>
                            </View>
                          </View>

                          <ProgressBar value={progress} />

                          <View style={styles.cardBottomRow}>
                            <Text style={styles.cardMeta}>{t.current_page} / {t.total_pages} бет</Text>
                            {progress < 100 && days > 0 && (
                              <Text style={styles.cardMetaPrimary}>Күнде {dailyPages} бет</Text>
                            )}
                          </View>

                          <View style={styles.cardFooter}>
                            <Text style={styles.cardFooterText}>Дедлайн: {formatDateKz(t.deadline)}</Text>
                          </View>
                        </TouchableOpacity>
                      </Link>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>

        {/* History */}
        {completed.length > 0 && (
          <View style={styles.section}>
            <View style={styles.h2Row}>
              <Feather name="check-circle" size={16} color={Colors.primary500} />
              <Text style={styles.h2}>Тарих ({completed.length})</Text>
            </View>
            <View style={styles.cardList}>
              {completed.map((t) => {
                const isExpired = !t.is_completed && t.deadline && t.deadline < today;
                const clubName = t.club_plans?.clubs?.name || null;
                return (
                  <Link key={t.id} href={`/tracker/${t.id}`} asChild>
                    <TouchableOpacity style={[styles.card, styles.historyCard]}>
                      <View style={styles.historyRow}>
                        <Feather
                          name="check-circle"
                          size={20}
                          color={isExpired ? Colors.gray400 : Colors.primary500}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.bookTitle} numberOfLines={1}>{t.book_title}</Text>
                          <Text style={styles.cardFooterText}>
                            {clubName || "Жеке"} · {formatDateKz(t.deadline)}
                          </Text>
                        </View>
                        <View style={[styles.badge, isExpired ? styles.badgeGray : styles.badgeGreen]}>
                          <Text style={[styles.badgeText, isExpired ? styles.badgeTextGray : styles.badgeTextGreen]}>
                            {isExpired ? "Аяқталды" : "✓"}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Link>
                );
              })}
            </View>
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
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  h1: { fontSize: 22, fontWeight: "700", color: Colors.primary900 },
  subtitle: { fontSize: 13, color: Colors.gray500, marginTop: 2 },
  h2: { fontSize: 15, fontWeight: "700", color: Colors.gray900 },
  h2Row: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, marginBottom: Spacing.sm },
  section: { gap: Spacing.sm },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary600,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  addBtnText: { color: Colors.white, fontWeight: "700", fontSize: 13 },
  emptyCard: {
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray100,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: Colors.gray900, marginTop: Spacing.xs },
  emptyDesc: { fontSize: 12, color: Colors.gray500, marginBottom: Spacing.sm },
  group: { gap: Spacing.sm },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  groupLabel: { fontSize: 13, fontWeight: "700", color: Colors.gray500 },
  groupLabelClub: { color: Colors.primary700 },
  groupLine: { flex: 1, height: 1, backgroundColor: Colors.gray100 },
  cardList: { gap: Spacing.md },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray100,
    borderLeftWidth: 4,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardPersonal: { borderLeftColor: Colors.gray200 },
  cardClub: { borderLeftColor: Colors.primary200 },
  historyCard: { borderLeftWidth: 1, opacity: 0.85 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  bookTitle: { fontSize: 14, fontWeight: "700", color: Colors.gray900 },
  bookAuthor: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
  badge: { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  badgeGreen: { backgroundColor: Colors.primary50 },
  badgeTextGreen: { color: Colors.primary700 },
  badgeYellow: { backgroundColor: "#fef9c3" },
  badgeTextYellow: { color: "#a16207" },
  badgeGray: { backgroundColor: Colors.gray100 },
  badgeTextGray: { color: Colors.gray500 },
  cardBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardMeta: { fontSize: 12, color: Colors.gray500 },
  cardMetaPrimary: { fontSize: 12, color: Colors.primary600, fontWeight: "600" },
  cardFooter: { borderTopWidth: 1, borderTopColor: Colors.gray50, paddingTop: Spacing.sm },
  cardFooterText: { fontSize: 11, color: Colors.gray400 },
  historyRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
});
