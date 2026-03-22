import { useTripStore } from '../store/tripStore';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { PlusCircle, Bell, Plane, MapPin } from 'lucide-react';

export function HomeScreen({ onStartPlanning }: { onStartPlanning: () => void }) {
  const { context } = useTripStore();
  const { user } = useAuthStore();
  const firstName = user?.displayName?.split(' ')[0] ?? 'Traveler';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

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
          <Button onClick={onStartPlanning} variant="secondary">
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
          <button className="text-primary font-bold text-sm">View all</button>
        </div>

        <div className="flex gap-6 overflow-x-auto no-scrollbar -mx-6 px-6 py-2">
          <Card className="min-w-[280px] md:min-w-[340px] p-0 group">
            <div className="relative h-44 overflow-hidden">
              <img
                src="https://picsum.photos/seed/maldives/600/400"
                alt="Maldives"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute top-4 left-4 backdrop-blur-md bg-white/20 px-3 py-1 rounded-full border border-white/30 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Planning</span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-headline font-bold text-on-surface">Maldives Escape</h3>
                <Badge variant="secondary">5 NIGHTS</Badge>
              </div>
              <p className="text-on-surface-variant text-sm">Nov 12 — Nov 17, 2023</p>
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-bold text-on-surface-variant uppercase tracking-tighter opacity-70">
                  <span>Parsed</span>
                  <span>Researched</span>
                  <span className="text-primary font-extrabold">Planned</span>
                  <span>Booked</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full w-[60%] bg-primary" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="pb-10">
        <h2 className="text-xl font-headline font-bold text-on-surface mb-6">Trending rn 🔥</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: 'Venice', img: 'venice' },
            { name: 'Yosemite', img: 'yosemite' },
          ].map((dest) => (
            <div key={dest.name} className="relative aspect-[4/5] rounded-[24px] overflow-hidden group">
              <img
                src={`https://picsum.photos/seed/${dest.img}/400/500`}
                alt={dest.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-4 left-4 text-white font-bold text-sm">{dest.name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
