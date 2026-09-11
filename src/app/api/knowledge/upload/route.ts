import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { 
  chunkText, 
  parseExcelToTextChunks, 
  extractTextFromDocx, 
  extractTextFromPptx, 
  extractTextFromLegacyDocOrPpt, 
  extractTextFromImage, 
  extractTextFromPdfWithGemini,
  KnowledgeChunk 
} from '@/lib/knowledgeChunker';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFParser = require('pdf2json');

export const dynamic = 'force-dynamic';

function safeDecodeURIComponent(str: string): string {
  if (!str) return '';
  try {
    return decodeURIComponent(str);
  } catch {
    try {
      return str.replace(/%([0-9A-Fa-f]{2})/g, (_, hex) => {
        try {
          return decodeURIComponent(`%${hex}`);
        } catch {
          return `%${hex}`;
        }
      });
    } catch {
      return str;
    }
  }
}

function extractTextFromPDF(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfParser = new (PDFParser as any)(null, 1);
      
      const timer = setTimeout(() => {
        try {
          pdfParser.destroy?.();
        } catch {
          // ignore
        }
        reject(new Error('Waktu pemrosesan PDF lokal habis'));
      }, 10000);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        clearTimeout(timer);
        reject(errData?.parserError || new Error('Gagal memproses file PDF lokal'));
      });

      pdfParser.on('pdfParser_dataReady', () => {
        clearTimeout(timer);
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rawText: string = (pdfParser as any).getRawTextContent();
          const decoded = safeDecodeURIComponent(rawText);
          resolve(decoded || '');
        } catch (e) {
          reject(e);
        }
      });

      pdfParser.parseBuffer(buffer);
    } catch (err) {
      reject(err);
    }
  });
}

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

    const MAX_FILE_SIZE_BYTES = 4.5 * 1024 * 1024; // 4.5 MB Limit (Serverless free-tier)

    if (file && file.size > 0) {
      fileName = file.name;
      
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { 
            error: `Ukuran file "${file.name}" (${(file.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas toleransi sistem (maksimal 4.5 MB pada environment free-tier). Silakan kompres berkas Anda sebelum diunggah.` 
          },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith('.pdf')) {
        jenis = 'pdf';
        let extractedText = '';
        
        // 1. Coba ekstraksi lokal dengan pdf2json
        try {
          extractedText = await extractTextFromPDF(buffer);
        } catch (pdfErr) {
          console.warn('Ekstraksi PDF lokal tidak berhasil, mencoba Gemini OCR...', pdfErr);
        }

        // 2. Jika teks kosong atau sangat sedikit (hasil scan gambar / OCR), gunakan Gemini Multimodal OCR
        if (!extractedText || extractedText.trim().length < 40) {
          try {
            console.log(`Memanggil Gemini OCR untuk file PDF "${fileName}"...`);
            extractedText = await extractTextFromPdfWithGemini(buffer);
          } catch (geminiErr) {
            console.error('Gemini PDF OCR error:', geminiErr);
          }
        }

        if (!extractedText || !extractedText.trim()) {
          return NextResponse.json(
            { error: 'Gagal mengekstrak teks dari dokumen PDF. Pastikan file PDF tidak terenkripsi kata sandi dan berisi teks/konten yang dapat dibaca.' },
            { status: 400 }
          );
        }
        chunks = chunkText(extractedText, 350, 50);
      } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv')) {
        jenis = lowerName.endsWith('.csv') ? 'csv' : 'excel';
        chunks = parseExcelToTextChunks(buffer);
      } else if (lowerName.endsWith('.docx')) {
        jenis = 'docx';
        const docxText = await extractTextFromDocx(buffer);
        if (!docxText.trim()) {
          return NextResponse.json(
            { error: 'Dokumen Word (.docx) tidak berisi teks yang dapat diekstrak.' },
            { status: 400 }
          );
        }
        chunks = chunkText(docxText, 350, 50);
      } else if (lowerName.endsWith('.doc')) {
        jenis = 'doc';
        const docText = extractTextFromLegacyDocOrPpt(buffer);
        if (!docText.trim()) {
          return NextResponse.json(
            { error: 'Gagal membaca isi file .doc warisan. Disarankan menyimpan ulang sebagai format .docx.' },
            { status: 400 }
          );
        }
        chunks = chunkText(docText, 350, 50);
      } else if (lowerName.endsWith('.pptx')) {
        jenis = 'pptx';
        const pptxText = await extractTextFromPptx(buffer);
        if (!pptxText.trim()) {
          return NextResponse.json(
            { error: 'File PowerPoint (.pptx) tidak berisi teks slide yang dapat diekstrak.' },
            { status: 400 }
          );
        }
        chunks = chunkText(pptxText, 350, 50);
      } else if (lowerName.endsWith('.ppt')) {
        jenis = 'ppt';
        const pptText = extractTextFromLegacyDocOrPpt(buffer);
        if (!pptText.trim()) {
          return NextResponse.json(
            { error: 'Gagal membaca isi file .ppt warisan. Disarankan menyimpan ulang sebagai format .pptx.' },
            { status: 400 }
          );
        }
        chunks = chunkText(pptText, 350, 50);
      } else if (
        lowerName.endsWith('.jpg') || 
        lowerName.endsWith('.jpeg') || 
        lowerName.endsWith('.png') || 
        lowerName.endsWith('.webp')
      ) {
        jenis = 'gambar';
        const mimeType = lowerName.endsWith('.png') 
          ? 'image/png' 
          : lowerName.endsWith('.webp') 
          ? 'image/webp' 
          : 'image/jpeg';
        const imageText = await extractTextFromImage(buffer, mimeType);
        if (!imageText.trim()) {
          return NextResponse.json(
            { error: 'Tidak ada teks yang berhasil diekstrak atau terbaca dari gambar ini.' },
            { status: 400 }
          );
        }
        chunks = chunkText(imageText, 350, 50);
      } else if (lowerName.endsWith('.txt') || lowerName.endsWith('.md')) {
        jenis = 'teks';
        const textContent = buffer.toString('utf-8');
        chunks = chunkText(textContent, 350, 50);
      } else {
        return NextResponse.json(
          { error: 'Format file tidak didukung. Harap upload format PDF, Word (.docx/.doc), PowerPoint (.pptx/.ppt), Excel (.xlsx/.xls), CSV, Gambar (.jpg/.png), atau TXT.' },
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
        // Rollback dokumen jika insert chunk gagal
        await supabase.from('ai_knowledge_docs').delete().eq('id', docId);
        return NextResponse.json(
          { error: `Gagal menyimpan indeks potongan pengetahuan: ${chunkError.message}` },
          { status: 500 }
        );
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
