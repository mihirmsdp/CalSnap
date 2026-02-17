import { searchFoods } from "@/services/usdaFoodService";

describe("usdaFoodService", () => {
  const originalEnv = process.env.EXPO_PUBLIC_USDA_API_KEY;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.EXPO_PUBLIC_USDA_API_KEY = originalEnv;
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("throws when USDA key is missing", async () => {
    delete process.env.EXPO_PUBLIC_USDA_API_KEY;
    await expect(searchFoods("paneer")).rejects.toThrow("Missing USDA API key");
  });

  it("maps nutrients from foodNutrients and keeps 100g values", async () => {
    process.env.EXPO_PUBLIC_USDA_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        foods: [
          {
            fdcId: 2429587,
            description: "PANEER",
            dataType: "Branded",
            servingSize: 28,
            servingSizeUnit: "g",
            foodNutrients: [
              { nutrient: { id: 1008 }, amount: 321 },
              { nutrient: { id: 1003 }, amount: 25 },
              { nutrient: { id: 1005 }, amount: 3.57 },
              { nutrient: { id: 1004 }, amount: 25 }
            ]
          }
        ],
        totalPages: 1
      })
    }) as jest.Mock;

    const result = await searchFoods("paneer");

    expect(result.foods[0]).toMatchObject({
      fdcId: 2429587,
      name: "Paneer",
      servingSize: 100,
      servingSizeUnit: "g",
      nutrition: {
        calories: 321,
        protein: 25,
        carbs: 3.6,
        fat: 25
      }
    });
  });

  it("falls back to label nutrients and converts per serving to 100g", async () => {
    process.env.EXPO_PUBLIC_USDA_API_KEY = "test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        foods: [
          {
            fdcId: 11,
            description: "Sample Food",
            servingSize: 28,
            servingSizeUnit: "g",
            foodNutrients: [],
            labelNutrients: {
              calories: { value: 89.9 },
              protein: { value: 7 }
            }
          }
        ],
        totalPages: 1
      })
    }) as jest.Mock;

    const result = await searchFoods("sample");
    const first = result.foods[0];

    expect(first.servingSize).toBe(100);
    expect(first.nutrition.calories).toBeCloseTo(321.1, 1);
    expect(first.nutrition.protein).toBeCloseTo(25, 1);
  });
});
