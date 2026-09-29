import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export interface FeatureAccessSettings {
  kameraCerdasLocked: boolean;
  tentangMetodologiLocked: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

const DEFAULT_SETTINGS: FeatureAccessSettings = {
  kameraCerdasLocked: true,
  tentangMetodologiLocked: true,
  updatedAt: new Date().toISOString()
};

// In-memory cache for ultra-fast response
let cachedSettings: FeatureAccessSettings | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 10000; // 10 detik

export async function GET() {
  const now = Date.now();
  if (cachedSettings && (now - lastFetchTime) < CACHE_TTL_MS) {
    return NextResponse.json({
      success: true,
      settings: cachedSettings,
      cached: true
    });
  }

  try {
    const { data, error } = await supabase
      .from('sp_cache_data')
      .select('data, fetched_at')
      .eq('tabel_sumber', 'app_feature_access')
      .single();

    if (!error && data && data.data) {
      const merged: FeatureAccessSettings = {
        ...DEFAULT_SETTINGS,
        ...(data.data as Partial<FeatureAccessSettings>),
        updatedAt: data.fetched_at || (data.data as any).updatedAt
      };
      cachedSettings = merged;
      lastFetchTime = now;
      return NextResponse.json({
        success: true,
        settings: merged
      });
    }
  } catch (err) {
    console.warn('[FeatureAccess] Fallback to default settings:', err);
  }

  return NextResponse.json({
    success: true,
    settings: cachedSettings || DEFAULT_SETTINGS
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { kameraCerdasLocked, tentangMetodologiLocked, updatedBy } = body;

    const newSettings: FeatureAccessSettings = {
      kameraCerdasLocked: typeof kameraCerdasLocked === 'boolean' ? kameraCerdasLocked : true,
      tentangMetodologiLocked: typeof tentangMetodologiLocked === 'boolean' ? tentangMetodologiLocked : true,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'Administrator'
    };

    // 1. Simpan ke database Supabase (tabel sp_cache_data)
    const { error: dbError } = await supabase
      .from('sp_cache_data')
      .upsert({
        tabel_sumber: 'app_feature_access',
        data: newSettings,
        fetched_at: newSettings.updatedAt
      }, {
        onConflict: 'tabel_sumber'
      });

    if (dbError) {
      console.warn('[FeatureAccess] Warning saving to Supabase:', dbError.message);
    }

    // 2. Update cache memori lokal
    cachedSettings = newSettings;
    lastFetchTime = Date.now();

    return NextResponse.json({
      success: true,
      message: 'Pengaturan akses fitur berhasil diperbarui.',
      settings: newSettings
    });
  } catch (err: any) {
    console.error('[FeatureAccess] Error updating settings:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal menyimpan pengaturan' },
      { status: 500 }
    );
  }
}
