/**
 * AI Conversational Context Engine — PANCI / Food Security Intelligence Kota Cilegon
 *
 * Engine untuk memahami, mempertahankan, dan menyambungkan konteks percakapan
 * secara akurat dalam satu sesi/chat (diadopsi dari algoritma ChatDKPP / dkpp-info).
 */

export const CONVERSATIONAL_CONTEXT_ENGINE_PROMPT = `# AI CONVERSATIONAL CONTEXT ENGINE — PANDUAN PEMAHAMAN KONTEKS MULTI-TURN
Anda adalah AI Conversational Context Engine yang bertugas memahami, mempertahankan, dan menyambungkan konteks percakapan secara akurat dalam satu sesi/chat.

## TUJUAN UTAMA:
Jangan pernah menganggap setiap pesan user sebagai pertanyaan yang berdiri sendiri. Setiap pesan baru harus dianalisis dalam konteks seluruh percakapan sebelumnya dalam sesi yang sama.

Tugas Anda bukan sekadar menjawab pesan terakhir, tetapi memahami:
1. Apa yang sedang dibicarakan.
2. Apa yang sudah diketahui dari percakapan sebelumnya.
3. Apa yang sedang dirujuk oleh user.
4. Apa maksud sebenarnya dari pesan terbaru.
5. Apakah pesan terbaru merupakan kelanjutan, koreksi, klarifikasi, elaborasi, perbandingan, atau topik baru.
6. Jika pesan terbaru ambigu tetapi memiliki hubungan kuat dengan pesan sebelumnya, sambungkan secara otomatis dengan konteks sebelumnya.
7. Jangan meminta user mengulangi pertanyaan apabila maksudnya masih dapat disimpulkan secara wajar dari konteks percakapan.

---

## ALGORITMA PEMAHAMAN KONTEKS (WAJIB DILAKUKAN SETIAP PESAN):

### LANGKAH 1 — BACA PESAN TERBARU
Identifikasi kata, frasa, entitas, objek, subjek, tindakan, waktu, lokasi, dan maksud eksplisit dalam pesan terbaru.

### LANGKAH 2 — PERIKSA KONTEKS SEBELUMNYA
Baca pesan-pesan sebelumnya dalam sesi percakapan, terutama:
- pertanyaan terakhir user;
- jawaban chatbot terakhir;
- topik utama yang sedang aktif;
- entitas yang sedang dibahas;
- parameter yang sudah disebutkan (tahun, lokasi kelurahan/kecamatan/pasar, komoditas, indikator);
- pilihan, kategori, atau objek yang sedang dibandingkan;
- istilah yang sudah memiliki referensi dari percakapan sebelumnya.

Prioritaskan konteks yang paling dekat secara percakapan, tetapi gunakan konteks yang lebih jauh apabila masih relevan.

### LANGKAH 3 — TENTUKAN HUBUNGAN PESAN
Klasifikasikan pesan terbaru secara internal menjadi salah satu:
- **NEW_TOPIC**: Pesan benar-benar membuka topik baru dan tidak berkaitan dengan konteks sebelumnya.
- **CONTINUATION**: Pesan merupakan kelanjutan langsung dari pertanyaan/topik sebelumnya.
- **CLARIFICATION**: User meminta penjelasan lebih lanjut mengenai jawaban atau bagian tertentu dari percakapan sebelumnya.
- **CORRECTION**: User memperbaiki informasi, istilah, nama, angka, atau maksud sebelumnya.
- **FOLLOW_UP**: User mengajukan pertanyaan lanjutan yang secara eksplisit maupun implisit masih menggunakan konteks sebelumnya.
- **COMPARISON**: User meminta perbandingan terhadap objek yang sebelumnya sedang dibahas.
- **REFINEMENT**: User mempersempit, memperluas, atau mengubah parameter pertanyaan sebelumnya.
- **REFERENCE**: User menggunakan kata atau frasa yang secara semantik merujuk kepada entitas/topik sebelumnya (contoh: "yang lain?", "yang paling murah?", "kalau di Ciwandan?", "kalau Merak?", "bagaimana dengan yang kedua?", "kalau tahun lalu?", "terus?", "kenapa?", "nomor 3?").

### LANGKAH 4 — RESOLUSI REFERENSI & QUERY RECONSTRUCTION
Jika pesan terbaru mengandung kata atau frasa yang tidak lengkap secara mandiri, cari antecedent/referensi-nya dalam percakapan sebelumnya dan rekonstruksi maksud lengkap secara internal sebelum menjawab:

* **Contoh 1 (Komoditas/Sektoral)**:
  * User: "Berapa produksi perikanan tangkap Kota Cilegon tahun 2025?" -> Bot: [menjawab] -> User: "Kalau budidaya?"
  * **Rekonstruksi**: "Berapa produksi perikanan budidaya Kota Cilegon tahun 2025?"
* **Contoh 2 (Lokasi/Pasar/Wilayah)**:
  * User: "Berapa harga beras medium di Pasar Kranggot?" -> User: "Kalau Merak?"
  * **Rekonstruksi**: "Berapa harga beras medium di Pasar Baru Merak?"
* **Contoh 3 (Nomor Urut / Butir)**:
  * User: "Apa saja indikator FSVA?" -> Bot: [menjawab daftar] -> User: "Nomor 4?"
  * **Rekonstruksi**: "Apa indikator FSVA nomor 4 dari daftar yang baru saja dibahas?"
* **Contoh 4 (Tahun/Periode)**:
  * User: "Berapa produksi padi 2024?" -> User: "2025?"
  * **Rekonstruksi**: "Berapa produksi padi Kota Cilegon tahun 2025?"
* **Contoh 5 (Kelurahan/Kecamatan)**:
  * User: "Berapa luas sawah di Kelurahan Cibeber?" -> User: "Kalau Panggung Rawi?"
  * **Rekonstruksi**: "Berapa luas sawah di Kelurahan Panggung Rawi?"

---

## ATURAN PERUBAHAN PARAMETER & ISOLASI TOPIK:
1. **Perubahan Parameter Tunggal**: Jika pesan terbaru hanya mengubah satu parameter (misal tahun, lokasi pasar/kelurahan, atau subsektor), **pertahankan seluruh parameter lainnya** (komoditas, metrik, wilayah Kota Cilegon, dsb.).
2. **Koreksi Konteks**: Jika user berkata "bukan itu...", "maksud saya...", "bukan tahun 2024 tapi 2025", gantikan parameter lama dengan parameter koreksi terbaru.
3. **Pemisahan Topik Baru (NEW_TOPIC)**: Jika user beralih secara eksplisit (misal dari produksi beras beralih ke "Apa itu SAKIP?" atau "Tampilkan 84 KWT"), reset konteks lama yang tidak relevan.
4. **Anti-Halusinasi Konteks**: Jangan mengarang informasi/antecedent yang tidak didukung data atau konteks percakapan. Jika terdapat dua interpretasi sama kuat dan ambigu, tanyakan klarifikasi singkat.
`;

/**
 * Heuristic Contextual Query Synthesizer
 * Membantu merekonstruksi query pencarian RAG / filter detector agar
 * pertanyaan pendek (short follow-ups) dapat menemukan referensi data yang tepat.
 */
export function reconstructContextualQuery(
  currentMessage: string,
  history: Array<{ role: string; content?: string; text?: string }>
): string {
  if (!currentMessage) return '';
  const trimmed = currentMessage.trim();
  const lower = trimmed.toLowerCase();

  // Jika pesan sudah cukup panjang dan lengkap (> 6 kata dan tidak diawali kata sambung rujukan), gunakan langsung
  const words = lower.split(/\s+/).filter(Boolean);
  const isShortFollowUp = words.length <= 5;
  const startsWithReference = /^(kalau|bagaimana\s+kalau|bagaimana\s+dengan|yang|lalu|terus|kenapa|mengapa|gimana|dan|nomor|ke-|angka|di|tahun|pada|bukan|maksud\s+saya)\b/i.test(lower);

  if (!isShortFollowUp && !startsWithReference) {
    return trimmed;
  }

  // Cari user message dan assistant message sebelumnya yang relevan
  const userMessages: string[] = [];
  const assistantMessages: string[] = [];

  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    const text = (h.content || h.text || '').trim();
    if (!text) continue;
    if (h.role === 'user' && userMessages.length < 2) {
      userMessages.push(text);
    } else if ((h.role === 'assistant' || h.role === 'model') && assistantMessages.length < 2) {
      assistantMessages.push(text);
    }
  }

  const prevUserMsg = userMessages[0] || '';
  if (!prevUserMsg) return trimmed;

  // 1. Kasus Komoditas / Subsektor (misal: "kalau budidaya?", "kalau tangkap?", "singkong?", "jagung?", "cabai?")
  if (/(budidaya|tangkap|padi|beras|singkong|ubi|jagung|kedelai|sapi|kambing|ayam|telur|cabai|cabe|bawang|minyak|gula|terigu|ikan|lele|nila|sukun)/i.test(lower)) {
    const matchYear = prevUserMsg.match(/\b(202[0-9])\b/);
    const yearStr = matchYear ? matchYear[1] : '';
    const isMetric = /(produksi|produktivitas|luas|panen|harga|stok|neraca|konsumsi|kemandirian|peramalan|forecast)/i.test(prevUserMsg);
    const metricStr = isMetric
      ? (prevUserMsg.match(/(produksi|produktivitas|luas tanam|luas panen|luas sawah|harga|stok|neraca|konsumsi|kemandirian|peramalan|forecast)/i)?.[0] || 'data')
      : '';

    return `${metricStr} ${trimmed} Kota Cilegon ${yearStr}`.trim();
  }

  // 2. Kasus Lokasi / Kecamatan / Kelurahan / Pasar (misal: "kalau Merak?", "Kecamatan Ciwandan?", "Panggung Rawi?")
  if (/(merak|kranggot|blok f|ciwandan|cibeber|jombang|pulomerak|pulo merak|gerogol|grogol|citangkil|purwakarta|bulakan|cikerai|kalitimbang|karang asem|kedaleman|bagendung|bendungan|ciwaduk|ciwedus|ketileng|deringo|kebonsari|lebak denok|samangraya|taman baru|warnasari|banjar negara|gunung sugih|kepuh|kubangsari|randakari|tegal ratu|gerem|kotasari|rawa arum|gedong dalem|jombang wetan|masigit|panggung rawi|sukmajaya|lebakgede|mekarsari|suralaya|tamansari|kebon dalem|kotabumi|pabean|ramanuju|tegal bunder)/i.test(lower)) {
    const prevEntities = prevUserMsg.replace(/[?.,!]/g, '');
    return `${trimmed} ${prevEntities}`.trim();
  }

  // 3. Kasus Tahun saja (misal: "kalau 2024?", "tahun 2026?")
  if (/^(kalau\s+)?(tahun\s+)?20[12][0-9]\??$/i.test(lower)) {
    const cleanedPrev = prevUserMsg.replace(/\b20[12][0-9]\b/g, '').replace(/\s+/g, ' ').trim();
    return `${cleanedPrev} ${trimmed}`.trim();
  }

  // 4. Kasus Nomor / Poin (misal: "nomor 4?", "yang ke 2?")
  if (/(nomor\s*\d+|ke\s*-\s*\d+|ke\s*\d+)/i.test(lower)) {
    return `${trimmed} dari konteks: ${prevUserMsg}`.trim();
  }

  // 5. Default synthesis untuk follow-up pendek: gabungkan dengan kata kunci pertanyaan sebelumnya
  return `${prevUserMsg} ${trimmed}`.trim();
}
