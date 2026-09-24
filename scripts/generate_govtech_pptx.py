import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Colors
    NAVY = RGBColor(11, 30, 65)        # #0B1E41
    EMERALD = RGBColor(5, 150, 105)     # #059669
    GOLD = RGBColor(217, 119, 6)        # #D97706
    WHITE = RGBColor(255, 255, 255)
    SLATE_DARK = RGBColor(30, 41, 59)   # #1E293B
    SLATE_LIGHT = RGBColor(241, 245, 249) # #F1F5F9
    SLATE_MUTED = RGBColor(100, 116, 139) # #64748B
    CARD_BG = RGBColor(248, 250, 252)

    def add_header(slide, title_text, category_text="GOVTECHATHON 2026 | JAKARTA SMART CITY"):
        # Top banner category
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.4))
        tf_c = cat_box.text_frame
        tf_c.word_wrap = True
        tf_c.margin_left = tf_c.margin_top = tf_c.margin_right = tf_c.margin_bottom = 0
        p_c = tf_c.paragraphs[0]
        p_c.text = category_text.upper()
        p_c.font.size = Pt(10)
        p_c.font.bold = True
        p_c.font.color.rgb = EMERALD

        # Title
        t_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(11.7), Inches(0.7))
        tf = t_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = title_text
        p.font.size = Pt(22)
        p.font.bold = True
        p.font.color.rgb = NAVY

        # Accent bar
        line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.5), Inches(11.7), Inches(0.04))
        line.fill.solid()
        line.fill.fore_color.rgb = EMERALD
        line.line.color.rgb = EMERALD

    def add_notes(slide, notes_text):
        notes_slide = slide.notes_slide
        tf = notes_slide.notes_text_frame
        tf.text = notes_text

    # ==================== SLIDE 1: COVER ====================
    s1 = prs.slides.add_slide(blank_layout)
    bg1 = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg1.fill.solid()
    bg1.fill.fore_color.rgb = NAVY
    bg1.line.color.rgb = NAVY

    t1 = s1.shapes.add_textbox(Inches(1.2), Inches(1.3), Inches(10.9), Inches(5.0))
    tf1 = t1.text_frame
    tf1.word_wrap = True

    p = tf1.paragraphs[0]
    p.text = "GovTechAthon 2026 — CONCEPT NOTE"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = GOLD

    p = tf1.add_paragraph()
    p.text = "DASHBOARD KETAPANG CILEGON"
    p.font.size = Pt(36)
    p.font.bold = True
    p.font.color.rgb = WHITE
    p.space_before = Pt(10)

    p = tf1.add_paragraph()
    p.text = "Sistem Informasi & Peringatan Dini Ketahanan Pangan Terpadu Berbasis AI, Machine Learning, dan Spasial GIS 43 Kelurahan"
    p.font.size = Pt(18)
    p.font.color.rgb = RGBColor(167, 243, 208)
    p.space_before = Pt(10)

    p = tf1.add_paragraph()
    p.text = "• Tema: \"Tantangan Lokal, Solusi Berstandar Global\"\n• Pilar Smart City: Smart Government (Utama), Smart Living & Smart Economy\n• Sasaran SDGs: SDG 2 (Tanpa Kelaparan) & SDG 3 (Kehidupan Sehat dan Sejahtera)\n• Pengusung: Tim Inovasi ASN — Dinas Ketahanan Pangan dan Pertanian Kota Cilegon\n• Tanggal & Lokasi: 24 September 2026 | Kota Cilegon, Provinsi Banten\n• Kontak: ketapangcilegon@gmail.com"
    p.font.size = Pt(13)
    p.font.color.rgb = RGBColor(226, 232, 240)
    p.space_before = Pt(24)

    add_notes(s1, "Selamat pagi Dewan Juri GovTechAthon 2026. Kami dari Pemerintah Kota Cilegon mempersembahkan Dashboard Ketapang, inovasi tata kelola ketahanan pangan terpadu berbasis AI dan GIS untuk kota industri.")

    # ==================== SLIDE 2: URBAN ISSUE ====================
    s2 = prs.slides.add_slide(blank_layout)
    add_header(s2, "Urban Issue: Paradoks Ketahanan Pangan di Kota Industri Berat Cilegon")

    # Card 1: Context & Data
    c1 = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.1))
    c1.fill.solid()
    c1.fill.fore_color.rgb = CARD_BG
    c1.line.color.rgb = RGBColor(203, 213, 225)
    tf_c1 = c1.text_frame
    tf_c1.word_wrap = True
    p = tf_c1.paragraphs[0]
    p.text = "FAKTA & DATA STATISTIK DAERAH"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = NAVY

    p = tf_c1.add_paragraph()
    p.text = "• Kota Industri Berat: Wilayah 175,51 km², 450.000+ penduduk, namun lahan sawah aktif hanya ~1.100–1.400 Ha (<5% wilayah).\n• Ketergantungan Ekstrem >85%: Pasokan pangan pokok Cilegon sepenuhnya bergantung pada pasokan luar daerah (Jateng, Jatim, Lampung via Selat Sunda).\n• Volatilitas Harga Tinggi: Komoditas bergejolak (cabai, bawang, beras, telur) memiliki koefisien variasi (CV) >20% di pasar tradisional saat cuaca buruk atau HBKN.\n• Disparitas Spasial: Terdapat kelurahan rentan dengan akses air bersih <85% dan angka prevalensi stunting balita 7%–9%."
    p.font.size = Pt(11)
    p.font.color.rgb = SLATE_DARK
    p.space_before = Pt(8)

    # Card 2: Problems & Gaps
    c2 = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.1))
    c2.fill.solid()
    c2.fill.fore_color.rgb = CARD_BG
    c2.line.color.rgb = RGBColor(203, 213, 225)
    tf_c2 = c2.text_frame
    tf_c2.word_wrap = True
    p = tf_c2.paragraphs[0]
    p.text = "MENGAPA UPAYA SEBELUMNYA BELUM OPTIMAL?"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = GOLD

    p = tf_c2.add_paragraph()
    p.text = "1. Silo Data Antar-OPD: Data harga harian (Disperindag), data stunting (Dinkes), dan produksi (DKPP) terpisah tanpa jembatan analitik terpadu.\n2. Analisis Manual yang Lambat: Dokumen FSVA dan SKPG konvensional diolah manual berbulan-bulan, sehingga data usang saat dipublikasikan.\n3. Pendekatan Bersifat Reaktif: Intervensi pasar murah (GPM) baru dijalankan 1-2 minggu setelah harga melonjak tinggi di pasar.\n\nAPA YANG DIBUTUHKAN?\nSistem Pendukung Keputusan Eksekutif (DSS) & EWS real-time berbasis AI yang memprediksi harga 1-3 bulan ke depan, memetakan kerawanan mikro 43 kelurahan, dan menerbitkan rekomendasi aksi otomatis."
    p.font.size = Pt(11)
    p.font.color.rgb = SLATE_DARK
    p.space_before = Pt(8)

    add_notes(s2, "Ketergantungan pangan Cilegon >85% membuat daerah sangat rentan. Sistem manual dan data terpisah membuat respons pemda terlambat. KETAPANG hadir menjawab kebutuhan integrasi dan prediksi.")

    # ==================== SLIDE 3: SOLUSI & ARSITEKTUR ====================
    s3 = prs.slides.add_slide(blank_layout)
    add_header(s3, "Inovasi Produk Digital: Pendekatan Solusi & Arsitektur KETAPANG")

    pillars = [
        ("PILAR 1: KETERSEDIAAN", "• Pemantauan 407 Petak Sawah Spasial\n• Cadangan Pangan Daerah (CPPD)\n• Agroklimat BMKG & NDVI Satelit\n• Neraca Bahan Makanan (NBM)", EMERALD),
        ("PILAR 2: KETERJANGKAUAN", "• Scraping Harga 3 Pasar Tradisional\n• AI Price Forecasting 1-3 Bulan (ML)\n• Volatilitas Koefisien Variasi (CV)\n• 3-Layer Early Warning System", GOLD),
        ("PILAR 3: PEMANFAATAN", "• Surveilans Stunting Balita e-PPGBM\n• Akses Air Bersih & Sanitasi Layak\n• Skor Pola Pangan Harapan (PPH)\n• Edukasi Konsumsi B2SA Beragam", NAVY)
    ]

    for i, (title, content, color) in enumerate(pillars):
        card = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8 + i*4.0), Inches(1.8), Inches(3.7), Inches(3.6))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = color
        card.line.width = Pt(2)
        tf = card.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = color

        p = tf.add_paragraph()
        p.text = content
        p.font.size = Pt(10.5)
        p.font.color.rgb = SLATE_DARK
        p.space_before = Pt(8)

    # Bottom output bar
    bot = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(5.6), Inches(11.7), Inches(1.3))
    bot.fill.solid()
    bot.fill.fore_color.rgb = NAVY
    bot.line.color.rgb = EMERALD
    tf_b = bot.text_frame
    tf_b.word_wrap = True
    p = tf_b.paragraphs[0]
    p.text = "OUTPUT: DECISION SUPPORT SYSTEM (DSS) & DYNAMIC POLICY ACTION GENERATOR"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = GOLD
    p = tf_b.add_paragraph()
    p.text = "Sistem secara otomatis menghasilkan rekomendasi intervensi presisi: \"Kelurahan X Prioritas Operasi Pasar GPM\" atau \"Kelurahan Y Prioritas Bantuan PMT Gizi Balita & Air Bersih\"."
    p.font.size = Pt(11)
    p.font.color.rgb = WHITE
    p.space_before = Pt(4)

    add_notes(s3, "KETAPANG menyatukan 3 pilar pangan nasional ke dalam satu data hub terpadu yang menghasilkan rekomendasi kebijakan intervensi secara otomatis.")

    # ==================== SLIDE 4: FITUR 1 (SPASIAL & AGRO-SATELIT) ====================
    s4 = prs.slides.add_slide(blank_layout)
    add_header(s4, "Fitur Unggulan 1: Peta Spasial GIS 43 Kelurahan & Agro-Satelit")

    features_s4 = [
        ("CHOROPLETH TEMATIK 43 KELURAHAN", "Visualisasi interaktif batas wilayah 43 kelurahan di 8 kecamatan dengan pembobotan skor komposit IKP, 3 sub-indeks pilar, dan ranking Borda Count Desil Prioritas 1 s/d 6."),
        ("INTEGRASI 407 PETAK SAWAH AKTIF", "Digitalisasi poligon spasial 407 petak sawah aktif Kota Cilegon yang terhubung dengan basis data Serumpun Padi DKPP."),
        ("SEBARAN SEKTOR PANGAN MIKRO", "Pin koordinat kelompok tani (Poktan), tambak budidaya ikan, nelayan tangkap pesisir, peternakan, dan Kelompok Wanita Tani (KWT)."),
        ("TELEMETRI AGRO-SATELIT & GPS TRACKER", "Analisis vegetasi NDVI dari citra satelit untuk mendeteksi potensi gagal panen atau kekeringan, dilengkapi fitur GPS Live Tracker untuk survei lapangan.")
    ]

    for i, (title, desc) in enumerate(features_s4):
        c = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8 + (i%2)*6.0), Inches(1.8 + (i//2)*2.6), Inches(5.7), Inches(2.3))
        c.fill.solid()
        c.fill.fore_color.rgb = CARD_BG
        c.line.color.rgb = RGBColor(203, 213, 225)
        tf = c.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = f"{i+1}. {title}"
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = NAVY

        p = tf.add_paragraph()
        p.text = desc
        p.font.size = Pt(10.5)
        p.font.color.rgb = SLATE_DARK
        p.space_before = Pt(6)

    add_notes(s4, "Peta GIS KETAPANG menampilkan kerawanan hingga tingkat kelurahan dan mendigitalkan 407 petak sawah serta seluruh kelompok tani di Cilegon.")

    # ==================== SLIDE 5: FITUR 2 (RADAR 11 INDIKATOR) ====================
    s5 = prs.slides.add_slide(blank_layout)
    add_header(s5, "Fitur Unggulan 2: Radar 11 Indikator FSVA 2025 & Automatic Policy Action")

    c_left = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.1))
    c_left.fill.solid()
    c_left.fill.fore_color.rgb = CARD_BG
    c_left.line.color.rgb = RGBColor(203, 213, 225)
    tf = c_left.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "11 INDIKATOR FSVA FORM 2 (BAPANAS 2025)"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = NAVY

    p = tf.add_paragraph()
    p.text = "• PILAR KETERSEDIAAN:\n  1.1 NCPR (Rasio Kebutuhan Pangan Pokok)\n  1.2 Angka Kecukupan Energi (AKE)\n  1.3 Ketersediaan Protein Hewani\n  1.4 Cadangan Pangan Pemerintah Daerah (CPPD)\n\n• PILAR KETERJANGKAUAN:\n  2.1 Penduduk Miskin Desil 1 & 2\n  2.2 Stabilitas Harga Pangan (Koefisien Variasi)\n  2.3 Prevalensi Kurang Pangan (PoU)\n\n• PILAR PEMANFAATAN:\n  3.1 Rata-rata Lama Sekolah Perempuan 15+ Thn\n  3.2 Rumah Tangga Tanpa Akses Air Minum Layak\n  3.3 Skor Pola Pangan Harapan (PPH) Konsumsi\n  3.4 Prevalensi Balita Stunting Bulanan"
    p.font.size = Pt(10.5)
    p.font.color.rgb = SLATE_DARK
    p.space_before = Pt(6)

    c_right = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.1))
    c_right.fill.solid()
    c_right.fill.fore_color.rgb = RGBColor(254, 243, 199) # Gold light
    c_right.line.color.rgb = GOLD
    c_right.line.width = Pt(2)
    tf = c_right.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "DYNAMIC POLICY ACTION GENERATOR"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = GOLD

    p = tf.add_paragraph()
    p.text = "Inovasi Kartu Evaluasi Emas Otomatis:\nSistem secara cerdas menganalisis indikator terlemah di kelurahan terpilih dan menghasilkan rekomendasi intervensi kebijakan instan:\n\n• Jika Defisit Balita Stunting:\n  -> Rekomendasi: Intervensi PMT Lokal Posyandu, Edukasi B2SA, dan Sanitasi Puskesmas.\n\n• Jika Defisit Volatilitas Harga (CV Tinggi):\n  -> Rekomendasi: Eksekusi Gerakan Pangan Murah (GPM) & Operasi Pasar Disperindag di kelurahan sasaran.\n\n• Jika Defisit Air Bersih:\n  -> Rekomendasi: Usulan prioritas pembangunan SPAM / sarana air bersih DPUPR dalam Musrenbang."
    p.font.size = Pt(11)
    p.font.color.rgb = SLATE_DARK
    p.space_before = Pt(8)

    add_notes(s5, "Radar 11 indikator FSVA 2025 membedah anatomi kerawanan per kelurahan. Dynamic Policy Action Generator memberikan rekomendasi intervensi otomatis sesuai indikator terlemah.")

    # ==================== SLIDE 6: FITUR 3 (AI FORECASTING & EWS) ====================
    s6 = prs.slides.add_slide(blank_layout)
    add_header(s6, "Fitur Unggulan 3: AI Price Forecasting & 3-Layer Early Warning System")

    c1 = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.1))
    c1.fill.solid()
    c1.fill.fore_color.rgb = CARD_BG
    c1.line.color.rgb = RGBColor(203, 213, 225)
    tf = c1.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "ENGINE MACHINE LEARNING NATIVE TYPESCRIPT"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = NAVY

    p = tf.add_paragraph()
    p.text = "• Cakupan: 10 Komoditas Pangan Strategis (Beras, Cabai Merah, Cabai Rawit, Bawang Merah, Daging Ayam, Sapi, Telur, Minyak, Gula).\n• Horizon Waktu: Peramalan 1 Bulan & 3 Bulan ke Depan.\n• Pipeline Model Selection: Membandingkan secara dinamis 3 model (Random Forest, Gradient Boosted Decision Trees, dan OLS dengan Dekomposisi Gaussian LU).\n• Validasi Ketat: Expanding Window / Walk-Forward Cross-Validation (4 Fold, n ≈ 43 observasi out-of-sample).\n• Kinerja Presisi: Rata-rata Akurasi 92,34% (Rata-rata MAPE Lintas Komoditas 7,66%)."
    p.font.size = Pt(11)
    p.font.color.rgb = SLATE_DARK
    p.space_before = Pt(8)

    c2 = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.1))
    c2.fill.solid()
    c2.fill.fore_color.rgb = CARD_BG
    c2.line.color.rgb = RGBColor(203, 213, 225)
    tf = c2.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "MEKANISME 3-LAYER EARLY WARNING SYSTEM (EWS)"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = EMERALD

    p = tf.add_paragraph()
    p.text = "1. Layer 1: Tren Prediksi Model AI\n   Mendeteksi kenaikan harga di luar batas musiman normal.\n\n2. Layer 2: Ambang Batas Koefisien Variasi (CV) Pasar\n   • Hijau (<10%) : Harga Stabil\n   • Kuning (10-15%): Waspada Fluktuasi\n   • Merah (>15%) : Gejolak Ekstrem / Butuh Intervensi GPM\n\n3. Layer 3: Pertumbuhan YoY SKPG Bulanan\n   Memonitor sinyal kerawanan pangan dan akses pangan rumah tangga.\n\n-> Output: Sinyal peringatan dini 30-90 hari sebelum harga melonjak di pasar."
    p.font.size = Pt(11)
    p.font.color.rgb = SLATE_DARK
    p.space_before = Pt(8)

    add_notes(s6, "AI Engine KETAPANG memprediksi harga dengan akurasi 92,34%. EWS 3-layer memberi peringatan dini 30-90 hari sebelum gejolak harga terjadi.")

    # ==================== SLIDE 7: FITUR 4 (AI CHAT & KAMERA CERDAS) ====================
    s7 = prs.slides.add_slide(blank_layout)
    add_header(s7, "Fitur Unggulan 4: Multimodal AI Food Intelligence & Kamera Cerdas")

    c1 = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.1))
    c1.fill.solid()
    c1.fill.fore_color.rgb = CARD_BG
    c1.line.color.rgb = RGBColor(203, 213, 225)
    tf = c1.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "AI FOOD INTELLIGENCE ASSISTANT"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = NAVY

    p = tf.add_paragraph()
    p.text = "• Antarmuka Percakapan Eksekutif (ChatGPT UI/UX Style): Pengambil kebijakan dapat bertanya dalam bahasa Indonesia sehari-hari.\n• Rendering Grafik Dinamis: AI merender grafik deret waktu Recharts langsung di dalam bubble chat.\n• Reverse Intelligence / MapAction: AI mengontrol peta spasial secara mandiri (terbang/zoom ke kelurahan dan menyalakan layer tematik yang ditanyakan).\n• Bebas Halusinasi (RAG Grounded): Jawaban berlandaskan dokumen regulasi resmi, juknis Bapanas, dan data statistik terverifikasi."
    p.font.size = Pt(11)
    p.font.color.rgb = SLATE_DARK
    p.space_before = Pt(8)

    c2 = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.1))
    c2.fill.solid()
    c2.fill.fore_color.rgb = CARD_BG
    c2.line.color.rgb = RGBColor(203, 213, 225)
    tf = c2.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "KAMERA CERDAS (COMPUTER VISION LAPANGAN)"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = EMERALD

    p = tf.add_paragraph()
    p.text = "• Mobile Field Web Tool: Digunakan enumerator pasar dan penyuluh pertanian lapangan via smartphone.\n• Pengenalan Visual AI Multimodal: Memotret sarana pasar atau tanaman di sawah, AI mengenali komoditas, estimasi stok, dan mendeteksi anomali/hama.\n• Reverse Geocoding Otomatis: Hasil foto otomatis dicocokkan dengan koordinat GPS dan nama kelurahan terdekat di Cilegon.\n• Sinkronisasi Instan: Data observasi lapangan langsung tersimpan ke Supabase database untuk memperbarui status EWS."
    p.font.size = Pt(11)
    p.font.color.rgb = SLATE_DARK
    p.space_before = Pt(8)

    add_notes(s7, "AI Assistant KETAPANG dapat mengendalikan peta spasial (Reverse Intelligence) dan Kamera Cerdas membantu enumerator memverifikasi pasokan pasar secara otomatis lewat foto.")

    # ==================== SLIDE 8: INTEGRASI SISTEM ====================
    s8 = prs.slides.add_slide(blank_layout)
    add_header(s8, "Ekosistem Kolaboratif: Integrasi Terbuka Lintas Sektor (>5 Sistem)")

    sys_boxes = [
        ("1. SAGON Disperindag", "Harga harian 3 pasar tradisional via automated scraping parser.", NAVY),
        ("2. e-PPGBM Dinas Kesehatan", "Data surveilans stunting dan gizi balita bulanan 43 kelurahan.", EMERALD),
        ("3. BMKG Banten", "Data curah hujan, suhu, dan anomali ENSO untuk fitur iklim ML.", GOLD),
        ("4. BPS Kota Cilegon", "Data angka kemiskinan makro, PDRB, dan laju inflasi daerah.", NAVY),
        ("5. Serumpun Padi DKPP", "Data spasial 407 petak sawah dan registrasi kelompok tani.", EMERALD),
        ("6. Bapanas & Bulog", "Standar FSVA 11 Form 2025 dan data cadangan pangan daerah.", GOLD)
    ]

    for i, (title, desc, color) in enumerate(sys_boxes):
        col = i % 3
        row = i // 3
        box = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8 + col*4.0), Inches(1.8 + row*2.3), Inches(3.7), Inches(2.0))
        box.fill.solid()
        box.fill.fore_color.rgb = CARD_BG
        box.line.color.rgb = color
        box.line.width = Pt(1.5)
        tf = box.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = color

        p = tf.add_paragraph()
        p.text = desc
        p.font.size = Pt(10)
        p.font.color.rgb = SLATE_DARK
        p.space_before = Pt(4)

    # Bottom Resilience Banner
    res = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.0), Inches(11.7), Inches(0.9))
    res.fill.solid()
    res.fill.fore_color.rgb = SLATE_DARK
    res.line.color.rgb = EMERALD
    tf = res.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "RESILIENSI SISTEM: Dilengkapi Automated Local Caching & Fallback serta Automated Pipeline Smoke Test."
    p.font.size = Pt(10.5)
    p.font.bold = True
    p.font.color.rgb = WHITE
    p.alignment = PP_ALIGN.CENTER

    add_notes(s8, "Interoperabilitas data menghubungkan 6 sistem berbeda. Mekanisme local caching dan automated smoke test menjamin sistem tetap aktif tanpa gangguan.")

    # ==================== SLIDE 9: RESULT & DAMPAK ====================
    s9 = prs.slides.add_slide(blank_layout)
    add_header(s9, "Result Prediction, Dampak Strategis & Roadmap Replikasi Daerah")

    c1 = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.1))
    c1.fill.solid()
    c1.fill.fore_color.rgb = CARD_BG
    c1.line.color.rgb = RGBColor(203, 213, 225)
    tf = c1.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "EFISIENSI & DAMPAK TERUKUR"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = NAVY

    p = tf.add_paragraph()
    p.text = "• Kecepatan Analisis Data: Dari 2–3 Minggu (manual) menjadi <5 Detik (otomatis).\n• Waktu Respons Operasi Pasar: Dipangkas dari 14 hari menjadi <48 jam pasca-peringatan EWS.\n• Efisiensi Anggaran APBD: Mencegah salah sasaran intervensi subsidi pangan (potensi penghematan >Rp300 juta/tahun).\n• Akurasi Peramalan Harga: Konsisten >90% (MAPE <10%).\n• Cakupan Pemantauan: 100% dari 43 kelurahan terpantau secara berkala."
    p.font.size = Pt(11)
    p.font.color.rgb = SLATE_DARK
    p.space_before = Pt(8)

    c2 = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.8), Inches(5.7), Inches(5.1))
    c2.fill.solid()
    c2.fill.fore_color.rgb = CARD_BG
    c2.line.color.rgb = RGBColor(203, 213, 225)
    tf = c2.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "POTENSI REPLIKASI ANTAR-DAERAH"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = EMERALD

    p = tf.add_paragraph()
    p.text = "• Keselarasan Regulasi Nasional: Mengacu 100% pada pedoman Juknis FSVA 2025 Bapanas RI dan Perpres Ketahanan Pangan.\n• Arsitektur Modular Serverless: Dibangun dengan TypeScript dan Next.js, mudah diterapkan tanpa biaya lisensi perangkat lunak mahal.\n• Skalabilitas Nasional: Sangat mudah direplikasi ke 514 Kabupaten/Kota se-Indonesia, terutama daerah perkotaan yang bergantung pada pasokan pangan eksternal.\n• Peluang Co-Creation bersama JSC: Pengembangan Open API Pangan antardaerah dalam kerangka GovTech Indonesia."
    p.font.size = Pt(11)
    p.font.color.rgb = SLATE_DARK
    p.space_before = Pt(8)

    add_notes(s9, "KETAPANG memangkas waktu analisis dari minggu menjadi detik dan siap direplikasi ke kabupaten/kota lain di Indonesia bersama Jakarta Smart City.")

    # ==================== SLIDE 10: REFERENCES ====================
    s10 = prs.slides.add_slide(blank_layout)
    add_header(s10, "Landasan Regulasi & Referensi Ilmiah Terverifikasi (APA Style)")

    c1 = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.5))
    c1.fill.solid()
    c1.fill.fore_color.rgb = CARD_BG
    c1.line.color.rgb = RGBColor(203, 213, 225)
    tf = c1.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "REGULASI & KEBIJAKAN RESMI"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = NAVY

    p = tf.add_paragraph()
    p.text = "1. Undang-Undang No. 18 Tahun 2012 tentang Pangan.\n2. Peraturan Pemerintah No. 17 Tahun 2015 tentang Ketahanan Pangan dan Gizi.\n3. Peraturan Presiden No. 66 Tahun 2021 tentang Badan Pangan Nasional.\n4. Peraturan Presiden No. 95 Tahun 2018 tentang SPBE.\n5. Peraturan Bapanas No. 12 Tahun 2024 tentang Sistem Peringatan Dini Kerawanan Pangan dan Gizi.\n6. Petunjuk Teknis Penyusunan FSVA Kabupaten/Kota 2025, Badan Pangan Nasional RI.\n7. Dokumen RPJMD Kota Cilegon & RKPD Cilegon 2025-2026."
    p.font.size = Pt(9.5)
    p.font.color.rgb = SLATE_DARK
    p.space_before = Pt(6)

    c2 = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.8), Inches(5.7), Inches(4.5))
    c2.fill.solid()
    c2.fill.fore_color.rgb = CARD_BG
    c2.line.color.rgb = RGBColor(203, 213, 225)
    tf = c2.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "REFERENSI KAJIAN & PUBLIKASI ILMIAH"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = EMERALD

    p = tf.add_paragraph()
    p.text = "• FAO. (2023). The State of Food Security and Nutrition in the World: Transforming Food Systems for Affordable Healthy Diets. Rome: FAO.\n• Hastuti, R., & Rahmanto, B. (2022). Penerapan EWS Sistem Kewaspadaan Pangan dan Gizi di Tingkat Daerah. Jurnal Analisis Kebijakan Pertanian, 20(1), 45-58.\n• Hyndman, R. J., & Athanasopoulos, G. (2021). Forecasting: Principles and Practice (3rd ed.). OTexts.\n• Nitiyudo, A., & Purwanto, E. (2024). Pemodelan Prediksi Harga Pangan Pokok Menggunakan Algoritma Machine Learning. Jurnal Teknologi Informasi, 12(2), 112-125.\n• World Bank. (2023). Indonesia Economic Prospects: Climate Change and Food Security. Washington, DC: World Bank Group."
    p.font.size = Pt(9.5)
    p.font.color.rgb = SLATE_DARK
    p.space_before = Pt(6)

    # Footer
    foot = s10.shapes.add_textbox(Inches(0.8), Inches(6.5), Inches(11.7), Inches(0.6))
    tf_f = foot.text_frame
    p = tf_f.paragraphs[0]
    p.text = "TERIMA KASIH — PEMERINTAH KOTA CILEGON × JAKARTA SMART CITY (GOVTECHATHON 2026)"
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = GOLD
    p.alignment = PP_ALIGN.CENTER

    add_notes(s10, "Inovasi KETAPANG berlandaskan hukum dan metodologi ilmiah yang kuat, siap dikembangkan menjadi produk enterprise bersama Jakarta Smart City.")

    # Save
    out_path = os.path.join(r"C:\Users\THINKPAD\.gemini\antigravity\scratch\dashboard-ketapang\public\govtech", "Concept_Note_GovTechAthon_2026_Ketapang.pptx")
    prs.save(out_path)
    print(f"Presentation saved successfully at: {out_path}")

if __name__ == "__main__":
    create_deck()
