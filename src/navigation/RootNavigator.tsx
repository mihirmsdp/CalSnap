import React from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthNavigator } from "@/navigation/AuthNavigator";
import { MainNavigator } from "@/navigation/MainNavigator";
import { OnboardingNavigator } from "@/navigation/OnboardingNavigator";
import { useAuth } from "@/hooks/useAuth";
import { colors } from "@/constants/theme";
import { GuestNameScreen } from "@/screens/auth/GuestNameScreen";

export const RootNavigator = (): React.JSX.Element => {
  const { user, loading } = useAuth();
  const isGuest = !!user?.email?.endsWith("@guest.local");
  const needsGuestName = isGuest && (!user?.name || /^guest(\s|$)/i.test(user.name.trim()));

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <AuthNavigator />;
  }

  if (needsGuestName) {
    return <GuestNameScreen />;
  }

  if (!user.onboardingCompleted) {
    return <OnboardingNavigator />;
  }

  return <MainNavigator />;
};
