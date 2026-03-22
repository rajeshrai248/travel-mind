import { TravelContext, TravelPreferences, DestinationEdits } from "../types";
import { TicketReader } from "./ticket-reader";
import { RegionPlanner } from "./region-planner";
import { Explorer } from "./explorer";
import { Architect } from "./architect";
import { Concierge } from "./concierge";
import { Closer } from "./closer";
import { Scheduler } from "./scheduler";
import { Companion } from "./companion";

export class Orchestrator {
  private apiKey: string;
  private ticketReader: TicketReader;
  private regionPlanner: RegionPlanner;
  private explorer: Explorer;
  private architect: Architect;
  private concierge: Concierge;
  private closer: Closer;
  private scheduler: Scheduler;
  private companion: Companion;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.ticketReader = new TicketReader(apiKey);
    this.regionPlanner = new RegionPlanner(apiKey);
    this.explorer = new Explorer(apiKey);
    this.architect = new Architect(apiKey);
    this.concierge = new Concierge(apiKey);
    this.closer = new Closer();
    this.scheduler = new Scheduler();
    this.companion = new Companion(apiKey);
  }

  async processInput(context: TravelContext, input: { type: 'pdf' | 'text' | 'approval' | 'preferences', data: any }, onProgress?: (stage: string) => void): Promise<Partial<TravelContext>> {
    switch (input.type) {
      case 'pdf':
        return await this.handlePdf(context, input.data, onProgress);
      case 'preferences': {
        // Support both plain TravelPreferences (from NewTripScreen) and
        // { preferences, destinationEdits } (from ItineraryScreen "Change it up")
        const hasEdits = input.data && input.data.preferences && typeof input.data.preferences === 'object' && 'totalBudget' in input.data.preferences;
        if (hasEdits) {
          return await this.handlePlanTrip(context, input.data.preferences, onProgress, input.data.destinationEdits);
        }
        return await this.handlePlanTrip(context, input.data, onProgress);
      }
      case 'text':
        return await this.handleText(context, input.data);
      case 'approval':
        return await this.handleApproval(context, input.data);
      default:
        return {};
    }
  }

  /**
   * Phase 1: Parse ticket only, then pause for user preferences.
   */
  private async handlePdf(context: TravelContext, pdfText: string, onProgress?: (stage: string) => void): Promise<Partial<TravelContext>> {
    onProgress?.('ticket');
    const readerResult = await this.ticketReader.parse(pdfText);

    // Set baseCity from the parsed destination
    return {
      ...readerResult,
      baseCity: readerResult.destination ?? null,
      status: 'awaiting_preferences',
    };
  }

  /**
   * Phase 2: After user submits preferences, run the full planning pipeline.
   * If destinationEdits is provided (from "Change it up"), use those instead of region planner.
   */
  private async handlePlanTrip(context: TravelContext, preferences: TravelPreferences, onProgress?: (stage: string) => void, destinationEdits?: DestinationEdits): Promise<Partial<TravelContext>> {
    const newContext: TravelContext = { ...context, preferences };

    let contextAfterRegion: TravelContext;

    if (destinationEdits && (destinationEdits.kept.length > 0 || destinationEdits.added.length > 0)) {
      // User manually edited destinations — use their choices
      onProgress?.('region_planner');
      const regionResult = await this.regionPlanner.planWithEdits(newContext, destinationEdits);
      contextAfterRegion = { ...newContext, ...regionResult, status: 'researching' };
    } else {
      // Fresh planning — discover nearby destinations
      onProgress?.('region_planner');
      const regionResult = await this.regionPlanner.plan(newContext);
      contextAfterRegion = { ...newContext, ...regionResult, status: 'researching' };
    }

    // Explore activities for each destination
    onProgress?.('explorer');
    const explorerResult = await this.explorer.research(contextAfterRegion);
    const contextAfterResearch: TravelContext = { ...contextAfterRegion, status: 'planning' };

    // Build multi-city itinerary (pass explored activities for the architect to use)
    onProgress?.('architect');
    const architectResult = await this.architect.planItinerary(contextAfterResearch, explorerResult.activities);
    const contextAfterPlanning: TravelContext = { ...contextAfterResearch, ...architectResult, status: 'reviewing' };

    // Recommend accommodations per stop
    onProgress?.('concierge');
    const conciergeResult = await this.concierge.recommend(contextAfterPlanning);

    return {
      ...contextAfterPlanning,
      ...conciergeResult,
      status: 'reviewing',
    };
  }

  private async handleText(context: TravelContext, userMessage: string): Promise<Partial<TravelContext>> {
    const companionResponse = await this.companion.chat(context, userMessage);

    return {
      conversationHistory: [
        ...context.conversationHistory,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: companionResponse, agent: 'Companion' },
      ],
    };
  }

  private async handleApproval(context: TravelContext, isApproved: boolean): Promise<Partial<TravelContext>> {
    if (isApproved) {
      const closerResult = await this.closer.execute(context);
      const schedulerResult = await this.scheduler.sync({ ...context, ...closerResult } as TravelContext);

      return {
        ...closerResult,
        ...schedulerResult,
        status: 'confirmed',
      };
    } else {
      // "Change it up" — go back to preferences so user can tweak and re-plan
      return {
        status: 'awaiting_preferences',
      };
    }
  }
}
