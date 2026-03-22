# 📚 TravelMind Codebase Exploration - INDEX

## Generated Documentation

This exploration has generated 3 comprehensive reference documents:

### 1. QUICK_REFERENCE.md (2.9 KB)
**Best for:** Quick lookups during development

Contents:
- 12 critical architectural facts
- Gemini API integration pattern
- Orchestrator flow diagram
- All agent schemas
- Store pattern (shallow merge!)
- Key types quick reference
- Multi-city pattern
- Authentication flow
- Persistence rules
- Build setup
- Server endpoints
- Non-obvious gotchas

**When to use:** During implementation, when you need quick answers

---

### 2. CODEBASE_SUMMARY.md (24.6 KB)
**Best for:** Deep understanding and reference

14 Sections:
1. PROJECT OVERVIEW
2. AGENTS (src/agents/) - All 10 agents with full schemas
3. STATE MANAGEMENT (tripStore, authStore, merge patterns)
4. TYPES (TravelContext, all 15+ interfaces)
5. SCREENS (App, HomeScreen, NewTripScreen, ItineraryScreen, ChatScreen)
6. COMPONENTS (Button, Card, Badge, Layout, TravelPreferencesForm)
7. SERVER (Express, routes, auth middleware)
8. BUILD CONFIG (Vite, TypeScript, path aliases)
9. STYLING (MD3 tokens, Tailwind v4)
10. AUTHENTICATION (Firebase client + admin)
11. DATA PERSISTENCE (Firestore auto-save/load)
12. GEMINI API KEY FLOW
13. COMMON PATTERNS (13 patterns documented)
14. NON-OBVIOUS CONVENTIONS (13 conventions + gotchas)

**When to use:** Writing features, understanding architecture, debugging

---

### 3. EXPLORATION_CHECKLIST.md (4.6 KB)
**Best for:** Understanding what was covered

Contents:
- Checklist of all 26 files examined
- Stats (agents, components, types, etc.)
- What was NOT examined (and why)
- Documents created reference
- Ready-for sections (what you can now do)

**When to use:** After exploration, reference during instruction writing


## HOW TO USE THESE DOCUMENTS

### Scenario 1: Adding a New Agent
→ Read QUICK_REFERENCE.md #2 (Agent Schemas)
→ Read CODEBASE_SUMMARY.md Section 1 (Agents) + Section 2 (Orchestrator)
→ Follow pattern from existing agents

### Scenario 2: Adding a Component
→ Read QUICK_REFERENCE.md #10 (CSS tokens)
→ Read CODEBASE_SUMMARY.md Section 5 (Components + Screens)
→ Check existing Button/Card/Badge for prop patterns

### Scenario 3: Debugging Store Issues
→ Read QUICK_REFERENCE.md #4 (Store Pattern - SHALLOW MERGE!)
→ Read CODEBASE_SUMMARY.md Section 3 (State Management)
→ Check useTripPersistence for auto-save logic

### Scenario 4: Understanding Multi-City Flow
→ Read QUICK_REFERENCE.md #6 (Multi-City Pattern)
→ Read CODEBASE_SUMMARY.md Section 2 (RegionPlanner, Explorer, Architect)
→ Follow destinations[] through pipeline

### Scenario 5: Writing Gemini Integration
→ Read QUICK_REFERENCE.md #1 (Gemini Pattern)
→ Read CODEBASE_SUMMARY.md Section 2 (Agent Schemas)
→ Use existing agents as templates (all follow same pattern)


## KEY DOCUMENTS IN TRAVEL-MIND FOLDER

`
travel-mind/
├── QUICK_REFERENCE.md          ← Start here for quick answers
├── CODEBASE_SUMMARY.md         ← Full reference (14 sections)
├── EXPLORATION_CHECKLIST.md    ← What was examined
├── README.md                   ← Original setup instructions
└── CLAUDE.md                   ← Context from AI Studio
`


## CRITICAL PATTERNS TO REMEMBER

1. **All agents call gemini-2.5-flash**
   - Same model everywhere
   - Same JSON schema pattern
   - Always use responseMimeType:"application/json"

2. **Orchestrator is the single entry point**
   - No direct agent calls from screens
   - All user input flows through orchestrator.processInput()
   - Returns Partial<TravelContext> for merge

3. **Store merge is SHALLOW**
   - setContext({prefs}) DOES NOT deep merge preferences
   - Must manually spread: setContext({prefs: {...context.prefs, ...}})
   - Only 1 level of merging happens

4. **Status drives navigation**
   - App.tsx watches context.status
   - Status changes trigger tab switches
   - 8 status states in pipeline

5. **Multi-city is core feature**
   - Respected by all agents
   - RegionPlanner outputs destinations[]
   - Explorer, Architect, Concierge handle in parallel
   - "Change it up" uses DestinationEdits type


## FILES EXAMINED (26 TOTAL)

Agents (10):
- orchestrator.ts
- ticket-reader.ts
- region-planner.ts
- explorer.ts
- architect.ts
- concierge.ts
- companion.ts
- closer.ts
- scheduler.ts
- trending.ts

Screens (5):
- App.tsx
- HomeScreen.tsx
- NewTripScreen.tsx
- ItineraryScreen.tsx
- ChatScreen.tsx

Components (5):
- Button.tsx
- Card.tsx
- Badge.tsx
- Layout.tsx
- TravelPreferencesForm.tsx

Store (2):
- tripStore.ts
- authStore.ts

Config (5):
- vite.config.ts
- tsconfig.json
- package.json
- index.css
- .env.example

Server (1):
- server.ts

Types (1):
- types.ts

Services (2):
- firebase.ts
- api.ts

Persistence (1):
- tripService.ts


## NEXT STEPS

You now have everything needed to write copilot-instructions.md:

✓ Complete understanding of agent patterns
✓ Store merge behavior documented
✓ All type definitions known
✓ Screen routing logic understood
✓ Component patterns identified
✓ Build configuration explained
✓ Auth flow mapped
✓ Persistence strategy understood
✓ Gemini API integration pattern known
✓ 13 common patterns documented
✓ 13 non-obvious conventions highlighted

Write instruction sections for:
- Adding new agents
- Creating new screens
- Building components
- Extending types
- Modifying preferences
- Debugging store state
- Tracing orchestrator flow
- Working with multi-city trips
- Firebase auth issues
- Gemini API errors

