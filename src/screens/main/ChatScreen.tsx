import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/common/Screen";
import { colors } from "@/constants/theme";

export const ChatScreen = (): React.JSX.Element => (
  <Screen>
    <View style={styles.card}>
      <Text style={styles.title}>Chat</Text>
      <Text style={styles.text}>Chat feature coming soon.</Text>
    </View>
  </Screen>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 6
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text
  },
  text: {
    color: colors.mutedText,
    fontWeight: "600"
  }
});
