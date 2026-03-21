import { useTripStore } from '../store/tripStore';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { MapPin, Clock, Calendar, Utensils, Navigation, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import { Orchestrator } from '../agents/orchestrator';

export function ItineraryScreen() {
  const { context, setContext, setStatus } = useTripStore();

  const handleApproval = async (approved: boolean) => {
    setStatus('confirming');
    const orchestrator = new Orchestrator(process.env.GEMINI_API_KEY!);
    const result = await orchestrator.processInput(context, { type: 'approval', data: approved });
    setContext(result);
  };

  if (!context.itinerary || context.itinerary.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-12 text-center space-y-6">
        <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center">
          <Calendar size={40} className="text-primary opacity-20" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">No itinerary yet</h2>
          <p className="text-on-surface-variant">
            Upload a ticket or chat with TravelMind to generate your perfect travel plan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pt-12 space-y-10 pb-32">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="primary">PHASE 1: ARCHITECT</Badge>
          <Badge variant="secondary">DRAFT</Badge>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
          {context.destination?.city} Itinerary
        </h1>
        <p className="text-on-surface-variant font-medium">
          {context.travelPeriod?.startDate} — {context.travelPeriod?.endDate}
        </p>
      </header>

      <div className="space-y-12">
        {context.itinerary.map((day) => (
          <div key={day.dayNumber} className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex flex-col items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Day</span>
                <span className="text-xl font-black leading-none">{day.dayNumber}</span>
              </div>
              <div className="flex flex-col">
                <h3 className="font-bold text-lg text-on-surface">{day.theme}</h3>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>

            <div className="relative pl-6 space-y-8 border-l-2 border-dashed border-outline-variant/30 ml-6">
              {day.activities.map((activity, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-2 border-primary z-10" />
                  <Card className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <Badge variant="primary" className="mb-1">{activity.category}</Badge>
                        <h4 className="font-bold text-on-surface">{activity.name}</h4>
                      </div>
                      <div className="flex items-center gap-1 text-primary">
                        <Clock size={14} />
                        <span className="text-xs font-bold">{activity.timeSlot.start}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant text-xs">
                      <MapPin size={14} />
                      <span className="truncate">{activity.location.address}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activity.highlights.map((h, i) => (
                        <span key={i} className="text-[10px] font-bold text-on-surface-variant/60 bg-surface-container px-2 py-1 rounded-md">
                          {h}
                        </span>
                      ))}
                    </div>
                  </Card>
                </div>
              ))}

              {day.meals.map((meal, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white border-2 border-secondary z-10" />
                  <div className="bg-secondary/5 rounded-2xl p-4 flex items-center gap-4 border border-secondary/10">
                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                      <Utensils size={20} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-on-surface">{meal.name}</h4>
                      <p className="text-xs text-on-surface-variant">{meal.cuisine} • {meal.priceRange}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {context.status === 'reviewing' && (
        <div className="fixed bottom-24 left-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-10 duration-500">
          <Card className="bg-primary text-on-primary p-6 shadow-2xl shadow-primary/40 space-y-6">
            <div className="space-y-1">
              <h3 className="text-xl font-bold">Approve this itinerary?</h3>
              <p className="text-on-primary/70 text-sm">
                The Architect has finished the draft. Approve to proceed with bookings.
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => handleApproval(true)} className="flex-1 bg-white text-primary hover:bg-white/90">
                <CheckCircle2 size={18} />
                Approve
              </Button>
              <Button onClick={() => handleApproval(false)} variant="outline" className="flex-1 border-white text-white hover:bg-white/10">
                <XCircle size={18} />
                Reject
              </Button>
            </div>
          </Card>
        </div>
      )}

      {context.status === 'confirmed' && (
        <div className="fixed bottom-24 left-6 right-6 z-50">
          <Card className="bg-green-600 text-white p-6 shadow-2xl shadow-green-600/40 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold">Trip Confirmed!</h3>
              <p className="text-white/80 text-xs">Bookings secured and calendar synced.</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
