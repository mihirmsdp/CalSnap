import { GeminiAnalysisResult } from "@/types/models";
import { config } from "@/constants/config";
import * as FileSystem from "expo-file-system/legacy";

interface AnalyzePayload {
  image: string;
  mimeType: string;
}

const baseUrl = config.apiBaseUrl;

export const apiService = {
  async analyzeFoodImage(payload: AnalyzePayload): Promise<GeminiAnalysisResult> {
    const response = await fetch(`${baseUrl}/api/analyze-food`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to analyze image. Please try again.");
    }

    return (await response.json()) as GeminiAnalysisResult;
  },

  async analyzeFoodImageFromUri(imageUri: string, mimeType = "image/jpeg"): Promise<GeminiAnalysisResult> {
    const image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64
    });
    if (!image) {
      throw new Error("Failed to read selected image.");
    }
    try {
      return await this.analyzeFoodImage({ image, mimeType });
    } catch (error) {
      const message = (error as Error).message || "";
      if (message.includes("Network request failed")) {
        throw new Error(
          "Could not connect to server. Make sure EXPO_PUBLIC_API_BASE_URL uses your computer's local IP and you're on the same WiFi network."
        );
      }
      throw error;
    }
  }
};
