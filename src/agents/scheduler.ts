import { TravelContext, CalendarEvent } from "../types";

export class Scheduler {
  async sync(context: TravelContext): Promise<Partial<TravelContext>> {
    // In a real app, this would use Google Calendar API.
    // For this prototype, we'll generate the events list.
    
    const events: CalendarEvent[] = [];
    
    if (context.itinerary) {
      context.itinerary.forEach(day => {
        day.activities.forEach(activity => {
          events.push({
            id: `event-${Date.now()}-${Math.random()}`,
            title: activity.name,
            start: `${day.date}T${activity.timeSlot.start}`,
            end: `${day.date}T${activity.timeSlot.end}`,
            location: activity.location.address,
            notes: activity.highlights.join(', '),
            category: activity.category,
          });
        });
      });
    }
    
    return {
      calendarEvents: events,
    };
  }
}
