import { GoogleGenAI, Type } from "@google/genai";
import { TravelContext, DestinationStop, DestinationEdits } from "../types";

export class RegionPlanner {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async plan(context: TravelContext): Promise<Partial<TravelContext>> {
    if (!context.baseCity || !context.travelPeriod) return {};

    const { transportMode, travelRadius, pace, restDayFrequency, interests } = context.preferences;
    const { durationDays } = context.travelPeriod;

    const transportDesc =
      transportMode === 'car' ? 'rental car (can drive anywhere within radius)'
      : transportMode === 'public' ? 'public transport only (trains, buses — no car)'
      : 'mix of rental car and public transport';

    const paceDesc =
      pace === 'relaxed' ? 'relaxed (1-2 activities/day, plenty of downtime)'
      : pace === 'moderate' ? 'moderate (2-3 activities/day, balanced)'
      : 'intense (packed schedule, see as much as possible)';

    const restDesc = restDayFrequency > 0
      ? `Schedule a rest/recovery day every ${restDayFrequency} active travel days. Rest days should have only light, optional activities.`
      : 'No mandatory rest days needed.';

    const prompt = `
      I'm arriving in ${context.baseCity.city}, ${context.baseCity.country} for ${durationDays} days.
      Travel dates: ${context.travelPeriod.startDate} to ${context.travelPeriod.endDate}.

      Transport: ${transportDesc}
      Travel radius: ${travelRadius} km from ${context.baseCity.city}
      Pace: ${paceDesc}
      Interests: ${interests.length > 0 ? interests.join(', ') : 'general sightseeing'}
      ${restDesc}

      Plan a multi-destination trip. Suggest which cities/towns to visit, how many days to spend in each,
      and the logical travel order. Consider:
      - Travel time between destinations (realistic for the transport mode)
      - Include the base/arrival city as the first and last stop
      - Allocate arrival day and departure day as lighter days
      - Include travel days when moving between distant cities (don't pack activities on travel days)
      - Total stayDays across all stops must equal exactly ${durationDays}
      - Only suggest destinations reachable by the specified transport mode within the radius
      - If transport is public-only and radius is small, it's OK to stay in one city with day trips

      Return the destinations in travel order. The first stop must be the arrival city (isBaseCity: true).
      If the trip returns to the base city at the end, add it again as the last stop (isBaseCity: true).
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
                  destination: {
                    type: Type.OBJECT,
                    properties: {
                      city: { type: Type.STRING },
                      country: { type: Type.STRING },
                      lat: { type: Type.NUMBER },
                      lng: { type: Type.NUMBER },
                    },
                    required: ["city", "country", "lat", "lng"],
                  },
                  stayDays: { type: Type.INTEGER },
                  isBaseCity: { type: Type.BOOLEAN },
                  distanceFromBase: { type: Type.NUMBER },
                  travelTimeFromPrevious: { type: Type.NUMBER },
                  travelModeFromPrevious: { type: Type.STRING },
                },
                required: ["destination", "stayDays", "isBaseCity", "distanceFromBase", "travelTimeFromPrevious", "travelModeFromPrevious"],
              },
            },
          },
          required: ["destinations"],
        },
      },
    });

    try {
      const result = JSON.parse(response.text || "{}");
      return {
        destinations: result.destinations || [],
      };
    } catch (e) {
      console.error("Failed to parse RegionPlanner response:", e);
      return {};
    }
  }

  /**
   * Re-plan with user-edited destinations: kept cities + newly added city names.
   */
  async planWithEdits(context: TravelContext, edits: DestinationEdits): Promise<Partial<TravelContext>> {
    if (!context.baseCity || !context.travelPeriod) return {};

    const { transportMode, pace, restDayFrequency, interests } = context.preferences;
    const { durationDays } = context.travelPeriod;

    const keptCities = edits.kept.map(s => s.destination.city);
    const addedCities = edits.added;

    const transportDesc =
      transportMode === 'car' ? 'rental car'
      : transportMode === 'public' ? 'public transport only'
      : 'mix of rental car and public transport';

    const paceDesc =
      pace === 'relaxed' ? 'relaxed (1-2 activities/day)'
      : pace === 'moderate' ? 'moderate (2-3 activities/day)'
      : 'intense (packed schedule)';

    const restDesc = restDayFrequency > 0
      ? `Schedule a rest/recovery day every ${restDayFrequency} active travel days.`
      : 'No mandatory rest days.';

    const prompt = `
      I'm arriving in ${context.baseCity.city}, ${context.baseCity.country} for ${durationDays} days.
      Travel dates: ${context.travelPeriod.startDate} to ${context.travelPeriod.endDate}.

      Transport: ${transportDesc}
      Pace: ${paceDesc}
      Interests: ${interests.length > 0 ? interests.join(', ') : 'general sightseeing'}
      ${restDesc}

      The traveler has manually chosen their destinations. Build a trip plan using EXACTLY these cities:
      - KEEP these cities: ${keptCities.join(', ')}
      ${addedCities.length > 0 ? `- ADD these new cities: ${addedCities.join(', ')}` : ''}

      Rules:
      - The base/arrival city (${context.baseCity.city}) must be the first and last stop
      - Distribute the ${durationDays} days across all cities logically
      - Include travel days when moving between distant cities
      - Total stayDays across all stops must equal exactly ${durationDays}
      - Order the cities in a logical travel route to minimize backtracking
      - For newly added cities, provide realistic coordinates and country

      Return the destinations in travel order.
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
                  destination: {
                    type: Type.OBJECT,
                    properties: {
                      city: { type: Type.STRING },
                      country: { type: Type.STRING },
                      lat: { type: Type.NUMBER },
                      lng: { type: Type.NUMBER },
                    },
                    required: ["city", "country", "lat", "lng"],
                  },
                  stayDays: { type: Type.INTEGER },
                  isBaseCity: { type: Type.BOOLEAN },
                  distanceFromBase: { type: Type.NUMBER },
                  travelTimeFromPrevious: { type: Type.NUMBER },
                  travelModeFromPrevious: { type: Type.STRING },
                },
                required: ["destination", "stayDays", "isBaseCity", "distanceFromBase", "travelTimeFromPrevious", "travelModeFromPrevious"],
              },
            },
          },
          required: ["destinations"],
        },
      },
    });

    try {
      const result = JSON.parse(response.text || "{}");
      return {
        destinations: result.destinations || [],
      };
    } catch (e) {
      console.error("Failed to parse RegionPlanner (edits) response:", e);
      return {};
    }
  }
}
