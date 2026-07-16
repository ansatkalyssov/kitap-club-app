import { Stack } from "expo-router";
import { Colors } from "@/constants/theme";

export default function TrackerStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.white },
        headerTintColor: Colors.gray900,
        headerShadowVisible: false,
        headerTitleStyle: { fontSize: 16, fontWeight: "700" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Кітап Трекері" }} />
      <Stack.Screen name="new" options={{ title: "Жаңа трекер" }} />
      <Stack.Screen name="[id]" options={{ title: "Трекер" }} />
    </Stack>
  );
}
