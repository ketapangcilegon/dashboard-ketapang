"use client";

import React, { useState } from 'react';
import MobileTopBar from './MobileTopBar';
import MobileBottomNav from './MobileBottomNav';
import MobileHome from './MobileHome';
import MobileProfileView from './MobileProfileView';
import MobileFeatureCatalogModal from './MobileFeatureCatalogModal';
import MobileNotificationModal from './MobileNotificationModal';
import { useAppNotifications } from '@/lib/useAppNotifications';

interface MobileAppContainerProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  livePrices?: Record<string, number> | null;
  liveDate?: string | null;
  liveHistory?: Record<string, Record<string, number>> | null;
  overallScore?: number;
  balitaStatus?: string;
  ikpData?: any[];
  fsvaMatangData?: any[];
  benchmarkCurrentData?: Record<number, number>;
  benchmarkList?: any[];
  children: React.ReactNode;
}

export default function MobileAppContainer({
  currentView,
  setCurrentView,
  livePrices,
  liveDate,
  liveHistory,
  overallScore = 82.4,
  balitaStatus = 'AMAN',
  ikpData = [],
  fsvaMatangData = [],
  benchmarkCurrentData,
  benchmarkList = [],
  children,
}: MobileAppContainerProps) {
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Real App Notifications (Strictly EWS alerts & SAGON price increases)
  const { 
    notifications, 
    unreadCount, 
    permissionStatus, 
    requestBrowserPermission 
  } = useAppNotifications(livePrices, liveHistory);

  const handleBackToHome = () => {
    setCurrentView('beranda');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0FDF4] via-[#F4F8F6] to-[#EBF3EF] text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white print:hidden">
      
      {/* 1. Android Style Sticky Top App Bar */}
      <MobileTopBar
        currentView={currentView}
        onBack={handleBackToHome}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        onOpenProfile={() => setCurrentView('profil_menu')}
        unreadCount={unreadCount}
      />

      {/* 2. Main Mobile Body Content */}
      <main className="flex-1 w-full px-3 pt-3">
        {currentView === 'beranda' ? (
          <MobileHome
            onNavigate={setCurrentView}
            onOpenCatalog={() => setIsCatalogOpen(true)}
            livePrices={livePrices}
            liveDate={liveDate}
            liveHistory={liveHistory}
            overallScore={overallScore}
            balitaStatus={balitaStatus}
            ikpData={ikpData}
            fsvaMatangData={fsvaMatangData}
            benchmarkCurrentData={benchmarkCurrentData}
            benchmarkList={benchmarkList}
          />
        ) : currentView === 'profil_menu' ? (
          <MobileProfileView
            onNavigate={setCurrentView}
            onOpenNotifications={() => setIsNotificationOpen(true)}
          />
        ) : (
          <div className="pb-24 animate-in fade-in duration-200">
            {children}
          </div>
        )}
      </main>

      {/* 3. Persistent Android Bottom Navigation Bar */}
      <MobileBottomNav
        currentView={currentView}
        onSelectView={setCurrentView}
        onOpenCatalog={() => setIsCatalogOpen(true)}
      />

      {/* 4. Bottom Sheet Catalog of All Features */}
      <MobileFeatureCatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onSelectFeature={setCurrentView}
        currentView={currentView}
      />

      {/* 5. Real Notification Popup (EWS & Harga SAGON Naik) */}
      <MobileNotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onNavigate={setCurrentView}
        notifications={notifications}
        permissionStatus={permissionStatus}
        onRequestPermission={requestBrowserPermission}
      />

    </div>
  );
}
