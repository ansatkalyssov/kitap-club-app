import { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, SafeAreaView } from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import { BookAnalysis } from "@/lib/types";
import { formatDateKz, formatMonthKz } from "@/lib/utils";
import AddReplyForm from "@/components/analysis/AddReplyForm";
import { Colors, Spacing, Radius } from "@/constants/theme";

export default function AnalysisDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session!.user.id;

  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState<BookAnalysis | null>(null);
  const [replies, setReplies] = useState<BookAnalysis[]>([]);
  const [isMember, setIsMember] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: threadData } = await supabase
      .from("book_analyses")
      .select("*, clubs(name, facilitator_id), club_plans(month, year, books(title, author, page_count)), profiles(name)")
      .eq("id", id)
      .single();
    const threadObj = (threadData as unknown as BookAnalysis) || null;
    setThread(threadObj);

    const { data: repliesData } = await supabase
      .from("book_analyses")
      .select("*, profiles(name)")
      .eq("parent_id", id)
      .order("created_at", { ascending: true });
    setReplies((repliesData as unknown as BookAnalysis[]) || []);

    if (threadObj) {
      const { data: membership } = await supabase
        .from("club_members")
        .select("id")
        .eq("club_id", threadObj.club_id)
        .eq("user_id", userId)
        .maybeSingle();
      setIsMember(!!membership);
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

  if (!thread) {
    return (
      <SafeAreaView style={styles.flex}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Пікір табылмады</Text>
        </View>
      </SafeAreaView>
    );
  }

  const clubs = thread.clubs;
  const clubPlan = thread.club_plans;
  const book = clubPlan?.books;
  const facilitatorId = clubs?.facilitator_id;
  const isFacilitator = facilitatorId === userId;
  const canReply = isFacilitator || isMember;
  const userReply = replies.find((r) => r.author_id === userId);

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Thread header */}
        <View style={styles.headerCard}>
          <Text style={styles.title}>{thread.title}</Text>

          <View style={styles.metaRow}>
            {clubs?.name && <Text style={styles.clubName}>{clubs.name}</Text>}
            {thread.meeting_date && (
              <View style={styles.metaItem}>
                <Feather name="calendar" size={12} color={Colors.gray500} />
                <Text style={styles.metaText}>{formatDateKz(thread.meeting_date)}</Text>
              </View>
            )}
          </View>

          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(thread.profiles?.name || "?").charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.authorName}>{thread.profiles?.name}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>жүргізуші</Text>
            </View>
          </View>

          {book && (
            <View style={styles.bookCard}>
              <Feather name="book-open" size={18} color={Colors.primary500} />
              <View style={{ flex: 1 }}>
                <Text style={styles.bookTitle}>{book.title}</Text>
                <Text style={styles.bookMeta}>
                  {[book.author, book.page_count ? `${book.page_count} бет` : null, clubPlan ? formatMonthKz(clubPlan.month, clubPlan.year) : null]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </View>
            </View>
          )}

          {thread.content && <Text style={styles.content}>{thread.content}</Text>}

          {thread.key_insights && thread.key_insights.length > 0 && (
            <View style={styles.insightsList}>
              {thread.key_insights.map((ins, i) => (
                <View key={i} style={styles.insightRow}>
                  <View style={styles.insightNumber}>
                    <Text style={styles.insightNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.insightText}>{ins}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Replies */}
        <View style={styles.repliesHeader}>
          <Feather name="message-square" size={16} color={Colors.gray400} />
          <Text style={styles.h2}>Пікірлер ({replies.length})</Text>
        </View>

        <View style={styles.repliesList}>
          {replies.map((reply) => {
            const isMe = reply.author_id === userId;
            const isFacRep = reply.author_id === facilitatorId;
            return (
              <View key={reply.id} style={styles.replyRow}>
                <View style={[styles.avatar, isMe ? styles.avatarMe : isFacRep ? styles.avatarFac : styles.avatarDefault]}>
                  <Text style={[styles.avatarText, isMe && styles.avatarTextMe]}>
                    {(reply.profiles?.name || "?").charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.replyCard, isMe && styles.replyCardMe]}>
                  <View style={styles.replyTopRow}>
                    <Text style={styles.replyName}>{reply.profiles?.name || "Пайдаланушы"}</Text>
                    {isFacRep && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>жүргізуші</Text>
                      </View>
                    )}
                    {isMe && (
                      <View style={styles.badgeMe}>
                        <Text style={styles.badgeMeText}>сіз</Text>
                      </View>
                    )}
                    <Text style={styles.replyDate}>
                      {new Date(reply.created_at).toLocaleDateString("kk-KZ", { day: "numeric", month: "short" })}
                    </Text>
                  </View>

                  {reply.content && <Text style={styles.replyContent}>{reply.content}</Text>}

                  {reply.key_insights && reply.key_insights.length > 0 && (
                    <View style={styles.insightsList}>
                      {reply.key_insights.map((ins, i) => (
                        <View key={i} style={styles.insightRow}>
                          <View style={styles.insightNumberSmall}>
                            <Text style={styles.insightNumberSmallText}>{i + 1}</Text>
                          </View>
                          <Text style={styles.insightTextSmall}>{ins}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {replies.length === 0 && (
            <Text style={styles.noReplies}>Әзірге пікір жоқ</Text>
          )}

          {canReply && !userReply && (
            <View style={styles.replyRow}>
              <View style={[styles.avatar, styles.avatarMe]}>
                <Text style={[styles.avatarText, styles.avatarTextMe]}>
                  {(thread.profiles?.name || "?").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <AddReplyForm threadId={thread.id} clubId={thread.club_id} userId={userId} onAdded={fetchData} />
              </View>
            </View>
          )}

          {canReply && userReply && (
            <Text style={styles.repliedNote}>✓ Сіз бұл талқыға пікіріңізді қалдырдыңыз</Text>
          )}

          {!canReply && (
            <Text style={styles.noReplies}>Пікір қалдыру үшін клубқа қосылыңыз</Text>
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
  headerCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.primary100,
    backgroundColor: Colors.primary50,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  title: { fontSize: 18, fontWeight: "700", color: Colors.gray900 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md, flexWrap: "wrap" },
  clubName: { fontSize: 13, fontWeight: "600", color: Colors.primary600 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: Colors.gray500 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 11, fontWeight: "700", color: Colors.primary700 },
  authorName: { fontSize: 12, color: Colors.gray500 },
  badge: { backgroundColor: Colors.primary100, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: "600", color: Colors.primary700 },
  bookCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: Spacing.md,
  },
  bookTitle: { fontSize: 13, fontWeight: "700", color: Colors.gray900 },
  bookMeta: { fontSize: 11, color: Colors.gray400, marginTop: 2 },
  content: {
    fontSize: 13,
    color: Colors.gray700,
    lineHeight: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.primary100,
    paddingTop: Spacing.md,
  },
  insightsList: { gap: Spacing.sm, marginTop: Spacing.xs },
  insightRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  insightNumber: {
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary100,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  insightNumberText: { fontSize: 11, fontWeight: "700", color: Colors.primary700 },
  insightText: { flex: 1, fontSize: 13, color: Colors.gray700, lineHeight: 19 },
  insightNumberSmall: {
    width: 16,
    height: 16,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  insightNumberSmallText: { fontSize: 10, fontWeight: "700", color: Colors.gray500 },
  insightTextSmall: { flex: 1, fontSize: 12, color: Colors.gray700, lineHeight: 17 },
  repliesHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  h2: { fontSize: 15, fontWeight: "700", color: Colors.gray700 },
  repliesList: { gap: Spacing.md },
  replyRow: { flexDirection: "row", gap: Spacing.sm, alignItems: "flex-start" },
  avatarDefault: { backgroundColor: Colors.gray100 },
  avatarFac: { backgroundColor: Colors.primary100 },
  avatarMe: { backgroundColor: Colors.primary500 },
  avatarTextMe: { color: Colors.white },
  replyCard: {
    flex: 1,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray100,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  replyCardMe: { borderColor: Colors.primary200, backgroundColor: Colors.primary50 },
  replyTopRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, flexWrap: "wrap" },
  replyName: { fontSize: 13, fontWeight: "700", color: Colors.gray900 },
  badgeMe: { backgroundColor: Colors.primary500, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  badgeMeText: { fontSize: 10, fontWeight: "600", color: Colors.white },
  replyDate: { fontSize: 11, color: Colors.gray400, marginLeft: "auto" },
  replyContent: { fontSize: 13, color: Colors.gray700, lineHeight: 19 },
  noReplies: { fontSize: 13, color: Colors.gray400, textAlign: "center", paddingVertical: Spacing.lg },
  repliedNote: { fontSize: 11, color: Colors.gray400, marginLeft: 36 },
});
