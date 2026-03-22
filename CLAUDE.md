# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TravelMind is a multi-agent AI travel planning app built with React 19, Express, and Google Gemini. Users upload flight ticket PDFs, and a pipeline of specialized AI agents extracts flight data, researches destinations, builds itineraries, and recommends accommodations.

## Commands

```bash
npm run dev          # Dev server (Express + Vite HMR) on port 3000
npm run build        # Production build (Vite → dist/)
npm start            # Production server
npm run lint         # Type check only (tsc --noEmit) — no linter like ESLint
npm run clean        # Remove dist/
```

There are no tests configured.

## Architecture

### Multi-Agent Pipeline

All agents live in `src/agents/` and use Google Gemini (`@google/genai`) with structured JSON schema responses. Each agent receives a `TravelContext` and returns a partial update to it.

**Pipeline flow:** PDF upload → `orchestrator` → `ticket-reader` → `explorer` → `architect` → `concierge`

- **orchestrator.ts** — Routes inputs to the correct agent. PDF uploads trigger the full pipeline; text messages go to `companion`; approvals go to `closer` + `scheduler`.
- **ticket-reader.ts** — Extracts flight/passenger data from PDF text.
- **explorer.ts** — Researches destination attractions (uses Google Search tool integration).
- **architect.ts** — Builds day-by-day itineraries from explored activities.
- **concierge.ts** — Recommends hotels and transport at budget/mid/premium tiers.
- **companion.ts** — Conversational chat agent with memory of prior messages.
- **closer.ts** / **scheduler.ts** — Simulated booking and calendar event creation.

### State Management

Zustand store in `src/store/tripStore.ts` holds a single `TravelContext` object (defined in `src/types.ts`). Agents produce partial context updates; the UI reacts to state changes.

### Server

`server.ts` — Express server with:
- `POST /api/parse-ticket` — PDF upload via multer (memory storage), parsed with pdf-parse
- Vite dev middleware in development; static file serving in production
- SPA fallback for client-side routing

### Frontend

- **Screens** in `src/screens/`: Home, NewTrip (file upload + progress), Chat, Itinerary
- **Components** in `src/components/`: Layout (bottom nav), Button, Card, Badge
- Tailwind CSS 4 with Material Design 3 color tokens defined in `src/index.css`
- Path alias: `@/*` maps to project root

### Environment

Requires `GEMINI_API_KEY` in `.env` (see `.env.example`). The key is injected into the Vite client bundle via `vite.config.ts`.
