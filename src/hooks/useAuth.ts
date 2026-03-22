import { useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleProvider, facebookProvider } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';
import type { AppUser } from '../types';

function mapFirebaseUser(user: import('firebase/auth').User): AppUser {
  const providerId = user.providerData[0]?.providerId;
  let provider: AppUser['provider'] = 'unknown';
  if (providerId === 'google.com') provider = 'google';
  else if (providerId === 'facebook.com') provider = 'facebook';

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    provider,
  };
}

export function useAuth() {
  const { setUser, setLoading, setError } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(mapFirebaseUser(firebaseUser));
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [setUser, setLoading]);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message ?? 'Google sign-in failed');
    }
  };

  const signInWithFacebook = async () => {
    try {
      setError(null);
      await signInWithPopup(auth, facebookProvider);
    } catch (err: any) {
      setError(err.message ?? 'Facebook sign-in failed');
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
  };

  return { signInWithGoogle, signInWithFacebook, signOut };
}
