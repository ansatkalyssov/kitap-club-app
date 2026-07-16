import { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, RefreshControl, SafeAreaView } from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import { Club } from "@/lib/types";
import JoinClubButton from "@/components/clubs/JoinClubButton";
import { Colors, Spacing, Radius } from "@/constants/theme";

const MAX_CLUBS = 3;

export default function ClubsListScreen() {
  const { session, profile } = useAuth();
  const userId = session!.user.id;
  const canCreateClub = profile?.role === "facilitator" || profile?.role === "admin";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"my" | "all">("my");
  const [search, setSearch] = useState("");
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [myClubIds, setMyClubIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    const { data: memberships } = await supabase
      .from("club_members")
      .select("club_id")
      .eq("user_id", userId);
    setMyClubIds(new Set((memberships || []).map((m) => m.club_id)));

    const { data } = await supabase
      .from("clubs")
      .select("*, cities(name), profiles(name), club_members(count)")
      .eq("is_active", true)
      .order("name", { ascending: true });
    setAllClubs((data as unknown as Club[]) || []);
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

  const myClubs = useMemo(
    () => allClubs.filter((c) => myClubIds.has(c.id) || c.facilitator_id === userId),
    [allClubs, myClubIds, userId]
  );
  const otherClubs = useMemo(
    () => allClubs.filter((c) => !myClubIds.has(c.id) && c.facilitator_id !== userId),
    [allClubs, myClubIds, userId]
  );

  const q = search.trim().toLowerCase();
  const baseList = tab === "my" ? myClubs : otherClubs;
  const displayClubs = q ? baseList.filter((c) => c.name.toLowerCase().includes(q)) : baseList;

  const canJoinMore = myClubIds.size < MAX_CLUBS;

  if (loading) {
    return (
      <SafeAreaView style={styles.flex}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary600} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary600]} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.h1}>Клубтар</Text>
            <Text style={styles.subtitle}>Кітап клубтарын шолыңыз</Text>
          </View>
          {canCreateClub && (
            <Link href="/clubs/new" asChild>
              <TouchableOpacity style={styles.newClubBtn}>
                <Feather name="plus" size={16} color={Colors.white} />
                <Text style={styles.newClubBtnText}>Клуб жасау</Text>
              </TouchableOpacity>
            </Link>
          )}
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tabBtn, tab === "my" && styles.tabBtnActive]} onPress={() => setTab("my")}>
            <Text style={[styles.tabText, tab === "my" && styles.tabTextActive]}>Менің клубтарым ({myClubs.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, tab === "all" && styles.tabBtnActive]} onPress={() => setTab("all")}>
            <Text style={[styles.tabText, tab === "all" && styles.tabTextActive]}>Барлығы ({otherClubs.length})</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Feather name="search" size={14} color={Colors.gray400} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Клубты іздеу..."
            placeholderTextColor={Colors.gray400}
            style={styles.searchInput}
          />
        </View>

        {displayClubs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="users" size={28} color={Colors.gray300} />
            <Text style={styles.emptyTitle}>
              {tab === "my" ? "Сіз ешбір клубқа тіркелмегенсіз" : "Клуб табылмады"}
            </Text>
            <Text style={styles.emptyDesc}>
              {tab === "my" ? '"Барлығы" бөлімінен клуб таңдап тіркеліңіз' : "Іздеу нәтижесі бос"}
            </Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {displayClubs.map((club) => {
              const memberCount = club.club_members?.[0]?.count ?? 0;
              return (
                <View key={club.id} style={styles.card}>
                  <Link href={`/clubs/${club.id}`} asChild>
                    <TouchableOpacity>
                      <View style={styles.cardTop}>
                        <View style={styles.emblem}>
                          <Text style={styles.emblemText}>{club.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.clubName} numberOfLines={1}>{club.name}</Text>
                          <View style={styles.metaRow}>
                            <Feather name="map-pin" size={11} color={Colors.gray400} />
                            <Text style={styles.metaText}>{club.cities?.name || "Қала белгіленбеген"}</Text>
                          </View>
                        </View>
                      </View>

                      {club.description && (
                        <Text style={styles.description} numberOfLines={2}>{club.description}</Text>
                      )}
                    </TouchableOpacity>
                  </Link>

                  <View style={styles.cardFooter}>
                    <View style={styles.metaRow}>
                      <Feather name="users" size={12} color={Colors.gray500} />
                      <Text style={styles.footerText}>{memberCount} мүше</Text>
                    </View>
                    {tab === "my" ? (
                      <View style={styles.metaRow}>
                        <Feather name="book-open" size={12} color={Colors.gray500} />
                        <Text style={styles.footerText}>{club.profiles?.name || "—"}</Text>
                      </View>
                    ) : (
                      <JoinClubButton
                        clubId={club.id}
                        userId={userId}
                        disabled={!canJoinMore}
                        disabledReason={!canJoinMore ? "Ең көп 3 клубқа тіркелуге болады" : undefined}
                        onJoined={fetchData}
                      />
                    )}
                  </View>
                </View>
              );
            })}
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
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: Spacing.md },
  h1: { fontSize: 22, fontWeight: "700", color: Colors.primary900 },
  subtitle: { fontSize: 13, color: Colors.gray500, marginTop: 2 },
  newClubBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary600,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  newClubBtnText: { color: Colors.white, fontWeight: "700", fontSize: 12 },
  tabs: { flexDirection: "row", gap: 4, backgroundColor: Colors.gray100, borderRadius: Radius.lg, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.md, alignItems: "center" },
  tabBtnActive: { backgroundColor: Colors.white },
  tabText: { fontSize: 12, fontWeight: "600", color: Colors.gray500 },
  tabTextActive: { color: Colors.primary700 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
  },
  searchInput: { flex: 1, fontSize: 13, color: Colors.gray900, paddingVertical: Spacing.sm },
  emptyCard: {
    alignItems: "center",
    gap: Spacing.sm,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray100,
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: Colors.gray900, marginTop: Spacing.xs, textAlign: "center" },
  emptyDesc: { fontSize: 12, color: Colors.gray500, textAlign: "center" },
  cardList: { gap: Spacing.md },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  emblem: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  emblemText: { fontSize: 18, fontWeight: "700", color: Colors.primary700 },
  clubName: { fontSize: 15, fontWeight: "700", color: Colors.gray900 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  metaText: { fontSize: 12, color: Colors.gray500 },
  description: { fontSize: 13, color: Colors.gray500 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.gray50,
    paddingTop: Spacing.sm,
  },
  footerText: { fontSize: 12, color: Colors.gray500 },
});
