import { auth } from './firebase';
import type { TravelContext, TrendingDestination, CityFeasibility } from '../types';

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

/** Returns the absolute API base URL (empty string in dev, VITE_API_URL in production). */
export function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL ?? '';
}

/** Calls POST /api/agent/process and returns the partial TravelContext result. */
export async function callAgentApi(
  inputType: 'pdf' | 'text' | 'approval' | 'preferences',
  inputData: unknown,
  context: TravelContext,
): Promise<Partial<TravelContext>> {
  const authHeaders = await getAuthHeaders().catch(() => ({}));
  const response = await fetch(`${getApiBaseUrl()}/api/agent/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ inputType, inputData, context }),
  });
  if (!response.ok) {
    throw new Error(`Agent API error: ${response.status}`);
  }
  const json = await response.json();
  return json.result as Partial<TravelContext>;
}

/** Calls POST /api/discover and returns an array of TrendingDestination. */
export async function callDiscoverApi(country: string, baseCity: string): Promise<TrendingDestination[]> {
  const authHeaders = await getAuthHeaders().catch(() => ({}));
  const response = await fetch(`${getApiBaseUrl()}/api/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ country, baseCity }),
  });
  if (!response.ok) {
    throw new Error(`Discover API error: ${response.status}`);
  }
  const json = await response.json();
  return json.destinations as TrendingDestination[];
}

/** Calls POST /api/validate-city and returns a CityFeasibility assessment. */
export async function callValidateCityApi(cityName: string, context: TravelContext): Promise<CityFeasibility> {
  const authHeaders = await getAuthHeaders().catch(() => ({}));
  const response = await fetch(`${getApiBaseUrl()}/api/validate-city`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ cityName, context }),
  });
  if (!response.ok) {
    throw new Error(`Validate city API error: ${response.status}`);
  }
  const json = await response.json();
  return json.feasibility as CityFeasibility;
}
