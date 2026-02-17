import AsyncStorage from "@react-native-async-storage/async-storage";
import { FoodItem } from "@/services/usdaFoodService";

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const SEARCH_CACHE_PREFIX = "usda_v3_search_";

export async function cacheSearch(query: string, foods: FoodItem[]): Promise<void> {
  await AsyncStorage.setItem(
    `${SEARCH_CACHE_PREFIX}${query.toLowerCase()}`,
    JSON.stringify({ foods, timestamp: Date.now() })
  );
}

export async function getCachedSearch(query: string): Promise<FoodItem[] | null> {
  try {
    const raw = await AsyncStorage.getItem(`${SEARCH_CACHE_PREFIX}${query.toLowerCase()}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { foods: FoodItem[]; timestamp: number };
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
    return parsed.foods;
  } catch {
    return null;
  }
}

export async function saveRecentFood(food: FoodItem): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem("recent_foods");
    let recent: FoodItem[] = raw ? (JSON.parse(raw) as FoodItem[]) : [];
    recent = recent.filter((entry) => entry.fdcId !== food.fdcId);
    recent.unshift(food);
    recent = recent.slice(0, 20);
    await AsyncStorage.setItem("recent_foods", JSON.stringify(recent));
  } catch {
    // Ignore cache failures.
  }
}

export async function getRecentFoods(): Promise<FoodItem[]> {
  try {
    const raw = await AsyncStorage.getItem("recent_foods");
    return raw ? (JSON.parse(raw) as FoodItem[]) : [];
  } catch {
    return [];
  }
}

export async function toggleFavorite(food: FoodItem): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem("favorite_foods");
    let favorites: FoodItem[] = raw ? (JSON.parse(raw) as FoodItem[]) : [];
    const exists = favorites.some((entry) => entry.fdcId === food.fdcId);
    if (exists) {
      favorites = favorites.filter((entry) => entry.fdcId !== food.fdcId);
    } else {
      favorites.unshift(food);
    }
    await AsyncStorage.setItem("favorite_foods", JSON.stringify(favorites));
    return !exists;
  } catch {
    return false;
  }
}

export async function getFavorites(): Promise<FoodItem[]> {
  try {
    const raw = await AsyncStorage.getItem("favorite_foods");
    return raw ? (JSON.parse(raw) as FoodItem[]) : [];
  } catch {
    return [];
  }
}

export async function isFavorite(fdcId: number): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.some((entry) => entry.fdcId === fdcId);
}
