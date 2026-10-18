"use client";

import { createClient, type Session, type User } from '@supabase/supabase-js';

/**
 * Klien Supabase khusus ENUMERATOR (pengguna publik yang masuk memakai Google/Gmail).
 *
 * Sengaja dipisahkan dari klien utama (`@/lib/supabase`) yang dipakai sesi Admin/Petugas:
 *  - `storageKey` berbeda  → sesi Google tidak pernah dianggap sesi Admin oleh komponen lain
 *    (Navbar, Sidebar, panel admin, dsb. membaca sesi klien utama).
 *  - `flowType: 'pkce'`    → callback OAuth hanya dapat ditukar oleh klien ini
 *    (klien utama berbasis implicit flow tidak ikut menangkap token di URL).
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const enumeratorSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    storageKey: 'ketapang-enumerator-auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export interface EnumeratorProfile {
  id: string;
  email: string;
  nama: string;
  avatarUrl?: string;
}

export function toEnumeratorProfile(user: User | null | undefined): EnumeratorProfile | null {
  if (!user?.email) return null;
  const provider = user.app_metadata?.provider;
  if (provider !== 'google') return null;
  const meta = (user.user_metadata || {}) as Record<string, unknown>;
  const nama = String(meta.full_name || meta.name || user.email.split('@')[0] || 'Enumerator');
  const avatarUrl = typeof meta.avatar_url === 'string' ? meta.avatar_url : typeof meta.picture === 'string' ? meta.picture : undefined;
  return { id: user.id, email: user.email, nama, avatarUrl };
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
  try {
    const redirectTo = `${window.location.origin}/?view=kamera_cerdas`;
    const { error } = await enumeratorSupabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { prompt: 'select_account' },
      },
    });
    return error ? { error: error.message } : {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Gagal memulai login Google.' };
  }
}

export async function signOutEnumerator(): Promise<void> {
  try {
    await enumeratorSupabase.auth.signOut();
  } catch {
    /* abaikan */
  }
}

export async function getEnumeratorSession(): Promise<Session | null> {
  const { data } = await enumeratorSupabase.auth.getSession();
  return data.session;
}
