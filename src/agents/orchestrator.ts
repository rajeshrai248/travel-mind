import { GoogleGenAI } from "@google/genai";
import { TravelContext, Message } from "../types";
import { TicketReader } from "./ticket-reader";
import { Explorer } from "./explorer";
import { Architect } from "./architect";
import { Concierge } from "./concierge";
import { Closer } from "./closer";
import { Scheduler } from "./scheduler";
import { Companion } from "./companion";

export class Orchestrator {
  private apiKey: string;
  private ticketReader: TicketReader;
  private explorer: Explorer;
  private architect: Architect;
  private concierge: Concierge;
  private closer: Closer;
  private scheduler: Scheduler;
  private companion: Companion;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.ticketReader = new TicketReader(apiKey);
    this.explorer = new Explorer(apiKey);
    this.architect = new Architect(apiKey);
    this.concierge = new Concierge(apiKey);
    this.closer = new Closer();
    this.scheduler = new Scheduler();
    this.companion = new Companion(apiKey);
  }

  async processInput(context: TravelContext, input: { type: 'pdf' | 'text' | 'approval', data: any }): Promise<Partial<TravelContext>> {
    switch (input.type) {
      case 'pdf':
        return await this.handlePdf(context, input.data);
      case 'text':
        return await this.handleText(context, input.data);
      case 'approval':
        return await this.handleApproval(context, input.data);
      default:
        return {};
    }
  }

  private async handlePdf(context: TravelContext, pdfText: string): Promise<Partial<TravelContext>> {
    const readerResult = await this.ticketReader.parse(pdfText);
    const newContext = { ...context, ...readerResult, status: 'researching' as const };
    
    // Auto-trigger research
    const explorerResult = await this.explorer.research(newContext as TravelContext);
    const contextAfterResearch = { ...newContext, ...explorerResult, status: 'planning' as const };
    
    // Auto-trigger planning
    const architectResult = await this.architect.planItinerary(contextAfterResearch as TravelContext);
    const contextAfterPlanning = { ...contextAfterResearch, ...architectResult, status: 'reviewing' as const };
    
    // Auto-trigger concierge
    const conciergeResult = await this.concierge.recommend(contextAfterPlanning as TravelContext);
    
    return {
      ...contextAfterPlanning,
      ...conciergeResult,
      status: 'reviewing',
    };
  }

  private async handleText(context: TravelContext, userMessage: string): Promise<Partial<TravelContext>> {
    const companionResponse = await this.companion.chat(context, userMessage);
    
    // For simplicity, we'll just add the message to history.
    // In a real app, the companion might trigger other agents.
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
      return {
        status: 'planning', // Go back to planning if rejected
      };
    }
  }
}
