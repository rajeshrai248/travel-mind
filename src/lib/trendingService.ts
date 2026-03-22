import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { TrendingAgent } from '../agents/trending';
import { getUserPreferenceSummary } from './preferencesService';
import type { TrendingDestination } from '../types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getCacheKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getCurrentMonth(): { month: string; year: number } {
  const now = new Date();
  return { month: MONTHS[now.getMonth()], year: now.getFullYear() };
}

/**
 * Get trending destinations for the current month, personalized for the user.
 * Results are cached in Firestore per user per month.
 */
export async function getTrendingDestinations(uid: string): Promise<TrendingDestination[]> {
  const cacheKey = getCacheKey();

  // 1. Check user-specific cache
  const userCacheRef = doc(db, 'users', uid, 'trendingCache', cacheKey);
  const userCacheSnap = await getDoc(userCacheRef);

  if (userCacheSnap.exists()) {
    const data = userCacheSnap.data();
    if (data.destinations?.length > 0) {
      return data.destinations as TrendingDestination[];
    }
  }

  // 2. Extract user preferences from past trips
  const preferences = await getUserPreferenceSummary(uid);

  // 3. If new user (no preferences), check global cache first
  if (!preferences) {
    const globalCacheRef = doc(db, 'global', 'trendingCache', 'months', cacheKey);
    const globalSnap = await getDoc(globalCacheRef);

    if (globalSnap.exists()) {
      const data = globalSnap.data();
      if (data.destinations?.length > 0) {
        return data.destinations as TrendingDestination[];
      }
    }
  }

  // 4. Call Gemini
  const { month, year } = getCurrentMonth();
  const apiKey = process.env.GEMINI_API_KEY || '';
  const agent = new TrendingAgent(apiKey);
  const destinations = await agent.getTrending(month, year, preferences);

  // 5. Cache the result
  if (preferences) {
    // Personalized — cache per user
    await setDoc(userCacheRef, { destinations, updatedAt: serverTimestamp() });
  } else {
    // Generic — cache globally for all new users
    const globalCacheRef = doc(db, 'global', 'trendingCache', 'months', cacheKey);
    await setDoc(globalCacheRef, { destinations, updatedAt: serverTimestamp() });
  }

  return destinations;
}
