import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

export const Screen = ({
  children,
  scroll = true,
  topOffset = 8,
  backgroundColor = colors.background
}: {
  children: React.ReactNode;
  scroll?: boolean;
  topOffset?: number;
  backgroundColor?: string;
}): React.JSX.Element => {
  const insets = useSafeAreaInsets();

  if (scroll) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + topOffset, paddingBottom: Math.max(16, insets.bottom + 12) }
        ]}
        style={[styles.root, { backgroundColor }]}
      >
        {children}
      </ScrollView>
    );
  }
  return (
    <View
      style={[
        styles.fixed,
        {
          backgroundColor,
          paddingTop: insets.top + topOffset,
          paddingBottom: Math.max(16, insets.bottom + 12)
        }
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16
  },
  fixed: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 16
  }
});
