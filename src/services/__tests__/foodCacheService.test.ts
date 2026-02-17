import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  cacheSearch,
  getCachedSearch,
  getFavorites,
  getRecentFoods,
  isFavorite,
  saveRecentFood,
  toggleFavorite
} from "@/services/foodCacheService";
import { FoodItem } from "@/services/usdaFoodService";

const paneer: FoodItem = {
  fdcId: 1,
  name: "Paneer",
  servingSize: 100,
  servingSizeUnit: "g",
  nutrition: {
    calories: 321,
    protein: 25,
    carbs: 3.6,
    fat: 25,
    fiber: 0,
    sugar: 1,
    sodium: 18,
    calcium: 407,
    iron: 0,
    potassium: 71
  }
};

describe("foodCacheService", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
  });

  it("caches and retrieves search results", async () => {
    await cacheSearch("paneer", [paneer]);
    const cached = await getCachedSearch("paneer");
    expect(cached).toHaveLength(1);
    expect(cached?.[0].name).toBe("Paneer");
  });

  it("returns null for expired search cache", async () => {
    const nowSpy = jest.spyOn(Date, "now");
    nowSpy.mockReturnValueOnce(1_000);
    await cacheSearch("paneer", [paneer]);
    nowSpy.mockReturnValueOnce(1_000 + 8 * 24 * 60 * 60 * 1000);

    const cached = await getCachedSearch("paneer");
    expect(cached).toBeNull();
  });

  it("keeps recent foods unique and ordered", async () => {
    await saveRecentFood(paneer);
    await saveRecentFood({ ...paneer, fdcId: 2, name: "Tofu" });
    await saveRecentFood(paneer);

    const recents = await getRecentFoods();
    expect(recents.map((item) => item.fdcId)).toEqual([1, 2]);
  });

  it("toggles favorites and checks favorite state", async () => {
    expect(await toggleFavorite(paneer)).toBe(true);
    expect(await isFavorite(1)).toBe(true);
    expect((await getFavorites()).map((item) => item.fdcId)).toEqual([1]);

    expect(await toggleFavorite(paneer)).toBe(false);
    expect(await isFavorite(1)).toBe(false);
    expect(await getFavorites()).toEqual([]);
  });
});
