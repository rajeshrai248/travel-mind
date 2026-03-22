import { useState, useEffect } from 'react';
import { useTripStore } from '../store/tripStore';
import { Button } from '../components/Button';
import { TravelPreferencesForm } from '../components/TravelPreferencesForm';
import { CloudUpload, Camera, Check, X } from 'lucide-react';
import { cn } from '../utils/cn';
import axios from 'axios';
import { getAuthHeaders } from '../lib/api';
import { Orchestrator } from '../agents/orchestrator';
import { TravelPreferences } from '../types';

const STAGES = [
  {
    id: 'upload',
    emoji: '📄',
    title: 'Reading your ticket',
    subtitle: 'Squinting at the fine print...',
    quips: [
      'Squinting at the fine print...',
      'Checking if you packed sunscreen...',
      'Validating your departure gate...',
      'Confirming you booked the right year...',
    ],
  },
  {
    id: 'ticket',
    emoji: '🔍',
    title: 'Reading your ticket',
    subtitle: 'Decoding your itinerary',
    quips: [
      'Memorising your flight number...',
      'Noting down your seat — window or aisle?',
      'Checking for hidden baggage fees...',
      'Verifying you didn\'t book the return first...',
    ],
  },
  {
    id: 'region_planner',
    emoji: '🗺️',
    title: 'Finding destinations',
    subtitle: 'Planning your route',
    quips: [
      'Scouting nearby cities worth visiting...',
      'Calculating driving distances...',
      'Finding hidden gem towns...',
      'Plotting the perfect road trip route...',
    ],
  },
  {
    id: 'explorer',
    emoji: '🔭',
    title: 'Exploring destinations',
    subtitle: 'Researching each stop',
    quips: [
      'Stalking travel influencers on Instagram...',
      'Reading 847 TripAdvisor reviews...',
      'Finding the best local coffee spots...',
      'Googling "is it safe to drink tap water"...',
    ],
  },
  {
    id: 'architect',
    emoji: '📅',
    title: 'Building your itinerary',
    subtitle: 'Building your day-by-day plan',
    quips: [
      'Tetris-ing museums and beach time...',
      'Blocking off rest days so you don\'t burn out...',
      'Scheduling gelato breaks every 2 hours...',
      'Making sure you don\'t miss the sunset...',
    ],
  },
  {
    id: 'concierge',
    emoji: '🏨',
    title: 'Finding your stays',
    subtitle: 'Hotels & transport for each stop',
    quips: [
      'Negotiating rates with hoteliers...',
      'Checking if the pool is heated...',
      'Finding the best Airbnbs near the center...',
      'Comparing train tickets vs rental cars...',
    ],
  },
  {
    id: 'done',
    emoji: '🎉',
    title: "You're going! 🎉",
    subtitle: "all locked in — go pack your bags 🧳",
    quips: ["you're all set — see you there ✈️"],
  },
];

const STAGE_ORDER = ['upload', 'ticket', 'region_planner', 'explorer', 'architect', 'concierge', 'done'];

function useQuipCycle(quips: string[], active: boolean) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active) return;
    setIndex(0);
    const id = setInterval(() => setIndex(i => (i + 1) % quips.length), 2200);
    return () => clearInterval(id);
  }, [quips, active]);
  return quips[index];
}

function ProcessingView({ stage }: { stage: string }) {
  const currentStageData = STAGES.find(s => s.id === stage) ?? STAGES[0];
  const currentIndex = STAGE_ORDER.indexOf(stage);
  const quip = useQuipCycle(currentStageData.quips, true);
  const isDone = stage === 'done';

  // Filter out 'upload' from the visible steps (it's instant)
  const visibleStages = STAGES.filter(s => s.id !== 'done' && s.id !== 'upload');

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      {/* Animated emoji */}
      <div className="relative flex items-center justify-center">
        <div
          className={cn(
            'absolute rounded-full opacity-20',
            isDone ? 'bg-green-400' : 'bg-primary',
          )}
          style={{
            width: 120,
            height: 120,
            animation: isDone ? 'none' : 'ping 1.8s cubic-bezier(0,0,0.2,1) infinite',
          }}
        />
        <div
          className={cn(
            'relative flex items-center justify-center rounded-full text-5xl shadow-lg',
            isDone ? 'bg-green-100' : 'bg-primary/10',
          )}
          style={{
            width: 96,
            height: 96,
            animation: isDone ? 'bounceIn 0.5s ease-out' : 'float 3s ease-in-out infinite',
          }}
        >
          {currentStageData.emoji}
        </div>
      </div>

      {/* Stage title + quip */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-on-surface">{currentStageData.title}</h3>
        <p
          key={quip}
          className="text-on-surface-variant text-sm"
          style={{ animation: 'fadeSlideIn 0.4s ease-out' }}
        >
          {quip}
        </p>
      </div>

      {/* Progress steps */}
      <div className="w-full space-y-2">
        {visibleStages.map((s) => {
          const stepIndex = STAGE_ORDER.indexOf(s.id);
          const done = stepIndex < currentIndex;
          const active = stepIndex === currentIndex;
          return (
            <div
              key={s.id}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-500',
                done && 'bg-primary/8 text-primary',
                active && 'bg-primary/12 text-primary',
                !done && !active && 'text-on-surface-variant/40',
              )}
            >
              <span className="text-lg w-6 text-center">
                {done ? '✓' : s.emoji}
              </span>
              <span className={cn('text-sm font-medium flex-1', active && 'font-semibold')}>
                {s.title}
              </span>
              {done && <Check size={14} className="text-primary" />}
              {active && (
                <span className="flex gap-1">
                  {[0, 1, 2].map(dot => (
                    <span
                      key={dot}
                      className="w-1.5 h-1.5 rounded-full bg-primary"
                      style={{ animation: `bounce 1.2s ease-in-out ${dot * 0.2}s infinite` }}
                    />
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
          style={{ width: `${(currentIndex / (STAGE_ORDER.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function NewTripScreen({ onComplete }: { onComplete: () => void }) {
  const { context, setContext } = useTripStore();
  const [phase, setPhase] = useState<'upload' | 'preferences' | 'processing'>('upload');
  const [stage, setStage] = useState('upload');
  const orchestratorRef = useState(() => new Orchestrator(process.env.GEMINI_API_KEY!))[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhase('processing');
    setStage('upload');

    const formData = new FormData();
    formData.append('ticket', file);

    try {
      const authHeaders = await getAuthHeaders().catch(() => ({}));
      const response = await axios.post('/api/parse-ticket', formData, { headers: authHeaders });

      const result = await orchestratorRef.processInput(
        context,
        { type: 'pdf', data: response.data.text },
        (s) => setStage(s),
      );

      // Ticket parsed — save partial context and show questionnaire
      setContext(result);
      setPhase('preferences');
    } catch (error) {
      console.error('[NewTrip] Upload error:', error);
      setPhase('upload');
      setStage('upload');
    }
  };

  const handlePreferencesSubmit = async (preferences: TravelPreferences) => {
    setPhase('processing');
    setStage('region_planner');

    try {
      const currentContext = { ...useTripStore.getState().context };
      const result = await orchestratorRef.processInput(
        currentContext,
        { type: 'preferences', data: preferences },
        (s) => setStage(s),
      );

      setContext(result);
      setStage('done');
      setTimeout(() => onComplete(), 1800);
    } catch (error) {
      console.error('[NewTrip] Planning error:', error);
      // Go back to preferences on error so user can retry
      setPhase('preferences');
    }
  };

  const mergedContext = { ...context, ...useTripStore.getState().context };

  return (
    <div className="max-w-2xl mx-auto px-6 pt-10 md:pt-12 pb-12 space-y-10">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <X className="text-primary cursor-pointer" onClick={() => onComplete()} />
          <span className="font-headline font-bold text-xl">TravelMind</span>
        </div>
      </header>

      {phase === 'upload' && (
        <section className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-on-surface">Drop your ticket 🎟️</h2>
            <p className="text-on-surface-variant text-lg">
              We'll read it, research it, and build your whole vibe. No stress.
            </p>
          </div>

          <div className="border-2 border-dashed border-outline-variant rounded-2xl p-12 bg-surface-container-lowest flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center">
              <CloudUpload size={32} className="text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold">Drop your flight ticket here</h3>
              <p className="text-on-surface-variant text-sm">PDF, photo, or screenshot — we read it all</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-2">
              <label className="bg-primary text-on-primary px-8 py-3 rounded-xl font-semibold shadow-sm active:scale-95 duration-200 cursor-pointer text-center">
                Pick a file
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,image/*" />
              </label>
              <Button variant="outline">
                <Camera size={18} />
                Take Photo
              </Button>
            </div>
          </div>
        </section>
      )}

      {phase === 'preferences' && mergedContext.baseCity && mergedContext.travelPeriod && (
        <section style={{ animation: 'fadeSlideIn 0.4s ease-out' }}>
          <TravelPreferencesForm
            baseCity={mergedContext.baseCity}
            durationDays={mergedContext.travelPeriod.durationDays}
            initialPreferences={mergedContext.preferences}
            onSubmit={handlePreferencesSubmit}
          />
        </section>
      )}

      {phase === 'processing' && (
        <section>
          <ProcessingView stage={stage} />
        </section>
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes ping {
          75%, 100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounceIn {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
