import { GoogleGenAI, Type } from "@google/genai";
import { TravelContext } from "../types";

export class TicketReader {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async parse(pdfText: string): Promise<Partial<TravelContext>> {
    console.log('[TicketReader] Starting, text length:', pdfText?.length, 'apiKey present:', !!this.ai);
    const prompt = `
      Extract structured travel data from the following airline ticket text:
      "${pdfText}"

      Extract:
      - Departure city and Arrival city
      - Departure date/time and Return date/time
      - Airline and Booking reference
      - Passenger name(s)
      - Layovers/connections if any

      Deduce the travel period (start date, end date, duration in days).
    `;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            flights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  airline: { type: Type.STRING },
                  flightNumber: { type: Type.STRING },
                  departureCity: { type: Type.STRING },
                  arrivalCity: { type: Type.STRING },
                  departureTime: { type: Type.STRING },
                  arrivalTime: { type: Type.STRING },
                  bookingReference: { type: Type.STRING },
                },
                required: ["airline", "departureCity", "arrivalCity", "departureTime", "arrivalTime"],
              },
            },
            passengers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                },
                required: ["name"],
              },
            },
            destination: {
              type: Type.OBJECT,
              properties: {
                city: { type: Type.STRING },
                country: { type: Type.STRING },
              },
              required: ["city", "country"],
            },
            travelPeriod: {
              type: Type.OBJECT,
              properties: {
                startDate: { type: Type.STRING },
                endDate: { type: Type.STRING },
                durationDays: { type: Type.INTEGER },
              },
              required: ["startDate", "endDate", "durationDays"],
            },
          },
          required: ["flights", "passengers", "destination", "travelPeriod"],
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
