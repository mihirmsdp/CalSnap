import { ActivityLevel, DietaryPreference, HealthCondition, MacroTargets, PrimaryGoal } from "@/types/models";

export interface MacroCalculationInput {
  gender: "male" | "female" | "other";
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number;
  activityLevel: ActivityLevel;
  primaryGoals: PrimaryGoal[];
  healthConditions: HealthCondition[];
  dietaryPreferences: DietaryPreference[];
}

const activityMultipliers: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9
};

const preferredGoal = (goals: PrimaryGoal[]): PrimaryGoal => {
  if (goals.includes("control_diabetes")) return "control_diabetes";
  if (goals.includes("lose_weight")) return "lose_weight";
  if (goals.includes("build_muscle")) return "build_muscle";
  if (goals.includes("get_fit")) return "get_fit";
  return "maintain";
};

const calculateBMR = (input: MacroCalculationInput): number => {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  if (input.gender === "male") return base + 5;
  return base - 161;
};

const adjustForGoal = (tdee: number, goal: PrimaryGoal): number => {
  switch (goal) {
    case "lose_weight":
      return tdee - 500;
    case "build_muscle":
      return tdee + 300;
    case "get_fit":
      return tdee - 250;
    case "control_diabetes":
      return tdee - 300;
    case "maintain":
    default:
      return tdee;
  }
};

const getMacroSplit = (
  goal: PrimaryGoal,
  healthConditions: HealthCondition[],
  dietaryPreferences: DietaryPreference[]
): { protein: number; carbs: number; fat: number } => {
  const hasDiabetes =
    healthConditions.includes("diabetes") || healthConditions.includes("pre_diabetic");
  const isKeto = dietaryPreferences.includes("keto");

  if (isKeto) return { protein: 0.25, carbs: 0.05, fat: 0.7 };
  if (hasDiabetes || goal === "control_diabetes") return { protein: 0.3, carbs: 0.35, fat: 0.35 };

  switch (goal) {
    case "lose_weight":
      return { protein: 0.35, carbs: 0.35, fat: 0.3 };
    case "build_muscle":
      return { protein: 0.3, carbs: 0.45, fat: 0.25 };
    case "get_fit":
      return { protein: 0.3, carbs: 0.4, fat: 0.3 };
    case "maintain":
    default:
      return { protein: 0.3, carbs: 0.4, fat: 0.3 };
  }
};

export const convertHeightToCm = (feet: number, inches: number): number => feet * 30.48 + inches * 2.54;
export const convertLbsToKg = (lbs: number): number => lbs * 0.453592;
export const convertKgToLbs = (kg: number): number => kg / 0.453592;

export const calculateMacros = (input: MacroCalculationInput): MacroTargets => {
  const bmr = calculateBMR(input);
  const tdee = bmr * activityMultipliers[input.activityLevel];
  const goal = preferredGoal(input.primaryGoals);
  const targetCalories = Math.max(1200, adjustForGoal(tdee, goal));
  const split = getMacroSplit(goal, input.healthConditions, input.dietaryPreferences);

  return {
    calories: Math.round(targetCalories),
    protein: Math.round((targetCalories * split.protein) / 4),
    carbs: Math.round((targetCalories * split.carbs) / 4),
    fat: Math.round((targetCalories * split.fat) / 9),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee)
  };
};
