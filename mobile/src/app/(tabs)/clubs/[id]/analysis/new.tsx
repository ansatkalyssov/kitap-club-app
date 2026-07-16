import { ScrollView, StyleSheet, SafeAreaView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import CreateAnalysisForm from "@/components/analysis/CreateAnalysisForm";
import { useAuth } from "@/context/AuthProvider";
import { Colors, Spacing } from "@/constants/theme";

export default function NewAnalysisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const userId = session!.user.id;

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <CreateAnalysisForm clubId={id} userId={userId} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.white },
  container: { padding: Spacing.lg },
});
