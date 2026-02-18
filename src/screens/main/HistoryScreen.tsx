import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { Screen } from "@/components/common/Screen";
import { useLogs } from "@/hooks/useLogs";
import { useAuth } from "@/hooks/useAuth";
import { AchievementProgress, MealType, WeightEntry } from "@/types/models";

const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

type PeriodKey = "today" | "week" | "last15" | "month" | "all";

const periodOptions: Array<{ key: PeriodKey; label: string; days: number | null }> = [
  { key: "today", label: "Today", days: 1 },
  { key: "week", label: "This Week", days: 7 },
  { key: "last15", label: "Last 15 Days", days: 15 },
  { key: "month", label: "This Month", days: 30 },
  { key: "all", label: "All Time", days: null }
];

const getDayKey = (iso: string): string => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfDay = (date: Date): Date => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const rangeStart = (now: Date, period: PeriodKey): Date | null => {
  const todayStart = startOfDay(now);
  switch (period) {
    case "today":
      return todayStart;
    case "week":
      return addDays(todayStart, -6);
    case "last15":
      return addDays(todayStart, -14);
    case "month":
      return addDays(todayStart, -29);
    case "all":
    default:
      return null;
  }
};

const ProgressBar = ({ value, color = "#3ec25b" }: { value: number; color?: string }): React.JSX.Element => (
  <View style={styles.progressTrack}>
    <View style={[styles.progressFill, { width: `${clamp(value) * 100}%`, backgroundColor: color }]} />
  </View>
);

const SectionHeader = ({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }): React.JSX.Element => (
  <View style={styles.sectionHeader}>
    <Ionicons name={icon} size={18} color="#1e9f3c" />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const WeightLineChart = ({
  values,
  width,
  height = 108
}: {
  values: number[];
  width: number;
  height?: number;
}): React.JSX.Element => {
  if (!values.length) {
    return (
      <View style={[styles.weightChartRow, styles.weightChartEmpty]}>
        <Text style={styles.subText}>No weight entries yet.</Text>
      </View>
    );
  }

  const chartPaddingX = 10;
  const chartPaddingY = 10;
  const innerWidth = Math.max(1, width - chartPaddingX * 2);
  const innerHeight = Math.max(1, height - chartPaddingY * 2);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = Math.max(0.01, maxValue - minValue);

  const getPoint = (value: number, index: number, total: number): { x: number; y: number } => {
    const ratioX = total <= 1 ? 0.5 : index / (total - 1);
    const x = chartPaddingX + ratioX * innerWidth;
    const y = chartPaddingY + (1 - (value - minValue) / range) * innerHeight;
    return { x, y };
  };

  const linePoints =
    values.length === 1
      ? (() => {
          const single = getPoint(values[0], 0, 1);
          return `${chartPaddingX},${single.y} ${chartPaddingX + innerWidth},${single.y}`;
        })()
      : values
          .map((value, index) => {
            const point = getPoint(value, index, values.length);
            return `${point.x},${point.y}`;
          })
          .join(" ");

  return (
    <View style={styles.weightChartRow}>
      <Svg width={width} height={height}>
        <Line x1={chartPaddingX} y1={chartPaddingY} x2={chartPaddingX + innerWidth} y2={chartPaddingY} stroke="#e2ebea" strokeWidth={1} />
        <Line
          x1={chartPaddingX}
          y1={chartPaddingY + innerHeight / 2}
          x2={chartPaddingX + innerWidth}
          y2={chartPaddingY + innerHeight / 2}
          stroke="#e2ebea"
          strokeWidth={1}
        />
        <Line
          x1={chartPaddingX}
          y1={chartPaddingY + innerHeight}
          x2={chartPaddingX + innerWidth}
          y2={chartPaddingY + innerHeight}
          stroke="#e2ebea"
          strokeWidth={1}
        />

        <Polyline points={linePoints} fill="none" stroke="#2eb14b" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />

        {values.map((value, index) => {
          const point = getPoint(value, index, values.length);
          return <Circle key={`dot_${index}`} cx={point.x} cy={point.y} r={4.5} fill="#ffffff" stroke="#2eb14b" strokeWidth={2} />;
        })}
      </Svg>
    </View>
  );
};
const parseWeight = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toTitleCase = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const HistoryScreen = (): React.JSX.Element => {
  const { user, updateProfile } = useAuth();
  const { logs, weightEntries, saveWeightEntry } = useLogs();
  const { width: screenWidth } = useWindowDimensions();

  const [period, setPeriod] = useState<PeriodKey>("week");
  const [weightInput, setWeightInput] = useState("");
  const [targetWeightInput, setTargetWeightInput] = useState("");
  const [targetEditOpen, setTargetEditOpen] = useState(false);
  const [expandedStats, setExpandedStats] = useState<Record<string, boolean>>({
    calories: true,
    macros: true,
    timing: false,
    foods: false
  });

  const selectedPeriod = periodOptions.find((item) => item.key === period) || periodOptions[1];
  const now = new Date();
  const start = rangeStart(now, period);
  const isTodayView = period === "today";

  const filteredLogs = useMemo(() => {
    if (!start) return logs;
    return logs.filter((log) => {
      const d = new Date(log.date);
      return d >= start && d <= now;
    });
  }, [logs, now, start]);

  const filteredWeightEntries = useMemo(() => {
    if (!start) return weightEntries;
    return weightEntries.filter((entry) => {
      const d = new Date(entry.date);
      return d >= start && d <= now;
    });
  }, [weightEntries, now, start]);

  const daysInRange = selectedPeriod.days || Math.max(1, new Set(logs.map((log) => getDayKey(log.date))).size);
  const uniqueDays = useMemo(() => new Set(filteredLogs.map((log) => getDayKey(log.date))), [filteredLogs]);
  const uniqueAllDays = useMemo(() => new Set(logs.map((log) => getDayKey(log.date))), [logs]);

  const totals = useMemo(
    () =>
      filteredLogs.reduce(
        (acc, log) => ({
          calories: acc.calories + log.totalNutrition.calories,
          protein: acc.protein + log.totalNutrition.protein,
          carbs: acc.carbs + log.totalNutrition.carbs,
          fat: acc.fat + log.totalNutrition.fat
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [filteredLogs]
  );

  const avg = {
    calories: totals.calories / Math.max(1, uniqueDays.size),
    protein: totals.protein / Math.max(1, uniqueDays.size),
    carbs: totals.carbs / Math.max(1, uniqueDays.size),
    fat: totals.fat / Math.max(1, uniqueDays.size)
  };

  const shownNutrition = isTodayView ? totals : avg;

  const logRate = Math.round((uniqueDays.size / Math.max(1, daysInRange)) * 100);

  const streak = useMemo(() => {
    const dayKeys = Array.from(uniqueAllDays).sort();
    let current = 0;
    const cursor = new Date();
    while (dayKeys.includes(getDayKey(cursor.toISOString()))) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    let best = 0;
    let run = 0;
    let prevDate: Date | null = null;

    dayKeys.forEach((key) => {
      const currentDate = new Date(`${key}T00:00:00`);
      if (!prevDate) {
        run = 1;
      } else {
        const diffDays = Math.round((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        run = diffDays === 1 ? run + 1 : 1;
      }
      prevDate = currentDate;
      best = Math.max(best, run);
    });

    return { current, best };
  }, [uniqueAllDays]);

  const sortedWeightsAsc = [...weightEntries].sort((a, b) => (a.date > b.date ? 1 : -1));
  const sortedWeightsPeriodAsc = [...filteredWeightEntries].sort((a, b) => (a.date > b.date ? 1 : -1));

  const onboardingStartWeight = user?.onboardingData?.weightKg ?? user?.weight;
  const fallbackStartWeight = onboardingStartWeight ?? 75;
  const targetWeight = user?.onboardingData?.targetWeightKg || fallbackStartWeight;

  // Keep "starting weight" anchored to onboarding value when present.
  const startWeight = onboardingStartWeight ?? sortedWeightsAsc[0]?.weightKg ?? fallbackStartWeight;
  const currentWeight = sortedWeightsAsc[sortedWeightsAsc.length - 1]?.weightKg ?? fallbackStartWeight;
  const weightChange = currentWeight - startWeight;
  const remainingWeight = Math.abs(targetWeight - currentWeight);
  const goalDiff = Math.abs(targetWeight - startWeight);
  const goalProgress = goalDiff === 0 ? 0 : Math.abs(weightChange) / goalDiff;

  const chartSource: WeightEntry[] = sortedWeightsPeriodAsc.length ? sortedWeightsPeriodAsc : sortedWeightsAsc.slice(-7);
  const weightSeries = chartSource.slice(-7).map((entry) => entry.weightKg);
  const weightChartWidth = Math.max(220, Math.min(screenWidth - 76, 420));

  const projectedDate = useMemo(() => {
    if (sortedWeightsAsc.length < 2 || targetWeight === currentWeight) {
      return null;
    }

    const first = sortedWeightsAsc[0];
    const last = sortedWeightsAsc[sortedWeightsAsc.length - 1];
    const days = Math.max(1, (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24));
    const trendKgPerDay = (last.weightKg - first.weightKg) / days;

    if (Math.abs(trendKgPerDay) < 0.001) return null;

    const needed = targetWeight - currentWeight;
    const directionMatches = needed > 0 ? trendKgPerDay > 0 : trendKgPerDay < 0;
    if (!directionMatches) return null;

    const daysToGoal = Math.ceil(Math.abs(needed / trendKgPerDay));
    return addDays(now, daysToGoal).toLocaleDateString();
  }, [sortedWeightsAsc, targetWeight, currentWeight, now]);

  const dayRangeForBars = Array.from({ length: 7 }).map((_, index) => {
    const day = addDays(startOfDay(now), -6 + index);
    const key = getDayKey(day.toISOString());
    const dayTotal = logs
      .filter((log) => getDayKey(log.date) === key)
      .reduce((sum, log) => sum + log.totalNutrition.calories, 0);
    return { label: day.toLocaleDateString(undefined, { weekday: "short" }).charAt(0), value: dayTotal, index };
  });

  const dailyGoals = user?.dailyGoals || { calories: 2000, protein: 150, carbs: 200, fat: 67 };
  const maxDailyCals = Math.max(dailyGoals.calories, ...dayRangeForBars.map((item) => item.value));

  const macroTotal = shownNutrition.protein + shownNutrition.carbs + shownNutrition.fat;
  const macroPercents = {
    protein: macroTotal ? Math.round((shownNutrition.protein / macroTotal) * 100) : 0,
    carbs: macroTotal ? Math.round((shownNutrition.carbs / macroTotal) * 100) : 0,
    fat: macroTotal ? Math.round((shownNutrition.fat / macroTotal) * 100) : 0
  };

  const allFoodNames = filteredLogs.flatMap((log) => log.foods.map((food) => food.name.trim())).filter(Boolean);
  const topFoodEntries = Object.entries(
    allFoodNames.reduce<Record<string, number>>((acc, name) => {
      const key = name.toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const mealTimeAverages: Array<{ meal: MealType; label: string }> =
    (["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((meal) => {
      const mealLogs = filteredLogs.filter((log) => log.mealType === meal);
      if (!mealLogs.length) return { meal, label: "-" };
      const avgMinutes =
        mealLogs.reduce((sum, log) => {
          const d = new Date(log.date);
          return sum + d.getHours() * 60 + d.getMinutes();
        }, 0) / mealLogs.length;
      const hours = Math.floor(avgMinutes / 60);
      const minutes = Math.round(avgMinutes % 60)
        .toString()
        .padStart(2, "0");
      const suffix = hours >= 12 ? "PM" : "AM";
      const hr12 = ((hours + 11) % 12) + 1;
      return { meal, label: `${hr12}:${minutes} ${suffix}` };
    });

  const achievements: AchievementProgress[] = [
    { type: "streak_7", title: "7-Day Streak", target: 7, current: streak.best, unlocked: streak.best >= 7 },
    { type: "streak_30", title: "30-Day Streak", target: 30, current: streak.best, unlocked: streak.best >= 30 },
    { type: "logs_100", title: "100 Food Logs", target: 100, current: logs.length, unlocked: logs.length >= 100 },
    {
      type: "weight_goal",
      title: "Weight Goal",
      target: goalDiff || 1,
      current: Math.abs(weightChange),
      unlocked: goalDiff > 0 && Math.abs(weightChange) >= goalDiff
    }
  ];

  const nextBadge = achievements.find((item) => !item.unlocked) || achievements[0];

  const insights = [
    `${isTodayView ? "Today" : `In ${selectedPeriod.label.toLowerCase()}`}: ${Math.round(shownNutrition.calories)} calories.`,
    shownNutrition.protein >= dailyGoals.protein
      ? "Protein target is on track."
      : `Need ${Math.max(0, Math.round(dailyGoals.protein - shownNutrition.protein))}g more protein.`,
    `Current streak: ${streak.current} days.`
  ];

  const toggleDetail = (key: string): void => {
    setExpandedStats((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const onSaveWeight = async (): Promise<void> => {
    if (!user) return;
    const weightKg = parseWeight(weightInput);
    if (weightKg < 30 || weightKg > 300) {
      Alert.alert("Invalid Weight", "Enter a value between 30 and 300 kg.");
      return;
    }

    try {
      await saveWeightEntry({
        id: `weight_${Date.now()}`,
        userId: user.id,
        date: new Date().toISOString(),
        weightKg,
        source: "manual"
      });
      setWeightInput("");
      Alert.alert("Saved", "Weight entry added.");
    } catch (error) {
      Alert.alert("Save Failed", (error as Error).message || "Could not save weight entry.");
    }
  };

  const onSaveTargetWeight = async (): Promise<void> => {
    if (!user || !user.onboardingData) {
      Alert.alert("Not available", "Complete onboarding first to set a target weight.");
      return;
    }
    const nextTarget = parseWeight(targetWeightInput);
    if (nextTarget < 30 || nextTarget > 300) {
      Alert.alert("Invalid Target", "Enter a target weight between 30 and 300 kg.");
      return;
    }

    try {
      await updateProfile({
        onboardingData: {
          ...user.onboardingData,
          targetWeightKg: nextTarget
        }
      });
      setTargetWeightInput("");
      setTargetEditOpen(false);
      Alert.alert("Saved", "Target weight updated.");
    } catch (error) {
      Alert.alert("Save Failed", (error as Error).message || "Could not update target weight.");
    }
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Progress</Text>
        <Pressable
          style={styles.periodBtn}
          onPress={() => {
            const index = periodOptions.findIndex((item) => item.key === period);
            const next = periodOptions[(index + 1) % periodOptions.length];
            setPeriod(next.key);
          }}
        >
          <Text style={styles.periodText}>{selectedPeriod.label}</Text>
          <Ionicons name="chevron-down" size={14} color="#4f5d62" />
        </Pressable>
      </View>

      <View style={styles.card}>
        <SectionHeader icon="stats-chart-outline" title="Weight Tracking" />
        <View style={styles.metricRow}>
          <Text style={styles.metricText}>Current: {currentWeight.toFixed(1)} kg</Text>
          <Text style={styles.metricText}>Starting: {startWeight.toFixed(1)} kg</Text>
        </View>
        <Text style={[styles.metricText, { color: weightChange <= 0 ? "#1a9f3a" : "#d6503f" }]}>
          Change: {weightChange >= 0 ? "+" : ""}
          {weightChange.toFixed(1)} kg
        </Text>

        <WeightLineChart values={weightSeries} width={weightChartWidth} />

        <View style={styles.inlineRow}>
          <Text style={styles.subText}>Target: {targetWeight.toFixed(1)} kg</Text>
          <Pressable
            style={styles.targetEditBtn}
            onPress={() => {
              setTargetEditOpen((prev) => !prev);
              setTargetWeightInput(String(Math.round(targetWeight * 10) / 10));
            }}
          >
            <Ionicons name="create-outline" size={14} color="#1e9f3c" />
          </Pressable>
        </View>
        {targetEditOpen ? (
          <View style={styles.inlineRow}>
            <TextInput
              value={targetWeightInput}
              onChangeText={setTargetWeightInput}
              keyboardType="numeric"
              placeholder="Update target (kg)"
              style={styles.weightInput}
            />
            <Pressable style={styles.secondaryBtn} onPress={() => void onSaveTargetWeight()}>
              <Ionicons name="save-outline" size={16} color="#1e9f3c" />
              <Text style={styles.secondaryBtnText}>Update</Text>
            </Pressable>
          </View>
        ) : null}
        <Text style={styles.subText}>Projected: {projectedDate || "Need more entries"}</Text>

        <View style={styles.inlineRow}>
          <TextInput
            value={weightInput}
            onChangeText={setWeightInput}
            keyboardType="numeric"
            placeholder="Add weight (kg)"
            style={styles.weightInput}
          />
          <Pressable style={styles.secondaryBtn} onPress={() => void onSaveWeight()}>
            <Ionicons name="add" size={18} color="#1e9f3c" />
            <Text style={styles.secondaryBtnText}>Save</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <SectionHeader icon="flame-outline" title="Streak & Consistency" />
        <View style={styles.gridTwo}>
          <View style={styles.metricCard}>
            <Text style={styles.metricBig}>{streak.current}</Text>
            <Text style={styles.metricLabel}>Day Streak</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricBig}>{logRate}%</Text>
            <Text style={styles.metricLabel}>Logging Rate</Text>
          </View>
        </View>
        <View style={styles.heatmapGrid}>
          {Array.from({ length: 28 }).map((_, index) => {
            const day = addDays(now, -27 + index);
            const key = getDayKey(day.toISOString());
            const active = uniqueAllDays.has(key);
            return <View key={`${key}_${index}`} style={[styles.heatCell, active && styles.heatCellActive]} />;
          })}
        </View>
      </View>

      <View style={styles.card}>
        <SectionHeader icon="bar-chart-outline" title={`Nutrition Trends (${selectedPeriod.label})`} />
        <Text style={styles.rowLabel}>{isTodayView ? "Calories" : "Avg Calories"} {Math.round(shownNutrition.calories)} / {dailyGoals.calories}</Text>
        <ProgressBar value={shownNutrition.calories / dailyGoals.calories} />
        <Text style={styles.rowLabel}>{isTodayView ? "Protein" : "Avg Protein"} {Math.round(shownNutrition.protein)}g / {dailyGoals.protein}g</Text>
        <ProgressBar value={shownNutrition.protein / dailyGoals.protein} color="#3bb95b" />
        <Text style={styles.rowLabel}>{isTodayView ? "Carbs" : "Avg Carbs"} {Math.round(shownNutrition.carbs)}g / {dailyGoals.carbs}g</Text>
        <ProgressBar value={shownNutrition.carbs / dailyGoals.carbs} color={shownNutrition.carbs > dailyGoals.carbs ? "#f25f45" : "#3bb95b"} />
        <Text style={styles.rowLabel}>{isTodayView ? "Fat" : "Avg Fat"} {Math.round(shownNutrition.fat)}g / {dailyGoals.fat}g</Text>
        <ProgressBar value={shownNutrition.fat / dailyGoals.fat} color="#3bb95b" />

        <Text style={styles.subHeader}>Daily Calorie Trend</Text>
        <View style={styles.barRow}>
          {dayRangeForBars.map((bar) => (
            <View key={`${bar.label}_${bar.index}`} style={styles.barCol}>
              <View style={[styles.barValue, { height: 12 + clamp(bar.value / Math.max(maxDailyCals, 1)) * 48 }]} />
              <Text style={styles.barLabel}>{bar.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.subHeader}>Macro Distribution</Text>
        <View style={styles.macroLegend}>
          <Text style={styles.legendText}>Protein {macroPercents.protein}%</Text>
          <Text style={styles.legendText}>Carbs {macroPercents.carbs}%</Text>
          <Text style={styles.legendText}>Fat {macroPercents.fat}%</Text>
        </View>
      </View>

      <View style={styles.card}>
        <SectionHeader icon="flag-outline" title="Goal Progress" />
        <Text style={styles.metricText}>Starting: {startWeight.toFixed(1)} kg</Text>
        <Text style={styles.metricText}>Current: {currentWeight.toFixed(1)} kg</Text>
        <Text style={styles.metricText}>Target: {targetWeight.toFixed(1)} kg</Text>
        <ProgressBar value={goalProgress} color="#36bf56" />
        <Text style={styles.subText}>{Math.abs(weightChange).toFixed(1)} kg moved • {remainingWeight.toFixed(1)} kg to go</Text>
      </View>

      <View style={styles.card}>
        <SectionHeader icon="bulb-outline" title="Insights & Tips" />
        {insights.map((insight, index) => (
          <View key={`insight_${index}`} style={styles.insightCard}>
            <Ionicons name="sparkles-outline" size={16} color="#1f9f3d" />
            <Text style={styles.insightBody}>{insight}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <SectionHeader icon="list-outline" title="Detailed Stats" />

        <Pressable style={styles.expandRow} onPress={() => toggleDetail("calories")}>
          <Text style={styles.expandTitle}>Calories</Text>
          <Ionicons name={expandedStats.calories ? "chevron-up" : "chevron-down"} size={18} color="#5a686d" />
        </Pressable>
        {expandedStats.calories ? (
          <View style={styles.expandBody}>
            {isTodayView ? (
              <>
                <Text style={styles.subText}>Today total: {Math.round(totals.calories)} cal</Text>
                <Text style={styles.subText}>Entries: {filteredLogs.length}</Text>
              </>
            ) : (
              <>
                <Text style={styles.subText}>Avg daily calories: {Math.round(avg.calories)} cal</Text>
                <Text style={styles.subText}>Total period calories: {Math.round(totals.calories)} cal</Text>
              </>
            )}
          </View>
        ) : null}

        <Pressable style={styles.expandRow} onPress={() => toggleDetail("macros")}>
          <Text style={styles.expandTitle}>Macronutrients</Text>
          <Ionicons name={expandedStats.macros ? "chevron-up" : "chevron-down"} size={18} color="#5a686d" />
        </Pressable>
        {expandedStats.macros ? (
          <View style={styles.expandBody}>
            <Text style={styles.subText}>{isTodayView ? "Protein" : "Avg protein"}: {Math.round(shownNutrition.protein)}g</Text>
            <Text style={styles.subText}>{isTodayView ? "Carbs" : "Avg carbs"}: {Math.round(shownNutrition.carbs)}g</Text>
            <Text style={styles.subText}>{isTodayView ? "Fat" : "Avg fat"}: {Math.round(shownNutrition.fat)}g</Text>
          </View>
        ) : null}

        <Pressable style={styles.expandRow} onPress={() => toggleDetail("timing")}>
          <Text style={styles.expandTitle}>Meal Timing</Text>
          <Ionicons name={expandedStats.timing ? "chevron-up" : "chevron-down"} size={18} color="#5a686d" />
        </Pressable>
        {expandedStats.timing ? (
          <View style={styles.expandBody}>
            {mealTimeAverages.map((item) => (
              <Text key={item.meal} style={styles.subText}>
                {toTitleCase(item.meal)}: {item.label}
              </Text>
            ))}
          </View>
        ) : null}

        <Pressable style={styles.expandRow} onPress={() => toggleDetail("foods")}>
          <Text style={styles.expandTitle}>Top Foods</Text>
          <Ionicons name={expandedStats.foods ? "chevron-up" : "chevron-down"} size={18} color="#5a686d" />
        </Pressable>
        {expandedStats.foods ? (
          <View style={styles.expandBody}>
            {topFoodEntries.length ? (
              topFoodEntries.map(([name, count], index) => (
                <Text key={`${name}_${index}`} style={styles.subText}>
                  {index + 1}. {toTitleCase(name)} ({count}x)
                </Text>
              ))
            ) : (
              <Text style={styles.subText}>No food stats yet.</Text>
            )}
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <SectionHeader icon="trophy-outline" title="Achievements" />
        <View style={styles.achGrid}>
          {achievements.map((badge) => (
            <View key={badge.type} style={[styles.achCard, !badge.unlocked && styles.achCardLocked]}>
              <View style={[styles.achIconWrap, badge.unlocked ? styles.achIconWrapActive : null]}>
                <Ionicons name={badge.unlocked ? "checkmark" : "lock-closed"} size={14} color={badge.unlocked ? "#1c8f37" : "#8e9aa0"} />
              </View>
              <Text style={[styles.achTitle, !badge.unlocked && styles.achTitleLocked]}>{badge.title}</Text>
              <Text style={styles.achSub}>{Math.min(Math.round(badge.current), badge.target)} / {Math.round(badge.target)}</Text>
              <ProgressBar value={badge.current / Math.max(badge.target, 1)} color={badge.unlocked ? "#4dd368" : "#b8c4ca"} />
            </View>
          ))}
        </View>
        <Text style={styles.subText}>Next: {nextBadge.title}</Text>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#172126"
  },
  periodBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#dbe4e7",
    backgroundColor: "#f7fafb",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  periodText: {
    color: "#4f5d62",
    fontWeight: "700"
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e7ecef",
    backgroundColor: "#f9fbfc",
    padding: 14,
    gap: 10
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  sectionTitle: {
    color: "#1b2930",
    fontWeight: "900",
    fontSize: 16
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10
  },
  metricText: {
    color: "#54646a",
    fontWeight: "700"
  },
  weightChartRow: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 108,
    borderRadius: 12,
    backgroundColor: "#eef7ef",
    paddingHorizontal: 8,
    paddingVertical: 8
  },
  weightChartEmpty: {
    minHeight: 72
  },
  subText: {
    color: "#6a777d",
    fontWeight: "600"
  },
  inlineRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center"
  },
  weightInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d6e0e4",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#172126",
    fontWeight: "700"
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#caebd2",
    backgroundColor: "#effcf2",
    paddingVertical: 10,
    paddingHorizontal: 12
  },
  secondaryBtnText: {
    color: "#1f9f3d",
    fontWeight: "800"
  },
  targetEditBtn: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#caebd2",
    backgroundColor: "#effcf2",
    alignItems: "center",
    justifyContent: "center"
  },
  gridTwo: {
    flexDirection: "row",
    gap: 10
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#edf8ef",
    borderWidth: 1,
    borderColor: "#d7f0dc",
    alignItems: "center",
    paddingVertical: 10,
    gap: 2
  },
  metricBig: {
    fontSize: 24,
    fontWeight: "900",
    color: "#172126"
  },
  metricLabel: {
    color: "#607176",
    fontWeight: "700"
  },
  heatmapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  heatCell: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: "#e6ecef"
  },
  heatCellActive: {
    backgroundColor: "#55d36f"
  },
  rowLabel: {
    color: "#516066",
    fontWeight: "700"
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#e4ebee",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999
  },
  subHeader: {
    marginTop: 4,
    color: "#1d2a30",
    fontWeight: "800"
  },
  barRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 78,
    borderRadius: 10,
    backgroundColor: "#f2f6f7",
    paddingHorizontal: 10,
    paddingBottom: 8
  },
  barCol: {
    alignItems: "center",
    gap: 4
  },
  barValue: {
    width: 16,
    borderRadius: 6,
    backgroundColor: "#3ec25c"
  },
  barLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#728085"
  },
  macroLegend: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  legendText: {
    color: "#5f6d72",
    fontWeight: "700"
  },
  insightCard: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5ecef",
    backgroundColor: "#ffffff",
    padding: 10,
    alignItems: "center"
  },
  insightBody: {
    flex: 1,
    color: "#66757b",
    fontWeight: "600"
  },
  expandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2
  },
  expandTitle: {
    color: "#1f2c31",
    fontWeight: "800"
  },
  expandBody: {
    borderRadius: 10,
    backgroundColor: "#f3f7f8",
    borderWidth: 1,
    borderColor: "#e6ecef",
    padding: 10,
    gap: 4
  },
  achGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  achCard: {
    width: "48%",
    borderRadius: 14,
    backgroundColor: "#eefbf1",
    borderWidth: 1,
    borderColor: "#d4efd9",
    padding: 10,
    gap: 6
  },
  achCardLocked: {
    backgroundColor: "#f3f6f7",
    borderColor: "#e1e8ea"
  },
  achIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e5ebee"
  },
  achIconWrapActive: {
    backgroundColor: "#d9f5df"
  },
  achTitle: {
    color: "#1e8f39",
    fontWeight: "800",
    fontSize: 12
  },
  achTitleLocked: {
    color: "#8d9aa0"
  },
  achSub: {
    color: "#6a777d",
    fontWeight: "700",
    fontSize: 12
  }
});








