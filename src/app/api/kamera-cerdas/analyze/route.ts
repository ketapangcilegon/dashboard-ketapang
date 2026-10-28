import { NextResponse } from 'next/server';

// ============================================================
// /api/kamera-cerdas/analyze
// Endpoint AI Vision Gemini untuk analisis foto lapangan:
// 1. Mode Pasokan Beras (Sarana Distribusi, Karung, Kemasan, Merek)
// 2. Mode Tanaman Pangan (Jenis Tanaman, Fase Tumbuh, Indikasi Objek)
// ============================================================

const GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash'
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
Tugas Anda adalah menganalisis foto sarana perdagangan atau distribusi beras di lapangan (kios pasar tradisional, warung kelontong, toko sembako, toko beras khusus, dll.).

METODOLOGI SPESIFIK: ESTIMASI VOLUME BERAS DALAM KOTAK DISPLAY / BAK SEKAT (PASAR & WARUNG KECIL)
1. Deteksi Kotak Sekat Beras Curah:
   Di pasar tradisional dan warung kecil Indonesia, beras sering disimpan dan didisplay dalam kotak kayu bersekat (rice display bins / kotak curah) dengan harga tertera (misal Rp 18.000, 13.000, 12.000/kg atau liter).
   - Kenali apakah terdapat wadah display kotak beras bersekat.
   - Hitung jumlah sekat/kotak yang terlihat (contoh: 2, 3, 4, 5, atau 6 sekat).
   - Identifikasi kondisi permukaan beras per sekat:
     * "Menggunung" (mounded/pyramid, beras dituangkan melebihi bibir kotak ~110-120% kapasitas).
     * "Penuh Rata" (level full ~100% kapasitas).
     * "3/4 Penuh" (~75% kapasitas).
     * "1/2 Penuh" (terambil separuh ~50% kapasitas).
     * "Sisa Dasar / 1/4" (~25% kapasitas).
   - Referensi Dimensi Fisik Kotak Sekat Standar Pasar Cilegon / Banten:
     * Standar pasar tradisional: Lebar ~40 cm, Panjang ~55 cm, Tinggi ~40 cm -> Kapasitas bibir ~88 Liter (~70 kg). Jika menggunung ~95-105 Liter (~76-84 kg).
     * Kotak warung kecil / kios sedang: Lebar ~35 cm, Panjang ~45 cm, Tinggi ~35 cm -> Kapasitas bibir ~55 Liter (~44 kg).
   - Rumus Konversi Fisika (Bulk Density Beras Giling):
     * Densitas ruah beras (bulk density) standar BPS/Bulog: 0.80 kg/liter (1 Liter Beras ≈ 0.80 kg; 1 kg ≈ 1.25 Liter).
     * Total Bobot Kotak (kg) = Total Volume (Liter) x 0.80 kg/liter.
   - Referensi Skala Objek (Scale Anchor):
     * Canting / Kaleng Takaran Literan (silinder kaleng seng diameter ~10 cm, tinggi ~13 cm) sering tertancap di atas beras. Jika terlihat, jadikan bukti sistem takaran literan.
     * Papan / Kartu Label Harga (misal tulisan Rp 18.000, 13.000, 12.000, 20.000): baca angka yang tertera dan petakan ke varietas beras.
2. Deteksi Karung Cadangan (Buffer Stock):
   Periksa apakah di samping, di bawah, atau di belakang kotak terdapat tumpukan karung beras cadangan (karung 5kg, 10kg, 25kg, 50kg). Hitung estimasi karung cadangan tersebut.
3. Estimasi Total Pasokan Lapangan:
   Total estimasi pasokan (kg) = Estimasi Beras di Kotak Curah (kg) + Estimasi Beras di Karung Cadangan (kg).

ATURAN KRUSIAL:
1. Anda TIDAK BOLEH mengklaim mengetahui jumlah stok faktual pasti; gunakan label "Estimasi Visual AI".
2. Identifikasi kategori sarana: Toko Beras Khusus | Warung Madura / 24 Jam | Distributor / Agen Beras | Minimarket | Warung Kelontong | Supermarket | Kios Pasar Tradisional | Gudang Penyimpanan Beras | Toko Sayur & Pangan | Lainnya.
3. Format output WAJIB JSON murni tanpa markdown wrapper (\`\`\`json).`;

      userPrompt = `Analisis foto sarana distribusi beras ini. Periksa apakah terdapat kotak beras curah bersekat (pasar tradisional/warung) dan/atau karung beras. Wilayah: ${gpsMeta?.kelurahan || 'Cilegon'}, ${gpsMeta?.kecamatan || 'Kota Cilegon'}.
Kembalikan JSON dengan format:
{
  "kategori_sarana": "Kios Pasar Tradisional | Warung Kelontong | Toko Beras Khusus | Warung Madura / 24 Jam | Distributor / Agen Beras | Minimarket | Supermarket | Lainnya",
  "kategori_id": "pasar_tradisional | warung_kelontong | toko_beras | warung_madura | distributor_agen | minimarket | supermarket | lainnya",
  "objek_beras_terdeteksi": true,
  "format_penyimpanan": "kotak_curah | tumpukan_karung | kombinasi_kotak_dan_karung",
  "kotak_beras": {
    "terdeteksi": true,
    "jumlah_sekat": 4,
    "kondisi_permukaan": "menggunung | penuh_rata | sebagian_terisi | hampir_habis",
    "estimasi_persen_isi": 105,
    "estimasi_volume_per_sekat_liter": 65,
    "total_volume_liter": 260,
    "estimasi_berat_kotak_kg": 208,
    "canting_takaran_terlihat": true,
    "label_harga_terbaca": ["18.000", "13.000", "12.000"]
  },
  "karung_cadangan": {
    "terdeteksi": true,
    "estimasi_jumlah_karung": 10,
    "ukuran_rata_rata_kg": 25,
    "estimasi_berat_karung_kg": 250
  },
  "estimasi_tumpukan_karung": "± 10 karung di samping kotak",
  "perkiraan_jumlah_karung_angka": 10,
  "ukuran_kemasan_terdeteksi": "Curah Kotak Kayu & Karung 25 kg",
  "merek_terbaca": "Beras Premium / Medium / IR-64",
  "estimasi_total_pasokan_kg": 458,
  "satuan_rekomendasi": "kotak",
  "indikasi_kapasitas": "Sedang",
  "confidence_score": 0.88,
  "deskripsi_visual": "Terlihat kotak display sekat kayu berisi beras curah menggunung dengan kaleng canting literan dan papan harga (Rp 18.000, Rp 13.000, Rp 12.000), serta tumpukan karung beras cadangan 25kg di samping.",
  "metode_kalkulasi": "Geometri kotak sekat (4 sekat x ~65L = 260L x 0.80 kg/L = 208 kg) + Buffer karung (10 x 25kg = 250 kg) = Total ~458 kg",
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
          kategori_sarana: 'Kios Pasar Tradisional',
          kategori_id: 'pasar_tradisional',
          objek_beras_terdeteksi: true,
          format_penyimpanan: 'kotak_curah',
          kotak_beras: {
            terdeteksi: true,
            jumlah_sekat: 3,
            kondisi_permukaan: 'penuh_rata',
            estimasi_persen_isi: 100,
            estimasi_volume_per_sekat_liter: 60,
            total_volume_liter: 180,
            estimasi_berat_kotak_kg: 144,
            canting_takaran_terlihat: false,
            label_harga_terbaca: []
          },
          karung_cadangan: {
            terdeteksi: false,
            estimasi_jumlah_karung: 0,
            ukuran_rata_rata_kg: 25,
            estimasi_berat_karung_kg: 0
          },
          estimasi_tumpukan_karung: 'Perlu konfirmasi manual',
          perkiraan_jumlah_karung_angka: 0,
          ukuran_kemasan_terdeteksi: 'Kotak Display Curah',
          merek_terbaca: 'Perlu konfirmasi manual',
          estimasi_total_pasokan_kg: 144,
          satuan_rekomendasi: 'kotak',
          confidence_score: 0.50,
          deskripsi_visual: 'Analisis visual offline. Silakan tinjau dan sesuaikan jumlah kotak sekat beras pada formulir di bawah.',
          metode_kalkulasi: 'Estimasi standar 3 sekat x 60L = 180L x 0.80 kg/L = 144 kg',
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
