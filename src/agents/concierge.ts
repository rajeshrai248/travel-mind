import { GoogleGenAI, Type } from "@google/genai";
import { TravelContext, AccommodationOption, TransportOption } from "../types";

export class Concierge {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async recommend(context: TravelContext): Promise<Partial<TravelContext>> {
    if (!context.destination || !context.travelPeriod) return {};

    const prompt = `
      Recommend hotels and transport options in ${context.destination.city}, ${context.destination.country} for ${context.travelPeriod.startDate} to ${context.travelPeriod.endDate}.
      Budget level: ${context.preferences.budgetLevel}.
      Filter by: budget, star rating, guest rating, location (proximity to itinerary hotspots), amenities, cancellation policy.
      Recommend rental cars and public transit options.
      Present options in tiered recommendations: Budget, Mid-Range, Premium.
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
            accommodations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  type: { type: Type.STRING },
                  pricePerNight: { type: Type.NUMBER },
                  rating: { type: Type.NUMBER },
                  location: { type: Type.STRING },
                  amenities: { type: Type.ARRAY, items: { type: Type.STRING } },
                  photos: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["name", "type", "pricePerNight", "rating", "location"],
              },
            },
            transport: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING },
                  provider: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  details: { type: Type.STRING },
                },
                required: ["type", "provider", "price", "details"],
              },
            },
          },
          required: ["accommodations", "transport"],
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
