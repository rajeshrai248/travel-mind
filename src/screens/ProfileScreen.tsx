import { useAuthStore } from '../store/authStore';
import { useAuth } from '../hooks/useAuth';
import { useTripStore } from '../store/tripStore';
import { Button } from '../components/Button';
import { LogOut } from 'lucide-react';

export function ProfileScreen() {
  const { user } = useAuthStore();
  const { signOut } = useAuth();
  const { resetTrip } = useTripStore();

  const handleSignOut = async () => {
    resetTrip();
    await signOut();
  };

  if (!user) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-8 py-12 text-center space-y-6">
      <div className="w-24 h-24 rounded-full bg-surface-container overflow-hidden border-4 border-primary-container shadow-xl">
        <img
          src={user.photoURL ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName ?? 'User')}&background=005251&color=fff`}
          alt="User"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-on-surface">
          {user.displayName ?? 'Traveler'}
        </h2>
        <p className="text-on-surface-variant font-medium">{user.email}</p>
        <span className="inline-block mt-1 text-xs font-semibold text-primary capitalize">
          {user.provider !== 'unknown' ? `Signed in with ${user.provider}` : ''}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 w-full pt-6">
        <div className="bg-surface-container-low p-4 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Trips</span>
          <p className="text-xl font-black text-on-surface">0</p>
          <p className="text-[10px] text-on-surface-variant">start your first one ✈️</p>
        </div>
        <div className="bg-surface-container-low p-4 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Miles</span>
          <p className="text-xl font-black text-on-surface">0</p>
          <p className="text-[10px] text-on-surface-variant">waiting to be earned 🌍</p>
        </div>
      </div>
      <div className="pt-4 w-full">
        <Button variant="outline" onClick={handleSignOut} className="w-full">
          <LogOut size={18} />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
