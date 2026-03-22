import { listTrips, loadTrip } from './tripService';
import type { UserPreferenceSummary } from '../types';

/**
 * Aggregates user preferences from their past trips.
 * Returns null if no trips exist (new user).
 */
export async function getUserPreferenceSummary(uid: string): Promise<UserPreferenceSummary | null> {
  const tripSummaries = await listTrips(uid);
  if (tripSummaries.length === 0) return null;

  // Load up to 5 most recent trips
  const recentIds = tripSummaries.slice(0, 5).map((t) => t.tripId);
  const trips = (await Promise.all(recentIds.map((id) => loadTrip(uid, id)))).filter(Boolean);

  if (trips.length === 0) return null;

  // Tally interests by frequency
  const interestCounts = new Map<string, number>();
  const paceScores: number[] = [];
  const dailyBudgets: number[] = [];
  const visitedCities = new Set<string>();

  for (const trip of trips) {
    if (!trip) continue;

    // Interests
    for (const interest of trip.preferences.interests) {
      interestCounts.set(interest, (interestCounts.get(interest) || 0) + 1);
    }

    // Pace
    const paceVal = trip.preferences.pace === 'relaxed' ? 0 : trip.preferences.pace === 'moderate' ? 1 : 2;
    paceScores.push(paceVal);

    // Budget per day
    if (trip.preferences.totalBudget > 0 && trip.travelPeriod) {
      dailyBudgets.push(trip.preferences.totalBudget / trip.travelPeriod.durationDays);
    }

    // Visited cities
    if (trip.baseCity) visitedCities.add(trip.baseCity.city);
    if (trip.destination) visitedCities.add(trip.destination.city);
    for (const stop of trip.destinations ?? []) {
      visitedCities.add(stop.destination.city);
    }
  }

  // Top interests sorted by frequency
  const topInterests = [...interestCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([interest]) => interest);

  // Average pace
  const avgPace = paceScores.length > 0
    ? paceScores.reduce((a, b) => a + b, 0) / paceScores.length
    : 1;
  const averagePace = avgPace < 0.67 ? 'relaxed' : avgPace < 1.33 ? 'moderate' : 'intense';

  // Budget tier from daily average
  let budgetTier: UserPreferenceSummary['budgetTier'] = 'mid';
  if (dailyBudgets.length > 0) {
    const avgDaily = dailyBudgets.reduce((a, b) => a + b, 0) / dailyBudgets.length;
    budgetTier = avgDaily < 80 ? 'budget' : avgDaily > 250 ? 'premium' : 'mid';
  }

  return {
    topInterests: topInterests.length > 0 ? topInterests : ['sightseeing'],
    averagePace,
    budgetTier,
    visitedCities: [...visitedCities],
  };
}
