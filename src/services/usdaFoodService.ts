const BASE_URL = "https://api.nal.usda.gov/fdc/v1";

export interface FoodItem {
  fdcId: number;
  name: string;
  brand?: string;
  servingSize: number;
  servingSizeUnit: string;
  householdServingText?: string;
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    calcium: number;
    iron: number;
    potassium: number;
  };
  dataType?: string;
}

interface UsdaNutrient {
  nutrientId?: number;
  value?: number;
  amount?: number;
  nutrient?: {
    id?: number;
  };
}

interface UsdaLabelNutrients {
  calories?: { value?: number };
  protein?: { value?: number };
  carbohydrates?: { value?: number };
  fat?: { value?: number };
  fiber?: { value?: number };
  sugars?: { value?: number };
  sodium?: { value?: number };
  calcium?: { value?: number };
  iron?: { value?: number };
  potassium?: { value?: number };
}

interface UsdaFood {
  fdcId: number;
  dataType?: string;
  description?: string;
  brandName?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: UsdaNutrient[];
  labelNutrients?: UsdaLabelNutrients;
}

interface SearchFoodsResponse {
  foods?: UsdaFood[];
  totalPages?: number;
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

const getNutrient = (nutrients: UsdaNutrient[], ...ids: number[]): number => {
  for (const id of ids) {
    const hit = nutrients.find(
      (entry) => (entry.nutrientId ?? entry.nutrient?.id) === id,
    );
    if (!hit) continue;
    const value = hit.value ?? hit.amount;
    if (typeof value === "number" && value > 0) return value;
  }
  return 0;
};

const toPer100gFromLabel = (
  value: number,
  servingSize?: number,
  servingUnit?: string,
): number => {
  if (!value || !servingSize || servingSize <= 0) return value || 0;
  const unit = (servingUnit || "g").trim().toLowerCase();
  let grams = servingSize;

  if (unit === "oz") grams = servingSize * 28.3495;
  else if (unit === "lb") grams = servingSize * 453.592;
  else if (unit === "kg") grams = servingSize * 1000;

  if (Math.abs(grams - 100) < 0.5) return value;
  return (value / grams) * 100;
};

const formatFood = (raw: UsdaFood): FoodItem => {
  const nutrients = raw.foodNutrients || [];
  
  // 1. Get values from the main array.
  // CRITICAL: These are ALWAYS per 100g in the USDA API.
  // We explicitly name this variable 'per100g' to remind us NOT to scale it.
  const per100g = {
    calories: getNutrient(nutrients, 1008, 2047, 2048),
    protein: getNutrient(nutrients, 1003),
    carbs: getNutrient(nutrients, 1005),
    fat: getNutrient(nutrients, 1004),
    fiber: getNutrient(nutrients, 1079),
    sugar: getNutrient(nutrients, 2000, 1063),
    sodium: getNutrient(nutrients, 1093),
    calcium: getNutrient(nutrients, 1087),
    iron: getNutrient(nutrients, 1089),
    potassium: getNutrient(nutrients, 1092)
  };

  // Check if we found valid data in the 100g array
  const hasFoodNutrients = Object.values(per100g).some((value) => value > 0);

  // 2. Prepare label values (just in case we need them as a fallback)
  // These are per serving, so they DO need scaling.
  const label = raw.labelNutrients;
  const servingSize = raw.servingSize || 0;
  const servingUnit = raw.servingSizeUnit || "g";

  const perServingScaled = {
    calories: toPer100gFromLabel(label?.calories?.value || 0, servingSize, servingUnit),
    protein: toPer100gFromLabel(label?.protein?.value || 0, servingSize, servingUnit),
    carbs: toPer100gFromLabel(label?.carbohydrates?.value || 0, servingSize, servingUnit),
    fat: toPer100gFromLabel(label?.fat?.value || 0, servingSize, servingUnit),
    fiber: toPer100gFromLabel(label?.fiber?.value || 0, servingSize, servingUnit),
    sugar: toPer100gFromLabel(label?.sugars?.value || 0, servingSize, servingUnit),
    sodium: toPer100gFromLabel(label?.sodium?.value || 0, servingSize, servingUnit),
    calcium: toPer100gFromLabel(label?.calcium?.value || 0, servingSize, servingUnit),
    iron: toPer100gFromLabel(label?.iron?.value || 0, servingSize, servingUnit),
    potassium: toPer100gFromLabel(label?.potassium?.value || 0, servingSize, servingUnit)
  };

  // 3. Selection Logic
  // If we have data from Step 1, use it directly. DO NOT SCALE IT.
  // Only use Step 2 if Step 1 failed.
  const final = hasFoodNutrients ? per100g : perServingScaled;

  return {
    fdcId: raw.fdcId,
    name: raw.description?.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()) || "Unknown",
    brand: raw.brandName || raw.brandOwner || undefined,
    servingSize: 100,
    servingSizeUnit: "g",
    householdServingText: raw.householdServingFullText || undefined,
    dataType: raw.dataType,
    nutrition: {
      calories: round1(final.calories),
      protein: round1(final.protein),
      carbs: round1(final.carbs),
      fat: round1(final.fat),
      fiber: round1(final.fiber),
      sugar: round1(final.sugar),
      sodium: round1(final.sodium),
      calcium: round1(final.calcium),
      iron: round1(final.iron),
      potassium: round1(final.potassium)
    }
  };
};

export async function searchFoods(
  query: string,
  page = 1,
  pageSize = 20,
): Promise<{ foods: FoodItem[]; totalPages: number }> {
  const usdaApiKey = process.env.EXPO_PUBLIC_USDA_API_KEY;
  if (!usdaApiKey) {
    throw new Error(
      "Missing USDA API key. Set EXPO_PUBLIC_USDA_API_KEY in .env",
    );
  }

  const params = new URLSearchParams({
    query,
    api_key: usdaApiKey,
    pageNumber: page.toString(),
    pageSize: pageSize.toString(),
  });
  ["Foundation", "SR Legacy", "Branded"].forEach((type) =>
    params.append("dataType", type),
  );

  const response = await fetch(`${BASE_URL}/foods/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`USDA API error: ${response.status}`);
  }

  const data = (await response.json()) as SearchFoodsResponse;
  const foods = (data.foods || []).map(formatFood);

  return {
    foods,
    totalPages: data.totalPages || 0,
  };
}
