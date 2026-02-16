import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";

export const Screen = ({
  children,
  scroll = true
}: {
  children: React.ReactNode;
  scroll?: boolean;
}): React.JSX.Element => {
  const insets = useSafeAreaInsets();

  if (scroll) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 8, paddingBottom: Math.max(16, insets.bottom + 12) }
        ]}
        style={styles.root}
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
          paddingTop: insets.top + 8,
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
