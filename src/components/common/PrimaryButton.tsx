import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors } from "@/constants/theme";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export const PrimaryButton = ({
  label,
  onPress,
  disabled,
  loading
}: PrimaryButtonProps): React.JSX.Element => {
  const inactive = disabled || loading;
  return (
    <Pressable onPress={onPress} style={[styles.button, inactive && styles.disabled]} disabled={inactive}>
      {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  disabled: {
    opacity: 0.6
  },
  label: {
    color: "#ffffff",
    fontWeight: "700"
  }
});
