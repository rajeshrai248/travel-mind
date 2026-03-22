import { GoogleGenAI, Type } from "@google/genai";
import { TrendingDestination, UserPreferenceSummary } from "../types";

export class TrendingAgent {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async getTrending(
    month: string,
    year: number,
    preferences?: UserPreferenceSummary | null,
  ): Promise<TrendingDestination[]> {
    const personalization = preferences
      ? `
      Personalize for a traveler who enjoys: ${preferences.topInterests.join(', ')}.
      They prefer a ${preferences.averagePace} pace and have a ${preferences.budgetTier} budget.
      AVOID recommending these already-visited cities: ${preferences.visitedCities.join(', ') || 'none'}.
      `
      : `Choose universally appealing destinations across different continents and travel styles.`;

    const prompt = `
      Return 6 trending travel destinations for ${month} ${year}.

      Consider:
      - Best weather windows and seasonal climate advantages
      - Cultural festivals, events, and celebrations happening this month
      - Peak seasons and shoulder seasons that offer great value
      - Unique seasonal experiences (cherry blossoms, northern lights, whale watching, etc.)

      ${personalization}

      For each destination provide:
      - city: the city name
      - country: the country name
      - reason: a concise, engaging sentence explaining why it's trending THIS month (mention the specific event, weather, or seasonal draw)
      - tags: 2-4 relevant tags (e.g. "cultural", "beach", "festival", "nature", "food", "adventure")
      - imageQuery: a short search-friendly term for finding images of this destination (e.g. "tokyo-cherry-blossoms", "reykjavik-northern-lights")
      - score: relevance/appeal score from 0-100

      Order by score descending. Ensure geographic diversity — don't cluster all destinations in one region.
    `;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            destinations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  city: { type: Type.STRING },
                  country: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  imageQuery: { type: Type.STRING },
                  score: { type: Type.NUMBER },
                },
                required: ["city", "country", "reason", "tags", "imageQuery", "score"],
              },
            },
          },
          required: ["destinations"],
        },
      },
    });

    try {
      const result = JSON.parse(response.text || "{}");
      return result.destinations || [];
    } catch (e) {
      console.error("Failed to parse TrendingAgent response:", e);
      return [];
    }
  }
}
