import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/common/Screen";
import { useAuth } from "@/hooks/useAuth";
import { useLogs } from "@/hooks/useLogs";
import { DiscoverCard, DiscoverFeed } from "@/types/models";
import { apiService } from "@/services/api";
import { databaseService } from "@/services/database";
import { AdBanner } from "@/components/ads/AdBanner";

const categoryIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  swap: "swap-horizontal-outline",
  tip: "bulb-outline",
  protein: "barbell-outline",
  carb: "nutrition-outline",
  micronutrient: "leaf-outline",
  habit: "repeat-outline"
};

const getLocalDateKey = (): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const summarizeLogs = (logs: ReturnType<typeof useLogs>["logs"]) => {
  const recent = logs.slice(0, 30);
  const uniqueDays = new Set(recent.map((log) => log.date.slice(0, 10))).size || 1;
  const totals = recent.reduce(
    (acc, log) => ({
      calories: acc.calories + log.totalNutrition.calories,
      protein: acc.protein + log.totalNutrition.protein,
      carbs: acc.carbs + log.totalNutrition.carbs,
      fat: acc.fat + log.totalNutrition.fat
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    totals,
    averages: {
      calories: Math.round(totals.calories / uniqueDays),
      protein: Math.round(totals.protein / uniqueDays),
      carbs: Math.round(totals.carbs / uniqueDays),
      fat: Math.round(totals.fat / uniqueDays)
    },
    logCount: recent.length
  };
};

export const DiscoverScreen = (): React.JSX.Element => {
  const { user } = useAuth();
  const { logs } = useLogs();
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<DiscoverFeed | null>(null);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => summarizeLogs(logs), [logs]);

  useEffect(() => {
    let active = true;

    const load = async (): Promise<void> => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const dateKey = getLocalDateKey();

      try {
        const cached = await databaseService.getDiscoverFeed(user.id, dateKey);
        if (cached && active) {
          setFeed(cached);
          setLoading(false);
          return;
        }

        const generated = await apiService.generateDiscoverFeed({
          summary: {
            dateKey,
            dailyGoals: user.dailyGoals,
            onboarding: user.onboardingData
              ? {
                  primaryGoals: user.onboardingData.primaryGoals,
                  healthConditions: user.onboardingData.healthConditions,
                  dietaryPreferences: user.onboardingData.dietaryPreferences
                }
              : null,
            recent: summary
          }
        });

        if (!active) return;

        await databaseService.upsertDiscoverFeed(user.id, generated);
        setFeed(generated);
      } catch (err) {
        if (!active) return;
        setError((err as Error).message || "Failed to load discover feed.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [summary, user]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.sub}>Personalized ideas for your goals</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#2fb24b" />
          <Text style={styles.muted}>Building your feed...</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && !error && feed?.cards?.length ? (
        <View style={styles.list}>
          {feed.cards.map((card: DiscoverCard) => (
            <View key={card.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.iconWrap}>
                  <Ionicons name={categoryIcon[card.category] || "bulb-outline"} size={18} color="#249a3f" />
                </View>
                <Text style={styles.cardTitle}>{card.title}</Text>
              </View>
              <Text style={styles.cardDesc}>{card.description}</Text>
              <Text style={styles.cardReason}>{card.reason}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {!loading && !error && !feed?.cards?.length ? <Text style={styles.muted}>No discover cards yet.</Text> : null}

      <AdBanner />
    </Screen>
  );
};

const styles = StyleSheet.create({
  header: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dce8e0",
    backgroundColor: "#effaf2",
    padding: 14,
    gap: 4
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#1a272c"
  },
  sub: {
    color: "#607075",
    fontWeight: "600"
  },
  centered: {
    paddingVertical: 20,
    alignItems: "center",
    gap: 8
  },
  muted: {
    color: "#6a777d",
    fontWeight: "600"
  },
  error: {
    color: "#c03535",
    fontWeight: "700"
  },
  list: {
    gap: 10
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dfe8ea",
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 6
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e8f7eb",
    alignItems: "center",
    justifyContent: "center"
  },
  cardTitle: {
    flex: 1,
    color: "#1f2c31",
    fontWeight: "900",
    fontSize: 16
  },
  cardDesc: {
    color: "#3f4e53",
    fontWeight: "700"
  },
  cardReason: {
    color: "#6a787d",
    fontWeight: "600"
  }
});
