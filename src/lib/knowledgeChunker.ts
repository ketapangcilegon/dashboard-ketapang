import * as XLSX from 'xlsx';
import JSZip from 'jszip';

export interface KnowledgeChunk {
  chunkIndex: number;
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Helper decode XML entities
 */
function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Ekstrak teks dari dokumen Word (.docx) menggunakan JSZip
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');
  
  if (!documentXml) {
    throw new Error('Format file .docx tidak valid atau tidak memiliki word/document.xml');
  }

  // Ganti tag paragraf dan tabel dengan baris baru, hapus tag XML lainnya
  const formatted = documentXml
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/w:tr>/g, '\n')
    .replace(/<w:tab\/>/g, ' ')
    .replace(/<[^>]+>/g, '');

  const clean = decodeXmlEntities(formatted)
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  return clean;
}

/**
 * Ekstrak teks dari presentasi PowerPoint (.pptx) menggunakan JSZip
 */
export async function extractTextFromPptx(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => {
      const matchA = a.match(/\d+/);
      const matchB = b.match(/\d+/);
      const numA = matchA ? parseInt(matchA[0], 10) : 0;
      const numB = matchB ? parseInt(matchB[0], 10) : 0;
      return numA - numB;
    });

  if (slideFiles.length === 0) {
    throw new Error('File .pptx tidak memiliki slide yang dapat dibaca.');
  }

  const slideTexts: string[] = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.file(slideFiles[i])?.async('string');
    if (xml) {
      const formatted = xml
        .replace(/<\/a:p>/g, '\n')
        .replace(/<[^>]+>/g, '');
      const clean = decodeXmlEntities(formatted)
        .replace(/\n\s*\n/g, '\n\n')
        .trim();

      if (clean) {
        slideTexts.push(`### Slide ${i + 1}\n${clean}`);
      }
    }
  }

  return slideTexts.join('\n\n');
}

/**
 * Ekstrak printable teks dari dokumen biner warisan (.doc atau .ppt)
 */
export function extractTextFromLegacyDocOrPpt(buffer: Buffer): string {
  // Ambil karakter ASCII dan UTF-8 printable string yang tersusun
  const raw = buffer.toString('binary');
  const cleanMatches = raw.match(/[\x20-\x7E\xA0-\xFF]{4,}/g) || [];
  const text = cleanMatches
    .filter(line => !/^[!@#$%^&*()_+=\-[\]{};':"\\|,.<>/?\s]+$/.test(line))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * Ekstrak teks dari gambar (JPG/PNG/WEBP) menggunakan Gemini Vision OCR
 */
export async function extractTextFromImage(
  buffer: Buffer, 
  mimeType: string, 
  apiKey?: string
): Promise<string> {
  const geminiKey = apiKey || process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi untuk menjalankan OCR gambar.');
  }

  const base64Data = buffer.toString('base64');
  const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'];
  
  let lastError = '';

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: 'Anda adalah sistem OCR cerdas. Ekstrak dan transkripsikan SELURUH teks, judul, tabel, angka, bagan, dan informasi penting yang tertulis di dalam gambar ini secara lengkap, terstruktur, dan presisi tanpa meringkas.'
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data
                }
              }
            ]
          }],
          generationConfig: {
            maxOutputTokens: 3000,
            temperature: 0.1
          }
        })
      });

      if (!response.ok) {
        lastError = `HTTP ${response.status}: ${await response.text()}`;
        continue;
      }

      const data = await response.json();
      const extracted = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (extracted.trim()) {
        return extracted.trim();
      }
    } catch (err) {
      lastError = String(err);
    }
  }

  throw new Error(`Gagal mengekstrak teks dari gambar: ${lastError || 'Tidak ada teks yang terdeteksi'}`);
}

/**
 * Membagi teks panjang menjadi beberapa chunk (~300-400 kata per chunk)
 * dengan overlap ~50 kata agar konteks tetap terjaga di perbatasan chunk.
 */
export function chunkText(
  fullText: string,
  chunkWordSize: number = 350,
  overlapWordSize: number = 50
): KnowledgeChunk[] {
  const clean = fullText.replace(/\r\n/g, '\n').replace(/\t/g, ' ').trim();
  if (!clean) return [];

  // Pisahkan berdasarkan paragraf dulu
  const paragraphs = clean.split(/\n\s*\n/);
  const words: string[] = [];

  for (const p of paragraphs) {
    const pWords = p.trim().split(/\s+/).filter(Boolean);
    if (pWords.length > 0) {
      words.push(...pWords, '\n\n');
    }
  }

  const chunks: KnowledgeChunk[] = [];
  let startIndex = 0;
  let chunkIdx = 0;

  while (startIndex < words.length) {
    const endIndex = Math.min(startIndex + chunkWordSize, words.length);
    const chunkWords = words.slice(startIndex, endIndex);
    
    // Gabungkan kembali
    const content = chunkWords.join(' ').replace(/\s+\n\n\s+/g, '\n\n').trim();
    if (content.length > 0) {
      chunks.push({
        chunkIndex: chunkIdx++,
        content,
        metadata: {
          wordCount: chunkWords.length,
          startIndex,
          endIndex
        }
      });
    }

    if (endIndex >= words.length) break;
    startIndex += (chunkWordSize - overlapWordSize);
  }

  return chunks;
}

/**
 * Parsing file Excel / CSV menjadi format teks naratif terstruktur
 * agar ramah dibaca dan diindeks oleh sistem RAG / AI
 */
export function parseExcelToTextChunks(buffer: Buffer): KnowledgeChunk[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const chunks: KnowledgeChunk[] = [];
  let chunkIdx = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    if (jsonData.length === 0) continue;

    // Kelompokkan per 10-15 baris per chunk agar tidak terlalu panjang
    const rowBatchSize = 12;
    for (let r = 0; r < jsonData.length; r += rowBatchSize) {
      const batch = jsonData.slice(r, r + rowBatchSize);
      const lines: string[] = [];
      lines.push(`### Lembar: ${sheetName} (Baris ${r + 1} s/d ${r + batch.length})`);

      for (const row of batch) {
        const entries = Object.entries(row)
          .filter(([, v]) => v !== '' && v !== null && v !== undefined)
          .map(([k, v]) => `${k}: ${v}`);
        if (entries.length > 0) {
          lines.push(`- ${entries.join(' | ')}`);
        }
      }

      const content = lines.join('\n');
      if (content.trim()) {
        chunks.push({
          chunkIndex: chunkIdx++,
          content,
          metadata: {
            sheetName,
            startRow: r + 1,
            endRow: r + batch.length
          }
        });
      }
    }
  }

  return chunks;
}

