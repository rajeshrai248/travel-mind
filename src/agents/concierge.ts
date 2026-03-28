import { GoogleGenAI, Type } from "@google/genai";
import { TravelContext, AccommodationOption, TransportOption, DestinationStop } from "../types";

export class Concierge {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async recommend(context: TravelContext): Promise<Partial<TravelContext>> {
    if (!context.travelPeriod) return {};

    const hasMultipleStops = context.destinations && context.destinations.length > 0;

    if (hasMultipleStops) {
      return await this.recommendMultiStop(context);
    }

    // Legacy single-destination fallback
    if (!context.destination) return {};
    return await this.recommendSingle(context.destination.city, context.destination.country, context);
  }

  private async recommendMultiStop(context: TravelContext): Promise<Partial<TravelContext>> {
    // Get unique non-base cities that need accommodation (base city included if staying overnight)
    const uniqueStops = new Map<string, DestinationStop>();
    for (const stop of context.destinations) {
      const key = `${stop.destination.city}-${stop.destination.country}`;
      if (!uniqueStops.has(key) && stop.stayDays > 0) {
        uniqueStops.set(key, stop);
      }
    }

    const stops = Array.from(uniqueStops.values());

    // Get accommodations for all stops in parallel
    const results = await Promise.all(
      stops.map(stop =>
        this.recommendSingle(stop.destination.city, stop.destination.country, context, stop.stayDays)
      )
    );

    // Merge all results
    const allAccommodations: AccommodationOption[] = [];
    const allTransport: TransportOption[] = [];
    for (const result of results) {
      if (result.accommodations) allAccommodations.push(...result.accommodations);
      if (result.transport) allTransport.push(...result.transport);
    }

    // Add inter-city transport options
    const interCityTransport = await this.getInterCityTransport(context);

    return {
      accommodations: allAccommodations,
      transport: [...allTransport, ...interCityTransport],
    };
  }

  private async recommendSingle(
    city: string,
    country: string,
    context: TravelContext,
    stayDays?: number,
  ): Promise<{ accommodations: AccommodationOption[]; transport: TransportOption[] }> {
    const stayNote = stayDays ? `Staying for ${stayDays} nights.` : '';
    const transportMode = context.preferences.transportMode;
    const transportHint =
      transportMode === 'car'
        ? 'Transport: the traveler has a rental car. Include car rental companies (with daily rates) and parking options in the transport array.'
        : transportMode === 'public'
        ? 'Transport: traveler uses public transport only. Include metro/bus passes, taxi/rideshare options.'
        : 'Transport: mix of rental car and public transport. Include both car rental options and public transit passes.';

    const prompt = `
      Recommend accommodations and local transport options in ${city}, ${country}.
      Dates: ${context.travelPeriod!.startDate} to ${context.travelPeriod!.endDate}.
      ${stayNote}
      Total trip budget: ${context.preferences.totalBudget} ${context.preferences.currency} for the entire trip (${context.travelPeriod!.durationDays} days).
      ${transportHint}

      For accommodations:
      - Include at least 3 options (Budget, Mid-Range, Premium tiers)
      - Include hotels, boutique hotels, and Airbnb/apartment-style options
      - Tag each with its city name in the location field (e.g. "City Center, ${city}")
      - Include realistic price per night in ${context.preferences.currency}

      For transport:
      - Include at least 2-3 options relevant to the transport preference above
      - For car rentals: include the provider name, daily rate, and vehicle type in details
      - Include realistic prices

      Generate a unique id for each accommodation and transport option (e.g. "acc-${city.toLowerCase().replace(/\s/g,'-')}-1").
    `;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
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
                required: ["id", "name", "type", "pricePerNight", "rating", "location"],
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
                required: ["id", "type", "provider", "price", "details"],
              },
            },
          },
          required: ["accommodations", "transport"],
        },
      },
    });

    try {
      const result = JSON.parse(response.text || "{}");
      console.log(`[Concierge] ${city}: ${result.accommodations?.length ?? 0} accommodations, ${result.transport?.length ?? 0} transport options`);
      return {
        accommodations: result.accommodations || [],
        transport: result.transport || [],
      };
    } catch (e) {
      console.error(`Failed to parse Concierge response for ${city}:`, e);
      console.error(`[Concierge] Raw response for ${city}:`, response.text?.slice(0, 300));
      return { accommodations: [], transport: [] };
    }
  }

  private async getInterCityTransport(context: TravelContext): Promise<TransportOption[]> {
    if (context.destinations.length < 2) return [];

    const legs = context.destinations
      .slice(1)
      .map((stop, i) => `${context.destinations[i].destination.city} → ${stop.destination.city} (${stop.travelModeFromPrevious})`)
      .join(', ');

    const prompt = `
      Recommend inter-city transport options for these legs: ${legs}.
      Transport preference: ${context.preferences.transportMode}.
      Total trip budget: ${context.preferences.totalBudget} ${context.preferences.currency} for the entire trip (${context.travelPeriod!.durationDays} days, so roughly ${Math.round(context.preferences.totalBudget / context.travelPeriod!.durationDays)} ${context.preferences.currency}/day).
      Include realistic prices and providers. If rental car, include estimated fuel cost.
    `;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
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
          required: ["transport"],
        },
      },
    });

    try {
      const result = JSON.parse(response.text || "{}");
      return result.transport || [];
    } catch (e) {
      console.error("Failed to parse inter-city transport response:", e);
      return [];
    }
  }
}
