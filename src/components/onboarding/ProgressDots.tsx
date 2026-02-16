import React from "react";
import { StyleSheet, View } from "react-native";

export const ProgressDots = ({
  total,
  current
}: {
  total: number;
  current: number;
}): React.JSX.Element => (
  <View style={styles.row}>
    {Array.from({ length: total }).map((_, index) => (
      <View key={index} style={[styles.dot, index <= current && styles.dotActive]} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: "#d8dbde"
  },
  dotActive: {
    backgroundColor: "#5be164"
  }
});
