import { GoogleGenAI, Type } from "@google/genai";
import { TravelContext, Activity } from "../types";

export class Architect {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async planItinerary(context: TravelContext, exploredActivities?: Activity[]): Promise<Partial<TravelContext>> {
    if (!context.travelPeriod) return {};

    const hasMultipleStops = context.destinations && context.destinations.length > 0;

    // Build destination schedule description
    let scheduleDesc = '';
    if (hasMultipleStops) {
      scheduleDesc = context.destinations.map((stop, i) => {
        const travelNote = stop.travelTimeFromPrevious > 0
          ? ` (${stop.travelTimeFromPrevious} min ${stop.travelModeFromPrevious} from previous stop)`
          : '';
        return `Stop ${i + 1}: ${stop.destination.city} — ${stop.stayDays} day(s)${travelNote}`;
      }).join('\n');
    } else if (context.destination) {
      scheduleDesc = `Single destination: ${context.destination.city}, ${context.destination.country}`;
    } else {
      return {};
    }

    const { pace, restDayFrequency, interests, totalBudget, currency } = context.preferences;

    const paceDesc =
      pace === 'relaxed' ? 'Relaxed pace: 1-2 activities per day maximum, generous free time'
      : pace === 'moderate' ? 'Moderate pace: 2-3 activities per day, balanced with downtime'
      : 'Packed pace: fit in as many activities as possible';

    const restDesc = restDayFrequency > 0
      ? `IMPORTANT: Schedule a rest/recovery day every ${restDayFrequency} active travel days. Rest days should have the dayType "rest" and only 0-1 light optional activities (e.g., a leisurely café visit or spa). The theme should be something like "Rest & Recharge".`
      : '';

    // Summarize explored activities for the prompt
    const activitiesContext = exploredActivities && exploredActivities.length > 0
      ? `\n      RESEARCHED ACTIVITIES (use these as the basis for the itinerary):\n      ${exploredActivities.map(a => `- ${a.name} (${(a as any).city || 'unknown city'}, ${a.category}, rating: ${a.rating})`).join('\n      ')}`
      : '';

    const prompt = `
      Create a day-by-day travel itinerary for ${context.travelPeriod.startDate} to ${context.travelPeriod.endDate} (${context.travelPeriod.durationDays} days).

      DESTINATION SCHEDULE:
      ${scheduleDesc}
      ${activitiesContext}

      RULES:
      - ${paceDesc}
      - Each day must have a "date" field in ISO format YYYY-MM-DD (e.g. 2026-07-28).
      - Each day must have a "city" field indicating which city/town it takes place in.
      - Each day must have a "dayType" field: "arrival" for the first day, "departure" for the last day, "travel" for days spent primarily traveling between cities, "rest" for rest/recovery days, and "explore" for normal sightseeing days.
      - Travel days (dayType: "travel") should have lighter activities — maybe 1 thing at the departure city in the morning and 1 at the arrival city in the evening.
      - Arrival day and departure day should be lighter (airport logistics, check-in/out).
      ${restDesc}
      - ${interests.length > 0 ? `Prioritize activities matching these interests: ${interests.join(', ')}` : 'General sightseeing'}
      - Include morning, afternoon, and evening activity slots where appropriate.
      - Include meal recommendations for each day.
      - Include transport segments between activities.
      - Optimize logistics — cluster nearby activities together.
      ${totalBudget > 0 ? `- Total trip budget is ${totalBudget} ${currency} (about ${Math.round(totalBudget / context.travelPeriod.durationDays)} ${currency}/day). Choose activities and meals that fit within this budget.` : ''}
    `;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
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
                  dayType: { type: Type.STRING },
                  city: { type: Type.STRING },
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
      console.log(`[Architect] Got ${result.itinerary?.length ?? 0} days. Day types:`, result.itinerary?.map((d: any) => `${d.date} ${d.city} (${d.dayType})`).join(', '));
      return result;
    } catch (e) {
      console.error("Failed to parse Architect response:", e);
      console.error("[Architect] Raw response:", response.text?.slice(0, 300));
      return {};
    }
  }
}
