import React, { useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/common/Screen";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { useAuth } from "@/hooks/useAuth";
import {
  ActivityLevel,
  DietaryPreference,
  HealthCondition,
  OnboardingData,
  PrimaryGoal
} from "@/types/models";
import { calculateMacros } from "@/services/macroCalculator";

const inputNum = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const goalOptions: Array<{ key: PrimaryGoal; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "lose_weight", label: "Lose Weight", icon: "trending-down-outline" },
  { key: "build_muscle", label: "Build Muscle", icon: "barbell-outline" },
  { key: "maintain", label: "Maintain Weight", icon: "swap-horizontal-outline" },
  { key: "get_fit", label: "Get Fit & Healthy", icon: "fitness-outline" },
  { key: "control_diabetes", label: "Control Diabetes", icon: "medkit-outline" }
];

const healthOptions: Array<{ key: HealthCondition; label: string }> = [
  { key: "diabetes", label: "Diabetes" },
  { key: "pre_diabetic", label: "Pre-diabetic" },
  { key: "high_bp", label: "High Blood Pressure" },
  { key: "high_cholesterol", label: "High Cholesterol" },
  { key: "pcos", label: "PCOS" },
  { key: "thyroid", label: "Thyroid Issues" },
  { key: "heart_disease", label: "Heart Disease" }
];

const dietOptions: Array<{ key: DietaryPreference; label: string }> = [
  { key: "vegetarian", label: "Vegetarian" },
  { key: "vegan", label: "Vegan" },
  { key: "gluten_free", label: "Gluten-Free" },
  { key: "dairy_free", label: "Dairy-Free" },
  { key: "keto", label: "Keto/Low-Carb" },
  { key: "paleo", label: "Paleo" },
  { key: "halal", label: "Halal" }
];

const activityOptions: Array<{ key: ActivityLevel; label: string; subtitle: string; multiplier: number; icon: string }> = [
  { key: "sedentary", label: "Sedentary", subtitle: "Little to no exercise", multiplier: 1.2, icon: "🛋️" },
  { key: "light", label: "Lightly Active", subtitle: "Exercise 1-3 days/week", multiplier: 1.375, icon: "🚶" },
  { key: "moderate", label: "Moderately Active", subtitle: "Exercise 3-5 days/week", multiplier: 1.55, icon: "🏃" },
  { key: "active", label: "Very Active", subtitle: "Exercise 6-7 days/week", multiplier: 1.725, icon: "🏋️" },
  { key: "veryActive", label: "Extra Active", subtitle: "Athlete or physical job", multiplier: 1.9, icon: "💪" }
];

const SettingRow = ({ label, value }: { label: string; value: string }): React.JSX.Element => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

export const DailyTargetsScreen = (): React.JSX.Element => {
  const { user, updateProfile } = useAuth();
  const [calories, setCalories] = useState(String(user?.dailyGoals.calories || 2000));
  const [protein, setProtein] = useState(String(user?.dailyGoals.protein || 150));
  const [carbs, setCarbs] = useState(String(user?.dailyGoals.carbs || 200));
  const [fat, setFat] = useState(String(user?.dailyGoals.fat || 67));

  const onRecalculate = (): void => {
    const data = user?.onboardingData;
    if (!data) {
      Alert.alert("Not available", "Complete onboarding first to recalculate targets.");
      return;
    }
    const next = calculateMacros({
      gender: data.gender,
      age: data.age,
      heightCm: data.heightCm,
      weightKg: user?.weight || data.weightKg,
      targetWeightKg: data.targetWeightKg,
      activityLevel: data.activityLevel,
      primaryGoals: data.primaryGoals,
      healthConditions: data.healthConditions,
      dietaryPreferences: data.dietaryPreferences
    });
    setCalories(String(next.calories));
    setProtein(String(next.protein));
    setCarbs(String(next.carbs));
    setFat(String(next.fat));
  };

  const onSave = async (): Promise<void> => {
    try {
      await updateProfile({
        dailyGoals: {
          calories: inputNum(calories),
          protein: inputNum(protein),
          carbs: inputNum(carbs),
          fat: inputNum(fat)
        }
      });
      Alert.alert("Saved", "Daily targets updated.");
    } catch (error) {
      Alert.alert("Failed", (error as Error).message);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Daily Nutrition Targets</Text>
      <Text style={styles.subtitle}>Your personalized targets based on your goals</Text>

      <View style={styles.card}>
        <FieldInput label="Daily Calories" value={calories} onChangeText={setCalories} unit="cal" />
        <FieldInput label="Protein" value={protein} onChangeText={setProtein} unit="g" />
        <FieldInput label="Carbohydrates" value={carbs} onChangeText={setCarbs} unit="g" />
        <FieldInput label="Fat" value={fat} onChangeText={setFat} unit="g" />
      </View>

      <PrimaryButton label="Recalculate Based on Current Stats" onPress={onRecalculate} />
      <PrimaryButton label="Save Changes" onPress={() => void onSave()} />
    </Screen>
  );
};

const FieldInput = ({
  label,
  value,
  onChangeText,
  unit
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  unit: string;
}): React.JSX.Element => (
  <View style={styles.fieldRow}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.fieldInputWrap}>
      <TextInput value={value} onChangeText={onChangeText} keyboardType="numeric" style={styles.fieldInput} />
      <Text style={styles.fieldUnit}>{unit}</Text>
    </View>
  </View>
);

export const BodyStatsScreen = (): React.JSX.Element => {
  const { user, updateProfile } = useAuth();
  const onb = user?.onboardingData;

  const [age, setAge] = useState(String(onb?.age || user?.age || 28));
  const [gender, setGender] = useState((onb?.gender || user?.gender || "male") as "male" | "female" | "other");
  const [heightCm, setHeightCm] = useState(String(onb?.heightCm || user?.height || 170));
  const [weightKg, setWeightKg] = useState(String(user?.weight || onb?.weightKg || 70));
  const [targetWeightKg, setTargetWeightKg] = useState(String(onb?.targetWeightKg || ""));

  const calc = useMemo(() => {
    const weight = inputNum(weightKg);
    const heightM = inputNum(heightCm) / 100;
    const bmi = heightM > 0 ? weight / (heightM * heightM) : 0;
    const macros = calculateMacros({
      gender,
      age: inputNum(age),
      heightCm: inputNum(heightCm),
      weightKg: weight,
      targetWeightKg: inputNum(targetWeightKg) || undefined,
      activityLevel: onb?.activityLevel || "moderate",
      primaryGoals: onb?.primaryGoals || ["maintain"],
      healthConditions: onb?.healthConditions || [],
      dietaryPreferences: onb?.dietaryPreferences || []
    });
    return { bmi, bmr: macros.bmr, tdee: macros.tdee };
  }, [age, gender, heightCm, onb?.activityLevel, onb?.dietaryPreferences, onb?.healthConditions, onb?.primaryGoals, targetWeightKg, weightKg]);

  const onSave = async (): Promise<void> => {
    if (!user) return;
    const nextOnboarding: OnboardingData | undefined = onb
      ? {
          ...onb,
          age: inputNum(age),
          gender,
          heightCm: inputNum(heightCm),
          weightKg: inputNum(weightKg),
          targetWeightKg: inputNum(targetWeightKg) || undefined
        }
      : undefined;

    try {
      await updateProfile({
        age: inputNum(age),
        gender,
        height: inputNum(heightCm),
        weight: inputNum(weightKg),
        onboardingData: nextOnboarding
      });
      Alert.alert("Saved", "Body stats updated.");
    } catch (error) {
      Alert.alert("Failed", (error as Error).message);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Body Statistics</Text>
      <View style={styles.card}>
        <FieldInput label="Age" value={age} onChangeText={setAge} unit="years" />
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.pillRow}>
            {(["male", "female", "other"] as const).map((item) => (
              <Pressable key={item} style={[styles.pill, gender === item && styles.pillActive]} onPress={() => setGender(item)}>
                <Text style={[styles.pillText, gender === item && styles.pillTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <FieldInput label="Height" value={heightCm} onChangeText={setHeightCm} unit="cm" />
        <FieldInput label="Current Weight" value={weightKg} onChangeText={setWeightKg} unit="kg" />
        <FieldInput label="Target Weight" value={targetWeightKg} onChangeText={setTargetWeightKg} unit="kg" />
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Calculated Metrics</Text>
        <SettingRow label="BMI" value={`${calc.bmi.toFixed(1)} (${calc.bmi < 25 ? "Normal" : "High"})`} />
        <SettingRow label="BMR" value={`${calc.bmr} cal/day`} />
        <SettingRow label="TDEE" value={`${calc.tdee} cal/day`} />
      </View>

      <PrimaryButton label="Save Changes" onPress={() => void onSave()} />
    </Screen>
  );
};

export const ActivityLevelScreen = (): React.JSX.Element => {
  const { user, updateProfile } = useAuth();
  const onb = user?.onboardingData;
  const [activity, setActivity] = useState<ActivityLevel>(onb?.activityLevel || "moderate");

  const tdee = useMemo(() => {
    const next = calculateMacros({
      gender: (onb?.gender || user?.gender || "male") as "male" | "female" | "other",
      age: onb?.age || user?.age || 28,
      heightCm: onb?.heightCm || user?.height || 170,
      weightKg: user?.weight || onb?.weightKg || 70,
      targetWeightKg: onb?.targetWeightKg,
      activityLevel: activity,
      primaryGoals: onb?.primaryGoals || ["maintain"],
      healthConditions: onb?.healthConditions || [],
      dietaryPreferences: onb?.dietaryPreferences || []
    });
    return next.tdee;
  }, [activity, onb?.age, onb?.dietaryPreferences, onb?.gender, onb?.healthConditions, onb?.heightCm, onb?.primaryGoals, onb?.targetWeightKg, onb?.weightKg, user?.age, user?.gender, user?.height, user?.weight]);

  const onSave = async (): Promise<void> => {
    if (!user || !onb) return;
    try {
      await updateProfile({
        onboardingData: {
          ...onb,
          activityLevel: activity
        }
      });
      Alert.alert("Updated", "Activity level updated.");
    } catch (error) {
      Alert.alert("Failed", (error as Error).message);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Activity Level</Text>
      <View style={styles.listWrap}>
        {activityOptions.map((option) => (
          <Pressable
            key={option.key}
            style={[styles.activityCard, activity === option.key && styles.activityCardActive]}
            onPress={() => setActivity(option.key)}
          >
            <Text style={styles.activityLabel}>{option.icon} {option.label}</Text>
            <Text style={styles.activitySub}>{option.subtitle}</Text>
            <Text style={styles.activitySub}>Multiplier: {option.multiplier}x</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.subtitle}>Your TDEE: {tdee} cal/day</Text>
      <PrimaryButton label="Update & Recalculate" onPress={() => void onSave()} />
    </Screen>
  );
};

const toggle = <T extends string>(items: T[], value: T): T[] =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

export const HealthGoalsScreen = (): React.JSX.Element => {
  const { user, updateProfile } = useAuth();
  const onb = user?.onboardingData;

  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>(onb?.primaryGoals[0] || "maintain");
  const [health, setHealth] = useState<HealthCondition[]>(onb?.healthConditions || []);
  const [diet, setDiet] = useState<DietaryPreference[]>(onb?.dietaryPreferences || []);

  const onSave = async (): Promise<void> => {
    if (!user || !onb) return;
    const updated = {
      ...onb,
      primaryGoals: [primaryGoal],
      healthConditions: health,
      dietaryPreferences: diet
    };

    const macros = calculateMacros({
      gender: updated.gender,
      age: updated.age,
      heightCm: updated.heightCm,
      weightKg: user.weight || updated.weightKg,
      targetWeightKg: updated.targetWeightKg,
      activityLevel: updated.activityLevel,
      primaryGoals: updated.primaryGoals,
      healthConditions: updated.healthConditions,
      dietaryPreferences: updated.dietaryPreferences
    });

    try {
      await updateProfile({
        dailyGoals: {
          calories: macros.calories,
          protein: macros.protein,
          carbs: macros.carbs,
          fat: macros.fat
        },
        onboardingData: {
          ...updated,
          macroTargets: macros
        }
      });
      Alert.alert("Saved", "Health goals updated and macros recalculated.");
    } catch (error) {
      Alert.alert("Failed", (error as Error).message);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Health Goals</Text>
      <View style={styles.card}>
        <Text style={styles.section}>Primary Goal</Text>
        {goalOptions.map((option) => (
          <Pressable key={option.key} style={styles.choiceRow} onPress={() => setPrimaryGoal(option.key)}>
            <Ionicons name={primaryGoal === option.key ? "radio-button-on" : "radio-button-off"} size={18} color="#2ca444" />
            <Ionicons name={option.icon} size={16} color="#4a5a60" />
            <Text style={styles.choiceText}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Health Conditions</Text>
        {healthOptions.map((option) => (
          <Pressable key={option.key} style={styles.choiceRow} onPress={() => setHealth((prev) => toggle(prev, option.key))}>
            <Ionicons name={health.includes(option.key) ? "checkbox" : "square-outline"} size={18} color="#2ca444" />
            <Text style={styles.choiceText}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Dietary Preferences</Text>
        {dietOptions.map((option) => (
          <Pressable key={option.key} style={styles.choiceRow} onPress={() => setDiet((prev) => toggle(prev, option.key))}>
            <Ionicons name={diet.includes(option.key) ? "checkbox" : "square-outline"} size={18} color="#2ca444" />
            <Text style={styles.choiceText}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.warning}>Updating these will recalculate your macros.</Text>
      <PrimaryButton label="Save & Recalculate" onPress={() => void onSave()} />
    </Screen>
  );
};

export const HelpFaqScreen = (): React.JSX.Element => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const faqs: Array<{ id: string; question: string; answer: string }> = [
    {
      id: "log_food",
      question: "How do I log food?",
      answer:
        "Open Home, expand a meal, and tap Log Food. You can scan a photo, review detected items, edit quantity/macros, and save."
    },
    {
      id: "macro_meaning",
      question: "What do protein, carbs, and fat mean?",
      answer:
        "Protein supports muscle and recovery. Carbs are your primary energy source. Fat supports hormones and long-lasting energy."
    },
    {
      id: "targets_setup",
      question: "How are my calorie and macro targets set?",
      answer:
        "Targets are calculated from your onboarding data: age, weight, activity level, health goals, and preferences. You can update them in Profile."
    },
    {
      id: "ai_analysis",
      question: "How does AI photo analysis work?",
      answer:
        "The app detects food items and estimates nutrition from the image. You should review and adjust name, quantity, and values before saving."
    },
    {
      id: "photo_accuracy",
      question: "How can I improve scan accuracy?",
      answer:
        "Use good lighting, keep all food visible, avoid blur, and capture from above. Include only one meal at a time when possible."
    },
    {
      id: "progress_reading",
      question: "How do I read the Progress charts?",
      answer:
        "Calories and macros show either today's totals or period averages. Streak and logging rate summarize consistency over time."
    },
    {
      id: "adjust_targets",
      question: "Can I change my goals later?",
      answer:
        "Yes. Go to Profile and update Daily Targets, Activity Level, or Health Goals. The app recalculates recommendations accordingly."
    },
    {
      id: "password_change",
      question: "How do I change my password?",
      answer:
        "Open Profile, select Change Password, enter current password, then set and confirm your new password."
    },
    {
      id: "sync_issue",
      question: "My data is not syncing. What should I do?",
      answer:
        "Check internet connection, sign out and sign back in, then reopen the app. If issue continues, contact support with screenshots."
    }
  ];
  const filtered = faqs;

  return (
    <Screen>
      <Text style={styles.title}>Help & FAQ</Text>
      <View style={styles.card}>
        {filtered.length ? (
          filtered.map((item) => {
            const expanded = expandedId === item.id;
            return (
              <Pressable
                key={item.id}
                style={[styles.faqRow, expanded && styles.faqRowExpanded]}
                onPress={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
              >
                <View style={styles.faqHeader}>
                  <View style={[styles.topicRow, styles.faqTopicRow]}>
                    <Ionicons name="help-circle-outline" size={16} color="#2ca444" />
                    <Text style={[styles.choiceText, styles.faqQuestionText]}>{item.question}</Text>
                  </View>
                  <View style={styles.faqChevronWrap}>
                    <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#6a777d" />
                  </View>
                </View>
                {expanded ? <Text style={styles.faqAnswer}>{item.answer}</Text> : null}
              </Pressable>
            );
          })
        ) : (
          <Text style={styles.subtitle}>No topics available.</Text>
        )}
      </View>
    </Screen>
  );
};

export const ContactSupportScreen = (): React.JSX.Element => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const onSendSupportEmail = async (): Promise<void> => {
    if (!message.trim()) {
      Alert.alert("Validation", "Please enter your message before sending.");
      return;
    }

    const to = "mihirmsdp@gmail.com";
    const nextSubject = subject.trim() || "CalSnap Support Request";
    const nextBody = message.trim();
    const url = `mailto:${to}?subject=${encodeURIComponent(nextSubject)}&body=${encodeURIComponent(nextBody)}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert("Email App Not Found", "No email app is configured on this device.");
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert("Failed", "Could not open your email app.");
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Contact Support</Text>
      <View style={styles.card}>
        <Text style={styles.section}>Subject</Text>
        <TextInput value={subject} onChangeText={setSubject} style={styles.search} placeholder="Enter subject" />
        <Text style={styles.section}>Message</Text>
        <TextInput
          value={message}
          onChangeText={setMessage}
          style={[styles.search, { minHeight: 120, textAlignVertical: "top" }]}
          multiline
          placeholder="Describe your issue"
        />
      </View>
      <PrimaryButton label="Send Message" onPress={() => void onSendSupportEmail()} />
      <Text style={styles.subtitle}>support@nutrisnap.com</Text>
    </Screen>
  );
};

export const RateAppScreen = (): React.JSX.Element => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");

  return (
    <Screen>
      <Text style={styles.title}>Rate CalSnap</Text>
      <Text style={styles.subtitle}>How would you rate the app?</Text>
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(n)}>
            <Ionicons name={n <= rating ? "star" : "star-outline"} size={34} color="#f7b500" />
          </Pressable>
        ))}
      </View>
      <TextInput
        value={feedback}
        onChangeText={setFeedback}
        style={[styles.search, { minHeight: 120, textAlignVertical: "top" }]}
        multiline
        placeholder="Tell us more (optional)"
      />
      <PrimaryButton label="Submit Review" onPress={() => Alert.alert("Thanks", "Review submitted.")} />
    </Screen>
  );
};

export const AboutAppScreen = (): React.JSX.Element => (
  <Screen>
    <Text style={styles.title}>About CalSnap</Text>
    <View style={styles.card}>
      <Text style={styles.logo}>CalSnap</Text>
      <Text style={styles.subtitle}>AI-Powered Nutrition Tracking</Text>
      <SettingRow label="Version" value="1.0.2" />
      <SettingRow label="Build" value="45" />
    </View>
    <View style={styles.card}>
      <SettingRow label="Website" value="www.calsnap.com" />
      <SettingRow label="Email" value="hello@calsnap.com" />
      <SettingRow label="Support" value="support@calsnap.com" />
    </View>
  </Screen>
);

export const ChangePasswordScreen = (): React.JSX.Element => {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const onSave = async (): Promise<void> => {
    if (next.length < 8) {
      Alert.alert("Validation", "New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      Alert.alert("Validation", "Passwords do not match.");
      return;
    }
    try {
      await changePassword(current, next);
      Alert.alert("Updated", "Password updated successfully.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (error) {
      Alert.alert("Failed", (error as Error).message || "Could not update password.");
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Change Password</Text>
      <View style={styles.card}>
        <Text style={styles.section}>Current Password</Text>
        <TextInput value={current} onChangeText={setCurrent} secureTextEntry style={styles.search} />
        <Text style={styles.section}>New Password</Text>
        <TextInput value={next} onChangeText={setNext} secureTextEntry style={styles.search} />
        <Text style={styles.section}>Confirm Password</Text>
        <TextInput value={confirm} onChangeText={setConfirm} secureTextEntry style={styles.search} />
      </View>
      <PrimaryButton label="Update Password" onPress={() => void onSave()} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#182327"
  },
  subtitle: {
    color: "#627176",
    fontWeight: "600"
  },
  section: {
    color: "#2c373b",
    fontWeight: "800"
  },
  warning: {
    color: "#8b6115",
    fontWeight: "700"
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e1e8ea",
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 8
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  rowLabel: {
    color: "#637176",
    fontWeight: "700"
  },
  rowValue: {
    color: "#1f2a2f",
    fontWeight: "800"
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  fieldLabel: {
    color: "#607177",
    fontWeight: "700"
  },
  fieldInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  fieldInput: {
    minWidth: 90,
    borderWidth: 1,
    borderColor: "#d5e0e4",
    borderRadius: 10,
    backgroundColor: "#f7fbfb",
    paddingHorizontal: 10,
    paddingVertical: 7,
    textAlign: "right",
    fontWeight: "800",
    color: "#1c272c"
  },
  fieldUnit: {
    color: "#617176",
    fontWeight: "700"
  },
  pillRow: {
    flexDirection: "row",
    gap: 6
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#edf3f4"
  },
  pillActive: {
    backgroundColor: "#2ca444"
  },
  pillText: {
    color: "#5e6d72",
    fontWeight: "700",
    textTransform: "capitalize"
  },
  pillTextActive: {
    color: "#ffffff"
  },
  listWrap: {
    gap: 8
  },
  activityCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e1e8ea",
    backgroundColor: "#ffffff",
    padding: 10,
    gap: 2
  },
  activityCardActive: {
    borderColor: "#35b24f",
    backgroundColor: "#edf9f0"
  },
  activityLabel: {
    color: "#1d2a2f",
    fontWeight: "800"
  },
  activitySub: {
    color: "#647378",
    fontWeight: "600"
  },
  choiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4
  },
  choiceText: {
    color: "#304045",
    fontWeight: "700"
  },
  search: {
    borderWidth: 1,
    borderColor: "#d7e2e6",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#1f2a2f"
  },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4
  },
  faqRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e7ecef",
    backgroundColor: "#fbfdfc",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
    overflow: "hidden"
  },
  faqRowExpanded: {
    borderColor: "#d5eadb",
    backgroundColor: "#f5fbf7"
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8
  },
  faqTopicRow: {
    flex: 1,
    paddingVertical: 0,
    alignItems: "flex-start"
  },
  faqQuestionText: {
    flexShrink: 1,
    paddingRight: 2
  },
  faqChevronWrap: {
    width: 20,
    minHeight: 20,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 1
  },
  faqAnswer: {
    color: "#5d6d72",
    fontWeight: "600",
    lineHeight: 19
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10
  },
  logo: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1a252a"
  }
});
