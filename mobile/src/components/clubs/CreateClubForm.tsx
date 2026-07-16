import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import { City } from "@/lib/types";
import { Colors, Spacing, Radius } from "@/constants/theme";

export default function CreateClubForm({ userId }: { userId: string }) {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<City[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cityId, setCityId] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("cities")
      .select("*")
      .order("name", { ascending: true })
      .then(({ data }) => setCities((data as City[]) || []));
  }, []);

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert("Қате", "Клуб атын енгізіңіз");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("clubs")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        city_id: cityId,
        facilitator_id: userId,
      })
      .select()
      .single();

    if (error || !data) {
      setLoading(false);
      Alert.alert("Қате", "Клуб жасалмады");
      return;
    }

    await refreshProfile();
    setLoading(false);
    router.replace(`/clubs/${data.id}`);
  }

  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.label}>Клуб аты *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Мысалы: Алматы Кітап Клубы"
          placeholderTextColor={Colors.gray400}
          style={styles.input}
          maxLength={100}
        />
      </View>

      <View>
        <Text style={styles.label}>Клуб туралы</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Клуб туралы қысқаша мағлұмат..."
          placeholderTextColor={Colors.gray400}
          style={[styles.input, styles.textarea]}
          multiline
          numberOfLines={4}
          maxLength={500}
        />
      </View>

      {cities.length > 0 && (
        <View>
          <Text style={styles.label}>Қала</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {cities.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, cityId === c.id && styles.chipActive]}
                onPress={() => setCityId(cityId === c.id ? null : c.id)}
              >
                <Text style={[styles.chipText, cityId === c.id && styles.chipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Feather name="users" size={16} color={Colors.white} />
            <Text style={styles.submitText}>Клубты жасау</Text>
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
  textarea: { minHeight: 90, textAlignVertical: "top" },
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
