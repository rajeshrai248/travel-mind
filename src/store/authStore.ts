import { create } from 'zustand';
import type { AppUser } from '../types';

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  setUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  setUser: (user) => set({ user, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
