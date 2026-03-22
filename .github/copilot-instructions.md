# TravelMind – Copilot Instructions

## Commands

```bash
npm run dev      # Express + Vite dev server on port 3000 (uses tsx)
npm run build    # Production build (Vite → dist/)
npm start        # Production server (node server.ts)
npm run lint     # TypeScript type-check only (tsc --noEmit) — no ESLint
npm run clean    # Remove dist/
```

There are no tests configured.

## Architecture

TravelMind is a multi-agent AI travel planning app. Users upload a flight PDF; a sequential agent pipeline extracts flight data, plans a multi-city route, researches attractions, builds a day-by-day itinerary, and recommends accommodation.

### Agent pipeline

All agents live in `src/agents/`. The pipeline is orchestrated by `Orchestrator` and triggered from `NewTripScreen`:

```
PDF upload → ticket-reader → (pause for user preferences) → region-planner → explorer → architect → concierge
Text message → companion
Approval → closer → scheduler
```

Each agent is a class accepting `apiKey` in the constructor and exposing a single async method that takes `TravelContext` and returns `Partial<TravelContext>`. The Orchestrator sequences them, merging results into a running `TravelContext` at each step.

The `onProgress` callback accepts a stage string (`'ticket'`, `'region_planner'`, `'explorer'`, `'architect'`, `'concierge'`) that maps to the `STAGES` array in `NewTripScreen.tsx` for the loading UI.

### Gemini API pattern

Every agent (except `Closer` and `Scheduler`, which are simulated) follows this exact pattern:

```ts
import { GoogleGenAI, Type } from "@google/genai";

const response = await this.ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: prompt,
  config: {
    responseMimeType: "application/json",
    responseSchema: { type: Type.OBJECT, properties: { ... } },
  },
});
const result = JSON.parse(response.text || "{}");
```

`Companion` uses `this.ai.chats.create(...)` + `chat.sendMessage()` instead (for conversation history). `Explorer` runs `researchSingle` in parallel with `Promise.all` when there are multiple destination stops.

`GEMINI_API_KEY` is read from `.env`, injected into the Vite client bundle via `vite.config.ts` `define`, and accessed at runtime as `process.env.GEMINI_API_KEY`.

### State management

A single Zustand store (`src/store/tripStore.ts`) holds the entire `TravelContext` object (defined in `src/types.ts`). Agents return `Partial<TravelContext>` and the store's `setContext` does a shallow merge (`{ ...state.context, ...newContext }`). `loadContext` replaces the whole object (used when loading from Firestore).

Only three statuses trigger Firestore auto-save: `'awaiting_preferences'`, `'reviewing'`, `'confirmed'` (see `useTripPersistence.ts`).

### TripStatus flow

```
idle → parsing → awaiting_preferences → region_planning → researching → planning → reviewing → booking → confirming → confirmed
```

The UI auto-switches to the trips tab when status reaches `'reviewing'` or `'confirmed'`.

### Server

`server.ts` is a single Express server that:
- Serves Vite dev middleware in development, static files from `dist/` in production
- `POST /api/parse-ticket` — multer memory storage → `pdf-parse` → returns `{ text }` (raw PDF text)
- Auth middleware verifies Firebase ID tokens (`Authorization: Bearer <token>`). Auth is **skipped** locally if `FIREBASE_SERVICE_ACCOUNT_KEY` is not set.
- Run with `tsx server.ts` in dev, `node server.ts` in prod

### Frontend routing

No router library — navigation is state-driven in `App.tsx`. Tab state (`'home' | 'chat' | 'trips' | 'profile'`) and a `showNewTrip` boolean control which screen renders. `NewTripScreen` slides in as a full-screen overlay (`fixed inset-0 z-[100]`) with a spring animation.

### Firebase / Auth

- `src/lib/firebase.ts` — Firebase client init (Auth + Firestore)
- `src/store/authStore.ts` — Zustand store for `user`, `loading`, `error`
- `src/hooks/useAuth.ts` — sets up the `onAuthStateChanged` listener
- `src/lib/tripService.ts` — Firestore CRUD: trips stored at `users/{uid}/trips/{tripId}`
- `src/lib/api.ts` — `getAuthHeaders()` gets a Firebase ID token for server requests

## Key Conventions

### Styling

Tailwind CSS v4 via `@tailwindcss/vite` (no `tailwind.config.js`). All design tokens are Material Design 3 custom properties defined in `src/index.css` under `@theme { ... }` and usable directly as Tailwind classes:

- `bg-primary`, `text-on-primary`, `bg-surface-container`, `text-on-surface-variant`, `border-outline-variant`, etc.
- Utility: `cn()` from `src/utils/cn.ts` (clsx + tailwind-merge)
- Common rounding: `rounded-xl` (buttons, cards), `rounded-2xl` (larger containers)
- `.glass-nav` and `.no-scrollbar` are global utility classes defined in `index.css`

### Path aliases

`@` resolves to the project root (not `src/`). So imports like `@/src/types` or `@/src/store/tripStore` work, but the conventional `@/components/...` actually means `<root>/components/...`.

### Component patterns

UI primitives (`Button`, `Card`, `Badge`) are in `src/components/` and accept standard HTML element props plus a `variant` and `size`. Always use the `Button` component over raw `<button>` elements. Icons come from `lucide-react`.

### Adding a new agent

1. Create `src/agents/my-agent.ts` as a class with `constructor(apiKey: string)` and an async method receiving `TravelContext`
2. Import and instantiate it in `Orchestrator`
3. Add a case in `Orchestrator.processInput` or wire it into an existing pipeline method
4. Add a matching stage entry to `STAGES` in `NewTripScreen.tsx` if it needs progress UI

### TravelContext field notes

- `destination` and `baseCity` both point to the arrival city; `destination` is kept for backward compatibility — prefer `baseCity`
- `destinations` (plural) is the `DestinationStop[]` multi-city route — always check this before falling back to `destination`
- Agent results merged with `setContext` are shallow — nested objects (e.g. `preferences`) are replaced entirely, not deep-merged

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Gemini API — bundled into the Vite client build |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Optional | Firebase Admin for server-side token verification; auth is bypassed locally without it |

See `.env.example` for the template.
