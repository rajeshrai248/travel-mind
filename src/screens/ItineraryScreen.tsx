import { useState } from 'react';
import { useTripStore } from '../store/tripStore';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { TravelPreferencesForm } from '../components/TravelPreferencesForm';
import { MapPin, Clock, Calendar, Utensils, Navigation, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';
import { cn } from '../utils/cn';
import { Orchestrator } from '../agents/orchestrator';
import { TravelPreferences, DayType, DestinationEdits } from '../types';

const DAY_TYPE_STYLES: Record<DayType, { bg: string; label: string; icon: string }> = {
  arrival: { bg: 'bg-blue-50 border-blue-200', label: 'ARRIVAL', icon: '✈️' },
  departure: { bg: 'bg-blue-50 border-blue-200', label: 'DEPARTURE', icon: '✈️' },
  explore: { bg: '', label: '', icon: '' },
  travel: { bg: 'bg-amber-50 border-amber-200', label: 'TRAVEL DAY', icon: '🚗' },
  rest: { bg: 'bg-green-50 border-green-200', label: 'REST DAY', icon: '😴' },
};

export function ItineraryScreen() {
  const { context, setContext, setStatus } = useTripStore();
  const [showPreferences, setShowPreferences] = useState(false);
  const [isReplanning, setIsReplanning] = useState(false);

  const handleApproval = async (approved: boolean) => {
    if (!approved) {
      // "Change it up" — show preferences form
      setShowPreferences(true);
      return;
    }

    setStatus('confirming');
    const orchestrator = new Orchestrator(process.env.GEMINI_API_KEY!);
    const result = await orchestrator.processInput(context, { type: 'approval', data: true });
    setContext(result);
  };

  const handleReplan = async (preferences: TravelPreferences, destinationEdits?: DestinationEdits) => {
    setShowPreferences(false);
    setIsReplanning(true);
    setStatus('region_planning');

    try {
      const orchestrator = new Orchestrator(process.env.GEMINI_API_KEY!);
      const result = await orchestrator.processInput(
        context,
        { type: 'preferences', data: { preferences, destinationEdits } },
      );
      setContext(result);
    } catch (error) {
      console.error('[Itinerary] Replan error:', error);
      setStatus('reviewing');
    } finally {
      setIsReplanning(false);
    }
  };

  if (!context.itinerary || context.itinerary.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-12 text-center space-y-6">
        <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center">
          <Calendar size={40} className="text-primary opacity-20" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">nothing here yet ✈️</h2>
          <p className="text-on-surface-variant">
            Drop a ticket or chat with TravelMind and we'll build your whole trip.
          </p>
        </div>
      </div>
    );
  }

  // Show preferences form when "Change it up" is pressed
  if (showPreferences && context.baseCity && context.travelPeriod) {
    return (
      <div className="max-w-2xl mx-auto px-6 pt-10 md:pt-12 pb-32 space-y-6">
        <button
          onClick={() => setShowPreferences(false)}
          className="flex items-center gap-2 text-primary font-semibold text-sm"
        >
          <ArrowLeft size={16} />
          Back to itinerary
        </button>
        <TravelPreferencesForm
          baseCity={context.baseCity}
          durationDays={context.travelPeriod.durationDays}
          initialPreferences={context.preferences}
          destinations={context.destinations}
          onSubmit={handleReplan}
          isChangingUp
        />
      </div>
    );
  }

  // Show replanning state
  if (isReplanning) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-12 text-center space-y-6">
        <div className="relative flex items-center justify-center">
          <div
            className="absolute rounded-full opacity-20 bg-primary"
            style={{ width: 120, height: 120, animation: 'ping 1.8s cubic-bezier(0,0,0.2,1) infinite' }}
          />
          <div
            className="relative flex items-center justify-center rounded-full text-5xl shadow-lg bg-primary/10"
            style={{ width: 96, height: 96, animation: 'float 3s ease-in-out infinite' }}
          >
            🔄
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Rebuilding your plan...</h2>
          <p className="text-on-surface-variant text-sm">Hang tight, we're reshuffling everything</p>
        </div>
        <style>{`
          @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
          @keyframes ping { 75%, 100% { transform: scale(1.8); opacity: 0; } }
        `}</style>
      </div>
    );
  }

  // Group days by city for visual separation
  const cityGroups: { city: string; days: typeof context.itinerary }[] = [];
  let currentGroup: typeof cityGroups[0] | null = null;

  for (const day of context.itinerary) {
    const city = day.city || context.destination?.city || 'Unknown';
    if (!currentGroup || currentGroup.city !== city) {
      currentGroup = { city, days: [] };
      cityGroups.push(currentGroup);
    }
    currentGroup.days.push(day);
  }

  return (
    <div className="px-6 pt-10 md:pt-12 space-y-10 pb-32">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="primary">YOUR PLAN</Badge>
          <Badge variant="secondary">DRAFT</Badge>
          {context.destinations.length > 1 && (
            <Badge variant="success">{context.destinations.length} STOPS</Badge>
          )}
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
          {context.destinations.length > 1
            ? `${context.baseCity?.city ?? context.destination?.city} & Beyond`
            : `${context.destination?.city} Itinerary`}
        </h1>
        <p className="text-on-surface-variant font-medium">
          {context.travelPeriod?.startDate} — {context.travelPeriod?.endDate}
        </p>

        {/* Route summary */}
        {context.destinations.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap pt-2">
            {context.destinations.map((stop, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={cn(
                  'text-xs font-bold px-2 py-1 rounded-lg',
                  stop.isBaseCity ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary',
                )}>
                  {stop.destination.city} ({stop.stayDays}d)
                </span>
                {i < context.destinations.length - 1 && (
                  <span className="text-on-surface-variant/40">→</span>
                )}
              </div>
            ))}
          </div>
        )}
      </header>

      <div className="space-y-12">
        {cityGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-6">
            {/* City divider */}
            {cityGroups.length > 1 && (
              <div className="flex items-center gap-3 pt-4">
                <MapPin size={18} className="text-primary" />
                <h2 className="text-lg font-extrabold text-primary uppercase tracking-wider">{group.city}</h2>
                <div className="flex-1 h-px bg-primary/20" />
              </div>
            )}

            {group.days.map((day) => {
              const dayType = (day.dayType as DayType) || 'explore';
              const typeStyle = DAY_TYPE_STYLES[dayType];

              return (
                <div key={day.dayNumber} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex flex-col items-center justify-center shadow-lg shadow-primary/20">
                      <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Day</span>
                      <span className="text-xl font-black leading-none">{day.dayNumber}</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-on-surface">{day.theme}</h3>
                        {typeStyle.label && (
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', typeStyle.bg)}>
                            {typeStyle.icon} {typeStyle.label}
                          </span>
                        )}
                      </div>
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
                              <span className="text-xs font-bold">{activity.timeSlot?.start}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-on-surface-variant text-xs">
                            <MapPin size={14} />
                            <span className="truncate">{activity.location?.address ?? ''}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(activity.highlights ?? []).map((h, i) => (
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
              );
            })}
          </div>
        ))}
      </div>

      {context.status === 'reviewing' && (
        <div className="fixed bottom-24 left-0 right-0 z-50 px-6 flex justify-center animate-in fade-in slide-in-from-bottom-10 duration-500">
          <div className="w-full max-w-2xl">
            <Card className="bg-primary text-on-primary p-6 shadow-2xl shadow-primary/40 space-y-6">
              <div className="space-y-1">
                <h3 className="text-xl font-bold">happy with this plan? 👀</h3>
                <p className="text-on-primary/70 text-sm">
                  looks good? tap approve and we'll lock in your bookings 🔒
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => handleApproval(true)} className="flex-1 bg-white text-primary hover:bg-white/90">
                  <CheckCircle2 size={18} />
                  Book it 🔥
                </Button>
                <Button onClick={() => handleApproval(false)} variant="outline" className="flex-1 border-white text-white hover:bg-white/10">
                  <XCircle size={18} />
                  Change it up
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {context.status === 'confirmed' && (
        <div className="fixed bottom-24 left-0 right-0 z-50 px-6 flex justify-center">
          <div className="w-full max-w-2xl">
            <Card className="bg-green-600 text-white p-6 shadow-2xl shadow-green-600/40 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">You're going! 🎉</h3>
                <p className="text-white/80 text-xs">all locked in — see you there ✈️</p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
