/* eslint-disable no-undef */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env by default; allow optional server/.env overrides.
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, ".env"), override: true });

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "12mb" }));

const FOOD_PROMPT = `
Analyze this food image and return ONLY a valid JSON object with this exact structure:
{
  "foods": [
    {
      "name": "food name",
      "quantity": "amount with unit (e.g., 150g, 1 cup)",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0,
      "fiber": 0,
      "sugar": 0,
      "sodium": 0,
      "vitamins": {
        "vitaminA": 0,
        "vitaminC": 0,
        "vitaminD": 0
      },
      "minerals": {
        "calcium": 0,
        "iron": 0,
        "potassium": 0
      }
    }
  ],
  "totalNutrition": {
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0
  }
}
Do not return markdown or code fences.
`;

const parseGeminiJson = (text) => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Gemini did not return JSON.");
  }
  return JSON.parse(text.slice(start, end + 1));
};

const normalizeToClientShape = (payload) => {
  const foods = Array.isArray(payload?.foods) ? payload.foods : [];
  const normalizedFoods = foods.map((food) => ({
    name: String(food?.name || "Unknown food"),
    servingSize: String(food?.quantity || "1 serving"),
    nutrition: {
      calories: Number(food?.calories || 0),
      protein: Number(food?.protein || 0),
      carbs: Number(food?.carbs || 0),
      fat: Number(food?.fat || 0),
      fiber: Number(food?.fiber || 0),
      sugar: Number(food?.sugar || 0),
      sodium: Number(food?.sodium || 0),
      vitamins: {
        vitaminA: Number(food?.vitamins?.vitaminA || 0),
        vitaminC: Number(food?.vitamins?.vitaminC || 0),
        vitaminD: Number(food?.vitamins?.vitaminD || 0)
      },
      minerals: {
        calcium: Number(food?.minerals?.calcium || 0),
        iron: Number(food?.minerals?.iron || 0),
        potassium: Number(food?.minerals?.potassium || 0)
      }
    }
  }));

  const total = payload?.totalNutrition || {};
  return {
    foods: normalizedFoods,
    totalNutrition: {
      calories: Number(total.calories || 0),
      protein: Number(total.protein || 0),
      carbs: Number(total.carbs || 0),
      fat: Number(total.fat || 0)
    },
    confidence: 0.85
  };
};

app.post("/api/analyze-food", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }
    const { image, mimeType } = req.body || {};
    if (!image) {
      return res.status(400).json({ error: "image is required" });
    }
    console.log("POST /api/analyze-food - received image payload");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([
      FOOD_PROMPT,
      {
        inlineData: {
          data: image,
          mimeType: mimeType || "image/jpeg"
        }
      }
    ]);

    const text = result?.response?.text?.();
    if (!text) {
      return res.status(502).json({ error: "Gemini returned no text output." });
    }
    const cleanedText = text.replace(/```json\s*|\s*```/g, "").trim();
    const parsed = parseGeminiJson(cleanedText);
    const normalized = normalizeToClientShape(parsed);
    return res.json(normalized);
  } catch (error) {
    console.error("Gemini API error:", error);
    return res.status(500).json({
      error: "Failed to analyze food image",
      details: error instanceof Error ? error.message : "Unknown server error"
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Food logging API running on :${port}`);
});
