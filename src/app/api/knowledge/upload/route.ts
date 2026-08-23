import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { chunkText, parseExcelToTextChunks, KnowledgeChunk } from '@/lib/knowledgeChunker';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require('pdf-parse');

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const rawText = formData.get('rawText') as string | null;
    const judul = (formData.get('judul') as string) || (file ? file.name.replace(/\.[^/.]+$/, '') : 'Dokumen Tanpa Judul');
    const deskripsi = (formData.get('deskripsi') as string) || '';
    let jenis = (formData.get('jenis') as string) || 'teks';

    let chunks: KnowledgeChunk[] = [];
    let fileName: string | null = null;

    if (file && file.size > 0) {
      fileName = file.name;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith('.pdf')) {
        jenis = 'pdf';
        const pdfData = await pdf(buffer);
        const extractedText = pdfData.text || '';
        if (!extractedText.trim()) {
          return NextResponse.json(
            { error: 'Gagal mengekstrak teks dari PDF. Pastikan PDF bukan hasil scan murni tanpa OCR.' },
            { status: 400 }
          );
        }
        chunks = chunkText(extractedText, 350, 50);
      } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv')) {
        jenis = lowerName.endsWith('.csv') ? 'csv' : 'excel';
        chunks = parseExcelToTextChunks(buffer);
      } else if (lowerName.endsWith('.txt') || lowerName.endsWith('.md')) {
        jenis = 'teks';
        const textContent = buffer.toString('utf-8');
        chunks = chunkText(textContent, 350, 50);
      } else {
        return NextResponse.json(
          { error: 'Format file tidak didukung. Harap upload format PDF, Excel (.xlsx/.xls), CSV, atau TXT.' },
          { status: 400 }
        );
      }
    } else if (rawText && rawText.trim()) {
      jenis = 'teks';
      chunks = chunkText(rawText.trim(), 350, 50);
    } else {
      return NextResponse.json(
        { error: 'Tidak ada file atau teks yang dikirimkan.' },
        { status: 400 }
      );
    }

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: 'Dokumen tidak menghasilkan potongan teks yang valid.' },
        { status: 400 }
      );
    }

    // 1. Simpan metadata dokumen ke ai_knowledge_docs
    const { data: docData, error: docError } = await supabase
      .from('ai_knowledge_docs')
      .insert({
        judul,
        deskripsi,
        jenis,
        file_name: fileName,
        total_chunks: chunks.length
      })
      .select('id')
      .single();

    if (docError || !docData) {
      console.error('Error inserting ai_knowledge_docs:', docError);
      return NextResponse.json(
        { error: `Gagal menyimpan dokumen: ${docError?.message || 'Database error'}` },
        { status: 500 }
      );
    }

    const docId = docData.id;

    // 2. Simpan chunks ke ai_knowledge_chunks (dalam batch 50 baris)
    const batchSize = 50;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize).map(c => ({
        doc_id: docId,
        chunk_index: c.chunkIndex,
        content: c.content,
        metadata: c.metadata || {}
      }));

      const { error: chunkError } = await supabase
        .from('ai_knowledge_chunks')
        .insert(batch);

      if (chunkError) {
        console.error('Error inserting chunk batch:', chunkError);
        // Tetap lanjutkan batch berikutnya jika memungkinkan
      }
    }

    return NextResponse.json({
      success: true,
      docId,
      judul,
      jenis,
      totalChunks: chunks.length,
      message: `Berhasil mengindeks dokumen "${judul}" menjadi ${chunks.length} potongan pengetahuan AI.`
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Upload knowledge error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
