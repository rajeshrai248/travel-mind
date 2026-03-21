import { TravelContext, Booking } from "../types";

export class Closer {
  async execute(context: TravelContext): Promise<Partial<TravelContext>> {
    // In a real app, this would initiate bookings via APIs or deep links.
    // For this prototype, we'll simulate the booking process.
    
    const bookings: Booking[] = [];
    
    if (context.flights.length > 0) {
      bookings.push({
        id: `flight-${Date.now()}`,
        type: 'flight',
        status: 'confirmed',
        details: context.flights[0],
      });
    }
    
    if (context.accommodations && context.accommodations.length > 0) {
      bookings.push({
        id: `hotel-${Date.now()}`,
        type: 'hotel',
        status: 'confirmed',
        details: context.accommodations[0],
      });
    }
    
    return {
      bookings,
      status: 'confirmed',
    };
  }
}
