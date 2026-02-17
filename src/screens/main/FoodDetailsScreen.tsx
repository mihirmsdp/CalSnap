import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainStackParamList } from "@/types/navigation";
import { MealType } from "@/types/models";
import { isFavorite, saveRecentFood, toggleFavorite } from "@/services/foodCacheService";
import { useAuth } from "@/hooks/useAuth";
import { useLogs } from "@/hooks/useLogs";

type Props = NativeStackScreenProps<MainStackParamList, "FoodDetails">;

const PRESETS = [
  { label: "1/2x", value: 0.5 },
  { label: "1x", value: 1 },
  { label: "1.5x", value: 1.5 },
  { label: "2x", value: 2 }
];

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" }
];

export const FoodDetailsScreen = ({ route, navigation }: Props): React.JSX.Element => {
  const { user } = useAuth();
  const { saveLog } = useLogs();
  const { food, mealType: initialMealType } = route.params;

  const [multiplier, setMultiplier] = useState(1);
  const [customValue, setCustomValue] = useState("1");
  const [mealType, setMealType] = useState<MealType>(initialMealType || "snack");
  const [favorited, setFavorited] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void saveRecentFood(food);
    void isFavorite(food.fdcId).then(setFavorited);
  }, [food]);

  const adjusted = useMemo(() => {
    const n = food.nutrition;
    return {
      calories: Math.round(n.calories * multiplier),
      protein: Number((n.protein * multiplier).toFixed(1)),
      carbs: Number((n.carbs * multiplier).toFixed(1)),
      fat: Number((n.fat * multiplier).toFixed(1)),
      fiber: Number((n.fiber * multiplier).toFixed(1)),
      sugar: Number((n.sugar * multiplier).toFixed(1)),
      sodium: Math.round(n.sodium * multiplier),
      calcium: Math.round(n.calcium * multiplier),
      iron: Number((n.iron * multiplier).toFixed(1)),
      potassium: Math.round(n.potassium * multiplier)
    };
  }, [food.nutrition, multiplier]);

  const handleCustom = (value: string): void => {
    setCustomValue(value);
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      setMultiplier(parsed);
    }
  };

  const handleFavorite = async (): Promise<void> => {
    const nextFavorite = await toggleFavorite(food);
    setFavorited(nextFavorite);
  };

  const handleAdd = async (): Promise<void> => {
    if (!user) {
      Alert.alert("Save Failed", "No authenticated user session found. Please sign in again.");
      return;
    }

    try {
      setSaving(true);
      await saveLog({
        id: `log_${Date.now()}`,
        userId: user.id,
        date: new Date().toISOString(),
        mealType,
        logType: "manual_search",
        foods: [
          {
            name: food.brand ? `${food.name} (${food.brand})` : food.name,
            servingSize: `${Number((food.servingSize * multiplier).toFixed(2))}${food.servingSizeUnit}`,
            nutrition: {
              calories: adjusted.calories,
              protein: adjusted.protein,
              carbs: adjusted.carbs,
              fat: adjusted.fat,
              fiber: adjusted.fiber,
              sugar: adjusted.sugar,
              sodium: adjusted.sodium,
              vitamins: {},
              minerals: {
                calcium: adjusted.calcium,
                iron: adjusted.iron,
                potassium: adjusted.potassium
              }
            }
          }
        ],
        totalNutrition: {
          calories: adjusted.calories,
          protein: adjusted.protein,
          carbs: adjusted.carbs,
          fat: adjusted.fat,
          fiber: adjusted.fiber,
          sugar: adjusted.sugar,
          sodium: adjusted.sodium,
          vitamins: {},
          minerals: {
            calcium: adjusted.calcium,
            iron: adjusted.iron,
            potassium: adjusted.potassium
          }
        }
      });

      Alert.alert("Added", `${food.name} added to ${mealType}`, [
        {
          text: "OK",
          onPress: () => navigation.navigate("Tabs", { screen: "Home" })
        }
      ]);
    } catch (error) {
      Alert.alert("Error", (error as Error).message || "Could not add food. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Food Details
        </Text>
        <TouchableOpacity onPress={() => void handleFavorite()}>
          <Ionicons name={favorited ? "heart" : "heart-outline"} size={24} color={favorited ? "#ef4444" : "#9ca3af"} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Text style={styles.foodName}>{food.name}</Text>
          {food.brand ? <Text style={styles.brand}>{food.brand}</Text> : null}
          <Text style={styles.serving}>
            Per {food.servingSize}
            {food.servingSizeUnit}
          </Text>
        </View>

        <View style={styles.caloriesCard}>
          <Text style={styles.caloriesNumber}>{adjusted.calories}</Text>
          <Text style={styles.caloriesLabel}>Calories</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Macros</Text>
          <Text style={styles.metric}>Protein: {adjusted.protein} g</Text>
          <Text style={styles.metric}>Carbs: {adjusted.carbs} g</Text>
          <Text style={styles.metric}>Fat: {adjusted.fat} g</Text>
          <Text style={styles.metric}>Fiber: {adjusted.fiber} g</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Serving Multiplier</Text>
          <View style={styles.presets}>
            {PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset.label}
                style={[styles.preset, multiplier === preset.value && styles.presetActive]}
                onPress={() => {
                  setMultiplier(preset.value);
                  setCustomValue(String(preset.value));
                }}
              >
                <Text style={[styles.presetText, multiplier === preset.value && styles.presetTextActive]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.customRow}>
            <Text style={styles.customLabel}>Custom:</Text>
            <TextInput
              style={styles.customInput}
              value={customValue}
              onChangeText={handleCustom}
              keyboardType="decimal-pad"
            />
            <Text style={styles.customUnit}>
              x {food.servingSize}
              {food.servingSizeUnit}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Meal Type</Text>
          <View style={styles.mealTypes}>
            {MEAL_TYPES.map((meal) => (
              <TouchableOpacity
                key={meal.value}
                style={[styles.mealButton, mealType === meal.value && styles.mealButtonActive]}
                onPress={() => setMealType(meal.value)}
              >
                <Text style={[styles.mealLabel, mealType === meal.value && styles.mealLabelActive]}>{meal.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Other Nutrients</Text>
          <Text style={styles.metric}>Sodium: {adjusted.sodium} mg</Text>
          <Text style={styles.metric}>Calcium: {adjusted.calcium} mg</Text>
          <Text style={styles.metric}>Iron: {adjusted.iron} mg</Text>
          <Text style={styles.metric}>Potassium: {adjusted.potassium} mg</Text>
        </View>

        <Text style={styles.source}>Data from USDA FoodData Central</Text>
        <View style={styles.spacer} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.addButton, saving && styles.addButtonDisabled]} onPress={() => void handleAdd()}>
          <Text style={styles.addButtonText}>{saving ? "Adding..." : `Add to ${mealType}`}</Text>
          <Text style={styles.addButtonCalories}>{adjusted.calories} cal</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  headerTitle: { fontSize: 18, fontWeight: "600", color: "#111827", flex: 1, textAlign: "center", marginHorizontal: 8 },
  infoCard: { backgroundColor: "#fff", padding: 16, marginBottom: 12 },
  foodName: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 4 },
  brand: { fontSize: 14, color: "#6b7280", marginBottom: 4 },
  serving: { fontSize: 13, color: "#9ca3af" },
  caloriesCard: {
    backgroundColor: "#10b981",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 24,
    alignItems: "center"
  },
  caloriesNumber: { fontSize: 52, fontWeight: "800", color: "#fff" },
  caloriesLabel: { fontSize: 16, color: "rgba(255,255,255,0.8)" },
  card: { backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 8 },
  metric: { fontSize: 14, color: "#374151" },
  presets: { flexDirection: "row", gap: 8, marginBottom: 14 },
  preset: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center"
  },
  presetActive: { borderColor: "#10b981", backgroundColor: "#f0fdf4" },
  presetText: { fontSize: 15, fontWeight: "600", color: "#6b7280" },
  presetTextActive: { color: "#10b981" },
  customRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  customLabel: { fontSize: 14, color: "#6b7280" },
  customInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 8,
    width: 70,
    textAlign: "center",
    fontSize: 16
  },
  customUnit: { fontSize: 14, color: "#6b7280" },
  mealTypes: { flexDirection: "row", gap: 8 },
  mealButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center"
  },
  mealButtonActive: { borderColor: "#10b981", backgroundColor: "#f0fdf4" },
  mealLabel: { fontSize: 12, color: "#6b7280" },
  mealLabelActive: { color: "#10b981", fontWeight: "600" },
  source: { textAlign: "center", fontSize: 12, color: "#9ca3af", padding: 16 },
  spacer: { height: 120 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb"
  },
  addButton: {
    backgroundColor: "#10b981",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  addButtonDisabled: { opacity: 0.6 },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "700", textTransform: "capitalize" },
  addButtonCalories: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "600" }
});
