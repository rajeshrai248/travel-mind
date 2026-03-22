export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: 'google' | 'facebook' | 'unknown';
}

export interface TrendingDestination {
  city: string;
  country: string;
  reason: string;
  tags: string[];
  imageQuery: string;
  score: number;
}

export interface UserPreferenceSummary {
  topInterests: string[];
  averagePace: 'relaxed' | 'moderate' | 'intense';
  budgetTier: 'budget' | 'mid' | 'premium';
  visitedCities: string[];
}

export interface Passenger {
  name: string;
}

export interface Flight {
  airline: string;
  flightNumber: string;
  departureCity: string;
  arrivalCity: string;
  departureTime: string;
  arrivalTime: string;
  bookingReference: string;
}

export interface Destination {
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export interface DestinationStop {
  destination: Destination;
  stayDays: number;
  isBaseCity: boolean;
  distanceFromBase: number; // km
  travelTimeFromPrevious: number; // minutes
  travelModeFromPrevious: 'drive' | 'train' | 'bus' | 'ferry' | 'flight' | 'none';
}

export type TransportMode = 'car' | 'public' | 'mixed';

export interface TravelPreferences {
  totalBudget: number; // actual trip budget in user's currency
  currency: string; // e.g. 'USD', 'EUR', 'GBP'
  interests: string[];
  pace: 'relaxed' | 'moderate' | 'intense';
  transportMode: TransportMode;
  travelRadius: number; // km from base city
  restDayFrequency: number; // rest day every N travel days (0 = no forced rest)
}

export interface DestinationEdits {
  kept: DestinationStop[];
  added: string[]; // city names typed by user
}

export interface Activity {
  name: string;
  category: 'cultural' | 'nature' | 'food' | 'nightlife' | 'shopping' | 'adventure' | 'relaxation';
  timeSlot: { start: string; end: string };
  duration: number; // minutes
  location: { lat: number; lng: number; address: string };
  rating: number;
  reviewCount: number;
  estimatedCost: number;
  highlights: string[];
  tags: string[];
  bookingRequired: boolean;
  bookingUrl?: string;
}

export interface MealRecommendation {
  name: string;
  cuisine: string;
  priceRange: string;
  rating: number;
  address: string;
}

export interface TransportSegment {
  mode: string;
  duration: number;
  cost: number;
}

export type DayType = 'explore' | 'travel' | 'rest' | 'arrival' | 'departure';

export interface DayPlan {
  dayNumber: number;
  date: string;
  theme: string;
  dayType: DayType;
  city: string; // which city this day is in
  activities: Activity[];
  meals: MealRecommendation[];
  transportBetweenActivities: TransportSegment[];
  estimatedCost: number;
}

export interface AccommodationOption {
  id: string;
  name: string;
  type: string;
  pricePerNight: number;
  rating: number;
  location: string;
  amenities: string[];
  photos: string[];
}

export interface TransportOption {
  id: string;
  type: string;
  provider: string;
  price: number;
  details: string;
}

export interface Booking {
  id: string;
  type: 'flight' | 'hotel' | 'transport' | 'activity';
  status: 'pending' | 'confirmed';
  details: any;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  notes: string;
  category: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent?: string;
}

export type TripStatus = 'idle' | 'parsing' | 'awaiting_preferences' | 'region_planning' | 'researching' | 'planning' | 'reviewing' | 'booking' | 'confirming' | 'confirmed';

export interface TravelContext {
  tripId: string;
  passengers: Passenger[];
  flights: Flight[];
  destination: Destination | null; // kept for backward compat — baseCity alias
  baseCity: Destination | null;
  destinations: DestinationStop[];
  travelPeriod: { startDate: string; endDate: string; durationDays: number } | null;
  budget: { total: number; currency: string; perDay: number };
  preferences: TravelPreferences;
  itinerary: DayPlan[] | null;
  accommodations: AccommodationOption[] | null;
  transport: TransportOption[] | null;
  bookings: Booking[];
  calendarEvents: CalendarEvent[];
  status: TripStatus;
  conversationHistory: Message[];
}
