import { GoogleGenAI } from "@google/genai";
import { TravelContext, Message } from "../types";

export class Companion {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async chat(context: TravelContext, userMessage: string): Promise<string> {
    const history = context.conversationHistory.map(m => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }],
    }));

    const chat = this.ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: `
          You are TravelMind Companion, a helpful AI travel assistant.
          You have access to the current travel context: ${JSON.stringify(context)}.
          Maintain conversational context and user preferences.
          Remember user preferences learned over time: budget tendencies, cuisine preferences, activity intensity level, accommodation style, travel companions.
          Support iterative refinement of the travel plan.
        `,
      },
    });

    // sendMessage only accepts the message parameter
    const response = await chat.sendMessage({ message: userMessage });
    return response.text || "I'm sorry, I couldn't process that.";
  }
}
