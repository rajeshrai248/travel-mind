import { useState, useEffect } from 'react';
import { useTripStore } from '../store/tripStore';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { PlusCircle, Bell, Plane, MapPin, Trash2, Loader2, TrendingUp } from 'lucide-react';
import { listTrips, loadTrip, deleteTrip, type TripSummary } from '../lib/tripService';
import { useTrendingDestinations } from '../hooks/useTrendingDestinations';

const STATUS_CONFIG: Record<string, { color: string; label: string; progress: number }> = {
  idle: { color: 'bg-gray-400', label: 'Draft', progress: 0 },
  parsing: { color: 'bg-yellow-400', label: 'Parsing', progress: 10 },
  awaiting_preferences: { color: 'bg-yellow-400', label: 'Awaiting Input', progress: 20 },
  region_planning: { color: 'bg-blue-400', label: 'Planning', progress: 35 },
  researching: { color: 'bg-blue-400', label: 'Researching', progress: 50 },
  planning: { color: 'bg-blue-400', label: 'Planning', progress: 65 },
  reviewing: { color: 'bg-orange-400', label: 'Review', progress: 80 },
  confirmed: { color: 'bg-green-500', label: 'Booked', progress: 100 },
};

const MONTH_NAME = new Date().toLocaleDateString('en-US', { month: 'long' });

function TrendingSection() {
  const { destinations, loading } = useTrendingDestinations();

  return (
    <section className="pb-10">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp size={20} className="text-primary" />
        <h2 className="text-xl font-headline font-bold text-on-surface">
          Trending in {MONTH_NAME} 🔥
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="relative aspect-[4/5] rounded-[24px] overflow-hidden bg-surface-container animate-pulse">
              <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                <div className="h-4 w-24 bg-outline-variant/20 rounded" />
                <div className="h-3 w-16 bg-outline-variant/20 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : destinations.length === 0 ? (
        <div className="text-center py-8 text-on-surface-variant text-sm">
          Couldn't load trending destinations right now
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {destinations.map((dest) => (
            <div key={`${dest.city}-${dest.country}`} className="relative aspect-[4/5] rounded-[24px] overflow-hidden group">
              <img
                src={`https://picsum.photos/seed/${dest.imageQuery}/400/500`}
                alt={dest.city}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                <div>
                  <h3 className="text-white font-bold text-sm">{dest.city}</h3>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">{dest.country}</p>
                </div>
                <p className="text-white/80 text-[11px] leading-snug line-clamp-2">{dest.reason}</p>
                <div className="flex flex-wrap gap-1">
                  {dest.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] font-bold uppercase tracking-wider text-white/90 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function HomeScreen({ onStartPlanning }: { onStartPlanning: () => void }) {
  const { loadContext, resetTrip } = useTripStore();
  const { user } = useAuthStore();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName = user?.displayName?.split(' ')[0] ?? 'Traveler';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    listTrips(user.uid)
      .then(setTrips)
      .catch((err) => console.error('[Home] Failed to load trips:', err))
      .finally(() => setLoading(false));
  }, [user]);

  const handleResume = async (tripId: string) => {
    if (!user) return;
    const full = await loadTrip(user.uid, tripId);
    if (full) loadContext(full);
  };

  const handleDelete = async (tripId: string) => {
    if (!user) return;
    await deleteTrip(user.uid, tripId);
    setTrips((prev) => prev.filter((t) => t.tripId !== tripId));
  };

  const handleNewTrip = () => {
    resetTrip();
    onStartPlanning();
  };

  return (
    <div className="px-6 pt-10 md:pt-12 pb-6 space-y-8">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container overflow-hidden border-2 border-primary-container">
            <img
              src={user?.photoURL ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=005251&color=fff&size=100`}
              alt="User"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col">
            <h2 className="font-headline font-bold tracking-tight text-on-surface text-lg">
              {greeting}, {firstName} 👋
            </h2>
            <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant">
              Where to next?
            </span>
          </div>
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
          <Bell size={20} className="text-primary" />
        </button>
      </header>

      <section className="relative overflow-hidden rounded-[24px] p-8 bg-gradient-to-br from-on-primary-container to-white shadow-sm">
        <div className="relative z-10 max-w-[60%]">
          <h1 className="text-2xl font-headline font-extrabold text-primary mb-2 leading-tight">
            New trip? Let's go.
          </h1>
          <p className="text-on-surface-variant text-sm mb-6">
            Drop your ticket, we handle the rest 🗺️
          </p>
          <Button onClick={handleNewTrip} variant="secondary">
            <PlusCircle size={18} />
            Let's go →
          </Button>
        </div>
        <div className="absolute -right-4 -bottom-4 opacity-20 pointer-events-none">
          <Plane size={180} className="text-primary" />
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <h2 className="text-xl font-headline font-bold text-on-surface">Your Trips</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="text-primary animate-spin" />
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant text-sm">
            No trips yet — start planning your first adventure!
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto no-scrollbar -mx-6 px-6 py-2">
            {trips.map((trip) => {
              const cfg = STATUS_CONFIG[trip.status] ?? STATUS_CONFIG.idle;
              const durationDays = trip.startDate && trip.endDate
                ? Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000)
                : 0;

              return (
                <div
                  key={trip.tripId}
                  onClick={() => handleResume(trip.tripId)}
                  className="cursor-pointer"
                >
                <Card
                  className="min-w-[280px] md:min-w-[340px] p-0 group hover:shadow-lg transition-shadow"
                >
                  <div className="relative h-32 overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <MapPin size={48} className="text-primary/30" />
                    <div className="absolute top-4 left-4 backdrop-blur-md bg-white/20 px-3 py-1 rounded-full border border-white/30 flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${cfg.color}`} />
                      <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider">{cfg.label}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(trip.tripId); }}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                    >
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                  <div className="p-6 space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-headline font-bold text-on-surface">
                        {trip.destination}
                        {trip.stopsCount > 1 ? ' & Beyond' : ''}
                      </h3>
                      {durationDays > 0 && (
                        <Badge variant="secondary">{durationDays} DAYS</Badge>
                      )}
                    </div>
                    {trip.startDate && (
                      <p className="text-on-surface-variant text-sm">
                        {trip.startDate} — {trip.endDate}
                      </p>
                    )}
                    <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${cfg.progress}%` }}
                      />
                    </div>
                  </div>
                </Card>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <TrendingSection />
    </div>
  );
}
