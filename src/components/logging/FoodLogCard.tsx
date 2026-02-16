import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/theme";
import { FoodLog } from "@/types/models";
import { formatDay } from "@/utils/date";

interface FoodLogCardProps {
  log: FoodLog;
  onDelete?: () => void;
}

export const FoodLogCard = ({ log, onDelete }: FoodLogCardProps): React.JSX.Element => (
  <View style={styles.card}>
    <View style={styles.topRow}>
      <Text style={styles.title}>{log.mealType.toUpperCase()}</Text>
      <Text style={styles.meta}>
        {formatDay(log.date)} | {log.logType}
      </Text>
    </View>
    <Text style={styles.calories}>{Math.round(log.totalNutrition.calories)} kcal</Text>
    <Text style={styles.foods}>{log.foods.map((food) => food.name).join(", ")}</Text>
    {onDelete ? (
      <Pressable onPress={onDelete}>
        <Text style={styles.delete}>Delete</Text>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 6
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  title: {
    color: colors.text,
    fontWeight: "800"
  },
  meta: {
    color: colors.mutedText,
    fontSize: 12
  },
  calories: {
    color: colors.text,
    fontWeight: "700"
  },
  foods: {
    color: colors.mutedText
  },
  delete: {
    color: colors.danger,
    fontWeight: "700"
  }
});
