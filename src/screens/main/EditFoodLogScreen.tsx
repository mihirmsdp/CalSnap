import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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
import { FoodItem as UsdaFoodItem, searchFoods } from "@/services/usdaFoodService";

type Props = NativeStackScreenProps<MainStackParamList, "EditFoodLog">;

const asNumber = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const updateFood = (foods: FoodItem[], index: number, update: (food: FoodItem) => FoodItem): FoodItem[] =>
  foods.map((food, i) => (i === index ? update(food) : food));

const parseQuantityAmount = (value: string): number => {
  const match = value.match(/(\d+(\.\d+)?)/);
  if (!match) return 0;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : 0;
};

const cloneNutrition = (nutrition: FoodItem["nutrition"]): FoodItem["nutrition"] => ({
  calories: nutrition.calories || 0,
  protein: nutrition.protein || 0,
  carbs: nutrition.carbs || 0,
  fat: nutrition.fat || 0,
  fiber: nutrition.fiber || 0,
  sugar: nutrition.sugar || 0,
  sodium: nutrition.sodium || 0,
  vitamins: {
    vitaminA: Number(nutrition.vitamins?.vitaminA || 0),
    vitaminC: Number(nutrition.vitamins?.vitaminC || 0),
    vitaminD: Number(nutrition.vitamins?.vitaminD || 0)
  },
  minerals: {
    calcium: Number(nutrition.minerals?.calcium || 0),
    iron: Number(nutrition.minerals?.iron || 0),
    potassium: Number(nutrition.minerals?.potassium || 0)
  }
});

const scaleNutrition = (nutrition: FoodItem["nutrition"], factor: number): FoodItem["nutrition"] => ({
  calories: Number((nutrition.calories * factor).toFixed(2)),
  protein: Number((nutrition.protein * factor).toFixed(2)),
  carbs: Number((nutrition.carbs * factor).toFixed(2)),
  fat: Number((nutrition.fat * factor).toFixed(2)),
  fiber: Number(((nutrition.fiber || 0) * factor).toFixed(2)),
  sugar: Number(((nutrition.sugar || 0) * factor).toFixed(2)),
  sodium: Number(((nutrition.sodium || 0) * factor).toFixed(2)),
  vitamins: {
    vitaminA: Number(((nutrition.vitamins?.vitaminA || 0) * factor).toFixed(2)),
    vitaminC: Number(((nutrition.vitamins?.vitaminC || 0) * factor).toFixed(2)),
    vitaminD: Number(((nutrition.vitamins?.vitaminD || 0) * factor).toFixed(2))
  },
  minerals: {
    calcium: Number(((nutrition.minerals?.calcium || 0) * factor).toFixed(2)),
    iron: Number(((nutrition.minerals?.iron || 0) * factor).toFixed(2)),
    potassium: Number(((nutrition.minerals?.potassium || 0) * factor).toFixed(2))
  }
});

interface FoodBase {
  baseAmount: number;
  baseNutrition: FoodItem["nutrition"];
}

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

const formatMacroValue = (value?: number): string => `${Number(value || 0).toFixed(1)} g`;

export const EditFoodLogScreen = ({ route, navigation }: Props): React.JSX.Element => {
  const { user } = useAuth();
  const { saveLog, deleteLog } = useLogs();

  const isEditMode = route.params.mode === "edit";
  const existingLog = isEditMode ? route.params.existingLog : null;

  const [mealType, setMealType] = useState<MealType>(
    isEditMode ? route.params.existingLog.mealType : route.params.preselectedMealType || "lunch"
  );
  const initialFoods = isEditMode ? route.params.existingLog.foods : route.params.aiResults.foods;
  const [foods, setFoods] = useState<FoodItem[]>(initialFoods);
  const [foodBases, setFoodBases] = useState<FoodBase[]>(
    initialFoods.map((food) => ({
      baseAmount: Math.max(0.01, parseQuantityAmount(food.servingSize) || 1),
      baseNutrition: cloneNutrition(food.nutrition)
    }))
  );
  const [saving, setSaving] = useState(false);
  const [showMicros, setShowMicros] = useState<Record<number, boolean>>({});
  const [macroEditorOpen, setMacroEditorOpen] = useState<Record<number, boolean>>({});
  const [nameSuggestions, setNameSuggestions] = useState<Record<number, UsdaFoodItem[]>>({});
  const [nameSuggestionLoading, setNameSuggestionLoading] = useState<Record<number, boolean>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const imageUri = isEditMode ? route.params.existingLog.photoUrl : route.params.imageUri;
  const totals = useMemo(() => sumNutrition(foods), [foods]);
  const radialFoods = useMemo(() => {
    const totalCalories = foods.reduce((sum, food) => sum + Math.max(0, food.nutrition.calories || 0), 0);
    const topFoods = [...foods]
      .map((food, index) => ({ food, index, calories: Math.max(0, food.nutrition.calories || 0) }))
      .sort((a, b) => b.calories - a.calories)
      .slice(0, 6);

    return topFoods.map((entry) => ({
      ...entry,
      percent: totalCalories > 0 ? (entry.calories / totalCalories) * 100 : 100 / Math.max(1, topFoods.length)
    }));
  }, [foods]);

  const setSuggestionsForIndex = (index: number, items: UsdaFoodItem[] = []): void => {
    setNameSuggestions((prev) => ({ ...prev, [index]: items }));
    setNameSuggestionLoading((prev) => ({ ...prev, [index]: false }));
  };

  const handleNameChange = (index: number, value: string): void => {
    setFoods((prev) =>
      updateFood(prev, index, (item) => ({
        ...item,
        name: value
      }))
    );

    if (debounceRef.current) clearTimeout(debounceRef.current);
    const query = value.trim();

    if (query.length < 2) {
      setSuggestionsForIndex(index, []);
      return;
    }

    setNameSuggestionLoading((prev) => ({ ...prev, [index]: true }));
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const { foods: matches } = await searchFoods(query, 1, 6);
          setSuggestionsForIndex(index, matches);
        } catch {
          setSuggestionsForIndex(index, []);
        }
      })();
    }, 350);
  };

  const applyUsdaSuggestion = (index: number, picked: UsdaFoodItem): void => {
    const pickedServing = `${picked.servingSize} ${picked.servingSizeUnit}`.trim();
    const nextServing = pickedServing || "100 g";
    const baseAmount = Math.max(0.01, parseQuantityAmount(nextServing) || 100);
    const factor = baseAmount / 100;

    const baseNutrition = {
      calories: picked.nutrition.calories || 0,
      protein: picked.nutrition.protein || 0,
      carbs: picked.nutrition.carbs || 0,
      fat: picked.nutrition.fat || 0,
      fiber: picked.nutrition.fiber || 0,
      sugar: picked.nutrition.sugar || 0,
      sodium: picked.nutrition.sodium || 0,
      vitamins: { vitaminA: 0, vitaminC: 0, vitaminD: 0 },
      minerals: {
        calcium: picked.nutrition.calcium || 0,
        iron: picked.nutrition.iron || 0,
        potassium: picked.nutrition.potassium || 0
      }
    };

    setFoods((prev) =>
      updateFood(prev, index, (item) => ({
        ...item,
        name: picked.name,
        servingSize: nextServing,
        nutrition: scaleNutrition(baseNutrition, factor)
      }))
    );
    setFoodBases((prev) =>
      prev.map((base, i) =>
        i === index
          ? {
              baseAmount,
              baseNutrition
            }
          : base
      )
    );
    setShowMicros((prev) => ({ ...prev, [index]: true }));
    setSuggestionsForIndex(index, []);
  };

  const handleQuantityChange = (index: number, nextServingSize: string): void => {
    const nextAmount = parseQuantityAmount(nextServingSize);
    const base = foodBases[index];

    if (!base || nextAmount <= 0) {
      setFoods((prev) =>
        updateFood(prev, index, (item) => ({
          ...item,
          servingSize: nextServingSize
        }))
      );
      return;
    }

    const factor = nextAmount / Math.max(base.baseAmount, 0.01);
    const nextNutrition = scaleNutrition(base.baseNutrition, factor);

    setFoods((prev) =>
      updateFood(prev, index, (item) => ({
        ...item,
        servingSize: nextServingSize,
        nutrition: nextNutrition
      }))
    );
  };

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
      const successMessage = isEditMode ? "Food log updated successfully." : "Food log saved successfully.";
      navigation.reset({
        index: 0,
        routes: [{ name: "Tabs", params: { screen: "Home", params: { saveSuccessMessage: successMessage } } }]
      });
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
              navigation.reset({
                index: 0,
                routes: [{ name: "Tabs", params: { screen: "Home" } }]
              });
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

        {imageUri ? (
          <View style={styles.flowerWrap}>
            <View style={styles.flowerStage}>
              {radialFoods.map((entry, idx) => {
                const angle = (-90 + idx * (360 / Math.max(radialFoods.length, 1))) * (Math.PI / 180);
                const x = 128 + 92 * Math.cos(angle) - 50;
                const y = 128 + 92 * Math.sin(angle) - 34;
                return (
                  <View key={`radial_${entry.index}`} style={[styles.flowerPetal, { left: x, top: y }]}>
                    <Text style={styles.flowerPercent}>{entry.percent.toFixed(1)}%</Text>
                    <Text style={styles.flowerName} numberOfLines={1}>
                      {entry.food.name}
                    </Text>
                  </View>
                );
              })}

              <View style={styles.centerImageRing}>
                <Image source={{ uri: imageUri }} style={styles.centerImage} resizeMode="cover" />
              </View>
            </View>
          </View>
        ) : null}
        <View style={styles.topStatsRow}>
          <View style={styles.topStatChip}>
            <Ionicons name="restaurant-outline" size={14} color="#1f8f36" />
            <Text style={styles.topStatText}>{foods.length} item{foods.length === 1 ? "" : "s"}</Text>
          </View>
          <View style={styles.topStatChip}>
            <Ionicons name="flame-outline" size={14} color="#1f8f36" />
            <Text style={styles.topStatText}>{Math.round(totals.calories)} kcal</Text>
          </View>
        </View>
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
        <View key={`food_${index}`} style={[styles.card, styles.foodCard]}>
          <View style={styles.foodHeader}>
            <View style={styles.foodTitleWrap}>
              <Text style={styles.foodItemLabel}>Food Item {index + 1}</Text>
              {macroEditorOpen[index] ? (
                <TextInput
                  value={food.name}
                  onChangeText={(value) => handleNameChange(index, value)}
                  placeholder="Food name"
                  placeholderTextColor="#9ba8ad"
                  style={styles.foodNameInput}
                />
              ) : (
                <View style={styles.foodNameReadonly}>
                  <Text style={styles.foodNameText}>{food.name || "Unnamed food"}</Text>
                </View>
              )}
              {macroEditorOpen[index] ? (
                <View style={styles.suggestionWrap}>
                  {nameSuggestionLoading[index] ? (
                    <View style={styles.suggestionLoading}>
                      <ActivityIndicator size="small" color="#1f8f36" />
                      <Text style={styles.suggestionHelpText}>Searching USDA...</Text>
                    </View>
                  ) : null}
                  {!nameSuggestionLoading[index] && (nameSuggestions[index]?.length || 0) > 0 ? (
                    <View style={styles.suggestionList}>
                      {nameSuggestions[index].map((item) => (
                        <Pressable
                          key={`${item.fdcId}_${index}`}
                          style={styles.suggestionItem}
                          onPress={() => applyUsdaSuggestion(index, item)}
                        >
                          <Text style={styles.suggestionName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.suggestionMeta} numberOfLines={1}>
                            {Math.round(item.nutrition.calories)} kcal · P {Math.round(item.nutrition.protein)}g · C{" "}
                            {Math.round(item.nutrition.carbs)}g · F {Math.round(item.nutrition.fat)}g
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
            <View style={styles.foodActions}>
              <Pressable
                style={[styles.iconBtn, macroEditorOpen[index] && styles.iconBtnActive]}
                onPress={() => {
                  const nextOpen = !macroEditorOpen[index];
                  setMacroEditorOpen((prev) => ({ ...prev, [index]: nextOpen }));
                  if (!nextOpen) setSuggestionsForIndex(index, []);
                }}
              >
                <Ionicons name="create-outline" size={14} color={macroEditorOpen[index] ? "#1f8f36" : "#6d7c81"} />
              </Pressable>
              <Pressable
                style={styles.removeFoodBtn}
                onPress={() => {
                  setFoods((prev) => prev.filter((_, i) => i !== index));
                  setFoodBases((prev) => prev.filter((_, i) => i !== index));
                  setMacroEditorOpen((prev) => {
                    const next = { ...prev };
                    delete next[index];
                    return next;
                  });
                  setNameSuggestions((prev) => {
                    const next = { ...prev };
                    delete next[index];
                    return next;
                  });
                  setNameSuggestionLoading((prev) => {
                    const next = { ...prev };
                    delete next[index];
                    return next;
                  });
                }}
              >
                <Ionicons name="trash-outline" size={14} color={colors.danger} />
              </Pressable>
            </View>
          </View>

          <View style={styles.quickStats}>
            <View style={styles.quickStatCard}>
              <View style={styles.quickStatHead}>
                <Ionicons name="barbell-outline" size={14} color="#15803d" />
                <Text style={styles.quickStatLabel}>Quantity</Text>
              </View>
              <TextInput
                value={food.servingSize}
                onChangeText={(value) => handleQuantityChange(index, value)}
                placeholder="e.g. 150g"
                placeholderTextColor="#96a5aa"
                style={styles.quickStatInput}
              />
            </View>
            <View style={styles.quickStatCard}>
              <View style={styles.quickStatHead}>
                <Ionicons name="flame-outline" size={14} color="#c2410c" />
                <Text style={styles.quickStatLabel}>Calories</Text>
              </View>
              <Text style={styles.calorieValue}>{Math.round(food.nutrition.calories || 0)} kcal</Text>
            </View>
          </View>

          <View style={styles.macroHeader}>
            <Text style={styles.macroTitle}>Macros (g)</Text>
            <Text style={styles.macroHint}>
              {macroEditorOpen[index] ? "Editing enabled" : "Tap pencil to edit"}
            </Text>
          </View>
          <View style={styles.macroGrid}>
            <View style={[styles.macroTile, styles.macroTileProtein]}>
              <Ionicons name="fitness-outline" size={16} color="#0f766e" style={styles.macroTileIcon} />
              <Text style={styles.macroTileLabel}>Protein</Text>
              {macroEditorOpen[index] ? (
                <TextInput
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
                  style={styles.macroInput}
                />
              ) : (
                <Text style={styles.macroTileValue}>{formatMacroValue(food.nutrition.protein)}</Text>
              )}
            </View>
            <View style={[styles.macroTile, styles.macroTileCarb]}>
              <Ionicons name="leaf-outline" size={16} color="#c2410c" style={styles.macroTileIcon} />
              <Text style={styles.macroTileLabel}>Carbs</Text>
              {macroEditorOpen[index] ? (
                <TextInput
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
                  style={styles.macroInput}
                />
              ) : (
                <Text style={styles.macroTileValue}>{formatMacroValue(food.nutrition.carbs)}</Text>
              )}
            </View>
            <View style={[styles.macroTile, styles.macroTileFat]}>
              <Ionicons name="water-outline" size={16} color="#7c3aed" style={styles.macroTileIcon} />
              <Text style={styles.macroTileLabel}>Fat</Text>
              {macroEditorOpen[index] ? (
                <TextInput
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
                  style={styles.macroInput}
                />
              ) : (
                <Text style={styles.macroTileValue}>{formatMacroValue(food.nutrition.fat)}</Text>
              )}
            </View>
          </View>
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

      <Pressable
        style={styles.addFoodBtn}
        onPress={() => {
          const empty = createEmptyFood();
          setFoods((prev) => [...prev, empty]);
          setFoodBases((prev) => [
            ...prev,
            {
              baseAmount: 1,
              baseNutrition: cloneNutrition(empty.nutrition)
            }
          ]);
        }}
      >
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
    backgroundColor: "#f2fbf4",
    padding: 10,
    gap: 10,
    shadowColor: "#0a0f0c",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2
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
  flowerWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d7e6da",
    backgroundColor: "#edf6f0",
    padding: 8,
    gap: 6,
    alignItems: "center"
  },
  flowerStage: {
    width: 256,
    height: 256,
    position: "relative"
  },
  flowerPetal: {
    position: "absolute",
    width: 100,
    minHeight: 68,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e1e8e2",
    backgroundColor: "#f8fff7",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 8
  },
  flowerPercent: {
    color: "#1f2a1f",
    fontWeight: "900",
    fontSize: 22
  },
  flowerName: {
    marginTop: 2,
    color: "#4f5f53",
    fontWeight: "700",
    fontSize: 13
  },
  centerImageRing: {
    position: "absolute",
    left: 128 - 40,
    top: 128 - 40,
    width: 80,
    height: 80,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: "#ffffff",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#101914",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3
  },
  centerImage: {
    width: 72,
    height: 72,
    borderRadius: 999
  },
  topStatsRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignSelf: "center"
  },
  topStatChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cce9d3",
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  topStatText: {
    color: "#2f4348",
    fontWeight: "800"
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d9e6ea",
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 10,
    shadowColor: "#0f1517",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1
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
  foodCard: {
    borderColor: "#d9e8da",
    backgroundColor: "#fbfdfb",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2
  },
  foodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  foodTitleWrap: {
    flex: 1,
    gap: 4
  },
  foodItemLabel: {
    color: "#5f6d72",
    fontWeight: "700",
    fontSize: 12
  },
  foodNameInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d7e5e9",
    backgroundColor: "#f8fbfc",
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#172328",
    fontWeight: "800",
    fontSize: 18
  },
  foodNameReadonly: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d7e5e9",
    backgroundColor: "#f8fbfc",
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center"
  },
  foodNameText: {
    color: "#172328",
    fontWeight: "800",
    fontSize: 18
  },
  suggestionWrap: {
    marginTop: 6
  },
  suggestionLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2
  },
  suggestionHelpText: {
    color: "#5f6d72",
    fontSize: 12,
    fontWeight: "700"
  },
  suggestionList: {
    borderWidth: 1,
    borderColor: "#d8e4e8",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    overflow: "hidden"
  },
  suggestionItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#edf2f4"
  },
  suggestionName: {
    color: "#152126",
    fontWeight: "800",
    fontSize: 13
  },
  suggestionMeta: {
    color: "#627379",
    fontWeight: "600",
    fontSize: 11,
    marginTop: 2
  },
  foodActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d8e4e8",
    backgroundColor: "#f6fafb",
    alignItems: "center",
    justifyContent: "center"
  },
  iconBtnActive: {
    borderColor: "#bfe4c7",
    backgroundColor: "#ecf9ef"
  },
  removeFoodBtn: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ffd7d7",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff1f1"
  },
  quickStats: {
    flexDirection: "row",
    gap: 8
  },
  quickStatCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d7e8dd",
    backgroundColor: "#f5faf6",
    padding: 10,
    gap: 6
  },
  quickStatHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  quickStatLabel: {
    color: "#2d4248",
    fontWeight: "800",
    fontSize: 12
  },
  quickStatInput: {
    borderWidth: 1,
    borderColor: "#d4e0e4",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: "#142125",
    fontWeight: "700"
  },
  calorieValue: {
    color: "#7c2d12",
    fontWeight: "900",
    fontSize: 20
  },
  macroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  macroTitle: {
    color: "#1a252a",
    fontWeight: "800",
    fontSize: 15
  },
  macroHint: {
    color: "#66767b",
    fontWeight: "700",
    fontSize: 12
  },
  macroGrid: {
    flexDirection: "row",
    gap: 8
  },
  macroTile: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dce8ec",
    backgroundColor: "#f7fafb",
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 88
  },
  macroTileIcon: {
    marginBottom: 4
  },
  macroTileProtein: {
    borderColor: "#bde6df",
    backgroundColor: "#effbf8"
  },
  macroTileCarb: {
    borderColor: "#f7d7b2",
    backgroundColor: "#fff8ee"
  },
  macroTileFat: {
    borderColor: "#ddd0f8",
    backgroundColor: "#f7f1ff"
  },
  macroTileLabel: {
    color: "#47585d",
    fontWeight: "800",
    marginBottom: 8
  },
  macroTileValue: {
    color: "#172328",
    fontWeight: "900",
    fontSize: 20
  },
  macroInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#cce0d5",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 7,
    textAlign: "center",
    color: "#142125",
    fontWeight: "800"
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderWidth: 1,
    borderColor: "#e1ebee",
    borderRadius: 12,
    backgroundColor: "#f8fbfc",
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
    borderColor: "#d4e0e4",
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

