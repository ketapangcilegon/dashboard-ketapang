import { NextResponse } from 'next/server';

// ============================================================
// /api/kamera-cerdas/analyze
// Endpoint AI Vision Gemini untuk analisis foto lapangan:
// 1. Mode Pasokan Beras (Sarana Distribusi, Karung, Kemasan, Merek)
// 2. Mode Tanaman Pangan (Jenis Tanaman, Fase Tumbuh, Indikasi Objek)
// ============================================================

const GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-2.5-flash'
];

interface AnalyzeRequestBody {
  imageBase64: string; // data:image/jpeg;base64,... or raw base64
  mode: 'pasokan_beras' | 'tanaman_pangan';
  gpsMeta?: {
    lat: number;
    lng: number;
    accuracy?: number;
    kelurahan?: string;
    kecamatan?: string;
  };
}

export async function POST(request: Request) {
  try {
    const body: AnalyzeRequestBody = await request.json();
    const { imageBase64, mode, gpsMeta } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Foto tidak boleh kosong' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY tidak dikonfigurasi di server' }, { status: 500 });
    }

    // Ekstrak pure base64 dan mime type
    let cleanBase64 = imageBase64;
    let mimeType = 'image/jpeg';
    if (imageBase64.includes(';base64,')) {
      const parts = imageBase64.split(';base64,');
      const mimeMatch = parts[0].match(/:(.*?)$/);
      if (mimeMatch) mimeType = mimeMatch[1];
      cleanBase64 = parts[1];
    }

    // Bangun System Prompt yang tegas & terstruktur
    let systemInstruction = '';
    let userPrompt = '';

    if (mode === 'pasokan_beras') {
      systemInstruction = `Anda adalah Asisten Pakar Pangan Spasial & Computer Vision untuk Dinas Ketahanan Pangan Kota Cilegon.
Tugas Anda adalah menganalisis foto sarana perdagangan atau distribusi beras di lapangan.

ATURAN KRUSIAL:
1. Anda TIDAK BOLEH mengklaim mengetahui jumlah stok faktual sebenarnya hanya dari foto.
2. Setiap estimasi jumlah karung yang terlihat adalah "Estimasi Visual AI" dan bukan data stok pasti.
3. Identifikasi jenis sarana dari kategori berikut:
   - Toko Beras Khusus
   - Warung Madura / 24 Jam
   - Distributor / Agen Beras
   - Minimarket (Indomaret/Alfamart/dll)
   - Warung Kelontong / Toko Sembako
   - Supermarket / Hypermarket
   - Kios Pasar Tradisional
   - Gudang Penyimpanan Beras
   - Toko Sayur & Pangan
   - Lainnya / Tidak dapat diidentifikasi
4. Ekstrak informasi visual:
   - Objek beras terdeteksi (ya/tidak)
   - Perkiraan jumlah tumpukan / karung yang terlihat di kamera (contoh: "± 10 karung")
   - Ukuran kemasan yang terlihat (contoh: "5 kg", "10 kg", "25 kg", "50 kg", "Literan / Curah")
   - Merek / label beras jika ada teks yang terbaca (contoh: "Rojolele", "Pandan Wangi", "Beras SPHP", "Setra Ramos", dll.)
   - Kondisi display sarana
5. Format output WAJIB JSON murni tanpa markdown wrapper (\`\`\`json).`;

      userPrompt = `Analisis foto sarana distribusi beras ini. Wilayah pengamatan: ${gpsMeta?.kelurahan || 'Cilegon'}, ${gpsMeta?.kecamatan || 'Kota Cilegon'}.
Kembalikan JSON dengan format:
{
  "kategori_sarana": "Toko Beras Khusus | Warung Madura / 24 Jam | Distributor / Agen Beras | Minimarket | Warung Kelontong | Supermarket | Kios Pasar Tradisional | Gudang Penyimpanan Beras | Toko Sayur & Pangan | Lainnya",
  "kategori_id": "toko_beras | warung_madura | distributor_agen | minimarket | warung_kelontong | supermarket | pasar_tradisional | gudang_beras | toko_sayur | lainnya",
  "objek_beras_terdeteksi": true,
  "estimasi_tumpukan_karung": "± 12 karung",
  "perkiraan_jumlah_karung_angka": 12,
  "ukuran_kemasan_terdeteksi": "5 kg dan 25 kg",
  "merek_terbaca": "Beras Premium Cilegon / SPHP / Tidak terbaca",
  "indikasi_kapasitas": "Sedang",
  "confidence_score": 0.85,
  "deskripsi_visual": "Terlihat etalase warung dengan tumpukan karung beras 25kg dan kemasan 5kg tertata rapi.",
  "saran_asal_pasokan_default": "Kabupaten Serang (Banten)"
}`;
    } else {
      systemInstruction = `Anda adalah Asisten Pakar Agronomi Spasial & Computer Vision untuk Dinas Ketahanan Pangan Kota Cilegon.
Tugas Anda adalah menganalisis foto tanaman pangan sumber karbohidrat di lapangan.

ATURAN KRUSIAL:
1. Identifikasi jenis tanaman pangan karbohidrat:
   - Sukun (Pohon Sukun / Artocarpus altilis)
   - Padi (Padi Sawah / Gogo / Oryza sativa)
   - Singkong (Ubi Kayu / Manihot esculenta)
   - Ubi Jalar (Mantang / Ipomoea batatas)
   - Jagung (Zea mays)
   - Talas (Keladi / Colocasia esculenta)
   - Sorgum (Cantel / Sorghum bicolor)
   - Tanaman Karbohidrat Lainnya / Tidak dikenal
2. Identifikasi indikasi fase pertumbuhan: "Baru Tanam / Bibit", "Vegetatif (Sedang Tumbuh)", "Generatif / Berbunga", "Siap Panen", "Pasca Panen".
3. Perkirakan jumlah tanaman / pohon / rumpun yang terlihat dalam frame kamera.
4. Jangan menyatakan umur atau produksi sebagai angka pasti. Gunakan label "Estimasi AI" atau "Estimasi Normatif".
5. Format output WAJIB JSON murni tanpa markdown wrapper (\`\`\`json).`;

      userPrompt = `Analisis foto tanaman pangan sumber karbohidrat ini. Wilayah pengamatan: ${gpsMeta?.kelurahan || 'Cilegon'}, ${gpsMeta?.kecamatan || 'Kota Cilegon'}.
Kembalikan JSON dengan format:
{
  "jenis_tanaman": "Pohon Sukun (Artocarpus altilis) | Padi Sawah (Oryza sativa) | Singkong / Ubi Kayu | Ubi Jalar / Mantang | Jagung Pangan | Talas / Keladi | Sorgum / Cantel | Tanaman Lainnya",
  "tanaman_id": "sukun | padi | singkong | ubi_jalar | jagung | talas | sorgum | lainnya",
  "fase_pertumbuhan": "Vegetatif (Sedang Tumbuh) | Siap Panen | Baru Tanam | Generatif",
  "perkiraan_jumlah_terlihat": "± 5 pohon / 1 petak",
  "kondisi_tanaman": "Sehat / Subur / Cukup Terawat",
  "indikasi_tinggi_ukuran": "Tinggi ± 4-5 meter",
  "confidence_score": 0.88,
  "deskripsi_visual": "Pohon sukun produktif dengan tajuk hijau lebat dan beberapa buah sukun terlihat menggantung.",
  "rekomendasi_satuan": "pohon"
}`;
    }

    // Panggil model Gemini Vision dengan Fallback
    let resultText = '';
    let usedModel = '';

    for (const model of GEMINI_MODELS) {
      try {
        const payload: Record<string, unknown> = {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: cleanBase64
                  }
                },
                {
                  text: userPrompt
                }
              ]
            }
          ],
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json'
          }
        };

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            resultText = text;
            usedModel = model;
            break;
          }
        } else {
          console.warn(`[Gemini Vision] Model ${model} returned ${res.status}`);
        }
      } catch (err) {
        console.warn(`[Gemini Vision] Error on model ${model}:`, err);
      }
    }

    if (!resultText) {
      // Fallback response jika AI API sedang offline/limit
      return NextResponse.json({
        success: false,
        fallback: true,
        data: mode === 'pasokan_beras' ? {
          kategori_sarana: 'Toko Beras Khusus',
          kategori_id: 'toko_beras',
          objek_beras_terdeteksi: true,
          estimasi_tumpukan_karung: 'Tidak dapat ditentukan dari foto',
          perkiraan_jumlah_karung_angka: 0,
          ukuran_kemasan_terdeteksi: 'Perlu konfirmasi manual',
          merek_terbaca: 'Perlu konfirmasi manual',
          confidence_score: 0.50,
          deskripsi_visual: 'Analisis visual offline. Silakan isi form manual di bawah.',
          saran_asal_pasokan_default: 'Kota Cilegon (Lokal)'
        } : {
          jenis_tanaman: 'Pohon Sukun (Artocarpus altilis)',
          tanaman_id: 'sukun',
          fase_pertumbuhan: 'Vegetatif (Sedang Tumbuh)',
          perkiraan_jumlah_terlihat: '1 pohon',
          kondisi_tanaman: 'Cukup Terawat',
          confidence_score: 0.50,
          deskripsi_visual: 'Analisis visual offline. Silakan isi data pohon/lahan manual di bawah.',
          rekomendasi_satuan: 'pohon'
        }
      });
    }

    // Parse JSON
    try {
      const parsed = JSON.parse(resultText.replace(/```json/g, '').replace(/```/g, '').trim());
      return NextResponse.json({
        success: true,
        model: usedModel,
        data: parsed
      });
    } catch {
      return NextResponse.json({
        success: true,
        raw: resultText
      });
    }

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('/api/kamera-cerdas/analyze error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
