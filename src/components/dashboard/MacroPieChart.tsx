import React from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { PieChart } from "react-native-chart-kit";
import { NutritionInfo } from "@/types/models";

interface MacroPieChartProps {
  nutrition: NutritionInfo;
}

const width = Dimensions.get("window").width - 32;

export const MacroPieChart = ({ nutrition }: MacroPieChartProps): React.JSX.Element => {
  const data = [
    { name: "Protein", grams: Math.max(nutrition.protein, 0), color: "#0f766e", legendFontColor: "#26221c", legendFontSize: 12 },
    { name: "Carbs", grams: Math.max(nutrition.carbs, 0), color: "#d97706", legendFontColor: "#26221c", legendFontSize: 12 },
    { name: "Fat", grams: Math.max(nutrition.fat, 0), color: "#7c3aed", legendFontColor: "#26221c", legendFontSize: 12 }
  ];

  return (
    <View style={styles.card}>
      <PieChart
        data={data.map((item) => ({ ...item, population: item.grams }))}
        width={width - 28}
        height={180}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="8"
        absolute
        chartConfig={{
          color: () => "#26221c"
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    backgroundColor: "#fff",
    paddingVertical: 6,
    alignItems: "center"
  }
});
