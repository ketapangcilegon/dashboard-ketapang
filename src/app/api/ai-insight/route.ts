import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const {
      year,
      month,
      kecamatan = 'ALL',
      kelurahan = 'ALL',
      cvBeras = 3.65,
      pphScore = 90.9,
      konsumsiEnergi = 2021,
      konsumsiProtein = 59,
      ketersediaanEnergi = 2582,
      ketersediaanProtein = 85,
      produksiBeras = 8708,
      balitaStatus = { sangatKurang: 232, kurang: 946, normal: 25044, lebih: 1064, total: 27286, status: 'AMAN' },
      hargaStrategis = { beras: 13500, minyak: 21000, telur: 30400, gula: 16000, cabai: 45000 }
    } = data;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Heuristic Fallback Analysis Generator (Professional and Rich in Detail)
      const analysisMarkdown = generateFallbackInsight({
        year,
        month,
        kecamatan,
        kelurahan,
        cvBeras,
        pphScore,
        konsumsiEnergi,
        konsumsiProtein,
        ketersediaanEnergi,
        ketersediaanProtein,
        produksiBeras,
        balitaStatus,
        hargaStrategis
      });

      return NextResponse.json({
        success: true,
        isFallback: true,
        insight: analysisMarkdown
      });
    }

    // Call official Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Anda adalah pakar Analis Ketahanan Pangan (Food Security Expert) dari Kementerian Pertanian / Dinas Ketahanan Pangan Kota Cilegon.
Tugas Anda adalah membaca data indikator ketahanan pangan real-time yang sedang ditampilkan di dashboard Ketapang berikut ini, lalu berikan laporan analisis/insight eksekutif yang tajam, solutif, profesional, dan kaya akan insight metodologis (tuliskan dalam Bahasa Indonesia yang formal dan terstruktur dengan rapi menggunakan Markdown).

DATA REAL-TIME KOTA CILEGON (Tahun ${year}, Bulan ${month}, Filter Wilayah: Kecamatan ${kecamatan}, Kelurahan ${kelurahan}):
1. Skor PPH Konsumsi (Pola Pangan Harapan): ${pphScore} (Target Nasional: 90)
2. Konsumsi Energi: ${konsumsiEnergi} kkal/kapita/hari (Target Nasional: 2100 kkal)
3. Konsumsi Protein: ${konsumsiProtein} gram/kapita/hari (Target Nasional: 57 g)
4. Ketersediaan Energi: ${ketersediaanEnergi} kkal/kapita/hari (Target Nasional: 2400 kkal)
5. Ketersediaan Protein: ${ketersediaanProtein} gram/kapita/hari (Target Nasional: 63 g)
6. Koefisien Variasi (CV) Harga Beras: ${cvBeras}% (Target Nasional: < 10% - Penanda stabilitas pasokan dan harga pangan utama)
7. Produksi Beras Lokal: ${produksiBeras} ton (Konversi 63.23% dari Gabah Kering Giling/GKG Provinsi Banten)
8. Kondisi Balita (BB/U):
   - Sangat Kurang: ${balitaStatus.sangatKurang} balita
   - Kurang: ${balitaStatus.kurang} balita
   - Normal: ${balitaStatus.normal} balita
   - Lebih: ${balitaStatus.lebih} balita
   - Status Gizi Keseluruhan: ${balitaStatus.status}
9. Rata-rata Harga Pangan Strategis Harian:
   - Beras: Rp ${hargaStrategis.beras.toLocaleString('id-ID')}/kg
   - Minyak Goreng: Rp ${hargaStrategis.minyak.toLocaleString('id-ID')}/liter
   - Telur Ayam: Rp ${hargaStrategis.telur.toLocaleString('id-ID')}/kg
   - Gula Pasir: Rp ${hargaStrategis.gula.toLocaleString('id-ID')}/kg
   - Cabai Merah: Rp ${hargaStrategis.cabai.toLocaleString('id-ID')}/kg

STRUKTUR LAPORAN HARUS TERDIRI DARI:
- **Ringkasan Eksekutif Ketahanan Pangan**: Ringkasan singkat status ketahanan pangan kota Cilegon saat ini (Aman/Waspada/Rentan).
- **Analisis Metodologi Konsumsi vs Ketersediaan**: Bandingkan konsumsi kalori/protein masyarakat dengan ketersediaan di pasar. Apakah pasokan mencukupi konsumsi?
- **Stabilitas Harga & Aksesibilitas**: Ulas mengenai tingkat volatilitas harga beras (CV: ${cvBeras}%) dan harga pangan strategis lainnya. Apakah terjangkau bagi masyarakat berpenghasilan rendah?
- **Kondisi Gizi Balita**: Analisis angka gizi balita Kota Cilegon dalam kaitannya dengan ketahanan pangan rumah tangga.
- **Rekomendasi Kebijakan & Intervensi**: Berikan 3 poin rekomendasi taktis bagi Dinas Ketahanan Pangan Kota Cilegon untuk menjaga pasokan, stabilisasi harga, dan intervensi lokus gizi kurang.

Jaga agar nada tulisan Anda tetap berwibawa, objektif, solutif, dan analitis. Jangan gunakan placeholder.`
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({
      success: true,
      isFallback: false,
      insight: generatedText
    });

  } catch (error: any) {
    console.error('Error generating AI Insight:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Terjadi kesalahan saat menghubungi Gemini API.'
    }, { status: 500 });
  }
}

function generateFallbackInsight(data: any) {
  const {
    year,
    month,
    kecamatan,
    kelurahan,
    cvBeras,
    pphScore,
    konsumsiEnergi,
    konsumsiProtein,
    ketersediaanEnergi,
    ketersediaanProtein,
    produksiBeras,
    balitaStatus,
    hargaStrategis
  } = data;

  const isPphGood = pphScore >= 90;
  const isEnergGood = konsumsiEnergi >= 2100;
  const isCvGood = cvBeras < 10;
  const isBalitaAman = balitaStatus.status === 'AMAN';

  return `### **LAPORAN AI INSIGHT KETAHANAN PANGAN KOTA CILEGON (TAHUN ${year})**

#### **1. Ringkasan Eksekutif**
Berdasarkan pemindaian data real-time, status ketahanan pangan Kota Cilegon (Filter: Kecamatan **${kecamatan}**, Kelurahan **${kelurahan}**) berada pada kategori **${isBalitaAman && isCvGood ? 'KONDISI AMAN & SEHAT' : 'KONDISI WASPADA'}**. Nilai skor PPH Konsumsi saat ini berada di angka **${pphScore}** dari target nasional (90), menunjukkan keragaman konsumsi pangan penduduk ${isPphGood ? 'sudah melampaui' : 'mendekati'} standar ideal nasional. Koefisien Variasi (CV) harga beras tercatat sebesar **${cvBeras}%**, menandakan stabilitas pasokan pangan pokok utama di wilayah Cilegon ${isCvGood ? 'dalam kondisi sangat stabil dan terkendali' : 'menunjukkan fluktuasi musiman ringan'}.

#### **2. Analisis Metodologis: Konsumsi vs Ketersediaan**
Terdapat korelasi yang sehat antara ketersediaan gizi di pasar dengan konsumsi aktual masyarakat:
- **Sektor Energi**: Ketersediaan energi tercatat sebesar **${ketersediaanEnergi} kkal/kapita/hari**, melampaui standar nasional (2.400 kkal). Hal ini mengindikasikan pasokan energi pangan makro di wilayah Cilegon sangat memadai untuk mendukung aktivitas fisik penduduk. Dari sisi konsumsi, serapan aktual berada di angka **${konsumsiEnergi} kkal/kapita/hari** (target minimal: 2.100 kkal).
- **Sektor Protein**: Ketersediaan protein tercatat sebesar **${ketersediaanProtein} g/kapita/hari**, melampaui standar nasional (63 g). Konsumsi aktual protein tercatat sebesar **${konsumsiProtein} g/kapita/hari** (target minimal: 57 g). Tingginya angka protein ini mencerminkan kualitas asupan gizi hewani dan nabati yang baik di Kota Cilegon.

#### **3. Stabilitas Harga & Aksesibilitas Pangan**
Koefisien Variasi (CV) harga beras di angka **${cvBeras}%** (di bawah ambang batas 10%) membuktikan efektivitas rantai pasok lokal dan program penetrasi pasar. Harga rata-rata komoditas strategis tercatat sebagai berikut:
- **Beras**: Rp ${hargaStrategis.beras.toLocaleString('id-ID')}/kg
- **Minyak Goreng**: Rp ${hargaStrategis.minyak.toLocaleString('id-ID')}/liter
- **Telur Ayam**: Rp ${hargaStrategis.telur.toLocaleString('id-ID')}/kg
- **Gula Pasir**: Rp ${hargaStrategis.gula.toLocaleString('id-ID')}/kg
- **Cabai Merah**: Rp ${hargaStrategis.cabai.toLocaleString('id-ID')}/kg

Angka-angka ini mencerminkan bahwa meskipun terjadi dinamika musiman pada komoditas hortikultura (Cabai Merah), bahan pangan pokok utama (Beras dan Minyak) tetap terjangkau bagi sebagian besar masyarakat.

#### **4. Profil Kerawanan & Kesehatan Balita**
Status gizi balita Kota Cilegon diklasifikasikan pada tingkat **${balitaStatus.status}** dengan total **${balitaStatus.total.toLocaleString('id-ID')} balita** yang diukur. Distribusinya adalah:
- **Normal**: ${balitaStatus.normal.toLocaleString('id-ID')} balita (${((balitaStatus.normal / balitaStatus.total) * 100).toFixed(1)}%)
- **Gizi Lebih**: ${balitaStatus.lebih.toLocaleString('id-ID')} balita (${((balitaStatus.lebih / balitaStatus.total) * 100).toFixed(1)}%)
- **Gizi Kurang / Buruk**: ${(balitaStatus.kurang + balitaStatus.sangatKurang).toLocaleString('id-ID')} balita (${(((balitaStatus.kurang + balitaStatus.sangatKurang) / balitaStatus.total) * 100).toFixed(1)}%)

Meskipun klasifikasi umum adalah **AMAN**, keberadaan ${(balitaStatus.kurang + balitaStatus.sangatKurang).toLocaleString('id-ID')} balita dengan indikasi gizi kurang/buruk memerlukan intervensi gizi terarah pada lokus-lokus prioritas kerawanan pangan.

#### **5. Rekomendasi Kebijakan Dinas Ketahanan Pangan**
1. **Optimalisasi Kegiatan GPM**: Terus laksanakan Gerakan Pangan Murah (GPM) secara berkelanjutan di kelurahan dengan prioritas FSVA rendah untuk menjaga daya beli kelompok rentan.
2. **Diversifikasi Konsumsi non-Beras**: Kembangkan kampanye diversifikasi pangan lokal berbasis protein non-beras guna mempertahankan tingginya skor PPH Konsumsi (${pphScore}).
3. **Intervensi Lokus Gizi Spesifik**: Kolaborasikan program bantuan pangan Bapanas dengan Dinas Kesehatan untuk penyaluran suplemen PMT (Pemberian Makanan Tambahan) tinggi protein di kelurahan dengan populasi balita gizi kurang tertinggi.`;
}
