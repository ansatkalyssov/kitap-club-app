import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthProvider";
import { Colors, Spacing, Radius } from "@/constants/theme";

type Mode = "login" | "register";
type Step = "auth" | "name";

export default function LoginScreen() {
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert("Қате", error.message.includes("Invalid login credentials") ? "Email немесе пароль қате" : error.message);
      return;
    }
    router.replace("/(tabs)");
  }

  async function handleRegister() {
    if (!email || !password) return;
    if (password.length < 6) {
      Alert.alert("Қате", "Пароль кемінде 6 таңба болуы керек");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.includes("already registered")) {
        Alert.alert("Қате", "Бұл email тіркелген. Кіруге көріңіз");
        setMode("login");
      } else {
        Alert.alert("Қате", error.message);
      }
      return;
    }
    if (data.user) {
      if (data.session) {
        setStep("name");
      } else {
        Alert.alert("Тіркелу", "Поштаңызға растау хаты жіберілді");
      }
    }
  }

  async function handleSetName() {
    if (!name.trim()) {
      Alert.alert("Қате", "Атыңызды енгізіңіз");
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const fullName = lastName.trim() ? `${name.trim()} ${lastName.trim()}` : name.trim();
    await supabase.from("profiles").upsert({ id: user.id, email: user.email!, name: fullName });
    await refreshProfile();
    setLoading(false);
    router.replace("/(tabs)");
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Feather name="book-open" size={28} color={Colors.white} />
          </View>
          <Text style={styles.title}>Кітап Клубы</Text>
          <Text style={styles.subtitle}>
            {step === "name" ? "Атыңызды енгізіңіз" : mode === "login" ? "Қош келдіңіз" : "Жаңа аккаунт"}
          </Text>
        </View>

        <View style={styles.card}>
          {step === "auth" ? (
            <>
              {/* Mode toggle */}
              <View style={styles.toggle}>
                {(["login", "register"] as Mode[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setMode(m)}
                    style={[styles.toggleBtn, mode === m && styles.toggleBtnActive]}
                  >
                    <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                      {m === "login" ? "Кіру" : "Тіркелу"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Email */}
              <View style={styles.inputWrap}>
                <Feather name="mail" size={15} color={Colors.gray400} style={styles.inputIcon} />
                <TextInput
                  placeholder="Email"
                  placeholderTextColor={Colors.gray400}
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>

              {/* Password */}
              <View style={styles.inputWrap}>
                <Feather name="lock" size={15} color={Colors.gray400} style={styles.inputIcon} />
                <TextInput
                  placeholder="Пароль"
                  placeholderTextColor={Colors.gray400}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  style={[styles.input, { paddingRight: 40 }]}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                >
                  <Feather name={showPassword ? "eye-off" : "eye"} size={15} color={Colors.gray400} />
                </TouchableOpacity>
              </View>

              {mode === "register" && (
                <Text style={styles.hint}>Пароль кемінде 6 таңба болуы керек</Text>
              )}

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={mode === "login" ? handleLogin : handleRegister}
                disabled={loading}
              >
                {loading && <ActivityIndicator color={Colors.white} style={{ marginRight: 8 }} />}
                <Text style={styles.primaryBtnText}>{mode === "login" ? "Кіру" : "Тіркелу"}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.hint}>Қолданбада қалай аталғыңызды енгізіңіз</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  placeholder="Аты — Мысалы: Айгүл"
                  placeholderTextColor={Colors.gray400}
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  autoFocus
                />
              </View>
              <View style={styles.inputWrap}>
                <TextInput
                  placeholder="Тегі — Мысалы: Қасымова"
                  placeholderTextColor={Colors.gray400}
                  value={lastName}
                  onChangeText={setLastName}
                  style={styles.input}
                />
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSetName} disabled={loading}>
                {loading && <ActivityIndicator color={Colors.white} style={{ marginRight: 8 }} />}
                <Text style={styles.primaryBtnText}>Бастау</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.white },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  header: { alignItems: "center", marginBottom: Spacing.xl },
  logo: {
    width: 56,
    height: 56,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary600,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  title: { fontSize: 22, fontWeight: "700", color: Colors.primary900 },
  subtitle: { marginTop: Spacing.xs, fontSize: 14, color: Colors.gray500 },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.gray100,
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    gap: Spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: Colors.gray100,
    borderRadius: Radius.md,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md - 2,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: Colors.white,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  toggleText: { fontSize: 14, fontWeight: "500", color: Colors.gray500 },
  toggleTextActive: { color: Colors.primary700 },
  inputWrap: { position: "relative", justifyContent: "center" },
  inputIcon: { position: "absolute", left: 14, zIndex: 1 },
  input: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingLeft: 38,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.gray900,
  },
  eyeBtn: { position: "absolute", right: 14 },
  hint: { fontSize: 12, color: Colors.gray400 },
  primaryBtn: {
    flexDirection: "row",
    backgroundColor: Colors.primary600,
    borderRadius: Radius.md,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: Colors.white, fontWeight: "700", fontSize: 14 },
});
