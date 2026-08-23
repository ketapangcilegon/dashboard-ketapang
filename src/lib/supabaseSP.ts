import { createClient } from '@supabase/supabase-js';

// Client untuk membaca data dari Serumpun-Padi GIS Database
// HANYA digunakan di server-side (API routes) — jangan import di komponen client!
const spUrl = process.env.SP_SUPABASE_URL || '';
const spAnonKey = process.env.SP_SUPABASE_ANON_KEY || '';

export const supabaseSP = createClient(spUrl, spAnonKey);
