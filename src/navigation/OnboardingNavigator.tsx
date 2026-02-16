import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { OnboardingEntryScreen } from "@/screens/onboarding/OnboardingEntryScreen";

const Stack = createNativeStackNavigator();

export const OnboardingNavigator = (): React.JSX.Element => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="OnboardingEntry" component={OnboardingEntryScreen} />
  </Stack.Navigator>
);
