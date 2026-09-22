-- ========================================================
-- MIGRATION DATA BALITA AGUSTUS 2026 (KOTA CILEGON)
-- Generated on 2026-09-22T03:29:23.469Z
-- ========================================================

-- 1. Hapus data existing untuk periode Agustus 2026
DELETE FROM gizi_balita_skpg_kelurahan WHERE tahun = 2026 AND bulan = 8;
DELETE FROM gizi_balita WHERE tahun = 2026 AND bulan = 8;
DELETE FROM gizi_balita_skpg WHERE tahun = 2026 AND bulan = 8;

-- 2. Insert ke tabel gizi_balita_skpg_kelurahan (43 Kelurahan)
INSERT INTO gizi_balita_skpg_kelurahan (tahun, bulan, kecamatan, kelurahan, bb_sangat_kurang, bb_kurang, bb_normal, bb_lebih, total_kurang, total_balita, nilai, bobot, status)
VALUES
  (2026, 8, 'Ciwandan', 'Gunung Sugih', 2, 9, 336, 12, 11, 359, 3.06, 3, 'AMAN'),
  (2026, 8, 'Ciwandan', 'Kepuh', 4, 15, 595, 8, 19, 622, 3.05, 3, 'AMAN'),
  (2026, 8, 'Ciwandan', 'Randakari', 4, 8, 563, 6, 12, 581, 2.07, 3, 'AMAN'),
  (2026, 8, 'Ciwandan', 'Tegal Ratu', 14, 41, 784, 31, 55, 870, 6.32, 3, 'AMAN'),
  (2026, 8, 'Ciwandan', 'Banjar Negara', 9, 18, 656, 10, 27, 693, 3.9, 3, 'AMAN'),
  (2026, 8, 'Ciwandan', 'Kubangsari', 11, 13, 471, 11, 24, 506, 4.74, 3, 'AMAN'),
  (2026, 8, 'Citangkil', 'Taman Baru', 5, 24, 611, 45, 29, 685, 4.23, 3, 'AMAN'),
  (2026, 8, 'Citangkil', 'Citangkil', 4, 54, 677, 37, 58, 772, 7.51, 3, 'AMAN'),
  (2026, 8, 'Citangkil', 'Kebonsari', 3, 13, 715, 68, 16, 799, 2, 3, 'AMAN'),
  (2026, 8, 'Pulomerak', 'Mekarsari', 9, 47, 759, 52, 56, 867, 6.46, 3, 'AMAN'),
  (2026, 8, 'Pulomerak', 'Tamansari', 13, 54, 763, 32, 67, 862, 7.77, 3, 'AMAN'),
  (2026, 8, 'Pulomerak', 'Lebakgede', 3, 38, 752, 35, 41, 828, 4.95, 3, 'AMAN'),
  (2026, 8, 'Pulomerak', 'Suralaya', 2, 27, 415, 61, 29, 505, 5.74, 3, 'AMAN'),
  (2026, 8, 'Purwakarta', 'Ramanuju', 0, 6, 97, 7, 6, 110, 5.45, 3, 'AMAN'),
  (2026, 8, 'Purwakarta', 'Kebon Dalem', 6, 37, 661, 59, 43, 763, 5.64, 3, 'AMAN'),
  (2026, 8, 'Purwakarta', 'Purwakarta', 2, 27, 320, 22, 29, 371, 7.82, 3, 'AMAN'),
  (2026, 8, 'Purwakarta', 'Tegal Bunder', 4, 29, 453, 12, 33, 498, 6.63, 3, 'AMAN'),
  (2026, 8, 'Purwakarta', 'Pabean', 0, 11, 214, 22, 11, 247, 4.45, 3, 'AMAN'),
  (2026, 8, 'Purwakarta', 'Kotabumi', 1, 18, 352, 11, 19, 382, 4.97, 3, 'AMAN'),
  (2026, 8, 'Gerogol', 'Kotasari', 4, 23, 400, 34, 27, 461, 5.86, 3, 'AMAN'),
  (2026, 8, 'Gerogol', 'Gerogol', 6, 32, 313, 9, 38, 360, 10.56, 2, 'WASPADA'),
  (2026, 8, 'Gerogol', 'Rawa Arum', 8, 20, 740, 43, 28, 811, 3.45, 3, 'AMAN'),
  (2026, 8, 'Gerogol', 'Gerem', 14, 59, 755, 29, 73, 857, 8.52, 3, 'AMAN'),
  (2026, 8, 'Cilegon', 'Bagendung', 2, 25, 701, 38, 27, 766, 3.52, 3, 'AMAN'),
  (2026, 8, 'Cilegon', 'Ciwedus', 1, 20, 860, 32, 21, 913, 2.3, 3, 'AMAN'),
  (2026, 8, 'Cilegon', 'Bendungan', 10, 28, 606, 29, 38, 673, 5.65, 3, 'AMAN'),
  (2026, 8, 'Cilegon', 'Ciwaduk', 1, 19, 522, 31, 20, 573, 3.49, 3, 'AMAN'),
  (2026, 8, 'Cilegon', 'Ketileng', 2, 15, 477, 33, 17, 527, 3.23, 3, 'AMAN'),
  (2026, 8, 'Jombang', 'Jombang Wetan', 5, 32, 741, 31, 37, 809, 4.57, 3, 'AMAN'),
  (2026, 8, 'Jombang', 'Masigit', 7, 27, 787, 37, 34, 858, 3.96, 3, 'AMAN'),
  (2026, 8, 'Jombang', 'Panggung Rawi', 6, 28, 531, 56, 34, 621, 5.48, 3, 'AMAN'),
  (2026, 8, 'Jombang', 'Gedong Dalem', 3, 4, 576, 17, 7, 600, 1.17, 3, 'AMAN'),
  (2026, 8, 'Jombang', 'Sukmajaya', 5, 17, 718, 18, 22, 758, 2.9, 3, 'AMAN'),
  (2026, 8, 'Cibeber', 'Bulakan', 10, 21, 450, 14, 31, 495, 6.26, 3, 'AMAN'),
  (2026, 8, 'Cibeber', 'Cikerai', 7, 12, 324, 9, 19, 352, 5.4, 3, 'AMAN'),
  (2026, 8, 'Cibeber', 'Kalitimbang', 2, 25, 610, 13, 27, 650, 4.15, 3, 'AMAN'),
  (2026, 8, 'Cibeber', 'Karang Asem', 17, 45, 920, 40, 62, 1022, 6.07, 3, 'AMAN'),
  (2026, 8, 'Cibeber', 'Cibeber', 8, 17, 803, 49, 25, 877, 2.85, 3, 'AMAN'),
  (2026, 8, 'Cibeber', 'Kedaleman', 8, 29, 630, 20, 37, 687, 5.39, 3, 'AMAN'),
  (2026, 8, 'Citangkil', 'Deringo', 1, 26, 865, 9, 27, 901, 3, 3, 'AMAN'),
  (2026, 8, 'Citangkil', 'Lebak Denok', 1, 16, 748, 15, 17, 780, 2.18, 3, 'AMAN'),
  (2026, 8, 'Citangkil', 'Warnasari', 6, 23, 610, 50, 29, 689, 4.21, 3, 'AMAN'),
  (2026, 8, 'Citangkil', 'Samangraya', 3, 18, 623, 11, 21, 655, 3.21, 3, 'AMAN')
ON CONFLICT (tahun, bulan, kelurahan) DO UPDATE SET
  kecamatan = EXCLUDED.kecamatan,
  bb_sangat_kurang = EXCLUDED.bb_sangat_kurang,
  bb_kurang = EXCLUDED.bb_kurang,
  bb_normal = EXCLUDED.bb_normal,
  bb_lebih = EXCLUDED.bb_lebih,
  total_kurang = EXCLUDED.total_kurang,
  total_balita = EXCLUDED.total_balita,
  nilai = EXCLUDED.nilai,
  bobot = EXCLUDED.bobot,
  status = EXCLUDED.status;

-- 3. Insert ke tabel gizi_balita (43 Kelurahan)
INSERT INTO gizi_balita (tahun, bulan, nama_kelurahan, gizi_sangat_kurang, gizi_kurang, gizi_normal, gizi_berlebih)
VALUES
  (2026, 8, 'Gunung Sugih', 2, 9, 336, 12),
  (2026, 8, 'Kepuh', 4, 15, 595, 8),
  (2026, 8, 'Randakari', 4, 8, 563, 6),
  (2026, 8, 'Tegal Ratu', 14, 41, 784, 31),
  (2026, 8, 'Banjar Negara', 9, 18, 656, 10),
  (2026, 8, 'Kubangsari', 11, 13, 471, 11),
  (2026, 8, 'Taman Baru', 5, 24, 611, 45),
  (2026, 8, 'Citangkil', 4, 54, 677, 37),
  (2026, 8, 'Kebonsari', 3, 13, 715, 68),
  (2026, 8, 'Mekarsari', 9, 47, 759, 52),
  (2026, 8, 'Tamansari', 13, 54, 763, 32),
  (2026, 8, 'Lebakgede', 3, 38, 752, 35),
  (2026, 8, 'Suralaya', 2, 27, 415, 61),
  (2026, 8, 'Ramanuju', 0, 6, 97, 7),
  (2026, 8, 'Kebon Dalem', 6, 37, 661, 59),
  (2026, 8, 'Purwakarta', 2, 27, 320, 22),
  (2026, 8, 'Tegal Bunder', 4, 29, 453, 12),
  (2026, 8, 'Pabean', 0, 11, 214, 22),
  (2026, 8, 'Kotabumi', 1, 18, 352, 11),
  (2026, 8, 'Kotasari', 4, 23, 400, 34),
  (2026, 8, 'Gerogol', 6, 32, 313, 9),
  (2026, 8, 'Rawa Arum', 8, 20, 740, 43),
  (2026, 8, 'Gerem', 14, 59, 755, 29),
  (2026, 8, 'Bagendung', 2, 25, 701, 38),
  (2026, 8, 'Ciwedus', 1, 20, 860, 32),
  (2026, 8, 'Bendungan', 10, 28, 606, 29),
  (2026, 8, 'Ciwaduk', 1, 19, 522, 31),
  (2026, 8, 'Ketileng', 2, 15, 477, 33),
  (2026, 8, 'Jombang Wetan', 5, 32, 741, 31),
  (2026, 8, 'Masigit', 7, 27, 787, 37),
  (2026, 8, 'Panggung Rawi', 6, 28, 531, 56),
  (2026, 8, 'Gedong Dalem', 3, 4, 576, 17),
  (2026, 8, 'Sukmajaya', 5, 17, 718, 18),
  (2026, 8, 'Bulakan', 10, 21, 450, 14),
  (2026, 8, 'Cikerai', 7, 12, 324, 9),
  (2026, 8, 'Kalitimbang', 2, 25, 610, 13),
  (2026, 8, 'Karang Asem', 17, 45, 920, 40),
  (2026, 8, 'Cibeber', 8, 17, 803, 49),
  (2026, 8, 'Kedaleman', 8, 29, 630, 20),
  (2026, 8, 'Deringo', 1, 26, 865, 9),
  (2026, 8, 'Lebak Denok', 1, 16, 748, 15),
  (2026, 8, 'Warnasari', 6, 23, 610, 50),
  (2026, 8, 'Samangraya', 3, 18, 623, 11);

-- 4. Insert ke tabel gizi_balita_skpg (8 Kecamatan)
INSERT INTO gizi_balita_skpg (tahun, bulan, kecamatan, bb_sangat_kurang, bb_kurang, bb_normal, bb_lebih, total_kurang, total_balita, nilai, bobot, status)
VALUES
  (2026, 8, 'Ciwandan', 44, 104, 3405, 78, 148, 3631, 4.08, 3, 'AMAN'),
  (2026, 8, 'Citangkil', 23, 174, 4849, 235, 197, 5281, 3.73, 3, 'AMAN'),
  (2026, 8, 'Pulomerak', 27, 166, 2689, 180, 193, 3062, 6.3, 3, 'AMAN'),
  (2026, 8, 'Purwakarta', 13, 128, 2097, 133, 141, 2371, 5.95, 3, 'AMAN'),
  (2026, 8, 'Gerogol', 32, 134, 2208, 115, 166, 2489, 6.67, 3, 'AMAN'),
  (2026, 8, 'Cilegon', 16, 107, 3166, 163, 123, 3452, 3.56, 3, 'AMAN'),
  (2026, 8, 'Jombang', 26, 108, 3353, 159, 134, 3646, 3.68, 3, 'AMAN'),
  (2026, 8, 'Cibeber', 52, 149, 3737, 145, 201, 4083, 4.92, 3, 'AMAN')
ON CONFLICT (tahun, bulan, kecamatan) DO UPDATE SET
  bb_sangat_kurang = EXCLUDED.bb_sangat_kurang,
  bb_kurang = EXCLUDED.bb_kurang,
  bb_normal = EXCLUDED.bb_normal,
  bb_lebih = EXCLUDED.bb_lebih,
  total_kurang = EXCLUDED.total_kurang,
  total_balita = EXCLUDED.total_balita,
  nilai = EXCLUDED.nilai,
  bobot = EXCLUDED.bobot,
  status = EXCLUDED.status;
