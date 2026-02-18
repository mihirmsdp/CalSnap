import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/common/Screen";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { useAuth } from "@/hooks/useAuth";
import { colors } from "@/constants/theme";

export const GuestNameScreen = (): React.JSX.Element => {
  const { user, updateProfile, signOut } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onContinue = async (): Promise<void> => {
    const nextName = name.trim();
    if (!nextName) {
      setError("Please enter a name to continue.");
      return;
    }
    if (!user) return;

    setSaving(true);
    setError(null);
    try {
      await updateProfile({ name: nextName });
    } catch (err) {
      setError((err as Error).message || "Could not save your name.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <Pressable
          style={styles.backButton}
          onPress={() => {
            void signOut();
          }}
        >
          <Ionicons name="chevron-back" size={18} color="#1a252a" />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>What shall we call you?</Text>
        <Text style={styles.subtitle}>Set your display name before starting onboarding.</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#95a1a6"
          style={styles.input}
          autoCapitalize="words"
          maxLength={40}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label="Continue" loading={saving} onPress={() => void onContinue()} />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: 12
  },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 2
  },
  backText: {
    color: "#1a252a",
    fontWeight: "700"
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#1a252a"
  },
  subtitle: {
    color: "#5f6f74",
    fontWeight: "600"
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
    color: colors.danger
  }
});
