export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type LogType = "photo" | "manual_search";

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  vitamins?: Record<string, number>;
  minerals?: Record<string, number>;
}

export interface FoodItem {
  name: string;
  servingSize: string;
  nutrition: NutritionInfo;
}

export interface FoodLog {
  id: string;
  userId: string;
  date: string;
  mealType: MealType;
  logType: LogType;
  photoUrl?: string;
  foods: FoodItem[];
  totalNutrition: NutritionInfo;
}

export interface WeightEntry {
  id: string;
  userId: string;
  date: string;
  weightKg: number;
  source: "manual" | "onboarding";
}

export interface DailyGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type PrimaryGoal =
  | "lose_weight"
  | "build_muscle"
  | "maintain"
  | "get_fit"
  | "control_diabetes";

export type HealthCondition =
  | "diabetes"
  | "pre_diabetic"
  | "high_bp"
  | "high_cholesterol"
  | "pcos"
  | "thyroid"
  | "heart_disease"
  | "none";

export type DietaryPreference =
  | "vegetarian"
  | "vegan"
  | "gluten_free"
  | "dairy_free"
  | "keto"
  | "paleo"
  | "halal"
  | "none";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "veryActive";

export interface MacroTargets extends DailyGoals {
  bmr: number;
  tdee: number;
}

export interface OnboardingData {
  primaryGoals: PrimaryGoal[];
  healthConditions: HealthCondition[];
  dietaryPreferences: DietaryPreference[];
  gender: "male" | "female" | "other";
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number;
  activityLevel: ActivityLevel;
  macroTargets: MacroTargets;
  onboardingCompleted: boolean;
  completedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  age?: number;
  weight?: number;
  height?: number;
  gender?: string;
  dailyGoals: DailyGoals;
  onboardingCompleted?: boolean;
  onboardingData?: OnboardingData;
  createdAt: string;
}

export type AchievementType =
  | "streak_7"
  | "streak_30"
  | "logs_100"
  | "weight_goal"
  | "protein_master";

export interface AchievementProgress {
  type: AchievementType;
  title: string;
  target: number;
  current: number;
  unlocked: boolean;
}

export type DiscoverCardCategory = "swap" | "tip" | "protein" | "carb" | "micronutrient" | "habit";

export interface DiscoverCard {
  id: string;
  title: string;
  description: string;
  reason: string;
  category: DiscoverCardCategory;
  actionLabel?: string;
}

export interface DiscoverFeed {
  dateKey: string;
  cards: DiscoverCard[];
  createdAt: string;
}

export interface GeminiAnalysisResult {
  foods: FoodItem[];
  totalNutrition: NutritionInfo;
  confidence: number;
  notes?: string;
}
