import { emptyNutrition, sumNutrition } from "@/utils/nutrition";

describe("nutrition utils", () => {
  it("returns zeroed nutrition by default", () => {
    expect(emptyNutrition()).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    });
  });

  it("sums nutrition values across foods", () => {
    const result = sumNutrition([
      {
        name: "Paneer",
        servingSize: "100g",
        nutrition: { calories: 321, protein: 25, carbs: 3.6, fat: 25, fiber: 0.2, sugar: 1.2, sodium: 18 }
      },
      {
        name: "Roti",
        servingSize: "1 piece",
        nutrition: { calories: 120, protein: 3.5, carbs: 20, fat: 3, fiber: 2, sugar: 0.6, sodium: 90 }
      }
    ]);

    expect(result).toEqual({
      calories: 441,
      protein: 28.5,
      carbs: 23.6,
      fat: 28,
      fiber: 2.2,
      sugar: 1.7999999999999998,
      sodium: 108
    });
  });
});
