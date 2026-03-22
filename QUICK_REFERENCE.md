# TravelMind: QUICK REFERENCE FOR COPILOT INSTRUCTIONS

## CRITICAL FACTS

### 1. ALL AGENTS CALL GEMINI-2.5-FLASH
- Model: 'gemini-2.5-flash' (hardcoded everywhere)
- API: @google/genai GoogleGenAI
- Auth: process.env.GEMINI_API_KEY (Vite injected)
- Config: ALL use JSON schema responseMimeType

### 2. ORCHESTRATOR FLOW
PDF → TicketReader → awaiting_preferences
Prefs → RegionPlanner → Explorer → Architect → Concierge → reviewing
Approve → Closer → Scheduler → confirmed

### 3. AGENT SCHEMAS
- TicketReader: flights, passengers, destination, travelPeriod
- RegionPlanner: destinations[{stayDays, isBaseCity, travelTime}]
- Explorer: activities[{name, category, location, rating, city}]
- Architect: itinerary[{dayNumber, date, dayType, activities, meals, transport}]
- Concierge: accommodations[], transport[]
- Companion: string (chat response)

### 4. STORE PATTERN (SHALLOW MERGE ONLY!)
setContext({preferences: {...}})  // Shallow!
// For nested updates, YOU spread:
setContext({preferences: {...context.preferences, pace: 'intense'}})

### 5. STATUS DRIVES NAVIGATION
idle → parsing → awaiting_preferences → region_planning → researching 
→ planning → reviewing → confirming → confirmed

Status 'reviewing' shows approval buttons
Status 'confirmed' shows success card

### 6. KEY TYPES
TravelContext: central data structure
  - baseCity (primary), destinations[] (multi-city)
  - travelPeriod: {startDate, endDate, durationDays}
  - preferences: TravelPreferences
  - itinerary: DayPlan[]
  - status: TripStatus

DestinationEdits: {kept: DestinationStop[], added: string[]}
  - For "Change it up" - user manually edits destinations

### 7. MULTI-CITY PATTERN
RegionPlanner: outputs destinations with stayDays, isBaseCity
Explorer: researches each city in parallel Promise.all()
Architect: receives merged activities, groups by city
Concierge: deduplicates, recommends per-city in parallel

### 8. AUTHENTICATION
Client: Firebase (Google/Facebook) → user.getIdToken()
Server: firebase-admin verifyIdToken(Bearer token)
Auto-attach to /api/parse-ticket requests

### 9. PERSISTENCE
Firestore: /users/{uid}/trips/{tripId}
Auto-save: useTripPersistence hook on status change
Saveable: 'awaiting_preferences', 'reviewing', 'confirmed'

### 10. BUILD
Vite + Tailwind v4
@theme tokens (MD3: primary #005251 teal, secondary #984623 orange)
Path alias: @/* → ./ (root)
GEMINI_API_KEY injected via define

### 11. SERVER
Express on port 3000
POST /api/parse-ticket: multer + pdf-parse + Firebase auth
Dev: Vite middleware, Prod: static dist/

### 12. NON-OBVIOUS
- Agents silently return {} on error (no throw)
- destination vs baseCity both used (legacy + new)
- Calendar events local only (not Google sync)
- PDF extraction happens server-side, sent to client agent
- Companion.chat() uses specific genai API: chat.sendMessage({message})
- RegionPlanner.planWithEdits() lets user override auto-discovery

