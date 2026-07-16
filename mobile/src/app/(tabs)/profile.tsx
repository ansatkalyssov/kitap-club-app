import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import { Colors, Spacing, Radius } from "@/constants/theme";

const ROLE_LABELS: Record<string, string> = {
  admin: "Админ",
  facilitator: "Жүргізуші",
  reader: "Оқырман",
};

export default function ProfileScreen() {
  const { profile, session } = useAuth();

  function handleLogout() {
    Alert.alert("Шығу", "Аккаунттан шығуды қалайсыз ба?", [
      { text: "Жоқ", style: "cancel" },
      { text: "Шығу", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);
  }

  const initial = (profile?.name || session?.user.email || "?").charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.flex}>
      <View style={styles.container}>
        <Text style={styles.h1}>Профиль</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{profile?.name || "Пайдаланушы"}</Text>
              <Text style={styles.email}>{session?.user.email}</Text>
              <Text style={styles.role}>{ROLE_LABELS[profile?.role || "reader"]}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={16} color={Colors.red500} />
          <Text style={styles.logoutText}>Шығу</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.white },
  container: { padding: Spacing.lg, gap: Spacing.lg },
  h1: { fontSize: 22, fontWeight: "700", color: Colors.primary900 },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray100,
    padding: Spacing.lg,
  },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: Colors.primary700, fontWeight: "700", fontSize: 18 },
  name: { fontSize: 16, fontWeight: "700", color: Colors.gray900 },
  email: { fontSize: 13, color: Colors.gray500, marginTop: 2 },
  role: { fontSize: 12, color: Colors.primary600, marginTop: 4, fontWeight: "600" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: Radius.md,
    paddingVertical: 13,
  },
  logoutText: { color: Colors.red500, fontWeight: "700", fontSize: 14 },
});
