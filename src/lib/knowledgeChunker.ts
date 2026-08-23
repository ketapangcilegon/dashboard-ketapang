import * as XLSX from 'xlsx';

export interface KnowledgeChunk {
  chunkIndex: number;
  content: string;
  metadata?: Record<string, unknown>;
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
    let content = chunkWords.join(' ').replace(/\s+\n\n\s+/g, '\n\n').trim();
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
