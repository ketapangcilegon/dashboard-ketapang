import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Ambil daftar seluruh dokumen Knowledge Base
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('ai_knowledge_docs')
      .select('id, judul, deskripsi, jenis, file_name, total_chunks, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      // Jika tabel belum dibuat di Supabase
      if (error.code === '42P01') {
        return NextResponse.json({ docs: [], uninitialized: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ docs: data || [] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE: Hapus dokumen berdasarkan docId
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Parameter id wajib diisi' }, { status: 400 });
    }

    // Menghapus dokumen (chunks akan terhapus otomatis via CASCADE di PostgreSQL)
    const { error } = await supabase
      .from('ai_knowledge_docs')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Dokumen berhasil dihapus' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH: Update judul dan deskripsi dokumen
export async function PATCH(request: Request) {
  try {
    const { id, judul, deskripsi } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Parameter id wajib diisi' }, { status: 400 });
    }
    if (!judul || !judul.trim()) {
      return NextResponse.json({ error: 'Judul dokumen tidak boleh kosong' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('ai_knowledge_docs')
      .update({
        judul: judul.trim(),
        deskripsi: deskripsi ? deskripsi.trim() : ''
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      doc: data, 
      message: 'Judul dan deskripsi dokumen berhasil diperbarui.' 
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

