import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SvgXml } from "react-native-svg";
import { Screen } from "@/components/common/Screen";
import { AuthStackParamList } from "@/types/navigation";
import { useAuth } from "@/hooks/useAuth";
import { fitnessStatsSvg } from "@/assets/fitnessStatsSvg";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

export const SignupScreen = ({ navigation }: Props): React.JSX.Element => {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Screen scroll={false} backgroundColor="#ffffff">
      <View style={styles.container}>
        <View style={styles.brandRow}>
          <Text style={styles.brand}>CalScan</Text>
          <Text style={styles.brandDot}>.</Text>
        </View>
        <View style={styles.heroCard}>
          <SvgXml xml={fitnessStatsSvg} width="100%" height={170} />
        </View>

        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="#9ba7ac"
            style={styles.input}
            autoCapitalize="words"
          />
        </View>
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>Email address</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="you@example.com"
            placeholderTextColor="#9ba7ac"
            style={styles.input}
          />
        </View>
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#9ba7ac"
            style={styles.input}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          disabled={loading}
          onPress={() => {
            void (async () => {
              setLoading(true);
              setError(null);
              try {
                await signUp(email.trim(), password, name.trim());
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setLoading(false);
              }
            })();
          }}
        >
          <Text style={styles.loginBtnText}>{loading ? "Creating..." : "Create Account"}</Text>
        </Pressable>
        <Text style={styles.link} onPress={() => navigation.navigate("Login")}>
          Already have an account? <Text style={styles.linkAccent}>Sign in</Text>
        </Text>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#ffffff",
    marginHorizontal: -16,
    paddingHorizontal: 16
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center"
  },
  brand: {
    fontSize: 40,
    fontWeight: "900",
    color: "#182327"
  },
  brandDot: {
    fontSize: 44,
    fontWeight: "900",
    lineHeight: 42,
    color: "#2eb14b"
  },
  heroCard: {
    borderRadius: 18,
    backgroundColor: "transparent",
    padding: 0
  },
  inputWrap: {
    gap: 4
  },
  inputLabel: {
    color: "#627176",
    fontSize: 12,
    fontWeight: "700"
  },
  input: {
    borderWidth: 1,
    borderColor: "#d8e3e7",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#1f2a2f",
    fontWeight: "700"
  },
  error: {
    color: "#d6503f",
    textAlign: "center"
  },
  loginBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: "#131823",
    alignItems: "center",
    justifyContent: "center"
  },
  loginBtnDisabled: {
    opacity: 0.6
  },
  loginBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15
  },
  link: {
    color: "#627176",
    textAlign: "center",
    marginTop: 8,
    fontWeight: "600"
  },
  linkAccent: {
    color: "#2eb14b",
    fontWeight: "800"
  }
});
