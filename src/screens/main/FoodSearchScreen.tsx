import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainStackParamList } from "@/types/navigation";
import { FoodItem, searchFoods } from "@/services/usdaFoodService";
import { cacheSearch, getCachedSearch, getRecentFoods } from "@/services/foodCacheService";

type Props = NativeStackScreenProps<MainStackParamList, "FoodSearch">;

const SUGGESTIONS = ["Chicken Breast", "Brown Rice", "Dal", "Paneer", "Roti", "Oats", "Eggs", "Broccoli"];

export const FoodSearchScreen = ({ navigation, route }: Props): React.JSX.Element => {
  const mealType = route.params?.mealType || "snack";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[]>([]);
  const [recentFoods, setRecentFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void getRecentFoods().then(setRecentFoods);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setError("");
      return;
    }

    const timer = setTimeout(() => {
      void doSearch(query, 1);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const doSearch = async (nextQuery: string, nextPage: number): Promise<void> => {
    try {
      if (nextPage === 1) {
        setLoading(true);
        setError("");
        setResults([]);
      } else {
        setLoadingMore(true);
      }

      if (nextPage === 1) {
        const cached = await getCachedSearch(nextQuery);
        if (cached) {
          setResults(cached);
          setLoading(false);
          return;
        }
      }

      const { foods, totalPages } = await searchFoods(nextQuery, nextPage);
      if (nextPage === 1) {
        setResults(foods);
        await cacheSearch(nextQuery, foods);
      } else {
        setResults((prev) => [...prev, ...foods]);
      }
      setPage(nextPage);
      setHasMore(nextPage < totalPages);
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const openFoodDetails = (item: FoodItem): void => {
    navigation.navigate("FoodDetails", { food: item, mealType });
  };

  const renderCard = (item: FoodItem): React.JSX.Element => (
    <TouchableOpacity style={styles.card} onPress={() => openFoodDetails(item)} activeOpacity={0.75}>
      <View style={styles.cardLeft}>
        <Text style={styles.foodName} numberOfLines={2}>
          {item.name}
        </Text>
        {item.brand ? (
          <Text style={styles.brand} numberOfLines={1}>
            {item.brand}
          </Text>
        ) : null}
        <Text style={styles.serving}>
          Per {item.servingSize}
          {item.servingSizeUnit}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.calories}>{Math.round(item.nutrition.calories)} cal</Text>
        <View style={styles.macros}>
          <Text style={[styles.macro, { color: "#ef4444" }]}>P:{Math.round(item.nutrition.protein)}g</Text>
          <Text style={[styles.macro, { color: "#3b82f6" }]}>C:{Math.round(item.nutrition.carbs)}g</Text>
          <Text style={[styles.macro, { color: "#f59e0b" }]}>F:{Math.round(item.nutrition.fat)}g</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            style={styles.input}
            placeholder="Search foods from USDA..."
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void doSearch(query, 1)}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && !error ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.fdcId.toString()}
          renderItem={({ item }) => renderCard(item)}
          contentContainerStyle={styles.list}
          keyboardDismissMode="on-drag"
          onEndReached={() => {
            if (hasMore && !loadingMore) {
              void doSearch(query, page + 1);
            }
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#10b981" style={styles.footerLoading} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              {query.length < 2 ? (
                <>
                  {recentFoods.length > 0 ? (
                    <>
                      <Text style={styles.sectionLabel}>Recent Foods</Text>
                      {recentFoods.slice(0, 5).map((item) => (
                        <View key={item.fdcId}>{renderCard(item)}</View>
                      ))}
                    </>
                  ) : null}
                  <Text style={styles.sectionLabel}>Quick Search</Text>
                  <View style={styles.chips}>
                    {SUGGESTIONS.map((suggestion) => (
                      <TouchableOpacity key={suggestion} style={styles.chip} onPress={() => setQuery(suggestion)}>
                        <Text style={styles.chipText}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <View style={styles.centerSmall}>
                  <Text style={styles.emptyTitle}>No Results</Text>
                  <Text style={styles.emptyText}>Try different keywords</Text>
                </View>
              )}
            </View>
          }
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  input: { flex: 1, fontSize: 15, color: "#111827" },
  center: { alignItems: "center", justifyContent: "center", padding: 24, paddingTop: 60 },
  centerSmall: { alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { color: "#6b7280", marginTop: 8 },
  errorText: { color: "#ef4444", textAlign: "center", marginBottom: 16 },
  retryBtn: { backgroundColor: "#10b981", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { color: "#fff", fontWeight: "600" },
  list: { padding: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  cardLeft: { flex: 1, marginRight: 12 },
  foodName: { fontSize: 15, fontWeight: "600", color: "#111827", marginBottom: 2 },
  brand: { fontSize: 12, color: "#6b7280", marginBottom: 2 },
  serving: { fontSize: 12, color: "#9ca3af" },
  cardRight: { alignItems: "flex-end", gap: 4 },
  calories: { fontSize: 16, fontWeight: "700", color: "#10b981" },
  macros: { flexDirection: "row", gap: 6 },
  macro: { fontSize: 11, fontWeight: "600" },
  emptyWrap: { padding: 16 },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: "#6b7280", marginBottom: 12, marginTop: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#10b981",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  chipText: { color: "#10b981", fontSize: 13, fontWeight: "500" },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#111827", marginBottom: 4 },
  emptyText: { color: "#6b7280", fontSize: 14 },
  footerLoading: { padding: 16 }
});
