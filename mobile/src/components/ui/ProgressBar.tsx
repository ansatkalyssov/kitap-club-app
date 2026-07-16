import { View, StyleSheet } from "react-native";
import { Colors, Radius } from "@/constants/theme";

export default function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clamped}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.gray100,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: Radius.full,
    backgroundColor: Colors.primary600,
  },
});
