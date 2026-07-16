import { useState } from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Colors, Spacing, Radius } from "@/constants/theme";

export default function LeaveClubButton({
  clubId,
  userId,
  onLeft,
}: {
  clubId: string;
  userId: string;
  onLeft: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function handleLeave() {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
      return;
    }
    setLoading(true);
    await supabase.from("club_members").delete().eq("club_id", clubId).eq("user_id", userId);
    setLoading(false);
    onLeft();
  }

  return (
    <TouchableOpacity onPress={handleLeave} disabled={loading} style={[styles.btn, confirm && styles.btnConfirm]}>
      {loading ? (
        <ActivityIndicator size="small" color={confirm ? Colors.white : Colors.gray500} />
      ) : (
        <Feather name="user-minus" size={12} color={confirm ? Colors.white : Colors.gray500} />
      )}
      <Text style={[styles.text, confirm && styles.textConfirm]}>{confirm ? "Расталсын ба?" : "Клубтан шығу"}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  btnConfirm: { backgroundColor: Colors.red500, borderColor: Colors.red500 },
  text: { fontSize: 12, fontWeight: "500", color: Colors.gray500 },
  textConfirm: { color: Colors.white },
});
