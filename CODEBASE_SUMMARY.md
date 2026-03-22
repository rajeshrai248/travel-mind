# TravelMind Codebase Architecture Guide

This document provides a comprehensive overview of the TravelMind codebase for writing copilot-instructions.md.

## PROJECT OVERVIEW

**Purpose:** TravelMind is an AI-powered travel planning assistant that converts flight tickets into complete multi-city itineraries with activities, accommodations, and dining recommendations.

**Core Flow:**
1. User uploads flight ticket (PDF)
2. TicketReader extracts travel dates and destination
3. User fills TravelPreferences form
4. Multi-stage agent pipeline plans the trip
5. User reviews and books the itinerary

---

## 1. AGENTS (src/agents/)

### Key Pattern: Gemini API Integration
- **Model:** gemini-2.5-flash
- **API:** @google/genai v1.29.0
- **Config:** All agents use JSON schema with responseMimeType: "application/json"
- **API Key Flow:** process.env.GEMINI_API_KEY (injected by Vite in vite.config.ts line 11)

### Orchestrator (orchestrator.ts) - ENTRY POINT
- **Role:** Routes all user input to specialized agents
- **Methods:**
  - \processInput(context, input, onProgress?)\ - Main orchestration entry
    - input.type: 'pdf' | 'text' | 'approval' | 'preferences'
    - Returns Partial<TravelContext> for store merge
  - Handles 4 input types:
    1. PDF → TicketReader → "awaiting_preferences"
    2. Preferences → Full planning pipeline → "reviewing"
    3. Text → Companion chat
    4. Approval → Closer + Scheduler → "confirmed"
- **Pipeline Steps:**
  1. TicketReader (PDF parsing)
  2. RegionPlanner (discover nearby destinations)
  3. Explorer (research activities)
  4. Architect (build itinerary)
  5. Concierge (hotels & transport)
  6. Closer (simulate bookings)
  7. Scheduler (create calendar events)

### TicketReader (ticket-reader.ts)
- **Parses PDF airline tickets**
- **Returns Schema:**
  \\\json
  {
    flights: Flight[],
    passengers: Passenger[],
    destination: { city, country },
    travelPeriod: { startDate, endDate, durationDays }
  }
  \\\
- **Key Fields:** Extracts airline, booking ref, departure/arrival cities, times
- **Non-obvious:** Sets baseCity from parsed destination (line 66)

### RegionPlanner (region-planner.ts)
- **Generates multi-destination itinerary**
- **Two modes:**
  1. \plan(context)\ - Fresh discovery
  2. \planWithEdits(context, edits)\ - User-edited destinations
- **Returns Schema:**
  \\\json
  {
    destinations: [{
      destination: { city, country, lat, lng },
      stayDays: number,
      isBaseCity: boolean,
      distanceFromBase: number,
      travelTimeFromPrevious: number,
      travelModeFromPrevious: 'drive|train|bus|ferry|flight|none'
    }]
  }
  \\\
- **Constraints:** Total stayDays must equal durationDays (enforced in prompt)
- **Key Pattern:** Respects transportMode and travelRadius preferences

### Explorer (explorer.ts)
- **Research activities for each destination**
- **Handles multi-destination by researching each city in parallel**
- **Returns Schema:**
  \\\json
  {
    activities: [{
      name, category, description, rating, reviewCount,
      duration, location: { lat, lng, address },
      estimatedCost, highlights[], tags[], bookingRequired,
      city: "required tag field"
    }]
  }
  \\\
- **Key Pattern:** Tags activities with city name (line 108)
- **Parallel:** Promise.all for multiple cities (line 38-42)

### Architect (architect.ts)
- **Builds complete day-by-day itinerary**
- **Receives:** Full context + explored activities from Explorer
- **Returns Schema:**
  \\\json
  {
    itinerary: [{
      dayNumber, date (ISO YYYY-MM-DD), theme,
      dayType: 'arrival|departure|explore|travel|rest',
      city,
      activities: [{
        name, category, timeSlot: {start, end}, duration,
        location: {lat, lng, address},
        rating, estimatedCost, highlights[], tags[], bookingRequired
      }],
      meals: [{
        name, cuisine, priceRange, rating, address
      }],
      transportBetweenActivities: [{
        mode, duration, cost
      }],
      estimatedCost
    }]
  }
  \\\
- **Key Rules:**
  - Assigns dayType: "arrival" first day, "departure" last day
  - Enforces rest days every N travel days
  - Clusters nearby activities
  - Respects pace preference (1-2 relaxed, 2-3 moderate, packed intense)
- **Non-obvious:** Activity/meal timeSlot times must be HH:MM format

### Concierge (concierge.ts)
- **Recommends hotels and transport**
- **Multi-city handling:** Deduplicates cities, calls recommendSingle in parallel
- **Returns Schema:**
  \\\json
  {
    accommodations: [{
      id, name, type, pricePerNight, rating,
      location (includes city name), amenities[], photos[]
    }],
    transport: [{
      id, type, provider, price, details
    }]
  }
  \\\
- **Key Feature:** getInterCityTransport() for legs between stops
- **Budget Context:** Includes per-day budget in prompt

### Companion (companion.ts)
- **Conversational chat about the trip**
- **Uses chat history:** Maps messages to genai format (role: 'model' for assistant)
- **System Instruction:** Context-aware travel assistant
- **Returns:** Single string response
- **Non-obvious:** Uses \chat.sendMessage({message})\ not \sendMessage(message)\

### Closer (closer.ts) - NON-AI
- **Simulates booking confirmation**
- **Creates bookings from context (flights, accommodations)**
- **Returns:** { bookings, status: 'confirmed' }

### Scheduler (scheduler.ts) - NON-AI
- **Converts itinerary to calendar events**
- **Creates CalendarEvent for each activity**
- **Returns:** { calendarEvents }

### TrendingAgent (trending.ts)
- **Used in HomeScreen for seasonal destinations**
- **Returns Schema:**
  \\\json
  {
    destinations: [{
      city, country, reason, tags[], imageQuery, score
    }]
  }
  \\\
- **Personalization:** Takes UserPreferenceSummary (interests, pace, budget, visited)

---

## 2. STATE MANAGEMENT (src/store/)

### tripStore.ts - MAIN STORE (Zustand)
\\\	ypescript
interface TripState {
  context: TravelContext;
  setContext(partial) - SHALLOW MERGE into context
  addMessage(message) - APPEND to conversationHistory
  setStatus(status)
  resetTrip() - Back to initialContext
  loadContext(context) - REPLACE entire context (from Firestore)
}
\\\
- **Pattern:** setContext merges shallow (line 45)
- **InitialContext:** Default trip with empty/zero values
- **Key Flow:** Status transitions: idle → parsing → awaiting_preferences → region_planning → researching → planning → reviewing → confirmed

### authStore.ts
\\\	ypescript
interface AuthState {
  user: AppUser | null
  loading, error
  setUser, setLoading, setError
}
\\\

---

## 3. TYPES (src/types.ts)

### TravelContext - CORE DATA STRUCTURE
\\\	ypescript
{
  tripId: string;
  passengers: Passenger[];
  flights: Flight[];
  destination: Destination | null;  // LEGACY: use baseCity
  baseCity: Destination | null;     // PRIMARY base city
  destinations: DestinationStop[];   // MULTI-CITY route
  travelPeriod: { startDate, endDate, durationDays } | null;
  budget: { total, currency, perDay };
  preferences: TravelPreferences;
  itinerary: DayPlan[] | null;
  accommodations: AccommodationOption[] | null;
  transport: TransportOption[] | null;
  bookings: Booking[];
  calendarEvents: CalendarEvent[];
  status: TripStatus;
  conversationHistory: Message[];
}
\\\

### TravelPreferences
- totalBudget: number (actual currency amount)
- currency: 'USD' | 'EUR' | 'GBP' | ...
- interests: string[] (e.g., 'culture', 'food', 'nature')
- pace: 'relaxed' | 'moderate' | 'intense'
- transportMode: 'car' | 'public' | 'mixed'
- travelRadius: number (km from base)
- restDayFrequency: number (days, 0 = none)

### Key Relationships:
- Destination: { city, country, lat, lng }
- DestinationStop: { destination, stayDays, isBaseCity, distanceFromBase, travelTime, travelMode }
- DayPlan: { dayNumber, date, theme, dayType, city, activities[], meals[], transport[], estimatedCost }
- DestinationEdits: { kept: DestinationStop[], added: string[] } - For "Change it up" feature

---

## 4. SCREENS (src/screens/)

### App.tsx - ROUTING & AUTH GUARD
- **Tabs:** 'home' | 'chat' | 'trips' | 'profile'
- **Flow:**
  1. useAuth() hook - monitors auth state
  2. useTripPersistence() - auto-load/save to Firestore
  3. Not authenticated → LoginScreen
  4. Auto-switch to 'trips' when status === 'reviewing' | 'confirmed'
  5. NewTripScreen slides up from bottom via AnimatePresence
- **Key Pattern:** Context updates trigger status checks for tab auto-switch (line 34-37)

### HomeScreen.tsx
- **Displays:**
  - User greeting + avatar
  - "New trip" CTA
  - Horizontal scrolling trip cards (min-w-[280px])
  - Trending destinations for current month
- **Trip Card Actions:**
  - Click to resume trip
  - Hover to reveal delete button
  - Shows progress bar based on STATUS_CONFIG
- **Trending Section:** TrendingDestination[] with image query for Picsum
- **Key Pattern:** useTrendingDestinations() hook fetches current month trends

### NewTripScreen.tsx
- **3-Phase Flow:**
  1. **Upload Phase:** Drop ticket PDF/image
  2. **Preferences Phase:** TravelPreferencesForm
  3. **Processing Phase:** ProcessingView with stage indicators
- **Orchestration:**
  - Instantiates Orchestrator once (line 212)
  - Phase 1: handleFileUpload → processInput(type: 'pdf')
  - Phase 2: handlePreferencesSubmit → processInput(type: 'preferences')
  - Calls onProgress callback for stage updates
- **Non-obvious:** setPhase vs setStage - phase is UI state, stage is agent progress

### ItineraryScreen.tsx
- **Displays:** Full itinerary grouped by city
- **Edit Features:**
  - "Change it up" button → shows TravelPreferencesForm with destination editor
  - Support for DestinationEdits (kept + added cities)
- **Status Actions:**
  - reviewing: Shows "Book it" / "Change it up" buttons
  - confirmed: Shows green confirmation card
- **Key Pattern:** safeFormatDate() handles multiple date formats (YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY)
- **Timeline UI:** Vertical line with activity/meal dots

### ChatScreen.tsx
- **Layout:** Fixed viewport height (100dvh - 7rem) with scrolling messages
- **Messages:**
  - User messages: blue right-aligned
  - Assistant messages: left-aligned with agent label
  - Typing indicator: 3 animated dots
- **Input:** Bottom-pinned text input with send button
- **Orchestration:** handleSend → processInput(type: 'text')

### LoginScreen.tsx
- **Auth buttons:** Google + Facebook
- **Error handling:** Shows error message if login fails
- **Not examined in detail:** Assumed to use useAuth() hook methods

### ProfileScreen.tsx
- **Not examined in detail:** Assumed user settings/preferences

---

## 5. COMPONENTS (src/components/)

### Button.tsx
\\\	ypescript
props: {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost'
  size: 'sm' | 'md' | 'lg'
  // Standard button HTML attributes
}
\\\
- All variants use rounded-xl, transition-all, active:scale-[0.98]
- Shadows for primary/secondary, borders for outline

### Card.tsx
\\\	ypescript
props: {
  padding: 'none' | 'sm' | 'md' | 'lg'
  className: string
}
\\\
- Shadow: shadow-[0_8px_32px_rgba(21,28,39,0.06)]
- Border: border-outline-variant/10
- Rounded: rounded-3xl

### Badge.tsx
- Variants: primary, secondary, success, warning, error
- Font: text-[10px] font-bold uppercase tracking-wider

### Layout.tsx
- **Bottom nav** with 4 tabs (Home, Chat, Trips, Profile)
- **Max width:** max-w-2xl centered
- **Nav styling:** glass-nav (backdrop-blur-xl) rounded-t-[24px]
- **Responsive:** Full-width mobile, centered desktop

### TravelPreferencesForm.tsx (21 KB form component)
**Multi-step form with conditional logic:**

**Step 0 (if isChangingUp): Destination Editor**
- Remove non-base destinations
- Add new cities via input field
- Visual distinction: base cities green, kept cities normal, new cities green with + icon

**Step 1: Transport Mode**
- 3 options: Car, Public Transit, Mixed
- Conditional: If not public, show radius presets (50/150/300/500 km)

**Step 2: Travel Pace**
- 3 options: Relaxed, Moderate, Packed
- Icons + descriptions

**Step 3: Interests** (Multi-select)
- 8 interest tags: culture, nature, food, nightlife, beach, adventure, shopping, relaxation
- Must select ≥1 to proceed

**Step 4: Budget**
- Currency dropdown (USD, EUR, GBP, etc.)
- Budget input field
- Must enter > 0 to proceed

**Step 5: Rest Days**
- Slider for rest day frequency (every N days)

**Props:**
- baseCity, durationDays (required)
- initialPreferences (for editing)
- isChangingUp (shows destination step + different header)
- destinations (to populate editor)
- onSubmit(preferences, destinationEdits?) - called with optional edits if "Change it up"

**Key Pattern:** canProceed() validation guards Next button

---

## 6. SERVER (server.ts)

### Setup
- **Port:** 3000 (0.0.0.0 interface)
- **Framework:** Express
- **Middleware:** express.json()
- **Dev:** Vite middleware for HMR
- **Prod:** Static dist/ + SPA fallback

### Routes

**POST /api/parse-ticket** (Protected)
- **Auth:** Bearer token via authenticateRequest middleware
- **Upload:** Single file via multer (memory storage)
- **Process:** pdf-parse library extracts text
- **Response:** { text: string }
- **Error Handling:** 400 if no file, 401 if invalid token, 500 if parse fails

**GET /api/health**
- Simple liveness probe

### Auth Middleware (authenticateRequest)
- **Optional:** Skips if FIREBASE_SERVICE_ACCOUNT_KEY not set (local dev)
- **Token:** Expects "Bearer {idToken}" in Authorization header
- **Verification:** firebase-admin getAuth().verifyIdToken()
- **Attaches:** req.user = decoded token payload

### Vite Integration
- **Dev Mode:** createViteServer with middlewareMode
- **Prod Mode:** Serve static dist/, SPA fallback to index.html
- **HMR Config:** Respects DISABLE_HMR env var (for AI Studio)

---

## 7. BUILD CONFIG

### vite.config.ts
\\\	ypescript
{
  plugins: [react(), tailwindcss()],
  define: {
    'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') }
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true'
  }
}
\\\

**Key Pattern:** GEMINI_API_KEY injected as define global → available in client code

### tsconfig.json
- **Target:** ES2022
- **Module:** ESNext
- **JSX:** react-jsx
- **Paths:** @/* → ./* (root aliases)
- **moduleDetection:** force (for ESM)

### package.json
- **Scripts:**
  - dev: tsx server.ts (runs server with TS support)
  - build: vite build
  - start: node server.ts (production)
  - preview: vite preview
- **Key Deps:**
  - @google/genai ^1.29.0 - Gemini API
  - zustand ^5.0.12 - State
  - firebase ^12.11.0 - Auth/Firestore client
  - firebase-admin ^13.7.0 - Server auth
  - express ^4.21.2
  - tailwindcss ^4.1.14
  - motion ^12.23.24 - Framer Motion
  - lucide-react ^0.546.0 - Icons

---

## 8. STYLING

### src/index.css
**Tailwind + MD3 (Material Design 3) tokens:**

\\\css
@theme {
  /* Primary colors */
  --color-primary: #005251 (teal)
  --color-on-primary: #ffffff
  --color-primary-container: #1a6b6a
  --color-on-primary-container: #a0e9e7
  
  /* Secondary colors */
  --color-secondary: #984623 (orange)
  --color-on-secondary: #ffffff
  --color-secondary-container: #fe956c
  --color-on-secondary-container: #752c0b
  
  /* Backgrounds */
  --color-background: #f9f9ff
  --color-surface: #f9f9ff
  
  /* Surface variants (layering) */
  --color-surface-container-lowest: #ffffff
  --color-surface-container-low: #f0f3ff
  --color-surface-container: #e7eefe
  --color-surface-container-high: #e2e8f8
  --color-surface-container-highest: #dce2f3
  
  /* Text/outline */
  --color-on-surface: #151c27
  --color-on-surface-variant: #3f4948
  --color-outline: #6f7978
  --color-outline-variant: #bec9c8
}
\\\

**Global Utilities:**
- .glass-nav: @apply bg-white/80 backdrop-blur-xl;
- .no-scrollbar: Hides scrollbars across browsers

**Font:** Inter (Google Fonts), antialiased

**Key Pattern:** MD3 tokens enable consistent color palette (primary=teal, secondary=orange)

---

## 9. AUTHENTICATION FLOW

### Client-Side (Firebase)
1. **Initialization:** src/lib/firebase.ts
   - Reads VITE_FIREBASE_* from .env
   - Exports: auth, db, googleProvider, facebookProvider
2. **Hook:** useAuth()
   - onAuthStateChanged listener
   - Returns: signInWithGoogle(), signInWithFacebook(), signOut()
   - Updates useAuthStore
3. **Auth Store:** useAuthStore
   - Tracks: user (AppUser | null), loading, error
4. **Token:** getAuthHeaders() helper
   - Calls user.getIdToken()
   - Returns: { Authorization: "Bearer {token}" }

### Server-Side (Firebase Admin)
1. **Initialization:** server.ts
   - Reads FIREBASE_SERVICE_ACCOUNT_KEY from env
   - Calls initializeApp(cert(serviceAccount))
2. **Middleware:** authenticateRequest
   - Extracts Bearer token from Authorization header
   - Verifies with firebase-admin getAuth().verifyIdToken()
   - Attaches req.user = decoded payload
   - Skips if Firebase not configured (local dev)

### Flow:
`
User Login → Firebase popup auth → Firebase returns idToken
           → useAuth hook captures token → stored in authStore
           → API calls include Bearer token → server verifies
`

---

## 10. DATA PERSISTENCE

### Firestore Structure
\\\
/users/{uid}/trips/{tripId} → TravelContext (full document)
\\\

### Auto-Save Pattern (useTripPersistence hook)
1. **On login:** Load most recent trip (if status !== 'idle')
2. **On status change:** If status in SAVEABLE_STATUSES (awaiting_preferences, reviewing, confirmed), call saveTrip()
3. **saveTrip():** Generates tripId if missing, writes full context + serverTimestamp()
4. **loadTrip():** Retrieves full context, strips metadata

### Trip Service (tripService.ts)
- **saveTrip(uid, context)** → Promise<tripId>
- **loadTrip(uid, tripId)** → Promise<TravelContext | null>
- **listTrips(uid)** → Promise<TripSummary[]> (ordered by updatedAt desc)
- **deleteTrip(uid, tripId)** → Promise<void>

---

## 11. GEMINI API KEY FLOW

### Environment Variables
1. **.env.example** (checked into repo)
   - GEMINI_API_KEY="MY_GEMINI_API_KEY"
   - VITE_FIREBASE_* for client auth
   - FIREBASE_SERVICE_ACCOUNT_KEY for server auth
2. **.env** (not checked in)
   - User sets GEMINI_API_KEY locally
   - AI Studio injects via secrets panel
3. **Vite Define (vite.config.ts line 11)**
   - 'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
   - Makes available as process.env.GEMINI_API_KEY on client
4. **Client Usage (all agents)**
   - constructor(apiKey: string) → new GoogleGenAI({ apiKey })
   - Called with process.env.GEMINI_API_KEY!
5. **Server Usage**
   - Not used on server (all agents run client-side)

### Key Security:
- GEMINI_API_KEY exposed to browser (acceptable for Gemini public API)
- FIREBASE_SERVICE_ACCOUNT_KEY kept server-side only

---

## 12. COMMON PATTERNS

### Orchestrator Pattern
`	ypescript
constructor(apiKey: string) {
  this.apiKey = apiKey;
  this.agent1 = new Agent1(apiKey);
  this.agent2 = new Agent2(apiKey);
}

async processInput(context, input, onProgress?) {
  switch (input.type) {
    case 'pdf':
      onProgress?.('stage1');
      const result1 = await this.agent1.process(input.data);
      return {...result1, status: 'next_status'};
    case 'preferences':
      const result2 = await this.agent2.process(...);
      return {...result2, status: 'next_status'};
  }
}
`

### Store Merge Pattern
`	ypescript
// setContext does shallow merge
setContext({ preferences: {...} })
// Result: new context = {...oldContext, preferences: {...}}
// Does NOT deep merge preferences

// For nested updates, spread manually:
setContext({
  preferences: {...context.preferences, pace: 'intense'}
})
`

### JSON Schema Pattern (Gemini)
`	ypescript
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: prompt,
  config: {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: { /* schema */ },
      required: ["field1", "field2"]
    }
  }
});

const result = JSON.parse(response.text || "{}");
`

### Status Transition Pattern
`
idle (fresh)
  ↓
parsing (uploading file)
  ↓
awaiting_preferences (user filling form)
  ↓
region_planning → researching → planning
  ↓
reviewing (show itinerary, approve/change)
  ↓
confirming → confirmed (bookings locked)
`

### Multi-City Pattern
`	ypescript
// Explorer handles multi-destination:
if (context.destinations.length > 0) {
  // Research each unique city in parallel
  const results = await Promise.all(
    uniqueCities.map(stop => this.researchSingle(...))
  );
  // Merge all activities
}

// Architect receives merged activities, groups by city during planning
// Concierge deduplicates cities, calls recommendSingle in parallel
`

---

## 13. NON-OBVIOUS CONVENTIONS

1. **destination vs baseCity**: Code uses both. baseCity is primary (set by TicketReader), destination kept for legacy compat
2. **setContext merges shallow**: Updates must manually spread nested objects
3. **Status drives UI tabs**: App watches context.status to auto-switch screens
4. **ProcessingView quips cycle**: Uses interval (2.2s) to show rotating hints during processing
5. **SAVEABLE_STATUSES set**: Only 3 statuses trigger Firestore auto-save (not during processing)
6. **STAGE_ORDER array**: Determines progress visualization independent of actual agent order
7. **Orchestrator.processInput returns Partial**: Store performs merge, not orchestrator
8. **No error handling in agents**: Agents silently return {} on JSON parse fail
9. **TravelPreferencesForm has stepOffset**: Offset by 1 when isChangingUp=true (adds destination editor step)
10. **Companion uses chat.sendMessage({message})**: Specific genai API method signature
11. **DestinationEdits.added are city names**: RegionPlanner looks up coords via Gemini prompt
12. **Calendar events created by Scheduler**: Not real Google Calendar, just stored in context
13. **Multer stores in memory**: PDF parsing happens client-side via server, not truly streaming
14. **HMR disabled in AI Studio**: DISABLE_HMR env var for stability during agent edits

---

## 14. FILE ORGANIZATION SUMMARY

\\\
travel-mind/
├── src/
│   ├── agents/              # 8 specialized AI agents
│   │   ├── orchestrator.ts     (router)
│   │   ├── ticket-reader.ts    (PDF parsing)
│   │   ├── region-planner.ts   (multi-destination discovery)
│   │   ├── explorer.ts         (activity research)
│   │   ├── architect.ts        (itinerary planning)
│   │   ├── concierge.ts        (accommodations & transport)
│   │   ├── companion.ts        (conversational chat)
│   │   ├── closer.ts           (booking simulation)
│   │   ├── scheduler.ts        (calendar sync)
│   │   └── trending.ts         (seasonal destinations)
│   ├── store/
│   │   ├── tripStore.ts        (Zustand - main state)
│   │   └── authStore.ts        (Zustand - auth state)
│   ├── screens/                # 6 main app screens
│   │   ├── App.tsx             (router & guards)
│   │   ├── HomeScreen.tsx      (trip list + trending)
│   │   ├── NewTripScreen.tsx   (upload & preferences)
│   │   ├── ItineraryScreen.tsx (view & edit itinerary)
│   │   ├── ChatScreen.tsx      (conversation)
│   │   ├── LoginScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── components/             # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Layout.tsx
│   │   └── TravelPreferencesForm.tsx (21 KB multi-step form)
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useTripPersistence.ts
│   │   └── useTrendingDestinations.ts
│   ├── lib/                    # Utilities & services
│   │   ├── firebase.ts
│   │   ├── api.ts
│   │   ├── tripService.ts
│   │   ├── trendingService.ts
│   │   └── preferencesService.ts
│   ├── types.ts                # TypeScript interfaces
│   ├── index.css               # Tailwind + MD3 tokens
│   ├── main.tsx
│   └── App.tsx
├── server.ts                   # Express server
├── vite.config.ts
├── tsconfig.json
├── package.json
├── .env.example
└── README.md
\\\

