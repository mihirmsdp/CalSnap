import React, { useMemo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "@/components/common/Screen";
import { ScanActionModal } from "@/components/logging/ScanActionModal";
import { useLogs } from "@/hooks/useLogs";
import { useAuth } from "@/hooks/useAuth";
import { emptyNutrition } from "@/utils/nutrition";
import { isSameDay } from "@/utils/date";
import { MealType } from "@/types/models";
import { MainStackParamList } from "@/types/navigation";

const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

const RingMeter = ({ progress, color }: { progress: number; color: string }): React.JSX.Element => {
  const size = 56;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamp(progress));
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#e8ebeb" strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
};

const mealIcons: Record<MealType, keyof typeof Ionicons.glyphMap> = {
  breakfast: "sunny-outline",
  lunch: "restaurant-outline",
  snack: "cafe-outline",
  dinner: "moon-outline"
};

export const HomeScreen = (): React.JSX.Element => {
  const { logs } = useLogs();
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [expandedMeal, setExpandedMeal] = React.useState<MealType | null>(null);
  const [scanModalVisible, setScanModalVisible] = React.useState(false);
  const [scanMealType, setScanMealType] = React.useState<MealType | undefined>(undefined);

  const todayNutrition = useMemo(() => {
    const todayIso = new Date().toISOString();
    const todayLogs = logs.filter((log) => isSameDay(log.date, todayIso));
    return todayLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.totalNutrition.calories,
        protein: acc.protein + log.totalNutrition.protein,
        carbs: acc.carbs + log.totalNutrition.carbs,
        fat: acc.fat + log.totalNutrition.fat
      }),
      emptyNutrition()
    );
  }, [logs]);

  const dailyGoals = user?.dailyGoals || { calories: 2200, protein: 140, carbs: 250, fat: 70 };
  const caloriesLeft = Math.max(0, dailyGoals.calories - todayNutrition.calories);
  const proteinLeft = Math.max(0, dailyGoals.protein - todayNutrition.protein);
  const carbsLeft = Math.max(0, dailyGoals.carbs - todayNutrition.carbs);

  const dayStrip = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }).map((_, index) => {
      const day = new Date(now);
      day.setDate(now.getDate() - 2 + index);
      const isToday = isSameDay(day.toISOString(), now.toISOString());
      return {
        label: day.toLocaleDateString(undefined, { weekday: "short" }),
        day: day.getDate(),
        isToday
      };
    });
  }, []);

  const todayIso = new Date().toISOString();
  const todayLogs = useMemo(() => logs.filter((log) => isSameDay(log.date, todayIso)), [logs, todayIso]);

  const mealCards = useMemo(() => {
    const order: Array<{ key: MealType; title: string }> = [
      { key: "breakfast", title: "Breakfast" },
      { key: "lunch", title: "Lunch" },
      { key: "snack", title: "Snacks" },
      { key: "dinner", title: "Dinner" }
    ];
    return order.map((meal) => {
      const entries = todayLogs.filter((log) => log.mealType === meal.key);
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
  }, [todayLogs]);

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
            <View key={`${day.label}_${day.day}`} style={[styles.dayPill, day.isToday && styles.dayPillActive]}>
              <Text style={[styles.dayLabel, day.isToday && styles.dayLabelActive]}>{day.label}</Text>
              <Text style={[styles.dayNum, day.isToday && styles.dayLabelActive]}>{day.day}</Text>
            </View>
          ))}
        </View>

        <View style={styles.calorieRow}>
          <Text style={styles.leftText}>Calories left</Text>
          <Text style={styles.bigNumber}>{Math.round(caloriesLeft).toLocaleString()}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${clamp(todayNutrition.calories / Math.max(dailyGoals.calories, 1)) * 100}%` }
            ]}
          />
        </View>
      </View>

      <View style={styles.splitRow}>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Protein left</Text>
          <Text style={styles.statValue}>{Math.round(proteinLeft).toLocaleString()}</Text>
          <Text style={styles.statUnit}>g</Text>
          <View style={styles.ringWrap}>
            <RingMeter progress={todayNutrition.protein / Math.max(dailyGoals.protein, 1)} color="#52de6d" />
          </View>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Carbs left</Text>
          <Text style={styles.statValue}>{Math.round(carbsLeft).toLocaleString()}</Text>
          <Text style={styles.statUnit}>g</Text>
          <View style={styles.ringWrap}>
            <RingMeter progress={todayNutrition.carbs / Math.max(dailyGoals.carbs, 1)} color="#ff6a00" />
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
  statUnit: {
    color: "#7b8488",
    fontWeight: "700"
  },
  ringWrap: {
    marginTop: -46,
    alignItems: "flex-end"
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
