"use client";

import { useState, useEffect, useCallback } from 'react';

export interface FeatureAccessSettings {
  kameraCerdasLocked: boolean;
  tentangMetodologiLocked: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

const LOCAL_STORAGE_KEY = 'dkpp_feature_access_settings';
const EVENT_NAME = 'dkpp_feature_access_updated';

const DEFAULT_SETTINGS: FeatureAccessSettings = {
  kameraCerdasLocked: true,
  tentangMetodologiLocked: true
};

export function getLocalFeatureAccess(): FeatureAccessSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export function useFeatureAccess() {
  const [settings, setSettings] = useState<FeatureAccessSettings>(() => getLocalFeatureAccess());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/feature-access');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings(data.settings);
          if (typeof window !== 'undefined') {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.settings));
          }
        }
      }
    } catch (err) {
      console.warn('[useFeatureAccess] Gagal memuat pengaturan:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    // Listen for cross-component / cross-window updates
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
        try {
          setSettings(JSON.parse(e.newValue));
        } catch {}
      }
    };

    const handleCustomEvent = (e: CustomEvent<FeatureAccessSettings>) => {
      if (e.detail) {
        setSettings(e.detail);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(EVENT_NAME as any, handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(EVENT_NAME as any, handleCustomEvent as EventListener);
    };
  }, [fetchSettings]);

  const updateSettings = async (newValues: Partial<FeatureAccessSettings>): Promise<boolean> => {
    try {
      const payload = {
        ...settings,
        ...newValues,
        updatedAt: new Date().toISOString()
      };

      // Optimistic update
      setSettings(payload);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }));
      }

      const res = await fetch('/api/settings/feature-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        // Rollback if failed
        fetchSettings();
        return false;
      }
      return true;
    } catch (err) {
      console.error('[useFeatureAccess] Gagal menyimpan:', err);
      fetchSettings();
      return false;
    }
  };

  return {
    settings,
    isLoading,
    isKameraLocked: settings.kameraCerdasLocked,
    isTentangLocked: settings.tentangMetodologiLocked,
    updateSettings,
    reload: fetchSettings
  };
}
