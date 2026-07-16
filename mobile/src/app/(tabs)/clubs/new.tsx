import { ScrollView, StyleSheet, SafeAreaView } from "react-native";
import CreateClubForm from "@/components/clubs/CreateClubForm";
import { useAuth } from "@/context/AuthProvider";
import { Colors, Spacing } from "@/constants/theme";

export default function NewClubScreen() {
  const { session } = useAuth();
  const userId = session!.user.id;

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <CreateClubForm userId={userId} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.white },
  container: { padding: Spacing.lg },
});
