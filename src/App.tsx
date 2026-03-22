/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { HomeScreen } from './screens/HomeScreen';
import { NewTripScreen } from './screens/NewTripScreen';
import { ChatScreen } from './screens/ChatScreen';
import { ItineraryScreen } from './screens/ItineraryScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { useTripStore } from './store/tripStore';
import { useAuthStore } from './store/authStore';
import { useAuth } from './hooks/useAuth';
import { useTripPersistence } from './hooks/useTripPersistence';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

export default function App() {
  // Initialize auth listener
  useAuth();
  // Auto-save/load trips from Firestore
  useTripPersistence();

  const { user, loading } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'trips' | 'profile'>('home');
  const [showNewTrip, setShowNewTrip] = useState(false);
  const { context } = useTripStore();

  // Auto-switch to chat or itinerary when context updates
  useEffect(() => {
    if (context.status === 'reviewing' || context.status === 'confirmed') {
      setActiveTab('trips');
    }
  }, [context.status]);

  // Loading state while Firebase checks auth
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  // Not authenticated — show login
  if (!user) {
    return <LoginScreen />;
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onStartPlanning={() => setShowNewTrip(true)} />;
      case 'chat':
        return <ChatScreen />;
      case 'trips':
        return <ItineraryScreen />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomeScreen onStartPlanning={() => setShowNewTrip(true)} />;
    }
  };

  return (
    <div className="min-h-screen w-screen bg-background">
      <AnimatePresence mode="wait">
        {showNewTrip ? (
          <motion.div
            key="new-trip"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-background overflow-y-auto"
          >
            <NewTripScreen onComplete={() => setShowNewTrip(false)} />
          </motion.div>
        ) : (
          <motion.div
            key="main-layout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Layout activeTab={activeTab} onTabChange={setActiveTab}>
              {renderScreen()}
            </Layout>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

