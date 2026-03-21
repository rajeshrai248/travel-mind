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
import { useTripStore } from './store/tripStore';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'trips' | 'profile'>('home');
  const [showNewTrip, setShowNewTrip] = useState(false);
  const { context } = useTripStore();

  // Auto-switch to chat or itinerary when context updates
  useEffect(() => {
    if (context.status === 'reviewing' || context.status === 'confirmed') {
      setActiveTab('trips');
    }
  }, [context.status]);

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onStartPlanning={() => setShowNewTrip(true)} />;
      case 'chat':
        return <ChatScreen />;
      case 'trips':
        return <ItineraryScreen />;
      case 'profile':
        return (
          <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-surface-container overflow-hidden border-4 border-primary-container shadow-xl">
              <img
                src="https://picsum.photos/seed/user/200/200"
                alt="User"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-on-surface">Rajesh Rai</h2>
              <p className="text-on-surface-variant font-medium">rajeshrai248@gmail.com</p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full pt-6">
              <div className="bg-surface-container-low p-4 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Trips</span>
                <p className="text-xl font-black text-on-surface">12</p>
              </div>
              <div className="bg-surface-container-low p-4 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Miles</span>
                <p className="text-xl font-black text-on-surface">42k</p>
              </div>
            </div>
          </div>
        );
      default:
        return <HomeScreen onStartPlanning={() => setShowNewTrip(true)} />;
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        {showNewTrip ? (
          <motion.div
            key="new-trip"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-background"
          >
            <NewTripScreen onComplete={() => setShowNewTrip(false)} />
          </motion.div>
        ) : (
          <motion.div
            key="main-layout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full"
          >
            <Layout activeTab={activeTab} onTabChange={setActiveTab}>
              <div className="h-full">
                {renderScreen()}
              </div>
            </Layout>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

