import React from "react";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MainStackParamList } from "@/types/navigation";
import { OnboardingQuestionnaire } from "@/screens/onboarding/OnboardingQuestionnaire";

export const OnboardingEditScreen = (): React.JSX.Element => {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  return <OnboardingQuestionnaire editMode onDone={() => navigation.goBack()} />;
};
