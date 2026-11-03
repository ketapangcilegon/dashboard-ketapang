import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Format data tidak valid.' },
        { status: 400 }
      );
    }

    const { email, password } = body;
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email dan kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: 'Konfigurasi autentikasi server belum lengkap.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (!authError && data?.user) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'Akses ditolak. Email atau kata sandi tidak valid atau tidak terdaftar.' },
      { status: 401 }
    );
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[API Auth Login] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan internal server.' },
      { status: 500 }
    );
  }
}
