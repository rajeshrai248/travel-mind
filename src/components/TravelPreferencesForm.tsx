import { useState } from 'react';
import { TravelPreferences, TransportMode, Destination, DestinationStop, DestinationEdits } from '../types';
import { Button } from './Button';
import { cn } from '../utils/cn';
import { Car, TrainFront, Shuffle, Compass, Flame, Leaf, MapPin, ArrowRight, X, Plus } from 'lucide-react';

interface TravelPreferencesFormProps {
  baseCity: Destination;
  durationDays: number;
  initialPreferences?: Partial<TravelPreferences>;
  onSubmit: (preferences: TravelPreferences, destinationEdits?: DestinationEdits) => void;
  isChangingUp?: boolean;
  destinations?: DestinationStop[];
}

const INTEREST_OPTIONS = [
  { id: 'culture', label: 'Culture & History', emoji: '🏛️' },
  { id: 'nature', label: 'Nature & Outdoors', emoji: '🌿' },
  { id: 'food', label: 'Food & Dining', emoji: '🍽️' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🌙' },
  { id: 'beach', label: 'Beaches', emoji: '🏖️' },
  { id: 'adventure', label: 'Adventure', emoji: '🧗' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'relaxation', label: 'Relaxation & Spa', emoji: '🧖' },
];

const TRANSPORT_OPTIONS: { id: TransportMode; label: string; desc: string; icon: typeof Car }[] = [
  { id: 'car', label: 'Rental Car', desc: 'Freedom to explore farther', icon: Car },
  { id: 'public', label: 'Public Transit', desc: 'Trains, buses & metro', icon: TrainFront },
  { id: 'mixed', label: 'Mix of Both', desc: 'Car for day trips, transit in cities', icon: Shuffle },
];

const PACE_OPTIONS: { id: TravelPreferences['pace']; label: string; desc: string; icon: typeof Flame }[] = [
  { id: 'relaxed', label: 'Relaxed', desc: '1-2 activities per day, plenty of downtime', icon: Leaf },
  { id: 'moderate', label: 'Moderate', desc: '2-3 activities, balanced with free time', icon: Compass },
  { id: 'intense', label: 'Packed', desc: 'See as much as possible!', icon: Flame },
];

const RADIUS_PRESETS = [
  { km: 50, label: 'Nearby', desc: 'Stay close to the city' },
  { km: 150, label: 'Regional', desc: 'Explore the wider region' },
  { km: 300, label: 'Road Trip', desc: 'Cover serious ground' },
  { km: 500, label: 'Cross-Country', desc: 'Go wherever is worth it' },
];

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'CHF', 'SEK', 'NZD'];

export function TravelPreferencesForm({
  baseCity,
  durationDays,
  initialPreferences,
  onSubmit,
  isChangingUp = false,
  destinations = [],
}: TravelPreferencesFormProps) {
  // When changing up, first step is destination editing
  const hasDestinations = isChangingUp && destinations.length > 0;
  const stepOffset = hasDestinations ? 1 : 0;
  const totalSteps = 4 + stepOffset;

  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<TravelPreferences>({
    totalBudget: initialPreferences?.totalBudget ?? 0,
    currency: initialPreferences?.currency ?? 'USD',
    interests: initialPreferences?.interests ?? [],
    pace: initialPreferences?.pace ?? 'moderate',
    transportMode: initialPreferences?.transportMode ?? 'mixed',
    travelRadius: initialPreferences?.travelRadius ?? 150,
    restDayFrequency: initialPreferences?.restDayFrequency ?? 3,
  });

  // Destination editing state
  const [keptDestinations, setKeptDestinations] = useState<DestinationStop[]>(destinations);
  const [addedCities, setAddedCities] = useState<string[]>([]);
  const [newCityInput, setNewCityInput] = useState('');

  const toggleInterest = (id: string) => {
    setPrefs(p => ({
      ...p,
      interests: p.interests.includes(id)
        ? p.interests.filter(i => i !== id)
        : [...p.interests, id],
    }));
  };

  const removeDestination = (index: number) => {
    const stop = keptDestinations[index];
    if (stop.isBaseCity) return; // can't remove base city
    setKeptDestinations(prev => prev.filter((_, i) => i !== index));
  };

  const addCity = () => {
    const city = newCityInput.trim();
    if (!city || addedCities.includes(city)) return;
    setAddedCities(prev => [...prev, city]);
    setNewCityInput('');
  };

  const removeAddedCity = (index: number) => {
    setAddedCities(prev => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(s => s + 1);
    } else {
      const edits = hasDestinations
        ? { kept: keptDestinations, added: addedCities }
        : undefined;
      onSubmit(prefs, edits);
    }
  };

  const canProceed = () => {
    const adjustedStep = step - stepOffset;
    if (hasDestinations && step === 0) {
      return keptDestinations.length > 0 || addedCities.length > 0;
    }
    if (adjustedStep === 1) return prefs.interests.length > 0;
    if (adjustedStep === 3) return prefs.totalBudget > 0;
    return true;
  };

  // Which logical step we're on (offset by destination step)
  const logicalStep = step - stepOffset;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-on-surface">
          {isChangingUp ? 'Tweak your vibe' : `You're heading to ${baseCity.city}!`}
        </h2>
        <p className="text-on-surface-variant">
          {isChangingUp
            ? 'Adjust your destinations and preferences — we\'ll rebuild everything.'
            : `${durationDays} days — let's make the most of it.`}
        </p>
      </header>

      {/* Progress dots */}
      <div className="flex items-center gap-2 justify-center">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <button
            key={i}
            onClick={() => i < step && setStep(i)}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              i === step ? 'w-8 bg-primary' : i < step ? 'w-2 bg-primary/40 cursor-pointer' : 'w-2 bg-outline-variant/30',
            )}
          />
        ))}
      </div>

      {/* Step: Destination Editor (only when changing up) */}
      {hasDestinations && step === 0 && (
        <div className="space-y-5" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
          <h3 className="font-bold text-lg text-on-surface">Your destinations</h3>
          <p className="text-sm text-on-surface-variant">Remove places you don't want, add new ones</p>

          <div className="space-y-2">
            {keptDestinations.map((stop, i) => (
              <div
                key={`${stop.destination.city}-${i}`}
                className={cn(
                  'flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all',
                  stop.isBaseCity
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-outline-variant/20 bg-surface-container-lowest',
                )}
              >
                <MapPin size={16} className={stop.isBaseCity ? 'text-primary' : 'text-on-surface-variant'} />
                <div className="flex-1">
                  <span className="font-bold text-sm text-on-surface">{stop.destination.city}</span>
                  <span className="text-xs text-on-surface-variant ml-2">{stop.stayDays}d</span>
                  {stop.isBaseCity && (
                    <span className="text-[10px] font-bold text-primary ml-2 uppercase">Base</span>
                  )}
                </div>
                {!stop.isBaseCity && (
                  <button
                    onClick={() => removeDestination(i)}
                    className="w-7 h-7 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}

            {/* Added cities */}
            {addedCities.map((city, i) => (
              <div
                key={`added-${city}`}
                className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-green-200 bg-green-50"
              >
                <Plus size={16} className="text-green-600" />
                <span className="font-bold text-sm text-on-surface flex-1">{city}</span>
                <span className="text-[10px] font-bold text-green-600 uppercase">New</span>
                <button
                  onClick={() => removeAddedCity(i)}
                  className="w-7 h-7 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Add city input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCityInput}
              onChange={e => setNewCityInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCity()}
              placeholder="Add a city..."
              className="flex-1 px-4 py-3 rounded-xl border-2 border-outline-variant/20 bg-surface-container-lowest text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none text-sm font-medium"
            />
            <Button
              onClick={addCity}
              disabled={!newCityInput.trim()}
              className="px-4"
            >
              <Plus size={16} />
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Step: Transport */}
      {logicalStep === 0 && !(hasDestinations && step === 0) && (
        <div className="space-y-4" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
          <h3 className="font-bold text-lg text-on-surface">How do you want to get around?</h3>
          <div className="space-y-3">
            {TRANSPORT_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const selected = prefs.transportMode === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setPrefs(p => ({ ...p, transportMode: opt.id }))}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left',
                    selected
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                      : 'border-outline-variant/20 bg-surface-container-lowest hover:border-outline-variant/40',
                  )}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    selected ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant',
                  )}>
                    <Icon size={22} />
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-on-surface">{opt.label}</span>
                    <p className="text-xs text-on-surface-variant">{opt.desc}</p>
                  </div>
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    selected ? 'border-primary bg-primary' : 'border-outline-variant/40',
                  )}>
                    {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          {prefs.transportMode !== 'public' && (
            <div className="space-y-3 pt-4">
              <h3 className="font-bold text-lg text-on-surface">How far would you go?</h3>
              <div className="grid grid-cols-2 gap-3">
                {RADIUS_PRESETS.map(r => {
                  const selected = prefs.travelRadius === r.km;
                  return (
                    <button
                      key={r.km}
                      onClick={() => setPrefs(p => ({ ...p, travelRadius: r.km }))}
                      className={cn(
                        'p-3 rounded-xl border-2 text-left transition-all',
                        selected
                          ? 'border-primary bg-primary/5'
                          : 'border-outline-variant/20 hover:border-outline-variant/40',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className={selected ? 'text-primary' : 'text-on-surface-variant'} />
                        <span className="font-bold text-sm">{r.label}</span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-1">{r.desc}</p>
                      <span className="text-[10px] font-bold text-primary/60 mt-1 block">{r.km} km</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step: Interests */}
      {logicalStep === 1 && (
        <div className="space-y-4" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
          <h3 className="font-bold text-lg text-on-surface">What are you into?</h3>
          <p className="text-sm text-on-surface-variant">Pick as many as you like</p>
          <div className="grid grid-cols-2 gap-3">
            {INTEREST_OPTIONS.map(opt => {
              const selected = prefs.interests.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleInterest(opt.id)}
                  className={cn(
                    'flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left',
                    selected
                      ? 'border-primary bg-primary/5'
                      : 'border-outline-variant/20 hover:border-outline-variant/40',
                  )}
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <span className={cn('font-semibold text-sm', selected ? 'text-primary' : 'text-on-surface')}>
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step: Pace */}
      {logicalStep === 2 && (
        <div className="space-y-4" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
          <h3 className="font-bold text-lg text-on-surface">What's your pace?</h3>
          <div className="space-y-3">
            {PACE_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const selected = prefs.pace === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setPrefs(p => ({ ...p, pace: opt.id }))}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left',
                    selected
                      ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                      : 'border-outline-variant/20 bg-surface-container-lowest hover:border-outline-variant/40',
                  )}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    selected ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant',
                  )}>
                    <Icon size={22} />
                  </div>
                  <div className="flex-1">
                    <span className="font-bold text-on-surface">{opt.label}</span>
                    <p className="text-xs text-on-surface-variant">{opt.desc}</p>
                  </div>
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    selected ? 'border-primary bg-primary' : 'border-outline-variant/40',
                  )}>
                    {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}

          {durationDays > 3 && (
            <div className="space-y-3 pt-4">
              <h3 className="font-bold text-lg text-on-surface">Rest days?</h3>
              <p className="text-sm text-on-surface-variant">
                We'll schedule lighter days so you don't burn out
              </p>
              <div className="flex gap-3">
                {[
                  { val: 0, label: 'None' },
                  { val: 4, label: 'Every 4 days' },
                  { val: 3, label: 'Every 3 days' },
                  { val: 2, label: 'Every 2 days' },
                ].map(opt => {
                  const selected = prefs.restDayFrequency === opt.val;
                  return (
                    <button
                      key={opt.val}
                      onClick={() => setPrefs(p => ({ ...p, restDayFrequency: opt.val }))}
                      className={cn(
                        'flex-1 py-2.5 px-2 rounded-xl border-2 text-xs font-bold transition-all text-center',
                        selected
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-outline-variant/20 text-on-surface-variant hover:border-outline-variant/40',
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Step: Budget (real numbers) */}
      {logicalStep === 3 && (
        <div className="space-y-5" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
          <h3 className="font-bold text-lg text-on-surface">What's your budget?</h3>
          <p className="text-sm text-on-surface-variant">
            Total spend for the whole trip — flights excluded
          </p>

          {/* Currency selector */}
          <div className="flex flex-wrap gap-2">
            {CURRENCY_OPTIONS.map(c => (
              <button
                key={c}
                onClick={() => setPrefs(p => ({ ...p, currency: c }))}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2',
                  prefs.currency === c
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-outline-variant/20 text-on-surface-variant hover:border-outline-variant/40',
                )}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Budget input */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-lg">
              {prefs.currency}
            </span>
            <input
              type="number"
              value={prefs.totalBudget || ''}
              onChange={e => setPrefs(p => ({ ...p, totalBudget: Math.max(0, Number(e.target.value)) }))}
              placeholder="0"
              className="w-full pl-16 pr-4 py-4 rounded-2xl border-2 border-outline-variant/20 bg-surface-container-lowest text-on-surface text-2xl font-bold focus:border-primary focus:outline-none text-right"
            />
          </div>

          {/* Per-day breakdown */}
          {prefs.totalBudget > 0 && (
            <div className="bg-primary/5 rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm font-medium text-on-surface-variant">That's roughly</span>
              <span className="text-lg font-bold text-primary">
                {Math.round(prefs.totalBudget / durationDays)} {prefs.currency}/day
              </span>
            </div>
          )}

          {/* Quick presets */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Quick pick</span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { amount: 500, label: 'Backpacker' },
                { amount: 1500, label: 'Comfortable' },
                { amount: 3000, label: 'Treat yourself' },
              ].map(opt => (
                <button
                  key={opt.amount}
                  onClick={() => setPrefs(p => ({ ...p, totalBudget: opt.amount }))}
                  className={cn(
                    'p-3 rounded-xl border-2 text-center transition-all',
                    prefs.totalBudget === opt.amount
                      ? 'border-primary bg-primary/5'
                      : 'border-outline-variant/20 hover:border-outline-variant/40',
                  )}
                >
                  <span className="block text-sm font-bold text-on-surface">{opt.amount} {prefs.currency}</span>
                  <span className="text-[10px] text-on-surface-variant">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
            Back
          </Button>
        )}
        <Button
          onClick={handleNext}
          disabled={!canProceed()}
          className="flex-1"
        >
          {step === totalSteps - 1 ? (isChangingUp ? 'Rebuild my plan' : 'Plan my trip') : 'Next'}
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
