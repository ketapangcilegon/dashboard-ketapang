import { NextResponse } from 'next/server';

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

    const adminEmail = process.env.ADMIN_EMAIL || 'ketapangcilegon@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'cilegon2026';

    if (
      email &&
      password &&
      email.toLowerCase() === adminEmail.toLowerCase() &&
      password === adminPassword
    ) {
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
