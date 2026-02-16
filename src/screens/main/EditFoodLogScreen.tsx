import React, { useMemo, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "@/components/common/Screen";
import { MainStackParamList } from "@/types/navigation";
import { FoodItem, FoodLog, MealType } from "@/types/models";
import { mealTypes } from "@/constants/meals";
import { colors } from "@/constants/theme";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { useAuth } from "@/hooks/useAuth";
import { useLogs } from "@/hooks/useLogs";
import { sumNutrition } from "@/utils/nutrition";

type Props = NativeStackScreenProps<MainStackParamList, "EditFoodLog">;

const asNumber = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const updateFood = (foods: FoodItem[], index: number, update: (food: FoodItem) => FoodItem): FoodItem[] =>
  foods.map((food, i) => (i === index ? update(food) : food));

const createEmptyFood = (): FoodItem => ({
  name: "",
  servingSize: "",
  nutrition: {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    vitamins: { vitaminA: 0, vitaminC: 0, vitaminD: 0 },
    minerals: { calcium: 0, iron: 0, potassium: 0 }
  }
});

const FieldRow = ({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  placeholder
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "numeric";
  placeholder?: string;
}): React.JSX.Element => (
  <View style={styles.fieldRow}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      placeholder={placeholder}
      placeholderTextColor="#93a0a4"
      style={styles.fieldInput}
    />
  </View>
);

export const EditFoodLogScreen = ({ route, navigation }: Props): React.JSX.Element => {
  const { user } = useAuth();
  const { saveLog, deleteLog } = useLogs();

  const isEditMode = route.params.mode === "edit";
  const existingLog = isEditMode ? route.params.existingLog : null;

  const [mealType, setMealType] = useState<MealType>(
    isEditMode ? route.params.existingLog.mealType : route.params.preselectedMealType || "lunch"
  );
  const [foods, setFoods] = useState<FoodItem[]>(
    isEditMode ? route.params.existingLog.foods : route.params.aiResults.foods
  );
  const [saving, setSaving] = useState(false);
  const [showMicros, setShowMicros] = useState<Record<number, boolean>>({});

  const imageUri = isEditMode ? route.params.existingLog.photoUrl : route.params.imageUri;
  const totals = useMemo(() => sumNutrition(foods), [foods]);

  const onSave = async (): Promise<void> => {
    if (!user) {
      Alert.alert("Save Failed", "No authenticated user session found. Please sign in again.");
      return;
    }

    if (!foods.length) {
      Alert.alert("Validation", "Add at least one food item before saving.");
      return;
    }

    setSaving(true);
    try {
      const log: FoodLog = {
        id: existingLog?.id || `log_${Date.now()}`,
        userId: user.id,
        date: existingLog?.date || new Date().toISOString(),
        mealType,
        logType: "photo",
        photoUrl: imageUri,
        foods,
        totalNutrition: totals
      };
      await saveLog(log);
      Alert.alert("Saved", isEditMode ? "Food log updated successfully." : "Food log saved successfully.");
      navigation.navigate("Tabs", { screen: "Home" });
    } catch (error) {
      const firebaseLike = error as { code?: string; message?: string };
      const details = [firebaseLike.code, firebaseLike.message].filter(Boolean).join(" | ");
      const message = details || "Failed to save food log. Please try again.";
      Alert.alert("Save Failed", message);
    } finally {
      setSaving(false);
    }
  };

  const onDeleteLog = (): void => {
    if (!existingLog) return;
    Alert.alert("Delete log", "Delete this food log permanently?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteLog(existingLog.id);
              Alert.alert("Deleted", "Food log deleted.");
              navigation.navigate("Tabs", { screen: "Home" });
            } catch (error) {
              Alert.alert("Delete Failed", (error as Error).message || "Could not delete log.");
            }
          })();
        }
      }
    ]);
  };

  return (
    <Screen>
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{isEditMode ? "Edit Food Log" : "Review & Save"}</Text>
          <View style={styles.statusBadge}>
            <Ionicons name="sparkles-outline" size={14} color="#1f8f36" />
            <Text style={styles.statusText}>{isEditMode ? "Editing" : "AI Analysis"}</Text>
          </View>
        </View>

        {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Meal Type</Text>
        <View style={styles.mealRow}>
          {mealTypes.map((meal) => (
            <Pressable
              key={meal}
              style={[styles.mealPill, meal === mealType && styles.mealPillActive]}
              onPress={() => setMealType(meal)}
            >
              <Text style={[styles.mealText, meal === mealType && styles.mealTextActive]}>{meal}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {foods.map((food, index) => (
        <View key={`${food.name}_${index}`} style={styles.card}>
          <View style={styles.foodHeader}>
            <Text style={styles.sectionTitle}>Food Item {index + 1}</Text>
            <Pressable style={styles.removeFoodBtn} onPress={() => setFoods((prev) => prev.filter((_, i) => i !== index))}>
              <Ionicons name="trash-outline" size={14} color={colors.danger} />
              <Text style={styles.removeFoodText}>Remove</Text>
            </Pressable>
          </View>

          <FieldRow
            label="Food"
            value={food.name}
            onChangeText={(value) =>
              setFoods((prev) =>
                updateFood(prev, index, (item) => ({
                  ...item,
                  name: value
                }))
              )
            }
            placeholder="Food name"
          />
          <FieldRow
            label="Quantity"
            value={food.servingSize}
            onChangeText={(value) =>
              setFoods((prev) =>
                updateFood(prev, index, (item) => ({
                  ...item,
                  servingSize: value
                }))
              )
            }
            placeholder="e.g. 150g"
          />
          <FieldRow
            label="Calories"
            value={String(food.nutrition.calories ?? 0)}
            onChangeText={(value) =>
              setFoods((prev) =>
                updateFood(prev, index, (item) => ({
                  ...item,
                  nutrition: { ...item.nutrition, calories: asNumber(value) }
                }))
              )
            }
            keyboardType="numeric"
          />
          <FieldRow
            label="Protein (g)"
            value={String(food.nutrition.protein ?? 0)}
            onChangeText={(value) =>
              setFoods((prev) =>
                updateFood(prev, index, (item) => ({
                  ...item,
                  nutrition: { ...item.nutrition, protein: asNumber(value) }
                }))
              )
            }
            keyboardType="numeric"
          />
          <FieldRow
            label="Carbs (g)"
            value={String(food.nutrition.carbs ?? 0)}
            onChangeText={(value) =>
              setFoods((prev) =>
                updateFood(prev, index, (item) => ({
                  ...item,
                  nutrition: { ...item.nutrition, carbs: asNumber(value) }
                }))
              )
            }
            keyboardType="numeric"
          />
          <FieldRow
            label="Fat (g)"
            value={String(food.nutrition.fat ?? 0)}
            onChangeText={(value) =>
              setFoods((prev) =>
                updateFood(prev, index, (item) => ({
                  ...item,
                  nutrition: { ...item.nutrition, fat: asNumber(value) }
                }))
              )
            }
            keyboardType="numeric"
          />
          <FieldRow
            label="Fiber (g)"
            value={String(food.nutrition.fiber ?? 0)}
            onChangeText={(value) =>
              setFoods((prev) =>
                updateFood(prev, index, (item) => ({
                  ...item,
                  nutrition: { ...item.nutrition, fiber: asNumber(value) }
                }))
              )
            }
            keyboardType="numeric"
          />
          <FieldRow
            label="Sugar (g)"
            value={String(food.nutrition.sugar ?? 0)}
            onChangeText={(value) =>
              setFoods((prev) =>
                updateFood(prev, index, (item) => ({
                  ...item,
                  nutrition: { ...item.nutrition, sugar: asNumber(value) }
                }))
              )
            }
            keyboardType="numeric"
          />
          <FieldRow
            label="Sodium (mg)"
            value={String(food.nutrition.sodium ?? 0)}
            onChangeText={(value) =>
              setFoods((prev) =>
                updateFood(prev, index, (item) => ({
                  ...item,
                  nutrition: { ...item.nutrition, sodium: asNumber(value) }
                }))
              )
            }
            keyboardType="numeric"
          />

          <Pressable
            onPress={() => setShowMicros((prev) => ({ ...prev, [index]: !prev[index] }))}
            style={styles.microToggle}
          >
            <Ionicons name={showMicros[index] ? "chevron-up" : "chevron-down"} size={14} color="#2b9f43" />
            <Text style={styles.microToggleText}>{showMicros[index] ? "Hide" : "Show"} Vitamins & Minerals</Text>
          </Pressable>

          {showMicros[index] ? (
            <View style={styles.microWrap}>
              <FieldRow
                label="Vitamin A"
                value={String(food.nutrition.vitamins?.vitaminA ?? 0)}
                onChangeText={(value) =>
                  setFoods((prev) =>
                    updateFood(prev, index, (item) => ({
                      ...item,
                      nutrition: {
                        ...item.nutrition,
                        vitamins: { ...(item.nutrition.vitamins || {}), vitaminA: asNumber(value) }
                      }
                    }))
                  )
                }
                keyboardType="numeric"
              />
              <FieldRow
                label="Vitamin C"
                value={String(food.nutrition.vitamins?.vitaminC ?? 0)}
                onChangeText={(value) =>
                  setFoods((prev) =>
                    updateFood(prev, index, (item) => ({
                      ...item,
                      nutrition: {
                        ...item.nutrition,
                        vitamins: { ...(item.nutrition.vitamins || {}), vitaminC: asNumber(value) }
                      }
                    }))
                  )
                }
                keyboardType="numeric"
              />
              <FieldRow
                label="Vitamin D"
                value={String(food.nutrition.vitamins?.vitaminD ?? 0)}
                onChangeText={(value) =>
                  setFoods((prev) =>
                    updateFood(prev, index, (item) => ({
                      ...item,
                      nutrition: {
                        ...item.nutrition,
                        vitamins: { ...(item.nutrition.vitamins || {}), vitaminD: asNumber(value) }
                      }
                    }))
                  )
                }
                keyboardType="numeric"
              />
              <FieldRow
                label="Calcium"
                value={String(food.nutrition.minerals?.calcium ?? 0)}
                onChangeText={(value) =>
                  setFoods((prev) =>
                    updateFood(prev, index, (item) => ({
                      ...item,
                      nutrition: {
                        ...item.nutrition,
                        minerals: { ...(item.nutrition.minerals || {}), calcium: asNumber(value) }
                      }
                    }))
                  )
                }
                keyboardType="numeric"
              />
              <FieldRow
                label="Iron"
                value={String(food.nutrition.minerals?.iron ?? 0)}
                onChangeText={(value) =>
                  setFoods((prev) =>
                    updateFood(prev, index, (item) => ({
                      ...item,
                      nutrition: {
                        ...item.nutrition,
                        minerals: { ...(item.nutrition.minerals || {}), iron: asNumber(value) }
                      }
                    }))
                  )
                }
                keyboardType="numeric"
              />
              <FieldRow
                label="Potassium"
                value={String(food.nutrition.minerals?.potassium ?? 0)}
                onChangeText={(value) =>
                  setFoods((prev) =>
                    updateFood(prev, index, (item) => ({
                      ...item,
                      nutrition: {
                        ...item.nutrition,
                        minerals: { ...(item.nutrition.minerals || {}), potassium: asNumber(value) }
                      }
                    }))
                  )
                }
                keyboardType="numeric"
              />
            </View>
          ) : null}
        </View>
      ))}

      <Pressable style={styles.addFoodBtn} onPress={() => setFoods((prev) => [...prev, createEmptyFood()])}>
        <Ionicons name="add-circle-outline" size={16} color="#1f8f34" />
        <Text style={styles.addFoodText}>Add Food Item</Text>
      </Pressable>

      <View style={styles.totalCard}>
        <Text style={styles.sectionTitle}>Total Nutrition</Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Calories</Text>
          <Text style={styles.totalValue}>{Math.round(totals.calories)} kcal</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Protein</Text>
          <Text style={styles.totalValue}>{Math.round(totals.protein)} g</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Carbs</Text>
          <Text style={styles.totalValue}>{Math.round(totals.carbs)} g</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Fat</Text>
          <Text style={styles.totalValue}>{Math.round(totals.fat)} g</Text>
        </View>
      </View>

      <PrimaryButton label={isEditMode ? "Update" : "Save"} loading={saving} onPress={() => void onSave()} />
      {isEditMode ? (
        <Pressable onPress={onDeleteLog}>
          <Text style={styles.deleteLog}>Delete Log</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.cancel}>Cancel</Text>
      </Pressable>
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dfe8ea",
    backgroundColor: "#f7fbf8",
    padding: 10,
    gap: 10
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#152126",
    flex: 1
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e5f8e8",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  statusText: {
    color: "#1f8f36",
    fontWeight: "800",
    fontSize: 12
  },
  preview: {
    width: "100%",
    height: 180,
    borderRadius: 12
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dfe8ea",
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 10
  },
  sectionTitle: {
    color: "#1a252a",
    fontWeight: "800",
    fontSize: 16
  },
  mealRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  mealPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#edf1f2"
  },
  mealPillActive: {
    backgroundColor: "#2eb14b"
  },
  mealText: {
    color: "#546368",
    fontWeight: "700",
    textTransform: "capitalize"
  },
  mealTextActive: {
    color: "#fff"
  },
  foodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  removeFoodBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#fff1f1"
  },
  removeFoodText: {
    color: colors.danger,
    fontWeight: "700"
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderWidth: 1,
    borderColor: "#e7edef",
    borderRadius: 12,
    backgroundColor: "#fbfcfc",
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  fieldLabel: {
    flex: 1,
    color: "#5c6a6f",
    fontWeight: "700",
    fontSize: 13
  },
  fieldInput: {
    width: "52%",
    borderWidth: 1,
    borderColor: "#d9e3e6",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 7,
    textAlign: "right",
    color: "#142125",
    fontWeight: "700"
  },
  microToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#ebf8ee",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  microToggleText: {
    color: "#2b9f43",
    fontWeight: "800"
  },
  microWrap: {
    gap: 8,
    marginTop: 2
  },
  addFoodBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#bfe4c7",
    backgroundColor: "#eefaf1",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6
  },
  addFoodText: {
    color: "#1f8f34",
    fontWeight: "800"
  },
  totalCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dfe8ea",
    backgroundColor: "#f4faf5",
    padding: 12,
    gap: 8
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  totalLabel: {
    color: "#5f6d72",
    fontWeight: "700"
  },
  totalValue: {
    color: "#1a252a",
    fontWeight: "900"
  },
  deleteLog: {
    textAlign: "center",
    color: colors.danger,
    fontWeight: "800"
  },
  cancel: {
    textAlign: "center",
    color: "#66767b",
    fontWeight: "700"
  }
});
