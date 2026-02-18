import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { Ionicons } from "@expo/vector-icons";
import { SvgXml } from "react-native-svg";
import { Screen } from "@/components/common/Screen";
import { AuthStackParamList } from "@/types/navigation";
import { useAuth } from "@/hooks/useAuth";
import { fitnessStatsSvg } from "@/assets/fitnessStatsSvg";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

WebBrowser.maybeCompleteAuthSession();

export const LoginScreen = ({ navigation }: Props): React.JSX.Element => {
  const { signIn, signInWithGoogle, signInAsGuest } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: googleWebClientId,
    androidClientId: googleAndroidClientId,
    iosClientId: googleIosClientId
  });

  React.useEffect(() => {
    if (response?.type !== "success") return;
    const idToken = response.params?.id_token;
    if (!idToken) {
      setError("Google sign-in failed. Missing ID token.");
      setGoogleLoading(false);
      return;
    }
    void (async () => {
      try {
        setError(null);
        await signInWithGoogle(idToken);
      } catch (err) {
        setError((err as Error).message || "Google sign-in failed.");
      } finally {
        setGoogleLoading(false);
      }
    })();
  }, [response, signInWithGoogle]);
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
        <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
          <Text style={styles.forgot}>Forgot password?</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Signup")}>
          <Text style={styles.signup}>Sign up</Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          style={[styles.loginBtn, loading && styles.googleBtnDisabled]}
          disabled={loading}
          onPress={() => {
            void (async () => {
              if (!email.trim() || !password.trim()) {
                Alert.alert("Missing Fields", "Please enter both email address and password.");
                return;
              }
              setError(null);
              setLoading(true);
              try {
                await signIn(email.trim(), password);
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setLoading(false);
              }
            })();
          }}
        >
          <Text style={styles.loginBtnText}>{loading ? "Signing in..." : "Login"}</Text>
          <Ionicons name="arrow-forward" size={16} color="#ffffff" />
        </Pressable>
        <Pressable
          style={[styles.googleBtn, (googleLoading || !request) && styles.googleBtnDisabled]}
          disabled={googleLoading || !request}
          onPress={() => {
            if (!googleWebClientId || !googleAndroidClientId || !googleIosClientId) {
              setError(
                "Missing Google client IDs. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID, and EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID."
              );
              return;
            }
            setGoogleLoading(true);
            void promptAsync();
          }}
        >
          <Ionicons name="logo-google" size={16} color="#1f2a2f" />
          <Text style={styles.googleBtnText}>{googleLoading ? "Opening Google..." : "Continue with Google"}</Text>
        </Pressable>
        <Pressable
          style={[styles.googleBtn, guestLoading && styles.googleBtnDisabled]}
          disabled={guestLoading}
          onPress={() => {
            void (async () => {
              try {
                setError(null);
                setGuestLoading(true);
                await signInAsGuest();
              } catch (err) {
                setError((err as Error).message || "Guest sign-in failed.");
              } finally {
                setGuestLoading(false);
              }
            })();
          }}
        >
          <Ionicons name="person-outline" size={16} color="#1f2a2f" />
          <Text style={styles.googleBtnText}>{guestLoading ? "Signing in..." : "Continue as Guest"}</Text>
        </Pressable>
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
  forgot: {
    color: "#4d5f65",
    textAlign: "right",
    fontWeight: "700"
  },
  signup: {
    color: "#2eb14b",
    textAlign: "center",
    fontWeight: "800"
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
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  loginBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15
  },
  googleBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d6e2e6",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  googleBtnDisabled: {
    opacity: 0.6
  },
  googleBtnText: {
    color: "#1f2a2f",
    fontWeight: "700"
  }
});
