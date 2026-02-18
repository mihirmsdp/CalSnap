import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "@/components/common/Screen";
import { ScanActionModal } from "@/components/logging/ScanActionModal";
import { useLogs } from "@/hooks/useLogs";
import { useAuth } from "@/hooks/useAuth";
import { emptyNutrition } from "@/utils/nutrition";
import { isSameDay } from "@/utils/date";
import { MealType } from "@/types/models";
import { MainStackParamList, MainTabParamList } from "@/types/navigation";

const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

const mealIcons: Record<MealType, keyof typeof Ionicons.glyphMap> = {
  breakfast: "sunny-outline",
  lunch: "restaurant-outline",
  snack: "cafe-outline",
  dinner: "moon-outline"
};

export const HomeScreen = (): React.JSX.Element => {
  const { logs } = useLogs();
  const { user } = useAuth();
  const route = useRoute<RouteProp<MainTabParamList, "Home">>();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [selectedDate, setSelectedDate] = React.useState<string>(new Date().toISOString());
  const [expandedMeal, setExpandedMeal] = React.useState<MealType | null>(null);
  const [scanModalVisible, setScanModalVisible] = React.useState(false);
  const [scanMealType, setScanMealType] = React.useState<MealType | undefined>(undefined);
  const [saveSuccessMessage, setSaveSuccessMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const incomingMessage = route.params?.saveSuccessMessage;
    if (incomingMessage) {
      setSaveSuccessMessage(incomingMessage);
    }
  }, [route.params]);

  const selectedDayLogs = useMemo(() => logs.filter((log) => isSameDay(log.date, selectedDate)), [logs, selectedDate]);

  const selectedNutrition = useMemo(() => {
    return selectedDayLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.totalNutrition.calories,
        protein: acc.protein + log.totalNutrition.protein,
        carbs: acc.carbs + log.totalNutrition.carbs,
        fat: acc.fat + log.totalNutrition.fat
      }),
      emptyNutrition()
    );
  }, [selectedDayLogs]);

  const dailyGoals = user?.dailyGoals || { calories: 2200, protein: 140, carbs: 250, fat: 70 };
  const caloriesLeft = dailyGoals.calories - selectedNutrition.calories;
  const caloriesCompleted = selectedNutrition.calories;
  const proteinLeft = dailyGoals.protein - selectedNutrition.protein;
  const carbsLeft = dailyGoals.carbs - selectedNutrition.carbs;
  const proteinCompleted = selectedNutrition.protein;
  const carbsCompleted = selectedNutrition.carbs;
  const overCalories = caloriesLeft < 0;
  const overProtein = proteinCompleted > dailyGoals.protein;
  const overCarbs = carbsCompleted > dailyGoals.carbs;
  const proteinProgress = clamp(selectedNutrition.protein / Math.max(dailyGoals.protein, 1));
  const carbsProgress = clamp(selectedNutrition.carbs / Math.max(dailyGoals.carbs, 1));

  const dayStrip = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }).map((_, index) => {
      const day = new Date(now);
      day.setHours(0, 0, 0, 0);
      day.setDate(now.getDate() - 6 + index);
      const isToday = isSameDay(day.toISOString(), now.toISOString());
      return {
        iso: day.toISOString(),
        label: day.toLocaleDateString(undefined, { weekday: "short" }),
        day: day.getDate(),
        isToday
      };
    });
  }, []);

  const mealCards = useMemo(() => {
    const order: Array<{ key: MealType; title: string }> = [
      { key: "breakfast", title: "Breakfast" },
      { key: "lunch", title: "Lunch" },
      { key: "snack", title: "Snacks" },
      { key: "dinner", title: "Dinner" }
    ];
    return order.map((meal) => {
      const entries = selectedDayLogs.filter((log) => log.mealType === meal.key);
      const calories = entries.reduce((sum, entry) => sum + entry.totalNutrition.calories, 0);
      const protein = entries.reduce((sum, entry) => sum + entry.totalNutrition.protein, 0);
      const carbs = entries.reduce((sum, entry) => sum + entry.totalNutrition.carbs, 0);
      const fat = entries.reduce((sum, entry) => sum + entry.totalNutrition.fat, 0);
      const photos = entries.map((entry) => entry.photoUrl).filter(Boolean).slice(0, 2) as string[];
      const foods = entries.flatMap((entry) => entry.foods.map((food) => food.name));
      return {
        ...meal,
        entries,
        calories,
        protein,
        carbs,
        fat,
        photos,
        foods
      };
    });
  }, [selectedDayLogs]);

  const openMealScanner = (mealType: MealType): void => {
    setScanMealType(mealType);
    setScanModalVisible(true);
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.hello}>Hello, {user?.name || "there"}</Text>
        <Text style={styles.sub}>Keep moving today</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.dayRow}>
          {dayStrip.map((day) => (
            <Pressable
              key={day.iso}
              onPress={() => {
                setSelectedDate(day.iso);
                setExpandedMeal(null);
              }}
              style={[styles.dayPill, isSameDay(day.iso, selectedDate) && styles.dayPillActive]}
            >
              <Text style={[styles.dayLabel, isSameDay(day.iso, selectedDate) && styles.dayLabelActive]}>{day.label}</Text>
              <Text style={[styles.dayNum, isSameDay(day.iso, selectedDate) && styles.dayLabelActive]}>{day.day}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.calorieRow}>
          <View style={styles.metricLabelRow}>
            <View style={[styles.metricIconWrap, { backgroundColor: "#e9f8ec" }]}>
              <Ionicons name="flame-outline" size={14} color="#2db348" />
            </View>
            <Text style={styles.leftText}>Calories left</Text>
          </View>
          <Text style={[styles.bigNumber, overCalories && styles.leftValueOver]}>{Math.round(caloriesLeft).toLocaleString()}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${clamp(selectedNutrition.calories / Math.max(dailyGoals.calories, 1)) * 100}%` }
            ]}
          />
        </View>
        <Text style={styles.completedText}>
          Calories consumed:{" "}
          <Text style={overCalories ? styles.completedValueOver : undefined}>{Math.round(caloriesCompleted)}</Text> /{" "}
          {Math.round(dailyGoals.calories)}
        </Text>
      </View>

      <View style={styles.splitRow}>
        <View style={styles.statCard}>
          <View style={styles.metricLabelRow}>
            <View style={[styles.metricIconWrap, { backgroundColor: "#e9f8ec" }]}>
              <Ionicons name="barbell-outline" size={14} color="#2db348" />
            </View>
            <Text style={styles.statTitle}>Protein left</Text>
          </View>
          <View style={styles.valueUnitRow}>
            <Text style={[styles.statValue, styles.centeredValue, proteinLeft < 0 && styles.leftValueOver]}>
              {Math.round(proteinLeft).toLocaleString()}
            </Text>
            <Text style={styles.statUnitInline}>g</Text>
          </View>
          <Text style={styles.completedText}>
            Completed:{" "}
            <Text style={overProtein ? styles.completedValueOver : undefined}>{Math.round(proteinCompleted)}</Text> /{" "}
            {Math.round(dailyGoals.protein)} g
          </Text>
          <View style={styles.miniTrack}>
            <View style={[styles.miniFill, { width: `${proteinProgress * 100}%` }]} />
          </View>
        </View>
        <View style={styles.statCard}>
          <View style={styles.metricLabelRow}>
            <View style={[styles.metricIconWrap, { backgroundColor: "#fff2e8" }]}>
              <Ionicons name="nutrition-outline" size={14} color="#ff6a00" />
            </View>
            <Text style={styles.statTitle}>Carbs left</Text>
          </View>
          <View style={styles.valueUnitRow}>
            <Text style={[styles.statValue, styles.centeredValue, carbsLeft < 0 && styles.leftValueOver]}>
              {Math.round(carbsLeft).toLocaleString()}
            </Text>
            <Text style={styles.statUnitInline}>g</Text>
          </View>
          <Text style={styles.completedText}>
            Completed: <Text style={overCarbs ? styles.completedValueOver : undefined}>{Math.round(carbsCompleted)}</Text>{" "}
            / {Math.round(dailyGoals.carbs)} g
          </Text>
          <View style={styles.miniTrack}>
            <View style={[styles.miniFillCarb, { width: `${carbsProgress * 100}%` }]} />
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Meals</Text>
        {mealCards.map((meal) => {
          const isExpanded = expandedMeal === meal.key;
          return (
            <View key={meal.key} style={styles.mealWrap}>
              <Pressable
                style={styles.mealCard}
                onPress={() => setExpandedMeal((prev) => (prev === meal.key ? null : meal.key))}
              >
                <View style={styles.mealLeft}>
                  <View style={styles.mealIconBubble}>
                    <Ionicons name={mealIcons[meal.key]} size={16} color="#2ba642" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mealTitle}>{meal.title}</Text>
                    {meal.entries.length > 0 ? (
                      <Text style={styles.mealCalories}>{Math.round(meal.calories)} kcal</Text>
                    ) : (
                      <Text style={styles.mealEmpty}>No meal logged yet</Text>
                    )}
                  </View>
                </View>

                <View style={styles.mealRight}>
                  {meal.photos.map((uri, index) => (
                    <Image key={`${meal.key}_${index}`} source={{ uri }} style={styles.mealPhoto} />
                  ))}
                  <Pressable
                    style={styles.plusPill}
                    onPress={(event) => {
                      event.stopPropagation();
                      setExpandedMeal((prev) => (prev === meal.key ? null : meal.key));
                    }}
                  >
                    <Text style={styles.plusText}>{isExpanded ? "-" : "+"}</Text>
                  </Pressable>
                </View>
              </Pressable>

              {isExpanded && meal.entries.length > 0 ? (
                <View style={styles.mealExpanded}>
                  {meal.entries.map((entry) => (
                    <View key={entry.id} style={styles.entryCard}>
                      <View style={styles.entryTop}>
                        <View style={styles.entryMeta}>
                          {entry.photoUrl ? <Image source={{ uri: entry.photoUrl }} style={styles.entryPhoto} /> : null}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.expandText}>{Math.round(entry.totalNutrition.calories)} kcal</Text>
                            <Text style={styles.expandFoods}>{entry.foods.map((food) => food.name).join(", ")}</Text>
                          </View>
                        </View>
                        <Pressable
                          style={styles.editBtn}
                          onPress={() => navigation.navigate("EditFoodLog", { mode: "edit", existingLog: entry })}
                        >
                          <Ionicons name="create-outline" size={14} color="#136f24" />
                          <Text style={styles.editBtnText}>Edit</Text>
                        </Pressable>
                      </View>
                      <View style={styles.entryMacros}>
                        <Text style={styles.entryMacroText}>P {Math.round(entry.totalNutrition.protein)}g</Text>
                        <Text style={styles.entryMacroText}>C {Math.round(entry.totalNutrition.carbs)}g</Text>
                        <Text style={styles.entryMacroText}>F {Math.round(entry.totalNutrition.fat)}g</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {isExpanded && meal.entries.length === 0 ? (
                <View style={styles.mealExpanded}>
                  <Text style={styles.emptyHint}>Add a food photo to start tracking this meal.</Text>
                  <Pressable style={styles.logFoodBtn} onPress={() => openMealScanner(meal.key)}>
                    <Ionicons name="scan" size={18} color="#fff" />
                    <Text style={styles.logFoodText}>Log Food</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <ScanActionModal
        visible={scanModalVisible}
        preselectedMealType={scanMealType}
        onClose={() => {
          setScanModalVisible(false);
          setScanMealType(undefined);
        }}
      />

      {saveSuccessMessage ? (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark" size={18} color="#ffffff" />
            </View>
            <Text style={styles.successTitle}>Saved</Text>
            <Text style={styles.successText}>{saveSuccessMessage}</Text>
            <Pressable style={styles.successBtn} onPress={() => setSaveSuccessMessage(null)}>
              <Text style={styles.successBtnText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  hero: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: "#bfe8be"
  },
  hello: {
    fontSize: 30,
    fontWeight: "800",
    color: "#17221b"
  },
  sub: {
    marginTop: 4,
    color: "#41604a",
    fontWeight: "600"
  },
  card: {
    borderRadius: 22,
    backgroundColor: "#f7f8f8",
    padding: 14,
    borderWidth: 1,
    borderColor: "#ebeeee",
    gap: 10
  },
  successOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(10,20,16,0.32)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20
  },
  successCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#d6eadb",
    backgroundColor: "#f6fff8",
    padding: 18,
    alignItems: "center",
    gap: 8
  },
  successIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#1f8f36",
    alignItems: "center",
    justifyContent: "center"
  },
  successTitle: {
    color: "#173223",
    fontWeight: "900",
    fontSize: 20
  },
  successText: {
    color: "#3f5c4a",
    textAlign: "center",
    fontWeight: "700"
  },
  successBtn: {
    marginTop: 6,
    minWidth: 130,
    borderRadius: 999,
    backgroundColor: "#2eb14b",
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: "center"
  },
  successBtnText: {
    color: "#ffffff",
    fontWeight: "900"
  },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  dayPill: {
    width: 42,
    height: 68,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e6e9ea",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f2f4f5"
  },
  dayPillActive: {
    borderColor: "#52de6d",
    backgroundColor: "#e9fceb"
  },
  dayLabel: {
    fontSize: 11,
    color: "#98a1a4",
    fontWeight: "700"
  },
  dayNum: {
    marginTop: 6,
    fontSize: 13,
    color: "#707a7e",
    fontWeight: "700"
  },
  dayLabelActive: {
    color: "#29aa45"
  },
  calorieRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  metricLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  metricIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center"
  },
  leftText: {
    color: "#737d81",
    fontWeight: "700"
  },
  bigNumber: {
    fontSize: 34,
    color: "#182226",
    fontWeight: "900"
  },
  progressTrack: {
    height: 16,
    borderRadius: 999,
    backgroundColor: "#e2e7e8",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#52de6d"
  },
  splitRow: {
    flexDirection: "row",
    gap: 10
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#f7f8f8",
    borderWidth: 1,
    borderColor: "#ebeeee",
    padding: 12
  },
  statTitle: {
    color: "#7b8488",
    fontWeight: "700"
  },
  statValue: {
    marginTop: 10,
    fontSize: 34,
    fontWeight: "900",
    color: "#172226"
  },
  valueUnitRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4
  },
  centeredValue: {
    textAlign: "center",
    marginTop: 0
  },
  statUnitInline: {
    color: "#7b8488",
    fontWeight: "700",
    fontSize: 15,
    paddingBottom: 6
  },
  completedText: {
    marginTop: 2,
    color: "#5f6d72",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center"
  },
  completedValueOver: {
    color: "#ef4444"
  },
  leftValueOver: {
    color: "#ef4444"
  },
  miniTrack: {
    marginTop: 6,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#dfe8e2",
    overflow: "hidden",
    width: "100%"
  },
  miniFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#37bf57"
  },
  miniFillCarb: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#ff7a1a"
  },
  sectionTitle: {
    color: "#6f777b",
    fontWeight: "700"
  },
  mealWrap: {
    gap: 6
  },
  mealCard: {
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#edf0f2",
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  mealLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10
  },
  mealIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e8f8ea",
    alignItems: "center",
    justifyContent: "center"
  },
  mealTitle: {
    color: "#182126",
    fontWeight: "800",
    fontSize: 18
  },
  mealCalories: {
    marginTop: 4,
    color: "#6d767a",
    fontWeight: "700"
  },
  mealEmpty: {
    marginTop: 4,
    color: "#98a1a4",
    fontWeight: "600"
  },
  mealRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  mealPhoto: {
    width: 36,
    height: 36,
    borderRadius: 18
  },
  plusPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f0f4f5",
    alignItems: "center",
    justifyContent: "center"
  },
  plusText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#172126",
    marginTop: -1
  },
  mealExpanded: {
    borderRadius: 12,
    backgroundColor: "#eef3f4",
    padding: 10,
    gap: 6
  },
  expandText: {
    color: "#586266",
    fontWeight: "700"
  },
  expandFoods: {
    color: "#707a7e",
    marginTop: 4
  },
  entryCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#dde6e8",
    backgroundColor: "#f8fbfc",
    padding: 8,
    gap: 6
  },
  entryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8
  },
  entryMeta: {
    flexDirection: "row",
    gap: 8,
    flex: 1
  },
  entryPhoto: {
    width: 34,
    height: 34,
    borderRadius: 8
  },
  entryMacros: {
    flexDirection: "row",
    gap: 10
  },
  entryMacroText: {
    color: "#607074",
    fontWeight: "700",
    fontSize: 12
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e2f6e6"
  },
  editBtnText: {
    color: "#136f24",
    fontWeight: "800",
    fontSize: 12
  },
  emptyHint: {
    color: "#667377",
    fontWeight: "600"
  },
  logFoodBtn: {
    marginTop: 4,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#28b344",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14
  },
  logFoodText: {
    color: "#fff",
    fontWeight: "800"
  }
});
