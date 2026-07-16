import { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView } from "react-native";
import { Link, useLocalSearchParams, useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import { Club, ClubPlan, BookAnalysis } from "@/lib/types";
import { formatDateKz, formatMonthKz, daysUntil } from "@/lib/utils";
import JoinClubButton from "@/components/clubs/JoinClubButton";
import LeaveClubButton from "@/components/clubs/LeaveClubButton";
import { Colors, Spacing, Radius } from "@/constants/theme";

const MONTH_ABBR_KZ = ["Қаң", "Ақп", "Нау", "Сәу", "Мам", "Мау", "Шіл", "Там", "Қыр", "Қаз", "Қар", "Жел"];
const MAX_CLUBS = 3;

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session!.user.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<Club | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [plans, setPlans] = useState<ClubPlan[]>([]);
  const [analyses, setAnalyses] = useState<BookAnalysis[]>([]);
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [showFullPlan, setShowFullPlan] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [canJoinMore, setCanJoinMore] = useState(true);

  const fetchData = useCallback(async () => {
    const { data: clubData } = await supabase
      .from("clubs")
      .select("*, cities(name), profiles(name)")
      .eq("id", id)
      .single();
    setClub((clubData as unknown as Club) || null);

    const { count } = await supabase
      .from("club_members")
      .select("id", { count: "exact", head: true })
      .eq("club_id", id);
    setMemberCount(count || 0);

    const { data: myMemberships } = await supabase
      .from("club_members")
      .select("club_id")
      .eq("user_id", userId);
    const myClubIds = new Set((myMemberships || []).map((m) => m.club_id));
    setIsMember(myClubIds.has(id));
    setCanJoinMore(myClubIds.size < MAX_CLUBS);

    const { data: plansData } = await supabase
      .from("club_plans")
      .select("*, books(*)")
      .eq("club_id", id)
      .order("year", { ascending: false })
      .order("month", { ascending: false });
    setPlans((plansData as unknown as ClubPlan[]) || []);

    const { data: analysesData } = await supabase
      .from("book_analyses")
      .select("*, club_plans(books(title)), profiles(name)")
      .eq("club_id", id)
      .is("parent_id", null)
      .order("created_at", { ascending: false })
      .limit(5);
    const analysesList = (analysesData as unknown as BookAnalysis[]) || [];
    setAnalyses(analysesList);

    const threadIds = analysesList.map((a) => a.id);
    if (threadIds.length) {
      const { data: repliesData } = await supabase
        .from("book_analyses")
        .select("parent_id")
        .in("parent_id", threadIds);
      const counts: Record<string, number> = {};
      (repliesData || []).forEach((r: { parent_id: string | null }) => {
        if (r.parent_id) counts[r.parent_id] = (counts[r.parent_id] || 0) + 1;
      });
      setReplyCounts(counts);
    } else {
      setReplyCounts({});
    }
  }, [id, userId]);

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

  if (loading) {
    return (
      <SafeAreaView style={styles.flex}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary600} />
        </View>
      </SafeAreaView>
    );
  }

  if (!club) {
    return (
      <SafeAreaView style={styles.flex}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Клуб табылмады</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isFacilitator = club.facilitator_id === userId;

  const today = new Date().toISOString().split("T")[0];
  const activePlans = plans.filter((p) => !p.end_date || p.end_date >= today);
  const pastPlans = plans.filter((p) => p.end_date && p.end_date < today);
  const nearestPlan =
    activePlans.filter((p) => p.end_date).sort((a, b) => (a.end_date || "").localeCompare(b.end_date || ""))[0] ||
    activePlans[0] ||
    null;
  const otherActivePlans = activePlans.filter((p) => p.id !== nearestPlan?.id);

  let countdown: { day: number; month: string; weekday: string; label: string; isClose: boolean } | null = null;
  if (nearestPlan?.meeting_date) {
    const [py, pm, pd] = nearestPlan.meeting_date.split("-").map(Number);
    const d = new Date(py, pm - 1, pd);
    const diffDays = daysUntil(nearestPlan.meeting_date);
    const isClose = diffDays <= 3;
    const label = diffDays === 0 ? "Бүгін!" : diffDays === 1 ? "Ертең" : `${diffDays} күн`;
    countdown = {
      day: d.getDate(),
      month: MONTH_ABBR_KZ[d.getMonth()],
      weekday: d.toLocaleDateString("kk-KZ", { weekday: "short" }),
      label,
      isClose,
    };
  }

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Club header */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.emblem}>
              <Text style={styles.emblemText}>{club.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clubName}>{club.name}</Text>
              <View style={styles.metaWrap}>
                {club.cities?.name && (
                  <View style={styles.metaItem}>
                    <Feather name="map-pin" size={12} color={Colors.gray500} />
                    <Text style={styles.metaText}>{club.cities.name}</Text>
                  </View>
                )}
                <View style={styles.metaItem}>
                  <Feather name="users" size={12} color={Colors.gray500} />
                  <Text style={styles.metaText}>{memberCount} мүше</Text>
                </View>
                <View style={styles.metaItem}>
                  <Feather name="book-open" size={12} color={Colors.gray500} />
                  <Text style={styles.metaText}>Жүргізуші: {club.profiles?.name || "—"}</Text>
                </View>
              </View>
              {club.description && <Text style={styles.description}>{club.description}</Text>}
            </View>
          </View>

          <View style={styles.actionRow}>
            {isFacilitator ? (
              <View style={styles.facilitatorBadge}>
                <Feather name="award" size={12} color={Colors.primary700} />
                <Text style={styles.facilitatorBadgeText}>Сіз — жүргізушісіз</Text>
              </View>
            ) : isMember ? (
              <LeaveClubButton clubId={id} userId={userId} onLeft={() => router.replace("/clubs")} />
            ) : (
              <JoinClubButton
                clubId={id}
                userId={userId}
                disabled={!canJoinMore}
                disabledReason={!canJoinMore ? "Ең көп 3 клубқа тіркелуге болады" : undefined}
                onJoined={fetchData}
              />
            )}
            {isFacilitator && (
              <Link href={`/clubs/${id}/progress`} asChild>
                <TouchableOpacity style={styles.progressLink}>
                  <Feather name="trending-up" size={12} color={Colors.primary600} />
                  <Text style={styles.progressLinkText}>Оқырмандар үлгерімі</Text>
                </TouchableOpacity>
              </Link>
            )}
          </View>
        </View>

        {/* Plans */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.h2}>Кітап жоспары</Text>
            {isFacilitator && (
              <Link href={`/clubs/${id}/plan/new`} asChild>
                <TouchableOpacity style={styles.addPlanBtn}>
                  <Feather name="plus" size={12} color={Colors.primary700} />
                  <Text style={styles.addPlanBtnText}>Жоспар қосу</Text>
                </TouchableOpacity>
              </Link>
            )}
          </View>

          {countdown && nearestPlan && (
            <View style={[styles.meetingCard, countdown.isClose && styles.meetingCardClose]}>
              <View style={[styles.dateBlock, countdown.isClose && styles.dateBlockClose]}>
                <Text style={[styles.dateDay, countdown.isClose && styles.dateDayClose]}>{countdown.day}</Text>
                <Text style={[styles.dateMonth, countdown.isClose && styles.dateMonthClose]}>{countdown.month}</Text>
                <Text style={[styles.dateWeekday, countdown.isClose && styles.dateWeekdayClose]}>{countdown.weekday}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.meetingLabel}>Ең жақын талқы</Text>
                <Text style={styles.meetingTitle} numberOfLines={1}>
                  {nearestPlan.books?.title ?? "Кітап белгіленбеген"}
                </Text>
                {nearestPlan.meeting_location && (
                  <Text style={styles.meetingLocation}>📍 {nearestPlan.meeting_location}</Text>
                )}
              </View>
              <Text style={[styles.countdownText, countdown.label === "Бүгін!" && styles.countdownToday, countdown.isClose && countdown.label !== "Бүгін!" && styles.countdownClose]}>
                {countdown.label}
              </Text>
            </View>
          )}

          {plans.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>Жоспар жоқ</Text>
            </View>
          ) : (
            (otherActivePlans.length > 0 || pastPlans.length > 0) && (
              <View>
                <TouchableOpacity style={styles.toggleRow} onPress={() => setShowFullPlan((v) => !v)}>
                  <View style={styles.toggleLine} />
                  <Text style={styles.toggleText}>
                    Толық жоспар ({otherActivePlans.length + pastPlans.length})
                  </Text>
                  <Feather name={showFullPlan ? "chevron-up" : "chevron-down"} size={14} color={Colors.gray400} />
                  <View style={styles.toggleLine} />
                </TouchableOpacity>

                {showFullPlan && (
                  <View style={styles.planList}>
                    {otherActivePlans.map((plan) => (
                      <View key={plan.id} style={styles.planCard}>
                        <View style={styles.planTopRow}>
                          <View style={styles.planBadge}>
                            <Text style={styles.planBadgeText}>{formatMonthKz(plan.month, plan.year)}</Text>
                          </View>
                          {plan.books?.page_count && (
                            <Text style={styles.planPages}>{plan.books.page_count} бет</Text>
                          )}
                        </View>
                        <Text style={styles.planTitle} numberOfLines={1}>{plan.books?.title ?? "Кітап белгіленбеген"}</Text>
                        {plan.books?.author && <Text style={styles.planAuthor}>{plan.books.author}</Text>}
                        {plan.meeting_date && (
                          <Text style={styles.planMeeting}>
                            📅 {formatDateKz(plan.meeting_date)}
                            {plan.meeting_location ? ` — ${plan.meeting_location}` : ""}
                          </Text>
                        )}
                        {plan.notes && <Text style={styles.planNotes}>{plan.notes}</Text>}
                      </View>
                    ))}

                    {pastPlans.length > 0 && (
                      <View>
                        <Text style={styles.historyLabel}>Тарих ({pastPlans.length})</Text>
                        {pastPlans.map((plan) => (
                          <View key={plan.id} style={[styles.planCard, styles.planCardPast]}>
                            <Text style={styles.planTitlePast} numberOfLines={1}>{plan.books?.title ?? "—"}</Text>
                            {plan.meeting_date && <Text style={styles.planMeetingPast}>{formatDateKz(plan.meeting_date)}</Text>}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )
          )}
        </View>

        {/* Discussions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.h2}>Пікір алмасу</Text>
            {isFacilitator && (
              <Link href={`/clubs/${id}/analysis/new`} asChild>
                <TouchableOpacity style={styles.addPlanBtn}>
                  <Feather name="plus" size={12} color={Colors.primary700} />
                  <Text style={styles.addPlanBtnText}>Талқы ашу</Text>
                </TouchableOpacity>
              </Link>
            )}
          </View>
          {analyses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>Пікір жоқ</Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {analyses.map((a) => (
                <Link key={a.id} href={`/clubs/analysis/${a.id}`} asChild>
                  <TouchableOpacity style={styles.analysisCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.analysisTitle} numberOfLines={1}>{a.title}</Text>
                      {a.club_plans?.books?.title && (
                        <Text style={styles.analysisBook}>{a.club_plans.books.title}</Text>
                      )}
                    </View>
                    <View style={styles.metaItem}>
                      <Feather name="message-square" size={11} color={Colors.gray400} />
                      <Text style={styles.metaText}>{replyCounts[a.id] || 0}</Text>
                    </View>
                  </TouchableOpacity>
                </Link>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
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
  headerRow: { flexDirection: "row", gap: Spacing.md },
  emblem: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  emblemText: { fontSize: 22, fontWeight: "700", color: Colors.primary700 },
  clubName: { fontSize: 18, fontWeight: "700", color: Colors.gray900 },
  metaWrap: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md, marginTop: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: Colors.gray500 },
  description: { fontSize: 13, color: Colors.gray500, marginTop: Spacing.sm },
  actionRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.gray50, paddingTop: Spacing.md },
  facilitatorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary50,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  facilitatorBadgeText: { fontSize: 12, fontWeight: "600", color: Colors.primary700 },
  progressLink: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  progressLinkText: { fontSize: 12, fontWeight: "600", color: Colors.primary600 },
  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  h2: { fontSize: 15, fontWeight: "700", color: Colors.gray900 },
  addPlanBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.primary50, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  addPlanBtnText: { fontSize: 11, fontWeight: "700", color: Colors.primary700 },
  meetingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: Spacing.md,
  },
  meetingCardClose: { borderColor: Colors.primary200, backgroundColor: Colors.primary50 },
  dateBlock: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.lg,
    paddingVertical: 10,
    backgroundColor: Colors.primary50,
  },
  dateBlockClose: { backgroundColor: Colors.primary600 },
  dateDay: { fontSize: 22, fontWeight: "800", color: Colors.primary700, lineHeight: 24 },
  dateDayClose: { color: Colors.white },
  dateMonth: { fontSize: 10, fontWeight: "700", color: Colors.primary700, textTransform: "uppercase", marginTop: 2 },
  dateMonthClose: { color: Colors.white },
  dateWeekday: { fontSize: 9, color: Colors.primary400, marginTop: 2 },
  dateWeekdayClose: { color: Colors.primary100 },
  meetingLabel: { fontSize: 10, fontWeight: "700", color: Colors.gray400, textTransform: "uppercase" },
  meetingTitle: { fontSize: 14, fontWeight: "700", color: Colors.gray900, marginTop: 2 },
  meetingLocation: { fontSize: 12, color: Colors.primary600, marginTop: 2 },
  countdownText: { fontSize: 12, fontWeight: "700", color: Colors.gray400 },
  countdownToday: { color: Colors.primary600 },
  countdownClose: { color: "#a16207" },
  emptyCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray100,
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  emptyCardText: { fontSize: 13, color: Colors.gray500 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingVertical: Spacing.sm },
  toggleLine: { flex: 1, height: 1, backgroundColor: Colors.gray100 },
  toggleText: { fontSize: 12, fontWeight: "600", color: Colors.gray500 },
  planList: { gap: Spacing.sm },
  planCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: Spacing.md,
    gap: 2,
  },
  planCardPast: { backgroundColor: Colors.gray50, opacity: 0.7, marginBottom: Spacing.sm },
  planTopRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  planBadge: { backgroundColor: Colors.primary50, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  planBadgeText: { fontSize: 10, fontWeight: "700", color: Colors.primary600 },
  planPages: { fontSize: 11, color: Colors.gray400 },
  planTitle: { fontSize: 14, fontWeight: "700", color: Colors.gray900, marginTop: 4 },
  planAuthor: { fontSize: 11, color: Colors.gray400 },
  planMeeting: { fontSize: 12, color: Colors.primary600, marginTop: 4 },
  planNotes: { fontSize: 11, color: Colors.gray400, fontStyle: "italic", marginTop: 4 },
  planTitlePast: { fontSize: 13, fontWeight: "600", color: Colors.gray700 },
  planMeetingPast: { fontSize: 11, color: Colors.gray400, marginTop: 2 },
  historyLabel: { fontSize: 11, color: Colors.gray400, marginVertical: Spacing.sm, textAlign: "center" },
  cardList: { gap: Spacing.sm },
  analysisCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: Spacing.md,
  },
  analysisTitle: { fontSize: 14, fontWeight: "700", color: Colors.gray900 },
  analysisBook: { fontSize: 11, color: Colors.gray400, marginTop: 2 },
});
