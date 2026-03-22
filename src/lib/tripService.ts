import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { TravelContext } from '../types';

export interface TripSummary {
  tripId: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: TravelContext['status'];
  stopsCount: number;
  updatedAt: number; // epoch ms
}

function tripsCol(uid: string) {
  return collection(db, 'users', uid, 'trips');
}

function tripDoc(uid: string, tripId: string) {
  return doc(db, 'users', uid, 'trips', tripId);
}

/** Save the full TravelContext to Firestore */
export async function saveTrip(uid: string, context: TravelContext): Promise<string> {
  const id = context.tripId || crypto.randomUUID();

  await setDoc(tripDoc(uid, id), {
    ...context,
    tripId: id,
    updatedAt: serverTimestamp(),
  });

  return id;
}

/** Load a single trip by ID */
export async function loadTrip(uid: string, tripId: string): Promise<TravelContext | null> {
  const snap = await getDoc(tripDoc(uid, tripId));
  if (!snap.exists()) return null;

  const data = snap.data();
  // Strip Firestore metadata fields
  const { updatedAt, ...rest } = data;
  return rest as TravelContext;
}

/** List all trips for a user (lightweight summaries) */
export async function listTrips(uid: string): Promise<TripSummary[]> {
  const q = query(tripsCol(uid), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();
    const ts = data.updatedAt as Timestamp | null;
    return {
      tripId: d.id,
      destination: data.baseCity?.city ?? data.destination?.city ?? 'Unknown',
      startDate: data.travelPeriod?.startDate ?? '',
      endDate: data.travelPeriod?.endDate ?? '',
      status: data.status ?? 'idle',
      stopsCount: data.destinations?.length ?? 0,
      updatedAt: ts?.toMillis?.() ?? Date.now(),
    };
  });
}

/** Delete a trip */
export async function deleteTrip(uid: string, tripId: string): Promise<void> {
  await deleteDoc(tripDoc(uid, tripId));
}
