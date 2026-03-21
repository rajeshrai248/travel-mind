import { GoogleGenAI, Type } from "@google/genai";
import { TravelContext, DayPlan } from "../types";

export class Architect {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async planItinerary(context: TravelContext): Promise<Partial<TravelContext>> {
    if (!context.destination || !context.travelPeriod) return {};

    const prompt = `
      Compose a day-by-day travel itinerary for ${context.destination.city}, ${context.destination.country} from ${context.travelPeriod.startDate} to ${context.travelPeriod.endDate}.
      Optimize for logistics, enjoyment, and pacing.
      Include morning/afternoon/evening activities, travel time between locations, and meal recommendations.
      Balance intensity and include leisure days.
      Highlight must-see attractions.
    `;

    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            itinerary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayNumber: { type: Type.INTEGER },
                  date: { type: Type.STRING },
                  theme: { type: Type.STRING },
                  activities: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        category: { type: Type.STRING },
                        timeSlot: {
                          type: Type.OBJECT,
                          properties: {
                            start: { type: Type.STRING },
                            end: { type: Type.STRING },
                          },
                        },
                        duration: { type: Type.NUMBER },
                        location: {
                          type: Type.OBJECT,
                          properties: {
                            lat: { type: Type.NUMBER },
                            lng: { type: Type.NUMBER },
                            address: { type: Type.STRING },
                          },
                        },
                        rating: { type: Type.NUMBER },
                        estimatedCost: { type: Type.NUMBER },
                        highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
                        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                        bookingRequired: { type: Type.BOOLEAN },
                      },
                    },
                  },
                  meals: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        cuisine: { type: Type.STRING },
                        priceRange: { type: Type.STRING },
                        rating: { type: Type.NUMBER },
                        address: { type: Type.STRING },
                      },
                    },
                  },
                  transportBetweenActivities: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        mode: { type: Type.STRING },
                        duration: { type: Type.NUMBER },
                        cost: { type: Type.NUMBER },
                      },
                    },
                  },
                  estimatedCost: { type: Type.NUMBER },
                },
              },
            },
          },
          required: ["itinerary"],
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
