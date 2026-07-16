import { ScrollView, StyleSheet, SafeAreaView } from "react-native";
import { useAuth } from "@/context/AuthProvider";
import { Colors, Spacing } from "@/constants/theme";
import CreateTrackerForm from "@/components/tracker/CreateTrackerForm";

export default function NewTrackerScreen() {
  const { session } = useAuth();
  const userId = session!.user.id;

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <CreateTrackerForm userId={userId} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.white },
  container: { padding: Spacing.lg },
});
