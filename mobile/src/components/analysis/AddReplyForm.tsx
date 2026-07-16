import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Colors, Spacing, Radius } from "@/constants/theme";

export default function AddReplyForm({
  threadId,
  clubId,
  userId,
  onAdded,
}: {
  threadId: string;
  clubId: string;
  userId: string;
  onAdded: () => void;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!content.trim()) {
      Alert.alert("Қате", "Пікіріңізді жазыңыз");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("book_analyses").insert({
      parent_id: threadId,
      club_id: clubId,
      author_id: userId,
      title: "",
      content: content.trim(),
    });
    setLoading(false);
    if (error) {
      Alert.alert("Қате", "Сақталмады");
      return;
    }
    setContent("");
    onAdded();
  }

  return (
    <View style={styles.box}>
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="Пікіріңізді жазыңыз..."
        placeholderTextColor={Colors.gray400}
        style={styles.input}
        multiline
        numberOfLines={3}
      />
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitBtn, (loading || !content.trim()) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading || !content.trim()}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Feather name="send" size={13} color={Colors.white} />
          )}
          <Text style={styles.submitText}>Жіберу</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray200,
    backgroundColor: Colors.gray50,
  },
  input: {
    minHeight: 70,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    fontSize: 13,
    color: Colors.gray900,
    textAlignVertical: "top",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
    padding: Spacing.sm,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary600,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 12, fontWeight: "600", color: Colors.white },
});
