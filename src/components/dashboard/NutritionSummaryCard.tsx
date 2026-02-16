import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import { NutritionInfo } from "@/types/models";

interface NutritionSummaryCardProps {
  title: string;
  nutrition: NutritionInfo;
}

export const NutritionSummaryCard = ({
  title,
  nutrition
}: NutritionSummaryCardProps): React.JSX.Element => (
  <View style={styles.card}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.calories}>{Math.round(nutrition.calories)} kcal</Text>
    <View style={styles.row}>
      <Text style={styles.item}>Protein: {Math.round(nutrition.protein)} g</Text>
      <Text style={styles.item}>Carbs: {Math.round(nutrition.carbs)} g</Text>
      <Text style={styles.item}>Fat: {Math.round(nutrition.fat)} g</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8
  },
  title: {
    color: colors.mutedText,
    fontWeight: "600"
  },
  calories: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800"
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  item: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600"
  }
});
