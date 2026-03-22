import { GoogleGenAI, Type } from "@google/genai";
import { TravelContext, Activity, DestinationStop } from "../types";

export interface ExplorerResult {
  activities: Activity[];
}

export class Explorer {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async research(context: TravelContext): Promise<ExplorerResult> {
    // If we have multi-destination stops, research each one
    if (context.destinations && context.destinations.length > 0) {
      return await this.researchMultiple(context);
    }

    // Fallback: single destination (legacy)
    if (!context.destination) return { activities: [] };
    return await this.researchSingle(context.destination.city, context.destination.country, context);
  }

  private async researchMultiple(context: TravelContext): Promise<ExplorerResult> {
    // Get unique cities (base city may appear twice — start and end)
    const uniqueCities = new Map<string, DestinationStop>();
    for (const stop of context.destinations) {
      const key = `${stop.destination.city}-${stop.destination.country}`;
      if (!uniqueCities.has(key)) {
        uniqueCities.set(key, stop);
      }
    }

    // Research all unique cities in parallel
    const entries = Array.from(uniqueCities.values());
    const results = await Promise.all(
      entries.map(stop =>
        this.researchSingle(stop.destination.city, stop.destination.country, context, stop.stayDays)
      )
    );

    // Merge all activities — the Architect will distribute them by city/day
    const allActivities: Activity[] = [];
    for (const result of results) {
      if (result.activities) {
        allActivities.push(...result.activities);
      }
    }

    return { activities: allActivities };
  }

  private async researchSingle(
    city: string,
    country: string,
    context: TravelContext,
    stayDays?: number,
  ): Promise<{ activities: Activity[] }> {
    const daysNote = stayDays ? `The traveler will be here for ${stayDays} days.` : '';
    const interestsNote = context.preferences.interests.length > 0
      ? `Their interests: ${context.preferences.interests.join(', ')}.`
      : '';

    const prompt = `
      Research and rank top tourist attractions, experiences, and points of interest in ${city}, ${country}.
      Consider the travel dates: ${context.travelPeriod?.startDate} to ${context.travelPeriod?.endDate}.
      ${daysNote}
      ${interestsNote}
      Categorize them: historical/cultural, nature/outdoors, food/dining, nightlife, shopping, family-friendly, off-the-beaten-path.
      Include: name, description, average rating, review count, estimated visit duration, opening hours, admission cost, location coordinates, photos.
      Tag each activity with its city name.
      Rank by relevance and quality.
    `;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
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
                  category: { type: Type.STRING },
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
                  city: { type: Type.STRING },
                },
                required: ["name", "category", "description", "rating", "location", "city"],
              },
            },
          },
          required: ["activities"],
        },
      },
    });

    try {
      const result = JSON.parse(response.text || "{}");
      return { activities: result.activities || [] };
    } catch (e) {
      console.error(`Failed to parse Explorer response for ${city}:`, e);
      return { activities: [] };
    }
  }
}
