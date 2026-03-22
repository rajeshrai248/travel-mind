import { create } from 'zustand';
import { TravelContext, Message, DayPlan, AccommodationOption, TransportOption } from '../types';

interface TripState {
  context: TravelContext;
  setContext: (context: Partial<TravelContext>) => void;
  addMessage: (message: Message) => void;
  setStatus: (status: TravelContext['status']) => void;
  resetTrip: () => void;
  /** Replace context entirely (used when loading from Firestore) */
  loadContext: (context: TravelContext) => void;
}

const initialContext: TravelContext = {
  tripId: '',
  passengers: [],
  flights: [],
  destination: null,
  baseCity: null,
  destinations: [],
  travelPeriod: null,
  budget: { total: 0, currency: 'USD', perDay: 0 },
  preferences: {
    totalBudget: 0,
    currency: 'USD',
    interests: [],
    pace: 'moderate',
    transportMode: 'mixed',
    travelRadius: 150,
    restDayFrequency: 3,
  },
  itinerary: null,
  accommodations: null,
  transport: null,
  bookings: [],
  calendarEvents: [],
  status: 'idle',
  conversationHistory: [],
};

export const useTripStore = create<TripState>((set) => ({
  context: initialContext,
  setContext: (newContext) =>
    set((state) => ({
      context: { ...state.context, ...newContext },
    })),
  addMessage: (message) =>
    set((state) => ({
      context: {
        ...state.context,
        conversationHistory: [...state.context.conversationHistory, message],
      },
    })),
  setStatus: (status) =>
    set((state) => ({
      context: { ...state.context, status },
    })),
  resetTrip: () => set({ context: initialContext }),
  loadContext: (context) => set({ context }),
}));
