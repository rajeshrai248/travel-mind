import { GoogleGenAI, Type } from "@google/genai";
import { TravelContext, TrendingDestination, CityFeasibility } from "../types";

export class DestinationAdvisor {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async getFamousDestinations(country: string, baseCity: string): Promise<TrendingDestination[]> {
    const baseCityNote = baseCity
      ? `The traveler's base city is ${baseCity}. Include it if notable, but prioritise diversity across the country.`
      : '';

    const prompt = `
      List the top 8–10 most famous and diverse tourist cities and destinations in ${country}.
      ${baseCityNote}
      Include a spread across the country — not just the capital or the most-hyped city.
      For each destination return: city name, country, a compelling 1–2 sentence reason to visit, 2–4 relevant interest tags (e.g. "history", "food", "nature", "beaches", "nightlife", "architecture"), an imageQuery string suitable for a stock photo search, and a score from 1–10 reflecting overall tourist appeal.
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
      const destinations: TrendingDestination[] = result.destinations || [];
      console.log(`[DestinationAdvisor] getFamousDestinations(${country}): got ${destinations.length} destinations`);
      return destinations;
    } catch (e) {
      console.error("[DestinationAdvisor] Failed to parse getFamousDestinations response:", e);
      return [];
    }
  }

  async validateCity(context: TravelContext, cityName: string): Promise<CityFeasibility> {
    const currentDestinations = context.destinations
      .map(d => `${d.destination.city}, ${d.destination.country} (${d.stayDays} days)`)
      .join("; ");

    const prompt = `
      A traveler wants to add "${cityName}" to their existing trip. Assess the feasibility.

      Current trip details:
      - Base city: ${context.baseCity?.city ?? "unknown"}, ${context.baseCity?.country ?? ""}
      - Travel period: ${context.travelPeriod?.startDate ?? "unknown"} to ${context.travelPeriod?.endDate ?? "unknown"} (${context.travelPeriod?.durationDays ?? "?"} days total)
      - Total budget: ${context.preferences.currency} ${context.preferences.totalBudget}
      - Transport mode: ${context.preferences.transportMode}
      - Travel radius preference: ${context.preferences.travelRadius} km from base city
      - Current destinations: ${currentDestinations || "none yet"}

      Questions to answer:
      1. Is "${cityName}" reachable given the transport mode and travel radius?
      2. What is the estimated additional cost (accommodation + transport) to add this city?
      3. How many extra days would be ideal to visit it properly?
      4. Is it within the remaining budget, or would the budget need to increase?
      5. If the budget is insufficient, what new total budget would you recommend? (current budget + estimated impact + a 10% buffer)

      Respond with a structured feasibility assessment.
    `;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            city: { type: Type.STRING },
            country: { type: Type.STRING },
            feasible: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
            budgetImpact: { type: Type.NUMBER },
            daysNeeded: { type: Type.NUMBER },
            recommendation: { type: Type.STRING },
            newTotalBudget: { type: Type.NUMBER },
          },
          required: ["city", "country", "feasible", "reason", "budgetImpact", "daysNeeded", "recommendation"],
        },
      },
    });

    try {
      const result: CityFeasibility = JSON.parse(response.text || "{}");
      console.log(`[DestinationAdvisor] validateCity(${cityName}): feasible=${result.feasible}, budgetImpact=${result.budgetImpact}`);
      return result;
    } catch (e) {
      console.error("[DestinationAdvisor] Failed to parse validateCity response:", e);
      // Return a safe fallback
      return {
        city: cityName,
        country: "Unknown",
        feasible: false,
        reason: "Could not assess feasibility at this time. Please try again.",
        budgetImpact: 0,
        daysNeeded: 2,
        recommendation: "Try checking again in a moment.",
      };
    }
  }
}
