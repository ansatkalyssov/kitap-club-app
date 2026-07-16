import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import { Colors, Spacing, Radius } from "@/constants/theme";

interface Props {
  label: string;
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
}

function toDate(str: string): Date {
  if (str) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date();
}

function toStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function DatePickerField({ label, value, onChange, placeholder = "Күнді таңдаңыз" }: Props) {
  const [open, setOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(toDate(value));

  function handleChange(_: DateTimePickerEvent, date?: Date) {
    if (date) setTempDate(date);
    if (Platform.OS === "android") {
      setOpen(false);
      if (date) onChange(toStr(date));
    }
  }

  function handleConfirm() {
    onChange(toStr(tempDate));
    setOpen(false);
  }

  function handleClear() {
    onChange("");
    setOpen(false);
  }

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={[styles.field, value ? styles.fieldFilled : styles.fieldEmpty]} onPress={() => { setTempDate(toDate(value)); setOpen(true); }}>
        <Feather name="calendar" size={14} color={value ? Colors.primary600 : Colors.gray400} />
        <Text style={[styles.fieldText, !value && styles.fieldPlaceholder]}>
          {value || placeholder}
        </Text>
        {value && (
          <TouchableOpacity onPress={() => onChange("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={14} color={Colors.gray400} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {Platform.OS === "ios" && open && (
        <Modal transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <TouchableOpacity onPress={handleClear}>
                  <Text style={styles.clearBtn}>Өшіру</Text>
                </TouchableOpacity>
                <Text style={styles.sheetTitle}>{label}</Text>
                <TouchableOpacity onPress={handleConfirm}>
                  <Text style={styles.confirmBtn}>Дайын</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="inline"
                onChange={handleChange}
                locale="kk-KZ"
                themeVariant="light"
                style={styles.picker}
                accentColor={Colors.primary600}
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === "android" && open && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="calendar"
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "500", color: Colors.gray700, marginBottom: Spacing.sm },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
  },
  fieldFilled: { borderColor: Colors.primary200, backgroundColor: Colors.primary50 },
  fieldEmpty: { borderColor: Colors.gray200 },
  fieldText: { flex: 1, fontSize: 14, color: Colors.gray900 },
  fieldPlaceholder: { color: Colors.gray400 },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.3)" },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  sheetTitle: { fontSize: 15, fontWeight: "700", color: Colors.gray900 },
  clearBtn: { fontSize: 14, color: Colors.gray500 },
  confirmBtn: { fontSize: 14, fontWeight: "700", color: Colors.primary600 },
  picker: { width: "100%" },
});
