import { useState } from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Colors, Spacing, Radius } from "@/constants/theme";

export default function DeleteTrackerButton({ trackerId, onDeleted }: { trackerId: string; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function handleDelete() {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
      return;
    }
    setLoading(true);
    await supabase.from("book_trackers").delete().eq("id", trackerId);
    setLoading(false);
    onDeleted();
  }

  return (
    <TouchableOpacity
      onPress={handleDelete}
      disabled={loading}
      style={[styles.btn, confirm && styles.btnConfirm]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={confirm ? Colors.white : Colors.gray500} />
      ) : (
        <Feather name="trash-2" size={14} color={confirm ? Colors.white : Colors.gray500} />
      )}
      <Text style={[styles.text, confirm && styles.textConfirm]}>{confirm ? "Расталсын ба?" : "Жою"}</Text>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignSelf: "flex-end",
  },
  btnConfirm: { backgroundColor: Colors.red500, borderColor: Colors.red500 },
  text: { fontSize: 13, fontWeight: "500", color: Colors.gray500 },
  textConfirm: { color: Colors.white },
});
