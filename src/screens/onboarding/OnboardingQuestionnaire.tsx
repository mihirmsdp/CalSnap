import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/common/Screen";
import { ProgressDots } from "@/components/onboarding/ProgressDots";
import { OptionCard } from "@/components/onboarding/OptionCard";
import { useAuth } from "@/hooks/useAuth";
import {
  ActivityLevel,
  DietaryPreference,
  HealthCondition,
  OnboardingData,
  PrimaryGoal,
  UserProfile
} from "@/types/models";
import { calculateMacros, convertHeightToCm, convertKgToLbs, convertLbsToKg } from "@/services/macroCalculator";

const steps = [
  "Welcome",
  "Primary Goal",
  "Health Conditions",
  "Dietary Preferences",
  "Personal Info",
  "Height",
  "Weight",
  "Activity",
  "Results"
];

const goalOptions: Array<{ key: PrimaryGoal; label: string; icon: string }> = [
  { key: "lose_weight", label: "Lose Weight", icon: "🎯" },
  { key: "build_muscle", label: "Build Muscle", icon: "💪" },
  { key: "maintain", label: "Maintain Weight", icon: "⚖️" },
  { key: "get_fit", label: "Get Fit & Healthy", icon: "🏃" },
  { key: "control_diabetes", label: "Control Diabetes", icon: "🩺" }
];

const healthOptions: Array<{ key: HealthCondition; label: string }> = [
  { key: "diabetes", label: "Diabetes" },
  { key: "pre_diabetic", label: "Pre-diabetic" },
  { key: "high_bp", label: "High Blood Pressure" },
  { key: "high_cholesterol", label: "High Cholesterol" },
  { key: "pcos", label: "PCOS" },
  { key: "thyroid", label: "Thyroid Issues" },
  { key: "heart_disease", label: "Heart Disease" },
  { key: "none", label: "None of the above" }
];

const dietaryOptions: Array<{ key: DietaryPreference; label: string; icon: string }> = [
  { key: "vegetarian", label: "Vegetarian", icon: "🥬" },
  { key: "vegan", label: "Vegan", icon: "🌱" },
  { key: "gluten_free", label: "Gluten-Free", icon: "🍞" },
  { key: "dairy_free", label: "Dairy-Free", icon: "🥛" },
  { key: "keto", label: "Keto/Low-Carb", icon: "🥓" },
  { key: "paleo", label: "Paleo", icon: "🍖" },
  { key: "halal", label: "Halal", icon: "🕌" },
  { key: "none", label: "None", icon: "⭕" }
];

const activityOptions: Array<{ key: ActivityLevel; label: string; description: string; icon: string }> = [
  { key: "sedentary", label: "Sedentary", description: "Little to no exercise", icon: "🛋️" },
  { key: "light", label: "Lightly Active", description: "1-3 days/week", icon: "🚶" },
  { key: "moderate", label: "Moderately Active", description: "3-5 days/week", icon: "🏃" },
  { key: "active", label: "Very Active", description: "6-7 days/week", icon: "🏋️" },
  { key: "veryActive", label: "Extra Active", description: "Athlete/physical job", icon: "💪" }
];

const parseNum = (text: string): number => {
  const value = Number(text);
  return Number.isFinite(value) ? value : 0;
};

const toggleMulti = <T extends string>(current: T[], key: T): T[] => {
  if (current.includes(key)) {
    return current.filter((value) => value !== key);
  }
  return [...current, key];
};

const defaultsFromUser = (user: UserProfile | null) => {
  const onboarding = user?.onboardingData;
  return {
    primaryGoals: onboarding?.primaryGoals || ([] as PrimaryGoal[]),
    healthConditions: onboarding?.healthConditions || ([] as HealthCondition[]),
    dietaryPreferences: onboarding?.dietaryPreferences || ([] as DietaryPreference[]),
    gender: (onboarding?.gender || "male") as "male" | "female" | "other",
    age: String(onboarding?.age || user?.age || 28),
    heightCm: String(onboarding?.heightCm || user?.height || 170),
    weightKg: String(onboarding?.weightKg || user?.weight || 70),
    targetWeightKg: String(onboarding?.targetWeightKg || ""),
    activityLevel: (onboarding?.activityLevel || "moderate") as ActivityLevel
  };
};

export const OnboardingQuestionnaire = ({
  editMode = false,
  onDone
}: {
  editMode?: boolean;
  onDone?: () => void;
}): React.JSX.Element => {
  const { user, completeOnboarding } = useAuth();
  const defaults = defaultsFromUser(user);
  const [step, setStep] = useState(editMode ? 1 : 0);
  const [saving, setSaving] = useState(false);
  const [primaryGoals, setPrimaryGoals] = useState<PrimaryGoal[]>(defaults.primaryGoals);
  const [healthConditions, setHealthConditions] = useState<HealthCondition[]>(defaults.healthConditions);
  const [dietaryPreferences, setDietaryPreferences] = useState<DietaryPreference[]>(defaults.dietaryPreferences);
  const [gender, setGender] = useState<"male" | "female" | "other">(defaults.gender);
  const [age, setAge] = useState(defaults.age);
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");
  const [heightCm, setHeightCm] = useState(defaults.heightCm);
  const [heightFt, setHeightFt] = useState("5");
  const [heightIn, setHeightIn] = useState("8");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [weightKg, setWeightKg] = useState(defaults.weightKg);
  const [weightLbs, setWeightLbs] = useState(String(Math.round(convertKgToLbs(parseNum(defaults.weightKg)))));
  const [targetWeightKg, setTargetWeightKg] = useState(defaults.targetWeightKg);
  const [targetWeightLbs, setTargetWeightLbs] = useState("");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(defaults.activityLevel);

  const normalizedHeightCm =
    heightUnit === "cm" ? parseNum(heightCm) : convertHeightToCm(parseNum(heightFt), parseNum(heightIn));
  const normalizedWeightKg = weightUnit === "kg" ? parseNum(weightKg) : convertLbsToKg(parseNum(weightLbs));
  const normalizedTargetWeightKg = (() => {
    if (weightUnit === "kg") return parseNum(targetWeightKg) || undefined;
    const value = convertLbsToKg(parseNum(targetWeightLbs));
    return value || undefined;
  })();

  const macroTargets = useMemo(
    () =>
      calculateMacros({
        gender,
        age: parseNum(age),
        heightCm: normalizedHeightCm,
        weightKg: normalizedWeightKg,
        targetWeightKg: normalizedTargetWeightKg,
        activityLevel,
        primaryGoals,
        healthConditions,
        dietaryPreferences
      }),
    [
      activityLevel,
      age,
      dietaryPreferences,
      gender,
      healthConditions,
      normalizedHeightCm,
      normalizedTargetWeightKg,
      normalizedWeightKg,
      primaryGoals
    ]
  );

  const validateStep = (): string | null => {
    if (step === 1 && primaryGoals.length === 0) return "Select at least one goal.";
    if (step === 4) {
      const ageValue = parseNum(age);
      if (ageValue < 13 || ageValue > 100) return "Age must be between 13 and 100.";
    }
    if (step === 5) {
      if (normalizedHeightCm < 120 || normalizedHeightCm > 250) return "Height must be between 120 and 250 cm.";
    }
    if (step === 6) {
      if (normalizedWeightKg < 30 || normalizedWeightKg > 300) return "Weight must be between 30 and 300 kg.";
      if (
        normalizedTargetWeightKg &&
        Math.abs(normalizedTargetWeightKg - normalizedWeightKg) > 50
      ) {
        return "Target weight must be within 50 kg of current weight.";
      }
    }
    return null;
  };

  const encouragement = useMemo(() => {
    if (healthConditions.includes("diabetes") || healthConditions.includes("pre_diabetic")) {
      return "Great! We've optimized your macros to support blood sugar management with lower carbs.";
    }
    if (primaryGoals.includes("lose_weight")) {
      return "Your plan is designed for sustainable weight loss of about 0.5kg per week.";
    }
    if (primaryGoals.includes("build_muscle")) {
      return "Your high-protein plan supports muscle growth while you train.";
    }
    return "Your targets are tuned for consistent, healthy progress.";
  }, [healthConditions, primaryGoals]);

  const next = async (): Promise<void> => {
    const error = validateStep();
    if (error) {
      Alert.alert("Validation", error);
      return;
    }
    if (step < steps.length - 1) {
      setStep((value) => value + 1);
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      const onboardingData: OnboardingData = {
        primaryGoals,
        healthConditions,
        dietaryPreferences,
        gender,
        age: parseNum(age),
        heightCm: normalizedHeightCm,
        weightKg: normalizedWeightKg,
        targetWeightKg: normalizedTargetWeightKg,
        activityLevel,
        macroTargets,
        onboardingCompleted: true,
        completedAt: new Date().toISOString()
      };
      await completeOnboarding(onboardingData);
      onDone?.();
    } catch (error) {
      Alert.alert("Failed", (error as Error).message || "Failed to save onboarding.");
    } finally {
      setSaving(false);
    }
  };

  const back = (): void => {
    if (step === 0) return;
    setStep((value) => value - 1);
  };

  return (
    <Screen>
      <View style={styles.container}>
        <ProgressDots total={steps.length} current={step} />

        {step === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="sparkles" size={56} color="#48cd5a" />
            <Text style={styles.title}>Welcome to CalSnap!</Text>
            <Text style={styles.subtitle}>Let's personalize your nutrition journey. Takes just 2 minutes.</Text>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.stepWrap}>
            <Text style={styles.title}>What's your primary goal?</Text>
            {goalOptions.map((option) => (
              <OptionCard
                key={option.key}
                label={option.label}
                icon={option.icon}
                selected={primaryGoals.includes(option.key)}
                multi
                onPress={() => setPrimaryGoals((current) => toggleMulti(current, option.key))}
              />
            ))}
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.stepWrap}>
            <Text style={styles.title}>Any health considerations?</Text>
            <Text style={styles.subtitle}>Select all that apply</Text>
            {healthOptions.map((option) => (
              <OptionCard
                key={option.key}
                label={option.label}
                selected={healthConditions.includes(option.key)}
                multi
                onPress={() =>
                  setHealthConditions((current) => {
                    if (option.key === "none") return ["none"];
                    const nextValue = toggleMulti(current.filter((item) => item !== "none"), option.key);
                    return nextValue.length ? nextValue : [];
                  })
                }
              />
            ))}
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.stepWrap}>
            <Text style={styles.title}>Any dietary preferences?</Text>
            <Text style={styles.subtitle}>Select all that apply</Text>
            {dietaryOptions.map((option) => (
              <OptionCard
                key={option.key}
                label={option.label}
                icon={option.icon}
                selected={dietaryPreferences.includes(option.key)}
                multi
                onPress={() =>
                  setDietaryPreferences((current) => {
                    if (option.key === "none") return ["none"];
                    const nextValue = toggleMulti(current.filter((item) => item !== "none"), option.key);
                    return nextValue.length ? nextValue : [];
                  })
                }
              />
            ))}
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.stepWrap}>
            <Text style={styles.title}>Tell us about yourself</Text>
            <View style={styles.row}>
              {(["male", "female", "other"] as const).map((value) => (
                <Pressable
                  key={value}
                  style={[styles.pill, gender === value && styles.pillActive]}
                  onPress={() => setGender(value)}
                >
                  <Text style={[styles.pillText, gender === value && styles.pillTextActive]}>{value}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholder="Age"
              style={styles.input}
            />
          </View>
        ) : null}

        {step === 5 ? (
          <View style={styles.stepWrap}>
            <Text style={styles.title}>What's your height?</Text>
            <View style={styles.row}>
              <Pressable style={[styles.pill, heightUnit === "cm" && styles.pillActive]} onPress={() => setHeightUnit("cm")}>
                <Text style={[styles.pillText, heightUnit === "cm" && styles.pillTextActive]}>cm</Text>
              </Pressable>
              <Pressable style={[styles.pill, heightUnit === "ft" && styles.pillActive]} onPress={() => setHeightUnit("ft")}>
                <Text style={[styles.pillText, heightUnit === "ft" && styles.pillTextActive]}>ft/in</Text>
              </Pressable>
            </View>
            {heightUnit === "cm" ? (
              <TextInput value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" style={styles.input} />
            ) : (
              <View style={styles.row}>
                <TextInput value={heightFt} onChangeText={setHeightFt} keyboardType="numeric" style={[styles.input, styles.half]} />
                <TextInput value={heightIn} onChangeText={setHeightIn} keyboardType="numeric" style={[styles.input, styles.half]} />
              </View>
            )}
          </View>
        ) : null}

        {step === 6 ? (
          <View style={styles.stepWrap}>
            <Text style={styles.title}>Weight information</Text>
            <View style={styles.row}>
              <Pressable style={[styles.pill, weightUnit === "kg" && styles.pillActive]} onPress={() => setWeightUnit("kg")}>
                <Text style={[styles.pillText, weightUnit === "kg" && styles.pillTextActive]}>kg</Text>
              </Pressable>
              <Pressable style={[styles.pill, weightUnit === "lbs" && styles.pillActive]} onPress={() => setWeightUnit("lbs")}>
                <Text style={[styles.pillText, weightUnit === "lbs" && styles.pillTextActive]}>lbs</Text>
              </Pressable>
            </View>
            {weightUnit === "kg" ? (
              <>
                <TextInput value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" placeholder="Current weight" style={styles.input} />
                <TextInput
                  value={targetWeightKg}
                  onChangeText={setTargetWeightKg}
                  keyboardType="numeric"
                  placeholder="Target weight (optional)"
                  style={styles.input}
                />
              </>
            ) : (
              <>
                <TextInput value={weightLbs} onChangeText={setWeightLbs} keyboardType="numeric" placeholder="Current weight (lbs)" style={styles.input} />
                <TextInput
                  value={targetWeightLbs}
                  onChangeText={setTargetWeightLbs}
                  keyboardType="numeric"
                  placeholder="Target weight (lbs, optional)"
                  style={styles.input}
                />
              </>
            )}
          </View>
        ) : null}

        {step === 7 ? (
          <View style={styles.stepWrap}>
            <Text style={styles.title}>How active are you?</Text>
            {activityOptions.map((option) => (
              <OptionCard
                key={option.key}
                label={option.label}
                icon={option.icon}
                description={option.description}
                selected={activityLevel === option.key}
                onPress={() => setActivityLevel(option.key)}
              />
            ))}
          </View>
        ) : null}

        {step === 8 ? (
          <View style={styles.stepWrap}>
            <View style={styles.centered}>
              <Ionicons name="checkmark-circle" size={62} color="#4cd95c" />
              <Text style={styles.title}>Your Plan is Ready!</Text>
            </View>
            <View style={styles.resultCard}>
              <Text style={styles.resultHeader}>Daily Targets</Text>
              <Text style={styles.resultLine}>🔥 {macroTargets.calories} calories</Text>
              <Text style={styles.resultLine}>🔴 {macroTargets.protein}g Protein</Text>
              <Text style={styles.resultLine}>🔵 {macroTargets.carbs}g Carbs</Text>
              <Text style={styles.resultLine}>🟡 {macroTargets.fat}g Fat</Text>
            </View>
            <Text style={styles.note}>{encouragement}</Text>
          </View>
        ) : null}

        <Pressable style={[styles.nextButton, saving && { opacity: 0.6 }]} onPress={() => void next()} disabled={saving}>
          <Text style={styles.nextText}>
            {step === 0
              ? "Get Started  →"
              : step === steps.length - 1
                ? editMode
                  ? "Save Changes  →"
                  : "Start Tracking  →"
                : "Next  →"}
          </Text>
        </Pressable>

        {step > 0 ? (
          <Pressable onPress={back}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16
  },
  centered: {
    alignItems: "center",
    gap: 10
  },
  stepWrap: {
    gap: 10
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#1b2529"
  },
  subtitle: {
    color: "#6d777b",
    fontWeight: "600"
  },
  row: {
    flexDirection: "row",
    gap: 10
  },
  input: {
    borderWidth: 1,
    borderColor: "#dfe5e8",
    borderRadius: 14,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f292d"
  },
  half: {
    flex: 1
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#edf2f4"
  },
  pillActive: {
    backgroundColor: "#59dd67"
  },
  pillText: {
    fontWeight: "700",
    color: "#5f696e",
    textTransform: "capitalize"
  },
  pillTextActive: {
    color: "#102013"
  },
  nextButton: {
    backgroundColor: "#58dd66",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center"
  },
  nextText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#102013"
  },
  back: {
    color: "#5c676b",
    fontWeight: "700"
  },
  resultCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4eaec",
    backgroundColor: "#f4f8f6",
    padding: 14,
    gap: 4
  },
  resultHeader: {
    color: "#586268",
    fontWeight: "700"
  },
  resultLine: {
    fontSize: 22,
    fontWeight: "800",
    color: "#152126"
  },
  note: {
    color: "#3f4c50",
    fontWeight: "600"
  }
});
