# DOKUMEN MATERI PRESENTASI EKSEKUTIF
## SISTEM INFORMASI & PERINGATAN DINI KETAHANAN PANGAN (KETAPANG) KOTA CILEGON

---

### 1. COVER PRESENTASI (SLIDE 1)
- **Judul Utama**: SISTEM INFORMASI & PERINGATAN DINI KETAHANAN PANGAN (KETAPANG) KOTA CILEGON
- **Subjudul**: Platform Digital Analisis 3 Pilar FSVA, EWS SKPG, & Peramalan Harga Pangan Berbasis Machine Learning
- **Penyelenggara**: Pemerintah Kota Cilegon | Dinas Ketahanan Pangan dan Pertanian

---

### 2. DAFTAR SINGKATAN & GLOSARIUM ISTILAH UI/UX (SLIDE 2)
| Singkatan | Kepanjangan & Definisi Istilah |
| :--- | :--- |
| **BPN / Bapanas** | Badan Pangan Nasional Republik Indonesia |
| **FSVA** | *Food Security and Vulnerability Atlas* (Peta Ketahanan dan Kerawanan Pangan) |
| **IKP** | Indeks Ketahanan Pangan (Nilai Komposit Skala 0–100) |
| **SKPG** | Sistem Kewaspadaan Pangan dan Gizi (Pemantauan Bulanan Desa/Kelurahan) |
| **EWS** | *Early Warning System* (Sistem Peringatan Dini Kerawanan Pangan) |
| **NCPR** | *Net Cereals Per Capita Requirement* (Rasio Ketersediaan Pangan Pokok Setara Beras) |
| **AKE** | Angka Kecukupan Energi (Standar Kecukupan Energi Konsumsi Masyarakat) |
| **PoU** | *Prevalence of Undernourishment* (Prevalensi Ketidakcukupan Konsumsi Pangan) |
| **PPH** | Pola Pangan Harapan (Indikator Kualitas & Keragaman Konsumsi Pangan) |
| **GPM** | Gerakan Pangan Murah (Operasi Pasar Intervensi Stabilitas Harga) |
| **HBKN** | Hari Besar Keagamaan Nasional (Ramadhan, Idul Fitri, Idul Adha, Nataru) |
| **SAGON** | Sistem Informasi Harga Bahan Pokok Pasar Tradisional Kota Cilegon |
| **GBDT / OLS** | *Gradient Boosted Decision Trees* / *Ordinary Least Squares Regression* |

---

### 3. LATAR BELAKANG & URGENSI PEMBANGUNAN WEB APP (SLIDE 3)
1. **Karakteristik Kota Industri**:
   Kota Cilegon merupakan pusat industri berat, manufaktur, dan petrokimia utama dengan luas lahan pertanian yang relatif terbatas. Tingkat ketergantungan pasokan pangan dari luar daerah mencapai **>85%**.
2. **Kerentanan Fluktuasi Harga & Pasokan**:
   Gejolak harga pangan pokok (cabai, bawang, beras, telur, minyak) akibat faktor cuaca ekstrem, disparitas pasar, dan hambatan distribusi memicu risiko inflasi daerah serta penurunan daya beli masyarakat.
3. **Kebutuhan Transformasi Digital**:
   Sistem evaluasi manual berbasis spreadsheet memperlambat kecepatan analisis dan deteksi kerawanan pangan. Diperlukan platform digital terpadu berbasis GIS, AI, dan EWS real-time untuk mendukung pengambilan keputusan eksekutif yang presisi.

---

### 4. RUMUSAN MASALAH & RISIKO JIKA WEB APP TIDAK DIBUAT (SLIDE 4)

#### A. Masalah Utama yang Diselesaikan:
- **Fragmentasi Data Pangan**: Terpisahnya data harga, gizi balita, dan iklim di berbagai instansi.
- **Keterlambatan Deteksi Dini**: Tidak adanya instrumen otomatis yang mampu memprediksi gejolak harga 1–3 bulan ke depan.
- **Ketidakakuratan Target Intervensi**: Kesulitan menentukan kelurahan mana yang membutuhkan Bantuan Pangan atau GPM secara mendesak.
- **Asimetri Informasi Pasar**: Pedagang dan publik kesulitan memantau tren harga resmi pasar secara real-time.

#### B. Risiko Fatal Jika Web App Tidak Dibuat:
- **Lag Intervensi Kebijakan**: Pemerintah daerah terlambat merespons lonjakan harga hingga memicu *panic buying*.
- **Eskalasi Angka Kerawanan Pangan**: Kelurahan rentan tanpa air bersih & pendapatan rendah terlambat mendapat pasokan.
- **Kerugian Ekonomi & Spekulasi Pasar**: Masyarakat dan pedagang terdampak fluktuasi harga tanpa kepastian stok.
- **Kegagalan Target SPM**: Ketidakmampuan memantau prevalensi stunting & kecukupan gizi balita secara berkala.

---

### 5. FITUR-FITUR UTAMA & FUNGSI PLATFORM (SLIDE 5)
1. **🗺️ Peta Ketahanan Pangan Interaktif (FSVA)**: Visualisasi GIS 43 Kelurahan berbasis IKP komposit & 3 pilar (Ketersediaan, Akses, Pemanfaatan).
2. **🕸️ Grafik Radar Ketahanan Kelurahan**: Visualisasi jaring laba-laba 11 Indikator FSVA 2025 dengan mode komparasi *Single* & *Dual Kelurahan*.
3. **🤖 Peramalan Harga Pangan AI (Machine Learning)**: Prediksi harga 1 & 3 bulan ke depan berbasis Machine Learning (Random Forest, GBDT, OLS) + Fitur HBKN & Cuaca BMKG.
4. **⚠️ Analisis SKPG & EWS Bulanan**: Sistem Peringatan Dini status kewaspadaan pangan bulanan kelurahan (Aman, Waspada, Rentan).
5. **🛒 Scraping Harga Harian (SAGON)**: Integrasi pencatatan harga harian komoditas pangan dari pasar-pasar tradisional Kota Cilegon.
6. **📋 Portal Input Admin & Rekomendasi**: Manajemen data upload FSVA, SKPG, Gizi Balita, serta penjanaan otomatis Rekomendasi Kebijakan (*Policy Action*).

---

### 6. HIGHLIGHT FITUR: GRAFIK RADAR 11 INDIKATOR FSVA 2025 (SLIDE 6)
- **11 Indikator FSVA Form 2 (Juknis Bapanas 2025)**:
  - *Ketersediaan*: 1.1 NCPR, 1.2 Ketersediaan Energi (AKE), 1.3 Protein Hewani, 1.4 Cadangan Pangan.
  - *Keterjangkauan*: 2.1 Penduduk Miskin Desil 1+2, 2.2 Stabilitas Harga (CV), 2.3 PoU.
  - *Pemanfaatan*: 3.1 Lama Sekolah Perempuan 15+ thn, 3.2 Tanpa Air Bersih, 3.3 Skor PPH Konsumsi, 3.4 Prevalensi Stunting.
- **Kartu Evaluasi Pastel Gold**:
  - Penjanaan otomatis rekomendasi kebijakan dinamis berdasarkan indikator terlemah di kelurahan terpilih (misal: PMT Lokal Posyandu untuk stunting, Operasi Pasar GPM untuk CV harga, atau sarana air bersih).

---

### 7. PEMETAAN PENGGUNA & PEMANFAAT UTAMA (SLIDE 7)
- **🏛️ Pemerintah Kota Cilegon & TPID**: Wali Kota, Sekda, dan TPID sebagai landasan keputusan Kebijakan Ketahanan Pangan & Operasi Pasar.
- **📊 Analis Ketahanan Pangan & OPD**: Analis DKPP, Bappeda, dan Disperindag untuk perencanaan program intervensi spesifik.
- **🎓 Akademisi & Peneliti**: Dosen dan mahasiswa untuk riset ilmiah, pemodelan ekonomi pertanian, dan studi kebijakan publik.
- **👥 Masyarakat Umum & Pelaku Usaha**: Warga Cilegon dan pedagang pasar untuk transparansi harga & kondisi ketahanan pangan wilayah.

---

### 8. ANALISIS DAMPAK STRATEGIS MULTI-SEKTOR (SLIDE 8)
- **Bagi Ketahanan Pangan Cilegon**: Meningkatnya ketahanan pangan daerah melalui deteksi dini kerawanan & penurunan stunting.
- **Bagi Pemkot Cilegon & TPID**: Mewujudkan *Data-Driven Governance*, presisi penganggaran APBD, dan efektivitas pengendalian inflasi.
- **Bagi Analis Ketahanan Pangan**: Efisiensi waktu analisis dari hitungan minggu menjadi hitungan detik + penjagaan *Policy Action* otomatis.
- **Bagi Akademisi & Peneliti**: Tersedianya open dataset pangan 5 tahun tervalidasi untuk publikasi ilmiah.
- **Bagi Masyarakat Umum**: Terlindunginya daya beli masyarakat dari gejolak harga serta terjaminnya transparansi informasi.

---

### 9. METODOLOGI & KEANDALAN MESIN AI (SLIDE 9)
- **Multi-Model Ensemble Engine**: Membandingkan Random Forest, GBDT, dan OLS untuk memilih model *champion* dengan MAPE terendah.
- **Feature Engineering 3 Dimensi**: Menggabungkan lag harga historis, fitur musiman HBKN (Ramadhan/Idul Fitri), dan iklim BMKG (curah hujan, suhu, kelembapan).
- **Akurasi Peramalan**: Dievaluasi menggunakan *Walk-Forward Cross-Validation*, menghasilkan tingkat akurasi rata-rata **88.8%** (MAPE 11.18%).

---

### 10. KESIMPULAN (SLIDE 10)
1. **Solusi Kompleks Kerawanan Pangan**: Platform KETAPANG berhasil memodernisasi analisis ketahanan pangan Kota Cilegon melalui penggabungan Peta GIS 43 Kelurahan, Grafik Radar 11 Indikator FSVA 2025, dan EWS SKPG.
2. **Keandalan AI & Peringatan Dini**: Penggunaan Machine Learning berbasis HBKN & Cuaca BMKG terbukti memberikan akurasi prediksi harga pangan sebesar 88.8%, memungkinkan Pemkot Cilegon melakukan aksi pencegahan sebelum gejolak harga terjadi.
3. **Efektivitas Kebijakan**: Penjanaan otomatis Rekomendasi Kebijakan (*Policy Action*) memastikan setiap intervensi (GPM, PMT Lokal, Bantuan Pangan, Air Bersih) tepat sasaran di tingkat kelurahan.
4. **Menuju Smart Food City**: Platform ini menempatkan Kota Cilegon sebagai pelopor tata kelola ketahanan pangan digital di Provinsi Banten.

---

### 11. DAFTAR REFERENSI ILMIAH (APA STYLE 6TH EDITION) (SLIDE 11)

- Badan Pangan Nasional. (2025). *Petunjuk teknis penyusunan Peta Ketahanan dan Kerawanan Pangan (Food Security and Vulnerability Atlas - FSVA) Kabupaten/Kota*. Jakarta: Bapanas RI.
- Badan Pusat Statistik Kota Cilegon. (2025). *Kota Cilegon dalam angka 2025*. Cilegon: BPS Kota Cilegon.
- Food and Agriculture Organization. (2023). *The state of food security and nutrition in the world 2023: Transforming food systems for affordable healthy diets*. Rome: FAO.
- Hastuti, R., & Rahmanto, B. (2022). Penerapan Early Warning System (EWS) Sistem Kewaspadaan Pangan dan Gizi di tingkat daerah. *Jurnal Analisis Kebijakan Pertanian*, 20(1), 45-58.
- Hyndman, R. J., & Athanasopoulos, G. (2021). *Forecasting: Principles and practice* (3rd ed.). Melbourne: OTexts.
- Nitiyudo, A., & Purwanto, E. (2024). Pemodelan prediksi harga pangan pokok menggunakan algoritma Machine Learning berbasis faktor iklim dan musiman. *Jurnal Teknologi Informasi dan Rekayasa Sistem*, 12(2), 112-125.
- Sudaryanto, T., Syahyuti, S., & Agus, F. (2021). Strategi dan kebijakan ketahanan pangan wilayah perkotaan berbasis lahan terbatas. *Jurnal Penelitian dan Pengembangan Pertanian*, 40(2), 89-102.
- World Bank. (2023). *Indonesia economic prospect: Climate change and food security*. Washington, DC: World Bank Group.
