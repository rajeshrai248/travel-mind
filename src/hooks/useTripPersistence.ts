import { useEffect, useRef } from 'react';
import { useTripStore } from '../store/tripStore';
import { useAuthStore } from '../store/authStore';
import { saveTrip, loadTrip, listTrips, type TripSummary } from '../lib/tripService';

/** Statuses worth saving — skip transient/loading states */
const SAVEABLE_STATUSES = new Set([
  'awaiting_preferences',
  'reviewing',
  'confirmed',
]);

/**
 * Auto-saves the current trip to Firestore when status reaches a meaningful state.
 * On mount (user login), loads the most recent trip if one exists.
 */
export function useTripPersistence() {
  const { context, loadContext, setContext } = useTripStore();
  const { user } = useAuthStore();
  const loadedRef = useRef(false);
  const savingRef = useRef(false);

  // Load most recent trip on login
  useEffect(() => {
    if (!user || loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      try {
        const trips = await listTrips(user.uid);
        if (trips.length === 0) return;

        // Load the most recent trip
        const latest = trips[0];
        const full = await loadTrip(user.uid, latest.tripId);
        if (full && full.status !== 'idle') {
          loadContext(full);
        }
      } catch (err) {
        console.error('[TripPersistence] Failed to load trips:', err);
      }
    })();
  }, [user, loadContext]);

  // Reset loaded flag on logout
  useEffect(() => {
    if (!user) {
      loadedRef.current = false;
    }
  }, [user]);

  // Auto-save when context reaches a saveable status
  useEffect(() => {
    if (!user || savingRef.current) return;
    if (!SAVEABLE_STATUSES.has(context.status)) return;

    savingRef.current = true;

    (async () => {
      try {
        const tripId = await saveTrip(user.uid, context);
        // If the trip didn't have an ID yet, set it
        if (!context.tripId) {
          setContext({ tripId });
        }
      } catch (err) {
        console.error('[TripPersistence] Failed to save trip:', err);
      } finally {
        savingRef.current = false;
      }
    })();
  }, [user, context.status, context, setContext]);
}
