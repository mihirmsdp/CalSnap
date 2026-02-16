import { FoodItem, NutritionInfo } from "@/types/models";

export const emptyNutrition = (): NutritionInfo => ({
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0
});

export const sumNutrition = (foods: FoodItem[]): NutritionInfo => {
  return foods.reduce(
    (acc, food) => ({
      calories: acc.calories + (food.nutrition.calories || 0),
      protein: acc.protein + (food.nutrition.protein || 0),
      carbs: acc.carbs + (food.nutrition.carbs || 0),
      fat: acc.fat + (food.nutrition.fat || 0),
      fiber: (acc.fiber || 0) + (food.nutrition.fiber || 0),
      sugar: (acc.sugar || 0) + (food.nutrition.sugar || 0),
      sodium: (acc.sodium || 0) + (food.nutrition.sodium || 0)
    }),
    emptyNutrition()
  );
};
