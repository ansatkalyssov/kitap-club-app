import { Stack } from "expo-router";
import { Colors } from "@/constants/theme";

export default function ClubsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.white },
        headerTintColor: Colors.gray900,
        headerShadowVisible: false,
        headerTitleStyle: { fontSize: 16, fontWeight: "700" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Клубтар" }} />
      <Stack.Screen name="new" options={{ title: "Клуб жасау" }} />
      <Stack.Screen name="[id]/index" options={{ title: "Клуб" }} />
      <Stack.Screen name="[id]/plan/new" options={{ title: "Жаңа жоспар" }} />
      <Stack.Screen name="[id]/analysis/new" options={{ title: "Пікір ашу" }} />
      <Stack.Screen name="[id]/progress" options={{ title: "Оқырмандар үлгерімі" }} />
      <Stack.Screen name="analysis/[id]" options={{ title: "Пікір алмасу" }} />
    </Stack>
  );
}
