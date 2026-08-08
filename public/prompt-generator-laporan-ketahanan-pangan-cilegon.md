# PROMPT UNTUK AI CODING AGENT
## Fitur: Tombol "Download Laporan Ketahanan Pangan (PDF)" — PanganCilegon.web.id

---

## KONTEKS SISTEM
Anda mengerjakan modul baru di aplikasi **PanganCilegon.web.id** (Next.js + TypeScript + Supabase/PostGIS). Tugasnya: tambahkan **tombol "Download Laporan PDF"** di UI (mis. di dashboard/beranda) yang ketika diklik akan men-generate dan mengunduh **laporan ketahanan pangan bulanan** dalam format PDF, berisi narasi otomatis berbasis data yang sudah tersedia di database. Gaya bahasa **formal-kebijakan pemerintah (Bahasa Indonesia baku, dinas/ASN)**, bukan gaya laporan korporat atau teknis-mentah — karena PDF ini akan dibaca dan berpotensi dilampirkan langsung oleh ASN/pimpinan DKPP.

Laporan HARUS auto-update setiap bulan (ambil bulan & tahun berjalan dari server time, bukan hardcode), dan narasi insight-nya dihasilkan oleh AI (Gemini API yang sudah terintegrasi), bukan template statis kaku — namun angka & klasifikasi harus tetap deterministik dari data, AI hanya merangkai narasi.

---

## STRUKTUR LAPORAN & INDIKATOR

### 1. RINGKASAN EKSEKUTIF
- Kalimat pembuka wajib memuat: `bulan berjalan` + `tahun berjalan` (real-time, format: "Juli 2026")
- Status umum ketahanan pangan: klasifikasikan otomatis (Aman / Waspada / Rawan) berdasarkan komposit dari CV beras + IKP + PoU (tentukan threshold gabungan, tampilkan logikanya di code comment)
- Highlight stabilitas beras: CV bulan terakhir beras medium, dengan pembanding ambang aman **<5%**
- Insight AI: 2-3 kalimat naratif menjelaskan *mengapa* kondisi tersebut terjadi (bukan cuma restate angka)

### 2. STABILITAS & DINAMIKA HARGA PANGAN
- CV (Coefficient of Variation) beras medium bulan terakhir (%)
- CV rata-rata tahun 2025 (%) — sebagai pembanding tren
- Tabel harga harian 10 komoditas pangan strategis (hasil scraping SAGON Cilegon), tampilkan harga terkini + delta MoM
- Proyeksi harga 1 bulan ke depan (dari model champion: OLS/GBDT/RF sesuai MAPE terbaik)
- Proyeksi harga 3 bulan ke depan
- Insight AI: identifikasi komoditas dengan risiko gejolak harga tertinggi, kaitkan dengan proyeksi

### 3. KONSUMSI & POLA PANGAN MASYARAKAT
- Skor PPH (Pola Pangan Harapan) konsumsi 2025 — bandingkan dengan skor ideal 100
- Tingkat konsumsi energi per kapita 2025 (kkal/kap/hari) vs standar AKE (2.150 kkal)
- Tingkat konsumsi protein per kapita 2025 (gram/kap/hari) vs standar AKP (57 gram)
- Insight AI: identifikasi kesenjangan (gap) mana yang paling signifikan

### 4. KETERSEDIAAN PANGAN
- Tingkat ketersediaan energi per kapita 2025
- Tingkat ketersediaan protein per kapita 2025
- Produksi beras lokal Cilegon (ton, tahun berjalan) — hitung rasio swasembada vs kebutuhan konsumsi wilayah
- Jumlah CPPD (Cadangan Pangan Pemerintah Daerah) Kota Cilegon 2025 (ton) — bandingkan dengan standar cadangan minimum (jika ada regulasi acuan, sebutkan)
- Insight AI: apakah ketersediaan lokal mencukupi atau bergantung pasokan luar daerah

### 5. INDEKS KOMPOSIT KETAHANAN PANGAN
- IKP (Indeks Ketahanan Pangan) 2025 — skor & kategori (1-6 sesuai kategori resmi BKP/Bapanas)
- PoU (Prevalence of Undernourishment) 2025 (%)
- Insight AI: posisi Cilegon relatif terhadap standar provinsi/nasional bila data tersedia

### 6. STATUS GIZI
- Prevalensi gizi buruk bulan terakhir (data admin-input terbaru, 2026)
- Status gizi balita berdasarkan indikator BB/U (persentase kategori: gizi baik/kurang/buruk/lebih)
- Insight AI: kaitkan dengan lokus kelurahan rentan (lihat bagian 7)

### 7. PEMETAAN KERENTANAN PANGAN WILAYAH (LOKUS)
Buat 3 sub-peta/tabel prioritas kelurahan terpisah namun saling dirujuk silang dalam narasi:

a. **Lokus rentan berdasarkan FSVA 2025** — daftar kelurahan desil rentan (4-6) dari hasil Borda Count FSVA
b. **Lokus rentan berdasarkan prevalensi gizi buruk** (bulan terakhir yang diinput admin, 2026)
c. **Lokus prioritas gabungan/agregat** — kombinasi Borda Count (FSVA 2025 + SKPG 2026), tampilkan sebagai ranking gabungan final

Insight AI: sebutkan kelurahan yang **konsisten muncul di ketiga lokus** (irisan tertinggi) sebagai prioritas intervensi utama — ini poin paling penting secara kebijakan.

### 8. REKOMENDASI KEBIJAKAN (auto-generated, bukan template tetap)
- 3-5 poin rekomendasi actionable berdasarkan seluruh temuan di atas, ditulis dalam gaya Telaahan Staf/rekomendasi dinas
- Prioritaskan kelurahan hasil irisan lokus di poin 7

---

## PERSYARATAN TEKNIS UNTUK AGENT

1. **Real-time date**: gunakan `new Date()` server-side, format Indonesia (`Intl.DateTimeFormat('id-ID')`), jangan hardcode bulan/tahun di manapun. Laporan yang di-generate adalah untuk periode bulan berjalan saat tombol diklik.
2. **Data source**: tarik dari tabel Supabase yang sudah ada (agent perlu eksplorasi dulu skema tabel: harga komoditas, FSVA, SKPG, CPPD, gizi, dsb — jangan asumsikan nama kolom). Jika data kosong, tampilkan "Data belum tersedia" bukan angka fiktif.
3. **Klasifikasi & threshold** harus berbasis fungsi deterministik (bukan diserahkan ke AI), contoh: CV <5% = stabil, 5-10% = waspada, >10% = tidak stabil. AI hanya menulis narasinya.
4. **AI Insight**: panggil Gemini API dengan prompt yang menyertakan angka-angka final (bukan data mentah) agar AI merangkai narasi berbasis fakta yang sudah dihitung sistem, hindari AI berhalusinasi angka. Cache hasil narasi AI per bulan (jangan panggil ulang API tiap kali tombol diklik oleh user berbeda) untuk hemat biaya & konsistensi isi laporan.
5. **Alur teknis tombol download**:
   - User klik tombol → cek apakah laporan bulan berjalan sudah pernah di-generate & di-cache (mis. tabel `laporan_bulanan` dengan kolom periode) → jika belum, compute semua indikator + panggil AI insight sekali → simpan hasil (angka + narasi) ke DB → generate PDF → jika sudah ada cache bulan tsb, langsung generate PDF dari data cache tanpa hitung ulang.
   - Rekomendasi library PDF generation di Next.js: **`@react-pdf/renderer`** (bagus untuk layout dokumen presisi/header-footer resmi) atau **Puppeteer/`html-to-pdf`** (jika ingin render dari komponen HTML/React yang sudah ada agar konsisten dengan tampilan web). Agent pilih sesuai stack yang paling ringan untuk deploy di Vercel (perhatikan limit serverless function Puppeteer di Vercel — pertimbangkan `@sparticuz/chromium` jika pakai Puppeteer).
   - Trigger download langsung di browser (blob response, bukan buka tab baru) dengan nama file terstruktur: `Laporan-Ketahanan-Pangan-Cilegon-{Bulan}-{Tahun}.pdf`
   - Tampilkan loading state di tombol saat proses generate berlangsung (terutama saat first-generate bulan itu, karena ada panggilan AI).
6. **Layout PDF**: dokumen resmi dinas — header logo Pemkot Cilegon/DKPP, nomor laporan (auto-increment atau format `NOMOR/DKPP/BULAN-TAHUN`), tanggal terbit, nama/jabatan penandatangan (bisa dikosongkan/placeholder jika belum ada data pejabat), nomor halaman, dan tabel/chart yang readable saat dicetak (bukan screenshot chart interaktif Leaflet — untuk peta lokus kelurahan gunakan static image/snapshot atau tabel ranking sebagai gantinya di PDF).
7. **Reusability**: buat komponen/template yang otomatis dipakai ulang tiap bulan tanpa perlu edit manual kode.
8. Sertakan **catatan metodologi** singkat di footer laporan (mis. sumber data, periode Borda Count, formula CV) agar laporan tetap kredibel dan bisa dipertanggungjawabkan saat dilampirkan ke dokumen dinas lain.

---

## GAYA BAHASA (WAJIB)
- Formal, khas dokumen kebijakan pemerintah daerah Indonesia
- Hindari istilah teknis IT/statistik mentah di narasi utama (taruh di lampiran/tooltip jika perlu)
- Setiap angka disertai interpretasi kualitatif (aman/waspada/rawan), bukan angka telanjang
- Konsisten dengan istilah yang sudah dipakai di dokumen resmi Ridwan sebelumnya (mis. "Skor Akurasi" bukan "Confidence Score")
