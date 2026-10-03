"use client";

import React, { useState, useRef, useEffect } from 'react';
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

  // Menyimpan posisi scroll terakhir pada halaman Beranda
  const berandaScrollRef = useRef<number>(0);

  // Monitor dan simpan posisi scroll selama user berada di Beranda
  useEffect(() => {
    if (currentView !== 'beranda') return;

    const handleScroll = () => {
      const scrollPos = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollPos >= 0) {
        berandaScrollRef.current = scrollPos;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentView]);

  // Navigasi dengan pencatatan posisi scroll sebelum meninggalkan Beranda
  const handleNavigate = (view: string) => {
    if (currentView === 'beranda') {
      const scrollPos = window.scrollY || document.documentElement.scrollTop || 0;
      berandaScrollRef.current = scrollPos;
    }
    setCurrentView(view);
  };

  // Navigasi kembali ke Beranda
  const handleBackToHome = () => {
    setCurrentView('beranda');
  };

  // Pulihkan posisi scroll saat kembali ke Beranda
  useEffect(() => {
    if (currentView === 'beranda') {
      const targetScroll = berandaScrollRef.current;
      if (targetScroll > 0) {
        // Pulihkan scroll segera
        window.scrollTo({ top: targetScroll, behavior: 'instant' });
        // Double rAF untuk memastikan DOM ter-render stabil
        const r1 = requestAnimationFrame(() => {
          window.scrollTo({ top: targetScroll, behavior: 'instant' });
          const r2 = requestAnimationFrame(() => {
            window.scrollTo({ top: targetScroll, behavior: 'instant' });
          });
          return () => cancelAnimationFrame(r2);
        });
        return () => cancelAnimationFrame(r1);
      }
    } else {
      // Saat membuka subview selain beranda, mulai dari paling atas subview
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentView]);

  // Real App Notifications (Strictly EWS alerts & SAGON price increases)
  const { 
    notifications, 
    unreadCount, 
    permissionStatus, 
    requestBrowserPermission 
  } = useAppNotifications(livePrices, liveHistory);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0FDF4] via-[#F4F8F6] to-[#EBF3EF] text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white print:hidden">
      
      {/* 1. Android Style Sticky Top App Bar */}
      <MobileTopBar
        currentView={currentView}
        onBack={handleBackToHome}
        onOpenNotifications={() => setIsNotificationOpen(true)}
        onOpenProfile={() => handleNavigate('profil_menu')}
        unreadCount={unreadCount}
      />

      {/* 2. Main Mobile Body Content */}
      <main className="flex-1 w-full px-3 pt-3">
        {/* MobileHome dipertahankan mounted dengan display toggle agar tinggi & posisi scroll presisi tanpa re-mount */}
        <div style={{ display: currentView === 'beranda' ? 'block' : 'none' }}>
          <MobileHome
            onNavigate={handleNavigate}
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
        </div>

        {currentView === 'profil_menu' ? (
          <MobileProfileView
            onNavigate={handleNavigate}
            onOpenNotifications={() => setIsNotificationOpen(true)}
          />
        ) : currentView !== 'beranda' ? (
          <div className="pb-24 animate-in fade-in duration-200">
            {children}
          </div>
        ) : null}
      </main>

      {/* 3. Persistent Android Bottom Navigation Bar */}
      <MobileBottomNav
        currentView={currentView}
        onSelectView={(view) => {
          if (currentView === 'beranda' && view === 'beranda') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            handleNavigate(view);
          }
        }}
        onOpenCatalog={() => setIsCatalogOpen(true)}
      />

      {/* 4. Bottom Sheet Catalog of All Features */}
      <MobileFeatureCatalogModal
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onSelectFeature={handleNavigate}
        currentView={currentView}
      />

      {/* 5. Real Notification Popup (EWS & Harga SAGON Naik) */}
      <MobileNotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onNavigate={handleNavigate}
        notifications={notifications}
        permissionStatus={permissionStatus}
        onRequestPermission={requestBrowserPermission}
      />

    </div>
  );
}
