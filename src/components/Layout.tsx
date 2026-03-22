import { ReactNode } from 'react';
import { Home, MessageSquare, Compass, User } from 'lucide-react';
import { cn } from '../utils/cn';

interface LayoutProps {
  children: ReactNode;
  activeTab: 'home' | 'chat' | 'trips' | 'profile';
  onTabChange: (tab: 'home' | 'chat' | 'trips' | 'profile') => void;
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'trips', label: 'Trips', icon: Compass },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Centered content column */}
      <main className="flex-1 pb-28 md:pb-24">
        <div className="max-w-2xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Bottom nav — centered on desktop, full-width on mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
        <div className="w-full max-w-2xl rounded-t-[24px] bg-white/80 backdrop-blur-xl shadow-[0_-8px_32px_rgba(21,28,39,0.06)] flex justify-around items-center px-4 pb-8 pt-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id as any)}
                className={cn(
                  'flex flex-col items-center justify-center transition-all active:scale-90 duration-200',
                  isActive ? 'text-primary' : 'text-slate-400'
                )}
              >
                <Icon size={24} className={cn(isActive && 'fill-primary')} />
                <span className="text-[10px] font-semibold uppercase tracking-widest mt-1">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
