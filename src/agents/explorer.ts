import { GoogleGenAI, Type } from "@google/genai";
import { TravelContext, Activity } from "../types";

export class Explorer {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async research(context: TravelContext): Promise<Partial<TravelContext>> {
    if (!context.destination) return {};

    const prompt = `
      Research and rank top tourist attractions, experiences, and points of interest in ${context.destination.city}, ${context.destination.country}.
      Consider the travel dates: ${context.travelPeriod?.startDate} to ${context.travelPeriod?.endDate}.
      Categorize them: historical/cultural, nature/outdoors, food/dining, nightlife, shopping, family-friendly, off-the-beaten-path.
      Include: name, description, average rating, review count, estimated visit duration, opening hours, admission cost, location coordinates, photos.
      Rank by relevance and quality.
    `;

    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            activities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING, enum: ['cultural', 'nature', 'food', 'nightlife', 'shopping', 'adventure', 'relaxation'] },
                  description: { type: Type.STRING },
                  rating: { type: Type.NUMBER },
                  reviewCount: { type: Type.NUMBER },
                  duration: { type: Type.NUMBER },
                  location: {
                    type: Type.OBJECT,
                    properties: {
                      lat: { type: Type.NUMBER },
                      lng: { type: Type.NUMBER },
                      address: { type: Type.STRING },
                    },
                  },
                  estimatedCost: { type: Type.NUMBER },
                  highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  bookingRequired: { type: Type.BOOLEAN },
                },
                required: ["name", "category", "description", "rating", "location"],
              },
            },
          },
          required: ["activities"],
        },
      },
    });

    try {
      const result = JSON.parse(response.text || "{}");
      return result;
    } catch (e) {
      console.error("Failed to parse Gemini response:", e);
      return {};
    }
  }
}
