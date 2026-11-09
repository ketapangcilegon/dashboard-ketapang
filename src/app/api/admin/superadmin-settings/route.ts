import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// File fallback untuk audit log jika tabel database belum tersedia di Supabase
const AUDIT_LOG_FILE = path.join(process.cwd(), 'data_superadmin_audit.json');

interface AuditEntry {
  id: string;
  userId: string;
  action: 'UPDATE_EMAIL' | 'UPDATE_PASSWORD' | 'SESSION_VERIFY';
  oldEmail?: string;
  newEmail?: string;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  timestamp: string;
  ip?: string;
}

function recordLocalAudit(entry: AuditEntry) {
  try {
    let logs: AuditEntry[] = [];
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
      logs = JSON.parse(content);
    }
    logs.unshift(entry);
    // Keep last 100 entries
    if (logs.length > 100) logs = logs.slice(0, 100);
    fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Superadmin Audit Log Error]', err);
  }
}

function getLocalAuditLogs(): AuditEntry[] {
  try {
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('[Get Superadmin Audit Log Error]', err);
  }
  return [];
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ success: false, error: 'Konfigurasi Supabase tidak ditemukan.' }, { status: 500 });
    }

    if (!token) {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Token autentikasi tidak disertakan.' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Sesi kedaluwarsa atau tidak valid.' }, { status: 401 });
    }

    // Verifikasi identitas superadmin
    const isSuperadmin = user.email === 'ketapangcilegon@gmail.com' || user.user_metadata?.role === 'superadmin' || user.email === process.env.ADMIN_EMAIL;
    if (!isSuperadmin) {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Akun ini bukan Superadmin.' }, { status: 403 });
    }

    // Ambil audit logs
    const auditLogs = getLocalAuditLogs();

    return NextResponse.json({
      success: true,
      superadmin: {
        id: user.id,
        email: user.email,
        role: 'superadmin',
        lastSignIn: user.last_sign_in_at,
        createdAt: user.created_at,
        appMetadata: user.app_metadata,
        userMetadata: user.user_metadata
      },
      auditLogs
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ success: false, error: 'Konfigurasi Supabase tidak ditemukan.' }, { status: 500 });
    }

    if (!token) {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Token autentikasi tidak disertakan.' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // 1. Verifikasi token pemanggil
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Sesi kedaluwarsa atau tidak valid.' }, { status: 401 });
    }

    const currentEmail = user.email || '';
    const isSuperadmin = currentEmail === 'ketapangcilegon@gmail.com' || user.user_metadata?.role === 'superadmin' || currentEmail === process.env.ADMIN_EMAIL;
    if (!isSuperadmin) {
      return NextResponse.json({ success: false, error: 'Akses ditolak: Anda tidak memiliki wewenang Superadmin.' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Format data JSON tidak valid.' }, { status: 400 });
    }

    const { action } = body;

    // ==========================================
    // ACTION 1: UPDATE EMAIL
    // ==========================================
    if (action === 'update-email') {
      const { newEmail, confirmEmail, currentPassword } = body;

      if (!newEmail || !confirmEmail || !currentPassword) {
        return NextResponse.json({ success: false, error: 'Email baru, konfirmasi email, dan password saat ini wajib diisi.' }, { status: 400 });
      }

      if (newEmail.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
        return NextResponse.json({ success: false, error: 'Konfirmasi email tidak sesuai dengan email baru.' }, { status: 400 });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail.trim())) {
        return NextResponse.json({ success: false, error: 'Format email baru tidak valid.' }, { status: 400 });
      }

      // Re-autentikasi dengan current password untuk memvalidasi kepemilikan akun yang sah
      const reAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data: reAuthData, error: reAuthError } = await reAuthClient.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword
      });

      if (reAuthError || !reAuthData.user) {
        recordLocalAudit({
          id: `audit-${Date.now()}`,
          userId: user.id,
          action: 'UPDATE_EMAIL',
          oldEmail: currentEmail,
          newEmail: newEmail.trim(),
          status: 'FAILED',
          errorMessage: 'Password saat ini salah saat re-autentikasi.',
          timestamp: new Date().toISOString()
        });
        return NextResponse.json({ success: false, error: 'Password saat ini yang Anda masukkan salah.' }, { status: 401 });
      }

      // Jalankan pembaruan email pada Supabase Auth menggunakan user session client
      const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } }
      });

      const { data: updateData, error: updateError } = await authenticatedClient.auth.updateUser({
        email: newEmail.trim().toLowerCase()
      });

      if (updateError) {
        recordLocalAudit({
          id: `audit-${Date.now()}`,
          userId: user.id,
          action: 'UPDATE_EMAIL',
          oldEmail: currentEmail,
          newEmail: newEmail.trim(),
          status: 'FAILED',
          errorMessage: updateError.message,
          timestamp: new Date().toISOString()
        });
        return NextResponse.json({ success: false, error: 'Gagal memperbarui email Supabase Auth: ' + updateError.message }, { status: 500 });
      }

      recordLocalAudit({
        id: `audit-${Date.now()}`,
        userId: user.id,
        action: 'UPDATE_EMAIL',
        oldEmail: currentEmail,
        newEmail: newEmail.trim().toLowerCase(),
        status: 'SUCCESS',
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: 'Permintaan perubahan email Supabase Auth berhasil diajukan. Tautan konfirmasi telah dikirimkan oleh Supabase ke alamat email terkait sesuai prosedur keamanan.',
        user: updateData.user
      });
    }

    // ==========================================
    // ACTION 2: UPDATE PASSWORD
    // ==========================================
    if (action === 'update-password') {
      const { currentPassword, newPassword, confirmPassword } = body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return NextResponse.json({ success: false, error: 'Password lama, password baru, dan konfirmasi password wajib diisi.' }, { status: 400 });
      }

      if (newPassword !== confirmPassword) {
        return NextResponse.json({ success: false, error: 'Konfirmasi password tidak sesuai dengan password baru.' }, { status: 400 });
      }

      if (newPassword.length < 12) {
        return NextResponse.json({ success: false, error: 'Password baru harus memiliki panjang minimal 12 karakter untuk mematuhi standar keamanan Superadmin.' }, { status: 400 });
      }

      // Re-autentikasi password lama
      const reAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data: reAuthData, error: reAuthError } = await reAuthClient.auth.signInWithPassword({
        email: currentEmail,
        password: currentPassword
      });

      if (reAuthError || !reAuthData.user) {
        recordLocalAudit({
          id: `audit-${Date.now()}`,
          userId: user.id,
          action: 'UPDATE_PASSWORD',
          status: 'FAILED',
          errorMessage: 'Password lama tidak cocok saat re-autentikasi.',
          timestamp: new Date().toISOString()
        });
        return NextResponse.json({ success: false, error: 'Password lama yang Anda masukkan tidak valid.' }, { status: 401 });
      }

      // Jalankan pembaruan password pada Supabase Auth menggunakan user session client
      const authenticatedClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: `Bearer ${token}` } }
      });

      const { data: updateData, error: updateError } = await authenticatedClient.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        recordLocalAudit({
          id: `audit-${Date.now()}`,
          userId: user.id,
          action: 'UPDATE_PASSWORD',
          status: 'FAILED',
          errorMessage: updateError.message,
          timestamp: new Date().toISOString()
        });
        return NextResponse.json({ success: false, error: 'Gagal memperbarui password Supabase Auth: ' + updateError.message }, { status: 500 });
      }

      recordLocalAudit({
        id: `audit-${Date.now()}`,
        userId: user.id,
        action: 'UPDATE_PASSWORD',
        status: 'SUCCESS',
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: 'Password Superadmin berhasil diperbarui di Supabase Auth.',
        user: updateData.user
      });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak dikenali.' }, { status: 400 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message || 'Terjadi kesalahan server.' }, { status: 500 });
  }
}

