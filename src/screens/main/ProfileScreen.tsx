import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "@/components/common/Screen";
import { useAuth } from "@/hooks/useAuth";
import { useLogs } from "@/hooks/useLogs";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { colors } from "@/constants/theme";
import { MainStackParamList } from "@/types/navigation";

const getLocalDayKey = (iso: string): string => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getStreak = (days: string[]): number => {
  const set = new Set(days);
  let streak = 0;
  const cursor = new Date();
  while (set.has(getLocalDayKey(cursor.toISOString()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const initials = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const formatLabel = (value: string): string =>
  value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const SectionCard = ({
  title,
  subtitle,
  icon,
  onPress
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}): React.JSX.Element => (
  <Pressable style={styles.sectionCard} onPress={onPress}>
    <View style={styles.sectionIcon}>
      <Ionicons name={icon} size={18} color="#1f8f34" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color="#8b979d" />
  </Pressable>
);

export const ProfileScreen = (): React.JSX.Element => {
  const { user, signOut, updateProfile } = useAuth();
  const { logs } = useLogs();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const isGuestUser = !!user?.email?.endsWith("@guest.local");

  const [editNameOpen, setEditNameOpen] = useState(false);
  const nameParts = (user?.name || "").split(" ");
  const [firstName, setFirstName] = useState(nameParts[0] || "");
  const [lastName, setLastName] = useState(nameParts.slice(1).join(" ") || "");

  const dayKeys = useMemo(
    () => Array.from(new Set(logs.map((log) => getLocalDayKey(log.date)))),
    [logs]
  );
  const streak = getStreak(dayKeys);

  if (!user) {
    return (
      <Screen>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.muted}>No active user.</Text>
      </Screen>
    );
  }

  const onPickAvatar = (): void => {
    Alert.alert("Change Photo", "Choose a source", [
      {
        text: "Take Photo",
        onPress: () => {
          void (async () => {
            try {
              const p = await ImagePicker.requestCameraPermissionsAsync();
              if (!p.granted) return;
              const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
              if (!res.canceled && res.assets[0]) {
                await updateProfile({ avatarUrl: res.assets[0].uri });
              }
            } catch (error) {
              Alert.alert("Update Failed", (error as Error).message || "Could not update photo.");
            }
          })();
        }
      },
      {
        text: "Select from Gallery",
        onPress: () => {
          void (async () => {
            try {
              const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!p.granted) return;
              const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsEditing: true,
                quality: 0.8
              });
              if (!res.canceled && res.assets[0]) {
                await updateProfile({ avatarUrl: res.assets[0].uri });
              }
            } catch (error) {
              Alert.alert("Update Failed", (error as Error).message || "Could not update photo.");
            }
          })();
        }
      },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const onSaveName = async (): Promise<void> => {
    const name = `${firstName} ${lastName}`.trim();
    if (!name) return;
    await updateProfile({ name });
    setEditNameOpen(false);
  };

  return (
    <Screen>
      <Text style={styles.title}>Profile & Settings</Text>

      <View style={styles.headerCard}>
        <Pressable style={styles.avatarWrap} onPress={onPickAvatar}>
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatarLoaded} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{initials(user.name)}</Text>
            </View>
          )}
          <Text style={styles.changePhoto}>Change Photo</Text>
        </Pressable>

        <Pressable style={styles.nameRow} onPress={() => setEditNameOpen(true)}>
          <Text style={styles.name}>{user.name}</Text>
          <Ionicons name="create-outline" size={16} color="#587178" />
        </Pressable>
        {!isGuestUser ? <Text style={styles.email}>{user.email}</Text> : null}

        <View style={styles.statsCard}>
          <Setting label="Member since" value={new Date(user.createdAt).toLocaleDateString()} />
          <Setting label="Streak" value={`${streak} day${streak === 1 ? "" : "s"}`} />
        </View>
      </View>

      <SectionCard
        title="Daily Nutrition Targets"
        subtitle={`${user.dailyGoals.calories} cal • P${user.dailyGoals.protein} C${user.dailyGoals.carbs} F${user.dailyGoals.fat}`}
        icon="nutrition-outline"
        onPress={() => navigation.navigate("DailyTargets")}
      />
      <SectionCard
        title="Body Statistics"
        subtitle={`${user.age || "-"} years • ${user.height || "-"} cm • ${user.weight || "-"} kg`}
        icon="body-outline"
        onPress={() => navigation.navigate("BodyStats")}
      />
      <SectionCard
        title="Activity Level"
        subtitle={formatLabel(user.onboardingData?.activityLevel || "moderate")}
        icon="walk-outline"
        onPress={() => navigation.navigate("ActivityLevel")}
      />
      <SectionCard
        title="Health Goals"
        subtitle={formatLabel(user.onboardingData?.primaryGoals?.[0] || "Not set")}
        icon="flag-outline"
        onPress={() => navigation.navigate("HealthGoals")}
      />

      <View style={styles.supportWrap}>
        <Text style={styles.groupTitle}>Support & Help</Text>
        <SectionCard title="Help & FAQ" subtitle="Guides and troubleshooting" icon="help-circle-outline" onPress={() => navigation.navigate("HelpFaq")} />
        <SectionCard title="Contact Support" subtitle="Send us a message" icon="chatbox-ellipses-outline" onPress={() => navigation.navigate("ContactSupport")} />
        <SectionCard title="Rate App" subtitle="Share your feedback" icon="star-outline" onPress={() => navigation.navigate("RateApp")} />
        <SectionCard title="About" subtitle="Version and legal info" icon="information-circle-outline" onPress={() => navigation.navigate("AboutApp")} />
      </View>

      {!isGuestUser ? (
        <SectionCard title="Change Password" subtitle="Update your account security" icon="lock-closed-outline" onPress={() => navigation.navigate("ChangePassword")} />
      ) : null}

      <PrimaryButton
        label="Sign Out"
        onPress={() =>
          Alert.alert("Sign Out?", "Are you sure you want to sign out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Sign Out", style: "destructive", onPress: () => void signOut() }
          ])
        }
      />

      <Modal visible={editNameOpen} transparent animationType="fade" onRequestClose={() => setEditNameOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TextInput value={firstName} onChangeText={setFirstName} style={styles.modalInput} placeholder="First Name" />
            <TextInput value={lastName} onChangeText={setLastName} style={styles.modalInput} placeholder="Last Name" />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalBtnAlt} onPress={() => setEditNameOpen(false)}>
                <Text style={styles.modalBtnAltText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalBtn} onPress={() => void onSaveName()}>
                <Text style={styles.modalBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const Setting = ({ label, value }: { label: string; value: string }): React.JSX.Element => (
  <View style={styles.settingRow}>
    <Text style={styles.settingLabel}>{label}</Text>
    <Text style={styles.settingValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#1b272c"
  },
  muted: {
    color: colors.mutedText
  },
  headerCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dfe7e9",
    backgroundColor: "#f6fbf7",
    padding: 14,
    gap: 8,
    alignItems: "center"
  },
  avatarWrap: {
    alignItems: "center",
    gap: 6
  },
  avatarFallback: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#41b957"
  },
  avatarLoaded: {
    width: 120,
    height: 120,
    borderRadius: 60
  },
  avatarInitials: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 34
  },
  changePhoto: {
    color: "#1f8f34",
    fontWeight: "700"
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  name: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1d2b30"
  },
  email: {
    color: "#627177",
    fontWeight: "600"
  },
  statsCard: {
    marginTop: 6,
    alignSelf: "stretch",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbe5e8",
    backgroundColor: "#ffffff",
    padding: 10,
    gap: 6
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  settingLabel: {
    color: "#66767b",
    fontWeight: "700"
  },
  settingValue: {
    color: "#1f2a2f",
    fontWeight: "800"
  },
  supportWrap: {
    gap: 8
  },
  groupTitle: {
    color: "#5f6e73",
    fontWeight: "800",
    fontSize: 13
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e1e8ea",
    backgroundColor: "#ffffff",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#e8f7eb",
    alignItems: "center",
    justifyContent: "center"
  },
  sectionTitle: {
    color: "#1f2a2f",
    fontWeight: "800"
  },
  sectionSubtitle: {
    color: "#728287",
    fontWeight: "600"
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(8,13,15,0.45)",
    justifyContent: "center",
    padding: 18
  },
  modalCard: {
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 10
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2a2f"
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#d6e1e4",
    borderRadius: 10,
    backgroundColor: "#f9fcfd",
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: "#1e2a2f"
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8
  },
  modalBtnAlt: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dce3e5",
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  modalBtnAltText: {
    color: "#65747a",
    fontWeight: "700"
  },
  modalBtn: {
    borderRadius: 10,
    backgroundColor: "#2fb24b",
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  modalBtnText: {
    color: "#ffffff",
    fontWeight: "800"
  }
});
