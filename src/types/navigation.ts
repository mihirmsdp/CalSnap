import { NavigatorScreenParams } from "@react-navigation/native";
import { FoodLog, GeminiAnalysisResult, MealType } from "@/types/models";
import { FoodItem as USDAFoodItem } from "@/services/usdaFoodService";

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Progress: undefined;
  Scan: undefined;
  Discover: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList>;
  EditFoodLog:
    | {
        mode: "new";
        imageUri: string;
        aiResults: GeminiAnalysisResult;
        preselectedMealType?: MealType;
      }
    | {
        mode: "edit";
        existingLog: FoodLog;
      };
  OnboardingEdit: undefined;
  DailyTargets: undefined;
  BodyStats: undefined;
  ActivityLevel: undefined;
  HealthGoals: undefined;
  HelpFaq: undefined;
  ContactSupport: undefined;
  RateApp: undefined;
  AboutApp: undefined;
  ChangePassword: undefined;
  FoodSearch:
    | {
        mealType?: MealType;
      }
    | undefined;
  FoodDetails: {
    food: USDAFoodItem;
    mealType?: MealType;
  };
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};
