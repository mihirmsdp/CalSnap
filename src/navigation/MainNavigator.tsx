import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MainStackParamList } from "@/types/navigation";
import { MainTabNavigator } from "@/navigation/MainTabNavigator";
import { EditFoodLogScreen } from "@/screens/main/EditFoodLogScreen";
import { OnboardingEditScreen } from "@/screens/onboarding/OnboardingEditScreen";
import {
  AboutAppScreen,
  ActivityLevelScreen,
  BodyStatsScreen,
  ChangePasswordScreen,
  ContactSupportScreen,
  DailyTargetsScreen,
  HealthGoalsScreen,
  HelpFaqScreen,
  RateAppScreen
} from "@/screens/main/ProfileDetailsScreens";

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainNavigator = (): React.JSX.Element => (
  <Stack.Navigator>
    <Stack.Screen name="Tabs" component={MainTabNavigator} options={{ headerShown: false }} />
    <Stack.Screen name="EditFoodLog" component={EditFoodLogScreen} options={{ title: "Review Food Log" }} />
    <Stack.Screen name="OnboardingEdit" component={OnboardingEditScreen} options={{ headerShown: false }} />
    <Stack.Screen name="DailyTargets" component={DailyTargetsScreen} options={{ title: "Daily Targets" }} />
    <Stack.Screen name="BodyStats" component={BodyStatsScreen} options={{ title: "Body Statistics" }} />
    <Stack.Screen name="ActivityLevel" component={ActivityLevelScreen} options={{ title: "Activity Level" }} />
    <Stack.Screen name="HealthGoals" component={HealthGoalsScreen} options={{ title: "Health Goals" }} />
    <Stack.Screen name="HelpFaq" component={HelpFaqScreen} options={{ title: "Help & FAQ" }} />
    <Stack.Screen name="ContactSupport" component={ContactSupportScreen} options={{ title: "Contact Support" }} />
    <Stack.Screen name="RateApp" component={RateAppScreen} options={{ title: "Rate App" }} />
    <Stack.Screen name="AboutApp" component={AboutAppScreen} options={{ title: "About" }} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: "Change Password" }} />
  </Stack.Navigator>
);
