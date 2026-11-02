/**
 * Master Data Koordinat GPS Pusat Kabupaten, Kota, dan Provinsi se-Indonesia
 * serta Utilitas Pencocokan Wilayah Indonesia (Smart Geo Fuzzy Matcher & Coordinate Resolver).
 *
 * Digunakan untuk:
 *  1. Mengoreksi typo input daerah asal pasokan beras manual secara instan.
 *  2. Menentukan titik koordinat GPS central [lng, lat] daerah asal pasokan secara akurat
 *     agar garis lengkung (Bezier arc) dan arah panah di Peta Arus Pasokan Beras
 *     otomatis ditarik dari titik central daerah yang diinput petugas/enumerator.
 */

export interface WilayahRef {
  kode?: string;
  nama: string;
  tipe: 'kota' | 'kabupaten' | 'provinsi';
  provinsi?: string;
  lat: number;
  lng: number;
  aliases?: string[];
}

export const DAFTAR_WILAYAH_INDONESIA: WilayahRef[] = [
  // ============================================================================
  // I. 38 PROVINSI SE-INDONESIA (CENTROID PROVINSI)
  // ============================================================================
  { kode: '11', nama: 'Aceh', tipe: 'provinsi', lat: 4.6951, lng: 96.7494, aliases: ['nad', 'nanggroe aceh darussalam'] },
  { kode: '12', nama: 'Sumatera Utara', tipe: 'provinsi', lat: 2.1154, lng: 99.5451, aliases: ['sumut'] },
  { kode: '13', nama: 'Sumatera Barat', tipe: 'provinsi', lat: -0.7399, lng: 100.8000, aliases: ['sumbar'] },
  { kode: '14', nama: 'Riau', tipe: 'provinsi', lat: 0.2933, lng: 101.7068 },
  { kode: '15', nama: 'Jambi', tipe: 'provinsi', lat: -1.6101, lng: 103.6131 },
  { kode: '16', nama: 'Sumatera Selatan', tipe: 'provinsi', lat: -3.3194, lng: 104.9147, aliases: ['sumsel'] },
  { kode: '17', nama: 'Bengkulu', tipe: 'provinsi', lat: -3.7928, lng: 102.2608 },
  { kode: '18', nama: 'Lampung', tipe: 'provinsi', lat: -4.5586, lng: 105.4068, aliases: ['lpg', 'lampung / luar jawa'] },
  { kode: '19', nama: 'Kepulauan Bangka Belitung', tipe: 'provinsi', lat: -2.7411, lng: 106.4406, aliases: ['babel', 'bangka belitung'] },
  { kode: '21', nama: 'Kepulauan Riau', tipe: 'provinsi', lat: 3.9457, lng: 108.1429, aliases: ['kepri'] },
  { kode: '31', nama: 'DKI Jakarta', tipe: 'provinsi', lat: -6.2088, lng: 106.8456, aliases: ['jakarta'] },
  { kode: '32', nama: 'Jawa Barat', tipe: 'provinsi', lat: -6.9147, lng: 107.6098, aliases: ['jabar'] },
  { kode: '33', nama: 'Jawa Tengah', tipe: 'provinsi', lat: -7.1510, lng: 110.1403, aliases: ['jateng'] },
  { kode: '34', nama: 'DI Yogyakarta', tipe: 'provinsi', lat: -7.7956, lng: 110.3695, aliases: ['jogja', 'diy', 'yogya', 'daerah istimewa yogyakarta'] },
  { kode: '35', nama: 'Jawa Timur', tipe: 'provinsi', lat: -7.5361, lng: 112.2384, aliases: ['jatim'] },
  { kode: '36', nama: 'Banten', tipe: 'provinsi', lat: -6.4058, lng: 106.0640 },
  { kode: '51', nama: 'Bali', tipe: 'provinsi', lat: -8.4095, lng: 115.1889 },
  { kode: '52', nama: 'Nusa Tenggara Barat', tipe: 'provinsi', lat: -8.6529, lng: 117.3616, aliases: ['ntb', 'lombok'] },
  { kode: '53', nama: 'Nusa Tenggara Timur', tipe: 'provinsi', lat: -8.6574, lng: 121.0794, aliases: ['ntt'] },
  { kode: '61', nama: 'Kalimantan Barat', tipe: 'provinsi', lat: -0.2787, lng: 111.4753, aliases: ['kalbar'] },
  { kode: '62', nama: 'Kalimantan Tengah', tipe: 'provinsi', lat: -1.6815, lng: 113.3824, aliases: ['kalteng'] },
  { kode: '63', nama: 'Kalimantan Selatan', tipe: 'provinsi', lat: -3.0926, lng: 115.2838, aliases: ['kalsel'] },
  { kode: '64', nama: 'Kalimantan Timur', tipe: 'provinsi', lat: 0.5387, lng: 116.4194, aliases: ['kaltim'] },
  { kode: '65', nama: 'Kalimantan Utara', tipe: 'provinsi', lat: 3.0731, lng: 116.0414, aliases: ['kaltara'] },
  { kode: '71', nama: 'Sulawesi Utara', tipe: 'provinsi', lat: 0.6247, lng: 123.9750, aliases: ['sulut'] },
  { kode: '72', nama: 'Sulawesi Tengah', tipe: 'provinsi', lat: -1.4300, lng: 121.4456, aliases: ['sulteng'] },
  { kode: '73', nama: 'Sulawesi Selatan', tipe: 'provinsi', lat: -3.6688, lng: 119.9741, aliases: ['sulsel'] },
  { kode: '74', nama: 'Sulawesi Tenggara', tipe: 'provinsi', lat: -4.1449, lng: 122.1746, aliases: ['sultra'] },
  { kode: '75', nama: 'Gorontalo', tipe: 'provinsi', lat: 0.6999, lng: 122.4467 },
  { kode: '76', nama: 'Sulawesi Barat', tipe: 'provinsi', lat: -2.8441, lng: 119.2321, aliases: ['sulbar'] },
  { kode: '81', nama: 'Maluku', tipe: 'provinsi', lat: -3.2385, lng: 130.1453 },
  { kode: '82', nama: 'Maluku Utara', tipe: 'provinsi', lat: 1.5709, lng: 127.8088, aliases: ['malut'] },
  { kode: '91', nama: 'Papua', tipe: 'provinsi', lat: -2.5337, lng: 140.7181 },
  { kode: '92', nama: 'Papua Barat', tipe: 'provinsi', lat: -1.3361, lng: 133.1747 },
  { kode: '93', nama: 'Papua Selatan', tipe: 'provinsi', lat: -7.7600, lng: 139.6000 },
  { kode: '94', nama: 'Papua Tengah', tipe: 'provinsi', lat: -3.9000, lng: 136.2000 },
  { kode: '95', nama: 'Papua Pegunungan', tipe: 'provinsi', lat: -4.1000, lng: 138.9500 },
  { kode: '96', nama: 'Papua Barat Daya', tipe: 'provinsi', lat: -1.0000, lng: 131.5000 },

  // ============================================================================
  // II. KABUPATEN & KOTA SE-INDONESIA
  // ============================================================================

  // --- BANTEN ---
  { kode: '36.72', nama: 'Cilegon', tipe: 'kota', provinsi: 'Banten', lat: -6.0025, lng: 106.0111, aliases: ['kota cilegon'] },
  { kode: '36.04', nama: 'Serang', tipe: 'kabupaten', provinsi: 'Banten', lat: -6.1514, lng: 106.1503, aliases: ['kabupaten serang', 'kota serang', 'ciruas', 'pontang', 'tirtayasa'] },
  { kode: '36.01', nama: 'Pandeglang', tipe: 'kabupaten', provinsi: 'Banten', lat: -6.3086, lng: 106.1067, aliases: ['kabupaten pandeglang', 'menes', 'panimbang'] },
  { kode: '36.02', nama: 'Lebak', tipe: 'kabupaten', provinsi: 'Banten', lat: -6.3578, lng: 106.2522, aliases: ['kabupaten lebak', 'rangkasbitung', 'malingping'] },
  { kode: '36.03', nama: 'Tangerang', tipe: 'kabupaten', provinsi: 'Banten', lat: -6.1783, lng: 106.4519, aliases: ['kabupaten tangerang', 'kota tangerang', 'tigaraksa', 'balaraja'] },
  { kode: '36.74', nama: 'Tangerang Selatan', tipe: 'kota', provinsi: 'Banten', lat: -6.2886, lng: 106.7179, aliases: ['tangsel', 'bsd', 'serpong'] },

  // --- DKI JAKARTA ---
  { kode: '31.71', nama: 'Jakarta Pusat', tipe: 'kota', provinsi: 'DKI Jakarta', lat: -6.1805, lng: 106.8284, aliases: ['jakpus'] },
  { kode: '31.72', nama: 'Jakarta Utara', tipe: 'kota', provinsi: 'DKI Jakarta', lat: -6.1384, lng: 106.8640, aliases: ['jakut', 'tanjung priok'] },
  { kode: '31.73', nama: 'Jakarta Barat', tipe: 'kota', provinsi: 'DKI Jakarta', lat: -6.1674, lng: 106.7637, aliases: ['jakbar'] },
  { kode: '31.74', nama: 'Jakarta Selatan', tipe: 'kota', provinsi: 'DKI Jakarta', lat: -6.2615, lng: 106.8106, aliases: ['jaksel'] },
  { kode: '31.75', nama: 'Jakarta Timur', tipe: 'kota', provinsi: 'DKI Jakarta', lat: -6.2250, lng: 106.9004, aliases: ['jaktim', 'cipinang', 'pasar induk cipinang'] },

  // --- JAWA BARAT ---
  { kode: '32.15', nama: 'Karawang', tipe: 'kabupaten', provinsi: 'Jawa Barat', lat: -6.3063, lng: 107.3019, aliases: ['krwng', 'karawng', 'rengasdengklok'] },
  { kode: '32.13', nama: 'Subang', tipe: 'kabupaten', provinsi: 'Jawa Barat', lat: -6.5715, lng: 107.7587, aliases: ['subng', 'pamanukan', 'patokbeusi'] },
  { kode: '32.12', nama: 'Indramayu', tipe: 'kabupaten', provinsi: 'Jawa Barat', lat: -6.3373, lng: 108.3258, aliases: ['indramyu', 'dermayu', 'haurgeulis', 'jatibarang'] },
  { kode: '32.03', nama: 'Cianjur', tipe: 'kabupaten', provinsi: 'Jawa Barat', lat: -6.8168, lng: 107.1425, aliases: ['cianjr', 'beras cianjur', 'pandanwangi'] },
  { kode: '32.10', nama: 'Majalengka', tipe: 'kabupaten', provinsi: 'Jawa Barat', lat: -6.8364, lng: 108.2274, aliases: ['kertajati', 'jatitujuh'] },
  { kode: '32.09', nama: 'Cirebon', tipe: 'kabupaten', provinsi: 'Jawa Barat', lat: -6.7155, lng: 108.5570, aliases: ['kota cirebon', 'sumber', 'arjawinangun'] },
  { kode: '32.08', nama: 'Kuningan', tipe: 'kabupaten', provinsi: 'Jawa Barat', lat: -6.9758, lng: 108.4831 },
  { kode: '32.11', nama: 'Sumedang', tipe: 'kabupaten', provinsi: 'Jawa Barat', lat: -6.8586, lng: 107.9207 },
  { kode: '32.06', nama: 'Tasikmalaya', tipe: 'kabupaten', provinsi: 'Jawa Barat', lat: -7.3274, lng: 108.2207, aliases: ['tasik', 'singaparna'] },
  { kode: '32.07', nama: 'Ciamis', tipe: 'kabupaten', provinsi: 'Jawa Barat', lat: -7.3258, lng: 108.3534 },
  { kode: '32.18', nama: 'Pangandaran', tipe: 'kabupaten', provinsi: 'Jawa Barat', lat: -7.6841, lng: 108.6512 },
  { kode: '32.79', nama: 'Banjar', tipe: 'kota', provinsi: 'Jawa Barat', lat: -7.3706, lng: 108.5342, aliases: ['kota banjar'] },
  { kode: '32.05', nama: 'Garut', tipe: 'kabupaten', provinsi: 'Jawa Barat', lat: -7.2279, lng: 107.9087, aliases: ['leles', 'kadungora'] },
  { kode: '32.02', nama: 'Sukabumi', tipe: 'kabupaten', provinsi: 'Jawa Barat', lat: -6.9277, lng: 106.9300, aliases: ['pelabuhanratu', 'cibadak'] },
  { kode: '32.04', nama: 'Bandung', tipe: 'kabupaten', provinsi: 'Jawa Barat', lat: -6.9175, lng: 107.6191, aliases: ['bdg', 'kota bandung', 'soreang', 'majalaya'] },
  { kode: '32.17', nama: 'Bandung Barat', tipe: 'kabupaten', provinsi: 'Jawa Barat', lat: -6.8452, lng: 107.4922, aliases: ['kbb', 'ngamprah', 'padalarang'] },
  { kode: '32.77', nama: 'Cimahi', tipe: 'kota', provinsi: 'Jawa Barat', lat: -6.8722, lng: 107.5425 },
  { kode: '32.16', nama: 'Bekasi', tipe: 'kabupaten', provinsi: 'Jawa Barat', lat: -6.2383, lng: 106.9756, aliases: ['cikarang', 'pebayuran'] },
  { kode: '32.01', nama: 'Bogor', tipe: 'kabupaten', provinsi: 'Jawa Barat', lat: -6.5971, lng: 106.8060, aliases: ['cibinong', 'jonggol'] },
  { kode: '32.76', nama: 'Depok', tipe: 'kota', provinsi: 'Jawa Barat', lat: -6.4025, lng: 106.7942 },
  { kode: '32.14', nama: 'Purwakarta', tipe: 'kabupaten', provinsi: 'Jawa Barat', lat: -6.5569, lng: 107.4433 },

  // --- JAWA TENGAH ---
  { kode: '33.21', nama: 'Demak', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -6.8906, lng: 110.6396, aliases: ['demk'] },
  { kode: '33.14', nama: 'Sragen', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -7.4265, lng: 111.0222, aliases: ['sragan', 'sragenn', 'masaran'] },
  { kode: '33.15', nama: 'Grobogan', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -7.0867, lng: 110.9158, aliases: ['purwodadi', 'gubug'] },
  { kode: '33.18', nama: 'Pati', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -6.7559, lng: 111.0380, aliases: ['juwana'] },
  { kode: '33.19', nama: 'Kudus', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -6.8048, lng: 110.8405 },
  { kode: '33.20', nama: 'Jepara', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -6.5888, lng: 110.6684 },
  { kode: '33.17', nama: 'Rembang', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -6.7086, lng: 111.3414 },
  { kode: '33.16', nama: 'Blora', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -6.9698, lng: 111.4186, aliases: ['cepu'] },
  { kode: '33.01', nama: 'Cilacap', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -7.7279, lng: 109.0059, aliases: ['majenang', 'kroya'] },
  { kode: '33.02', nama: 'Banyumas', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -7.4244, lng: 109.2396, aliases: ['purwokerto'] },
  { kode: '33.03', nama: 'Purbalingga', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -7.3908, lng: 109.3639 },
  { kode: '33.04', nama: 'Banjarnegara', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -7.3999, lng: 109.6953 },
  { kode: '33.05', nama: 'Kebumen', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -7.6687, lng: 109.6519, aliases: ['gombong'] },
  { kode: '33.06', nama: 'Purworejo', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -7.7145, lng: 110.0086, aliases: ['kutoarjo'] },
  { kode: '33.07', nama: 'Wonosobo', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -7.3614, lng: 109.9002 },
  { kode: '33.08', nama: 'Magelang', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -7.4797, lng: 110.2177, aliases: ['mungkid', 'muntilan'] },
  { kode: '33.23', nama: 'Temanggung', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -7.3161, lng: 110.1756 },
  { kode: '33.10', nama: 'Klaten', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -7.7058, lng: 110.6064, aliases: ['delanggu', 'beras delanggu'] },
  { kode: '33.11', nama: 'Sukoharjo', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -7.6830, lng: 110.8406 },
  { kode: '33.12', nama: 'Wonogiri', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -7.8147, lng: 110.9261 },
  { kode: '33.09', nama: 'Boyolali', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -7.5322, lng: 110.5955 },
  { kode: '33.13', nama: 'Karanganyar', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -7.5964, lng: 110.9508 },
  { kode: '33.29', nama: 'Brebes', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -6.8706, lng: 109.0427, aliases: ['bumiayu'] },
  { kode: '33.28', nama: 'Tegal', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -6.8694, lng: 109.1402, aliases: ['slawi', 'kota tegal'] },
  { kode: '33.27', nama: 'Pemalang', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -6.8906, lng: 109.3808 },
  { kode: '33.26', nama: 'Pekalongan', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -6.8886, lng: 109.6753, aliases: ['kajen', 'kota pekalongan'] },
  { kode: '33.25', nama: 'Batang', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -6.9082, lng: 109.7303 },
  { kode: '33.24', nama: 'Kendal', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -6.9240, lng: 110.2039 },
  { kode: '33.22', nama: 'Semarang', tipe: 'kabupaten', provinsi: 'Jawa Tengah', lat: -6.9667, lng: 110.4167, aliases: ['smg', 'ungaran', 'kota semarang'] },
  { kode: '33.73', nama: 'Salatiga', tipe: 'kota', provinsi: 'Jawa Tengah', lat: -7.3305, lng: 110.5084 },
  { kode: '33.72', nama: 'Surakarta (Solo)', tipe: 'kota', provinsi: 'Jawa Tengah', lat: -7.5755, lng: 110.8243, aliases: ['solo', 'surakarta'] },

  // --- DI YOGYAKARTA ---
  { kode: '34.71', nama: 'Yogyakarta', tipe: 'kota', provinsi: 'DI Yogyakarta', lat: -7.7956, lng: 110.3695, aliases: ['kota yogyakarta', 'jogjakarta'] },
  { kode: '34.04', nama: 'Sleman', tipe: 'kabupaten', provinsi: 'DI Yogyakarta', lat: -7.7156, lng: 110.3556 },
  { kode: '34.02', nama: 'Bantul', tipe: 'kabupaten', provinsi: 'DI Yogyakarta', lat: -7.8879, lng: 110.3289 },
  { kode: '34.01', nama: 'Kulon Progo', tipe: 'kabupaten', provinsi: 'DI Yogyakarta', lat: -7.8267, lng: 110.1642, aliases: ['wates'] },
  { kode: '34.03', nama: 'Gunungkidul', tipe: 'kabupaten', provinsi: 'DI Yogyakarta', lat: -7.9667, lng: 110.6028, aliases: ['wonosari', 'gunung kidul'] },

  // --- JAWA TIMUR ---
  { kode: '35.11', nama: 'Bondowoso', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.9135, lng: 113.8214, aliases: ['kabupaten bondowoso', 'bondowso'] },
  { kode: '35.12', nama: 'Situbondo', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.7062, lng: 114.0098, aliases: ['kabupaten situbondo'] },
  { kode: '35.10', nama: 'Banyuwangi', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -8.2192, lng: 114.3691, aliases: ['banyuwgi', 'bwi', 'genteng', 'rogojampi'] },
  { kode: '35.09', nama: 'Jember', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -8.1724, lng: 113.7007, aliases: ['kabupaten jember', 'tanggul', 'ambulu'] },
  { kode: '35.08', nama: 'Lumajang', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -8.1335, lng: 113.2248 },
  { kode: '35.13', nama: 'Probolinggo', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.7543, lng: 113.2159, aliases: ['kraksaan', 'kota probolinggo'] },
  { kode: '35.14', nama: 'Pasuruan', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.6453, lng: 112.9075, aliases: ['bangil', 'pandaan', 'kota pasuruan'] },
  { kode: '35.07', nama: 'Malang', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.9797, lng: 112.6304, aliases: ['kepanjen', 'kota malang'] },
  { kode: '35.79', nama: 'Batu', tipe: 'kota', provinsi: 'Jawa Timur', lat: -7.8671, lng: 112.5239, aliases: ['kota batu'] },
  { kode: '35.21', nama: 'Ngawi', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.4039, lng: 111.4461, aliases: ['ngawii'] },
  { kode: '35.22', nama: 'Bojonegoro', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.1502, lng: 111.8817 },
  { kode: '35.23', nama: 'Tuban', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -6.8976, lng: 112.0468 },
  { kode: '35.24', nama: 'Lamongan', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.1197, lng: 112.4167, aliases: ['babat'] },
  { kode: '35.25', nama: 'Gresik', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.1566, lng: 112.6555 },
  { kode: '35.19', nama: 'Madiun', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.6298, lng: 111.5239, aliases: ['caruban', 'kota madiun'] },
  { kode: '35.20', nama: 'Magetan', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.6542, lng: 111.3264 },
  { kode: '35.02', nama: 'Ponorogo', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.8685, lng: 111.4620 },
  { kode: '35.01', nama: 'Pacitan', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -8.1945, lng: 111.1030 },
  { kode: '35.18', nama: 'Nganjuk', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.6042, lng: 111.9036, aliases: ['kertosono'] },
  { kode: '35.06', nama: 'Kediri', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.8166, lng: 112.0114, aliases: ['pare', 'ngasem', 'kota kediri'] },
  { kode: '35.04', nama: 'Tulungagung', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -8.0657, lng: 111.9025 },
  { kode: '35.03', nama: 'Trenggalek', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -8.0500, lng: 111.7167 },
  { kode: '35.05', nama: 'Blitar', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -8.0955, lng: 112.1609, aliases: ['kanigoro', 'kota blitar'] },
  { kode: '35.17', nama: 'Jombang', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.5459, lng: 112.2331, aliases: ['jombang jatim'] },
  { kode: '35.16', nama: 'Mojokerto', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.4722, lng: 112.4336, aliases: ['mojosari', 'kota mojokerto'] },
  { kode: '35.15', nama: 'Sidoarjo', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.4478, lng: 112.7183 },
  { kode: '35.78', nama: 'Surabaya', tipe: 'kota', provinsi: 'Jawa Timur', lat: -7.2575, lng: 112.7521, aliases: ['sby'] },
  { kode: '35.26', nama: 'Bangkalan', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.0455, lng: 112.7351, aliases: ['madura'] },
  { kode: '35.27', nama: 'Sampang', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.1872, lng: 113.2394 },
  { kode: '35.28', nama: 'Pamekasan', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.1568, lng: 113.4746 },
  { kode: '35.29', nama: 'Sumenep', tipe: 'kabupaten', provinsi: 'Jawa Timur', lat: -7.0167, lng: 113.8667 },

  // --- SUMATERA (LAMPUNG, SUMSEL, SUMBAR, SUMUT, RIAU, JAMBI, ACEH, BENGKULU) ---
  { kode: '18.71', nama: 'Bandar Lampung', tipe: 'kota', provinsi: 'Lampung', lat: -5.4292, lng: 105.2610, aliases: ['lampung kota', 'tanjung karang'] },
  { kode: '18.72', nama: 'Metro', tipe: 'kota', provinsi: 'Lampung', lat: -5.1131, lng: 105.3067, aliases: ['kota metro'] },
  { kode: '18.02', nama: 'Lampung Tengah', tipe: 'kabupaten', provinsi: 'Lampung', lat: -4.8667, lng: 105.2667, aliases: ['gunung sugih lampung', 'bandar jaya'] },
  { kode: '18.01', nama: 'Lampung Selatan', tipe: 'kabupaten', provinsi: 'Lampung', lat: -5.5623, lng: 105.5453, aliases: ['kalianda', 'bakauheni', 'natar'] },
  { kode: '18.07', nama: 'Lampung Timur', tipe: 'kabupaten', provinsi: 'Lampung', lat: -5.1025, lng: 105.6800, aliases: ['sukadana'] },
  { kode: '18.03', nama: 'Lampung Utara', tipe: 'kabupaten', provinsi: 'Lampung', lat: -4.8167, lng: 104.8833, aliases: ['kotabumi lampung'] },
  { kode: '18.04', nama: 'Lampung Barat', tipe: 'kabupaten', provinsi: 'Lampung', lat: -5.0333, lng: 104.0833, aliases: ['liwa'] },
  { kode: '18.05', nama: 'Tulang Bawang', tipe: 'kabupaten', provinsi: 'Lampung', lat: -4.3917, lng: 105.5750, aliases: ['menggala'] },
  { kode: '18.06', nama: 'Tanggamus', tipe: 'kabupaten', provinsi: 'Lampung', lat: -5.4167, lng: 104.6667, aliases: ['kota agung'] },
  { kode: '18.09', nama: 'Pesawaran', tipe: 'kabupaten', provinsi: 'Lampung', lat: -5.4000, lng: 105.0833, aliases: ['gedong tataan'] },
  { kode: '18.10', nama: 'Pringsewu', tipe: 'kabupaten', provinsi: 'Lampung', lat: -5.3582, lng: 104.9744 },
  { kode: '18.11', nama: 'Mesuji', tipe: 'kabupaten', provinsi: 'Lampung', lat: -4.0439, lng: 105.4014 },
  { kode: '16.71', nama: 'Palembang', tipe: 'kota', provinsi: 'Sumatera Selatan', lat: -2.9761, lng: 104.7754, aliases: ['palembng', 'plg', 'pelembang'] },
  { kode: '16.07', nama: 'Banyuasin', tipe: 'kabupaten', provinsi: 'Sumatera Selatan', lat: -2.8833, lng: 104.3833, aliases: ['pangkalan balai'] },
  { kode: '16.06', nama: 'Musi Banyuasin', tipe: 'kabupaten', provinsi: 'Sumatera Selatan', lat: -2.8950, lng: 103.8122, aliases: ['muba', 'sekayu'] },
  { kode: '16.02', nama: 'Ogan Komering Ilir', tipe: 'kabupaten', provinsi: 'Sumatera Selatan', lat: -3.3931, lng: 105.1614, aliases: ['oki', 'kayuagung'] },
  { kode: '16.01', nama: 'Ogan Komering Ulu', tipe: 'kabupaten', provinsi: 'Sumatera Selatan', lat: -4.1278, lng: 104.1667, aliases: ['oku', 'baturaja'] },
  { kode: '16.08', nama: 'OKU Timur', tipe: 'kabupaten', provinsi: 'Sumatera Selatan', lat: -4.2292, lng: 104.4556, aliases: ['martapura sumsel', 'belitang'] },
  { kode: '13.71', nama: 'Padang', tipe: 'kota', provinsi: 'Sumatera Barat', lat: -0.9471, lng: 100.4172 },
  { kode: '13.75', nama: 'Bukittinggi', tipe: 'kota', provinsi: 'Sumatera Barat', lat: -0.3056, lng: 100.3692 },
  { kode: '13.76', nama: 'Payakumbuh', tipe: 'kota', provinsi: 'Sumatera Barat', lat: -0.2208, lng: 100.6308 },
  { kode: '13.02', nama: 'Solok', tipe: 'kabupaten', provinsi: 'Sumatera Barat', lat: -0.7997, lng: 100.6561, aliases: ['beras solok', 'arauka'] },
  { kode: '13.04', nama: 'Tanah Datar', tipe: 'kabupaten', provinsi: 'Sumatera Barat', lat: -0.4556, lng: 100.5944, aliases: ['batusangkar'] },
  { kode: '13.06', nama: 'Agam', tipe: 'kabupaten', provinsi: 'Sumatera Barat', lat: -0.2692, lng: 100.1325, aliases: ['lubuk basung'] },
  { kode: '12.71', nama: 'Medan', tipe: 'kota', provinsi: 'Sumatera Utara', lat: 3.5952, lng: 98.6722, aliases: ['medn'] },
  { kode: '12.07', nama: 'Deli Serdang', tipe: 'kabupaten', provinsi: 'Sumatera Utara', lat: 3.4214, lng: 98.8672, aliases: ['lubuk pakam'] },
  { kode: '12.18', nama: 'Serdang Bedagai', tipe: 'kabupaten', provinsi: 'Sumatera Utara', lat: 3.3667, lng: 99.1333, aliases: ['sei rampah'] },
  { kode: '12.08', nama: 'Simalungun', tipe: 'kabupaten', provinsi: 'Sumatera Utara', lat: 2.9000, lng: 99.0000, aliases: ['pematangsiantar'] },
  { kode: '12.09', nama: 'Asahan', tipe: 'kabupaten', provinsi: 'Sumatera Utara', lat: 2.9833, lng: 99.6167, aliases: ['kisaran'] },
  { kode: '14.71', nama: 'Pekanbaru', tipe: 'kota', provinsi: 'Riau', lat: 0.5071, lng: 101.4478 },
  { kode: '14.01', nama: 'Kampar', tipe: 'kabupaten', provinsi: 'Riau', lat: 0.3344, lng: 101.0250, aliases: ['bangkinang'] },
  { kode: '15.71', nama: 'Kota Jambi', tipe: 'kota', provinsi: 'Jambi', lat: -1.6101, lng: 103.6131 },
  { kode: '15.01', nama: 'Kerinci', tipe: 'kabupaten', provinsi: 'Jambi', lat: -2.0833, lng: 101.4833 },
  { kode: '11.71', nama: 'Banda Aceh', tipe: 'kota', provinsi: 'Aceh', lat: 5.5483, lng: 95.3238 },
  { kode: '11.06', nama: 'Aceh Besar', tipe: 'kabupaten', provinsi: 'Aceh', lat: 5.3833, lng: 95.5167, aliases: ['jantho'] },
  { kode: '11.07', nama: 'Pidie', tipe: 'kabupaten', provinsi: 'Aceh', lat: 5.0833, lng: 95.9500, aliases: ['sigli'] },
  { kode: '11.11', nama: 'Bireuen', tipe: 'kabupaten', provinsi: 'Aceh', lat: 5.2014, lng: 96.7022 },
  { kode: '11.08', nama: 'Aceh Utara', tipe: 'kabupaten', provinsi: 'Aceh', lat: 5.0500, lng: 97.1333, aliases: ['lhoksukon', 'lhokseumawe'] },

  // --- BALI & NUSA TENGGARA ---
  { kode: '51.71', nama: 'Denpasar', tipe: 'kota', provinsi: 'Bali', lat: -8.6705, lng: 115.2126 },
  { kode: '51.02', nama: 'Tabanan', tipe: 'kabupaten', provinsi: 'Bali', lat: -8.5411, lng: 115.1253, aliases: ['lumbung padi bali'] },
  { kode: '51.03', nama: 'Badung', tipe: 'kabupaten', provinsi: 'Bali', lat: -8.5819, lng: 115.1772, aliases: ['mangupura'] },
  { kode: '51.04', nama: 'Gianyar', tipe: 'kabupaten', provinsi: 'Bali', lat: -8.5447, lng: 115.3253 },
  { kode: '51.08', nama: 'Buleleng', tipe: 'kabupaten', provinsi: 'Bali', lat: -8.1120, lng: 115.0882, aliases: ['singaraja'] },
  { kode: '52.71', nama: 'Mataram', tipe: 'kota', provinsi: 'Nusa Tenggara Barat', lat: -8.5833, lng: 116.1167 },
  { kode: '52.01', nama: 'Lombok Barat', tipe: 'kabupaten', provinsi: 'Nusa Tenggara Barat', lat: -8.6833, lng: 116.1167, aliases: ['gerung'] },
  { kode: '52.02', nama: 'Lombok Tengah', tipe: 'kabupaten', provinsi: 'Nusa Tenggara Barat', lat: -8.7000, lng: 116.2667, aliases: ['praya'] },
  { kode: '52.03', nama: 'Lombok Timur', tipe: 'kabupaten', provinsi: 'Nusa Tenggara Barat', lat: -8.5333, lng: 116.5333, aliases: ['selong'] },
  { kode: '52.04', nama: 'Sumbawa', tipe: 'kabupaten', provinsi: 'Nusa Tenggara Barat', lat: -8.5000, lng: 117.4333, aliases: ['sumbawa besar'] },
  { kode: '52.06', nama: 'Bima', tipe: 'kabupaten', provinsi: 'Nusa Tenggara Barat', lat: -8.4667, lng: 118.7167 },
  { kode: '53.71', nama: 'Kupang', tipe: 'kota', provinsi: 'Nusa Tenggara Timur', lat: -10.1772, lng: 123.6070 },
  { kode: '53.10', nama: 'Manggarai', tipe: 'kabupaten', provinsi: 'Nusa Tenggara Timur', lat: -8.6167, lng: 120.4667, aliases: ['ruteng', 'labuan bajo'] },

  // --- SULAWESI ---
  { kode: '73.71', nama: 'Makassar', tipe: 'kota', provinsi: 'Sulawesi Selatan', lat: -5.1477, lng: 119.4327, aliases: ['makasar', 'ujung pandang'] },
  { kode: '73.14', nama: 'Sidrap (Sidenreng Rappang)', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', lat: -3.9272, lng: 119.7964, aliases: ['sidrap', 'sidenreng', 'pangkajene'] },
  { kode: '73.15', nama: 'Pinrang', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', lat: -3.7858, lng: 119.6522 },
  { kode: '73.08', nama: 'Bone', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', lat: -4.5386, lng: 120.3278, aliases: ['watampone'] },
  { kode: '73.13', nama: 'Wajo', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', lat: -4.1264, lng: 120.0319, aliases: ['sengkang'] },
  { kode: '73.12', nama: 'Soppeng', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', lat: -4.3542, lng: 119.8861, aliases: ['watansoppeng'] },
  { kode: '73.17', nama: 'Luwu', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', lat: -3.3500, lng: 120.2500, aliases: ['belopa', 'palopo'] },
  { kode: '73.06', nama: 'Gowa', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', lat: -5.2044, lng: 119.4547, aliases: ['sungguminasa'] },
  { kode: '73.09', nama: 'Maros', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', lat: -5.0053, lng: 119.5731 },
  { kode: '73.72', nama: 'Parepare', tipe: 'kota', provinsi: 'Sulawesi Selatan', lat: -4.0135, lng: 119.6255 },
  { kode: '72.71', nama: 'Palu', tipe: 'kota', provinsi: 'Sulawesi Tengah', lat: -0.8917, lng: 119.8707 },
  { kode: '72.08', nama: 'Parigi Moutong', tipe: 'kabupaten', provinsi: 'Sulawesi Tengah', lat: -0.8167, lng: 120.1833 },
  { kode: '74.71', nama: 'Kendari', tipe: 'kota', provinsi: 'Sulawesi Tenggara', lat: -3.9985, lng: 122.5130 },
  { kode: '74.02', nama: 'Konawe', tipe: 'kabupaten', provinsi: 'Sulawesi Tenggara', lat: -3.8542, lng: 122.0500, aliases: ['unaaha'] },
  { kode: '71.71', nama: 'Manado', tipe: 'kota', provinsi: 'Sulawesi Utara', lat: 1.4748, lng: 124.8421 },
  { kode: '71.01', nama: 'Bolaang Mongondow', tipe: 'kabupaten', provinsi: 'Sulawesi Utara', lat: 0.7500, lng: 124.0833, aliases: ['bolmong', 'kotamobagu'] },
  { kode: '76.04', nama: 'Polewali Mandar', tipe: 'kabupaten', provinsi: 'Sulawesi Barat', lat: -3.4325, lng: 119.3436, aliases: ['polman'] },

  // --- KALIMANTAN, MALUKU & PAPUA ---
  { kode: '63.71', nama: 'Banjarmasin', tipe: 'kota', provinsi: 'Kalimantan Selatan', lat: -3.3186, lng: 114.5944 },
  { kode: '63.04', nama: 'Barito Kuala', tipe: 'kabupaten', provinsi: 'Kalimantan Selatan', lat: -3.0833, lng: 114.6167, aliases: ['marabahan'] },
  { kode: '63.03', nama: 'Banjar Kalsel', tipe: 'kabupaten', provinsi: 'Kalimantan Selatan', lat: -3.4167, lng: 114.8500, aliases: ['martapura'] },
  { kode: '61.71', nama: 'Pontianak', tipe: 'kota', provinsi: 'Kalimantan Barat', lat: -0.0263, lng: 109.3425 },
  { kode: '61.01', nama: 'Sambas', tipe: 'kabupaten', provinsi: 'Kalimantan Barat', lat: 1.3625, lng: 109.3000 },
  { kode: '62.71', nama: 'Palangka Raya', tipe: 'kota', provinsi: 'Kalimantan Tengah', lat: -2.2136, lng: 113.9108, aliases: ['palangkaraya'] },
  { kode: '62.03', nama: 'Kapuas', tipe: 'kabupaten', provinsi: 'Kalimantan Tengah', lat: -3.0000, lng: 114.3833, aliases: ['kuala kapuas'] },
  { kode: '64.72', nama: 'Samarinda', tipe: 'kota', provinsi: 'Kalimantan Timur', lat: -0.5022, lng: 117.1536 },
  { kode: '64.02', nama: 'Kutai Kartanegara', tipe: 'kabupaten', provinsi: 'Kalimantan Timur', lat: -0.4400, lng: 116.9800, aliases: ['tenggarong'] },
  { kode: '93.01', nama: 'Merauke', tipe: 'kabupaten', provinsi: 'Papua Selatan', lat: -8.4932, lng: 140.4018, aliases: ['lumbung pangan timur'] },
  { kode: '11.01', nama: 'Aceh Selatan', tipe: 'kabupaten', provinsi: 'Aceh', lat: 3.2589, lng: 97.1794, aliases: ['tapaktuan'] },
  { kode: '11.02', nama: 'Aceh Tenggara', tipe: 'kabupaten', provinsi: 'Aceh', lat: 3.3667, lng: 97.7, aliases: ['kutacane'] },
  { kode: '11.03', nama: 'Aceh Timur', tipe: 'kabupaten', provinsi: 'Aceh', lat: 4.6333, lng: 97.6333, aliases: ['idi rayeuk'] },
  { kode: '11.04', nama: 'Aceh Tengah', tipe: 'kabupaten', provinsi: 'Aceh', lat: 4.6294, lng: 96.8489, aliases: ['takengon'] },
  { kode: '11.05', nama: 'Aceh Barat', tipe: 'kabupaten', provinsi: 'Aceh', lat: 4.1453, lng: 96.1264, aliases: ['meulaboh'] },
  { kode: '11.12', nama: 'Aceh Barat Daya', tipe: 'kabupaten', provinsi: 'Aceh', lat: 3.7375, lng: 96.8358, aliases: ['blangpidie'] },
  { kode: '11.16', nama: 'Aceh Tamiang', tipe: 'kabupaten', provinsi: 'Aceh', lat: 4.2833, lng: 98.0583, aliases: ['karang baru'] },
  { kode: '11.72', nama: 'Sabang', tipe: 'kota', provinsi: 'Aceh', lat: 5.8947, lng: 95.3192 },
  { kode: '11.73', nama: 'Lhokseumawe', tipe: 'kota', provinsi: 'Aceh', lat: 5.1801, lng: 97.1507 },
  { kode: '11.74', nama: 'Langsa', tipe: 'kota', provinsi: 'Aceh', lat: 4.4683, lng: 97.9683 },
  { kode: '11.75', nama: 'Subulussalam', tipe: 'kota', provinsi: 'Aceh', lat: 2.6419, lng: 98.0075 },
  { kode: '12.01', nama: 'Tapanuli Tengah', tipe: 'kabupaten', provinsi: 'Sumatera Utara', lat: 1.7, lng: 98.8167, aliases: ['pandan'] },
  { kode: '12.02', nama: 'Tapanuli Utara', tipe: 'kabupaten', provinsi: 'Sumatera Utara', lat: 2.0167, lng: 98.9667, aliases: ['tarutung'] },
  { kode: '12.03', nama: 'Tapanuli Selatan', tipe: 'kabupaten', provinsi: 'Sumatera Utara', lat: 1.5167, lng: 99.25, aliases: ['sipirok'] },
  { kode: '12.05', nama: 'Langkat', tipe: 'kabupaten', provinsi: 'Sumatera Utara', lat: 3.75, lng: 98.45, aliases: ['stabat'] },
  { kode: '12.06', nama: 'Karo', tipe: 'kabupaten', provinsi: 'Sumatera Utara', lat: 3.1, lng: 98.4833, aliases: ['kabanjahe', 'berastagi'] },
  { kode: '12.10', nama: 'Labuhanbatu', tipe: 'kabupaten', provinsi: 'Sumatera Utara', lat: 2.1, lng: 99.8333, aliases: ['rantauprapat'] },
  { kode: '12.12', nama: 'Toba', tipe: 'kabupaten', provinsi: 'Sumatera Utara', lat: 2.3333, lng: 99.0667, aliases: ['balige'] },
  { kode: '12.13', nama: 'Mandailing Natal', tipe: 'kabupaten', provinsi: 'Sumatera Utara', lat: 0.855, lng: 99.5614, aliases: ['madina', 'panyabungan'] },
  { kode: '12.19', nama: 'Batu Bara', tipe: 'kabupaten', provinsi: 'Sumatera Utara', lat: 3.1667, lng: 99.5, aliases: ['limapuluh'] },
  { kode: '12.72', nama: 'Pematangsiantar', tipe: 'kota', provinsi: 'Sumatera Utara', lat: 2.9595, lng: 99.0682, aliases: ['siantar'] },
  { kode: '12.74', nama: 'Tanjungbalai', tipe: 'kota', provinsi: 'Sumatera Utara', lat: 2.9667, lng: 99.8 },
  { kode: '12.75', nama: 'Binjai', tipe: 'kota', provinsi: 'Sumatera Utara', lat: 3.6001, lng: 98.4854 },
  { kode: '12.76', nama: 'Tebing Tinggi', tipe: 'kota', provinsi: 'Sumatera Utara', lat: 3.3285, lng: 99.1625 },
  { kode: '12.77', nama: 'Padangsidimpuan', tipe: 'kota', provinsi: 'Sumatera Utara', lat: 1.3778, lng: 99.2717 },
  { kode: '13.01', nama: 'Pesisir Selatan', tipe: 'kabupaten', provinsi: 'Sumatera Barat', lat: -1.35, lng: 100.5667, aliases: ['painan'] },
  { kode: '13.05', nama: 'Padang Pariaman', tipe: 'kabupaten', provinsi: 'Sumatera Barat', lat: -0.6, lng: 100.2833, aliases: ['parit malintang'] },
  { kode: '13.07', nama: 'Lima Puluh Kota', tipe: 'kabupaten', provinsi: 'Sumatera Barat', lat: -0.15, lng: 100.65, aliases: ['sarilamak'] },
  { kode: '13.08', nama: 'Pasaman', tipe: 'kabupaten', provinsi: 'Sumatera Barat', lat: 0.1333, lng: 100.1667, aliases: ['lubuk sikaping'] },
  { kode: '13.12', nama: 'Pasaman Barat', tipe: 'kabupaten', provinsi: 'Sumatera Barat', lat: 0.0833, lng: 99.8167, aliases: ['simpang empat'] },
  { kode: '13.72', nama: 'Kota Solok', tipe: 'kota', provinsi: 'Sumatera Barat', lat: -0.7931, lng: 100.6556 },
  { kode: '13.74', nama: 'Padang Panjang', tipe: 'kota', provinsi: 'Sumatera Barat', lat: -0.4667, lng: 100.4 },
  { kode: '13.77', nama: 'Pariaman', tipe: 'kota', provinsi: 'Sumatera Barat', lat: -0.6258, lng: 100.1206 },
  { kode: '14.02', nama: 'Indragiri Hulu', tipe: 'kabupaten', provinsi: 'Riau', lat: -0.3958, lng: 102.5417, aliases: ['inhu', 'rengat'] },
  { kode: '14.04', nama: 'Indragiri Hilir', tipe: 'kabupaten', provinsi: 'Riau', lat: -0.3208, lng: 103.1583, aliases: ['inhil', 'tembilahan'] },
  { kode: '14.03', nama: 'Bengkalis', tipe: 'kabupaten', provinsi: 'Riau', lat: 1.48, lng: 102.08 },
  { kode: '14.08', nama: 'Siak', tipe: 'kabupaten', provinsi: 'Riau', lat: 0.7931, lng: 102.0494, aliases: ['siak sri indrapura'] },
  { kode: '14.72', nama: 'Dumai', tipe: 'kota', provinsi: 'Riau', lat: 1.6675, lng: 101.4478 },
  { kode: '21.71', nama: 'Batam', tipe: 'kota', provinsi: 'Kepulauan Riau', lat: 1.0456, lng: 104.0305 },
  { kode: '21.72', nama: 'Tanjungpinang', tipe: 'kota', provinsi: 'Kepulauan Riau', lat: 0.9186, lng: 104.4467 },
  { kode: '15.02', nama: 'Merangin', tipe: 'kabupaten', provinsi: 'Jambi', lat: -2.0667, lng: 102.1333, aliases: ['bangko'] },
  { kode: '15.05', nama: 'Muaro Jambi', tipe: 'kabupaten', provinsi: 'Jambi', lat: -1.4667, lng: 103.5167, aliases: ['sengeti'] },
  { kode: '15.06', nama: 'Tanjung Jabung Barat', tipe: 'kabupaten', provinsi: 'Jambi', lat: -0.8167, lng: 103.4667, aliases: ['kuala tungkal'] },
  { kode: '15.07', nama: 'Tanjung Jabung Timur', tipe: 'kabupaten', provinsi: 'Jambi', lat: -1.1333, lng: 103.85, aliases: ['muara sabak'] },
  { kode: '17.71', nama: 'Kota Bengkulu', tipe: 'kota', provinsi: 'Bengkulu', lat: -3.7928, lng: 102.2608 },
  { kode: '17.02', nama: 'Rejang Lebong', tipe: 'kabupaten', provinsi: 'Bengkulu', lat: -3.4667, lng: 102.5333, aliases: ['curup'] },
  { kode: '19.71', nama: 'Pangkalpinang', tipe: 'kota', provinsi: 'Kepulauan Bangka Belitung', lat: -2.1316, lng: 106.1169 },
  { kode: '19.01', nama: 'Bangka', tipe: 'kabupaten', provinsi: 'Kepulauan Bangka Belitung', lat: -1.8667, lng: 106.1167, aliases: ['sungailiat'] },
  { kode: '19.02', nama: 'Belitung', tipe: 'kabupaten', provinsi: 'Kepulauan Bangka Belitung', lat: -2.7417, lng: 107.6333, aliases: ['tanjung pandan'] },
  { kode: '16.03', nama: 'Muara Enim', tipe: 'kabupaten', provinsi: 'Sumatera Selatan', lat: -3.6542, lng: 103.775 },
  { kode: '16.04', nama: 'Lahat', tipe: 'kabupaten', provinsi: 'Sumatera Selatan', lat: -3.7942, lng: 103.5417 },
  { kode: '16.05', nama: 'Musi Rawas', tipe: 'kabupaten', provinsi: 'Sumatera Selatan', lat: -3.2667, lng: 103.05 },
  { kode: '16.09', nama: 'OKU Selatan', tipe: 'kabupaten', provinsi: 'Sumatera Selatan', lat: -4.5583, lng: 104.0667, aliases: ['muaradua'] },
  { kode: '16.10', nama: 'Ogan Ilir', tipe: 'kabupaten', provinsi: 'Sumatera Selatan', lat: -3.25, lng: 104.65, aliases: ['indralaya'] },
  { kode: '16.72', nama: 'Pagar Alam', tipe: 'kota', provinsi: 'Sumatera Selatan', lat: -4.0208, lng: 103.2519 },
  { kode: '16.73', nama: 'Lubuklinggau', tipe: 'kota', provinsi: 'Sumatera Selatan', lat: -3.2967, lng: 102.8617 },
  { kode: '16.74', nama: 'Prabumulih', tipe: 'kota', provinsi: 'Sumatera Selatan', lat: -3.4328, lng: 104.2356 },
  { kode: '18.08', nama: 'Way Kanan', tipe: 'kabupaten', provinsi: 'Lampung', lat: -4.5, lng: 104.5167, aliases: ['blambangan umpu'] },
  { kode: '18.12', nama: 'Tulang Bawang Barat', tipe: 'kabupaten', provinsi: 'Lampung', lat: -4.5167, lng: 105.0833, aliases: ['tubaba', 'panaragan'] },
  { kode: '18.13', nama: 'Pesisir Barat', tipe: 'kabupaten', provinsi: 'Lampung', lat: -5.1936, lng: 103.9308, aliases: ['krui'] },
  { kode: '61.02', nama: 'Mempawah', tipe: 'kabupaten', provinsi: 'Kalimantan Barat', lat: 0.3667, lng: 108.9667 },
  { kode: '61.03', nama: 'Sanggau', tipe: 'kabupaten', provinsi: 'Kalimantan Barat', lat: 0.1333, lng: 110.5833 },
  { kode: '61.04', nama: 'Ketapang Kalbar', tipe: 'kabupaten', provinsi: 'Kalimantan Barat', lat: -1.85, lng: 109.9667 },
  { kode: '61.12', nama: 'Kubu Raya', tipe: 'kabupaten', provinsi: 'Kalimantan Barat', lat: -0.1333, lng: 109.3833, aliases: ['sungai raya'] },
  { kode: '61.72', nama: 'Singkawang', tipe: 'kota', provinsi: 'Kalimantan Barat', lat: 0.9061, lng: 108.9872 },
  { kode: '62.01', nama: 'Kotawaringin Barat', tipe: 'kabupaten', provinsi: 'Kalimantan Tengah', lat: -2.6833, lng: 111.6167, aliases: ['pangkalan bun'] },
  { kode: '62.02', nama: 'Kotawaringin Timur', tipe: 'kabupaten', provinsi: 'Kalimantan Tengah', lat: -2.5333, lng: 112.95, aliases: ['sampit'] },
  { kode: '63.01', nama: 'Tanah Laut', tipe: 'kabupaten', provinsi: 'Kalimantan Selatan', lat: -3.8, lng: 114.7667, aliases: ['pelaihari'] },
  { kode: '63.06', nama: 'Hulu Sungai Selatan', tipe: 'kabupaten', provinsi: 'Kalimantan Selatan', lat: -2.7833, lng: 115.2667, aliases: ['kandangan'] },
  { kode: '63.07', nama: 'Hulu Sungai Tengah', tipe: 'kabupaten', provinsi: 'Kalimantan Selatan', lat: -2.5833, lng: 115.3833, aliases: ['barabai'] },
  { kode: '63.72', nama: 'Banjarbaru', tipe: 'kota', provinsi: 'Kalimantan Selatan', lat: -3.4422, lng: 114.8325 },
  { kode: '64.71', nama: 'Balikpapan', tipe: 'kota', provinsi: 'Kalimantan Timur', lat: -1.2379, lng: 116.8529 },
  { kode: '64.74', nama: 'Bontang', tipe: 'kota', provinsi: 'Kalimantan Timur', lat: 0.1333, lng: 117.5 },
  { kode: '65.71', nama: 'Tarakan', tipe: 'kota', provinsi: 'Kalimantan Utara', lat: 3.3, lng: 117.6333 },
  { kode: '65.02', nama: 'Bulungan', tipe: 'kabupaten', provinsi: 'Kalimantan Utara', lat: 2.8375, lng: 117.3653, aliases: ['tanjung selor'] },
  { kode: '73.02', nama: 'Bulukumba', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', lat: -5.5583, lng: 120.1917 },
  { kode: '73.03', nama: 'Bantaeng', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', lat: -5.5458, lng: 119.9514 },
  { kode: '73.04', nama: 'Jeneponto', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', lat: -5.6833, lng: 119.7333 },
  { kode: '73.05', nama: 'Takalar', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', lat: -5.4167, lng: 119.4833 },
  { kode: '73.10', nama: 'Pangkep', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', lat: -4.8333, lng: 119.55, aliases: ['pangkajene dan kepulauan'] },
  { kode: '73.11', nama: 'Barru', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', lat: -4.4083, lng: 119.6208 },
  { kode: '73.16', nama: 'Enrekang', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', lat: -3.5639, lng: 119.775 },
  { kode: '73.22', nama: 'Luwu Utara', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', lat: -2.55, lng: 120.3333, aliases: ['masamba'] },
  { kode: '73.24', nama: 'Luwu Timur', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', lat: -2.5833, lng: 121.15, aliases: ['malili'] },
  { kode: '73.73', nama: 'Palopo', tipe: 'kota', provinsi: 'Sulawesi Selatan', lat: -2.9925, lng: 120.1969 },
  { kode: '75.71', nama: 'Kota Gorontalo', tipe: 'kota', provinsi: 'Gorontalo', lat: 0.5435, lng: 123.0568 },
  { kode: '76.02', nama: 'Mamuju', tipe: 'kabupaten', provinsi: 'Sulawesi Barat', lat: -2.6778, lng: 118.8861 },
  { kode: '81.71', nama: 'Ambon', tipe: 'kota', provinsi: 'Maluku', lat: -3.6954, lng: 128.1814 },
  { kode: '81.01', nama: 'Maluku Tengah', tipe: 'kabupaten', provinsi: 'Maluku', lat: -3.3083, lng: 128.9583, aliases: ['masohi'] },
  { kode: '82.71', nama: 'Ternate', tipe: 'kota', provinsi: 'Maluku Utara', lat: 0.7893, lng: 127.3774 },
  { kode: '91.71', nama: 'Jayapura', tipe: 'kota', provinsi: 'Papua', lat: -2.5337, lng: 140.7181 },
  { kode: '92.02', nama: 'Manokwari', tipe: 'kabupaten', provinsi: 'Papua Barat', lat: -0.8615, lng: 134.062 },
  { kode: '96.71', nama: 'Sorong', tipe: 'kota', provinsi: 'Papua Barat Daya', lat: -0.8762, lng: 131.2558 },
];

/**
 * Menghitung jarak Levenshtein antara dua kata (case-insensitive)
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }

  return dp[m][n];
}

/**
 * Mencari titik koordinat GPS central dari nama daerah asal pasokan (mendukung nama Kabupaten, Kota, Provinsi, maupun input bebas).
 * Memprioritaskan kecocokan Kabupaten/Kota lebih dulu sebelum Provinsi.
 */
export function cariKoordinatWilayah(
  input?: string | null,
  extraDaftar?: WilayahRef[]
): WilayahRef | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  const daftar = extraDaftar && extraDaftar.length > 0
    ? [...extraDaftar, ...DAFTAR_WILAYAH_INDONESIA]
    : DAFTAR_WILAYAH_INDONESIA;

  // Bersihkan awalan seperti "Lainnya:", "Kabupaten", "Kota", dan bagian dalam kurung misal "(Jawa Timur)"
  const tanpaKurung = raw
    .replace(/^lainnya\s*:\s*/i, '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^(kota|kabupaten|kab\.?|provinsi|prov\.?)\s+/i, '')
    .trim()
    .toLowerCase();

  const fullLower = raw
    .replace(/^lainnya\s*:\s*/i, '')
    .toLowerCase()
    .trim();

  // Pisahkan daftar Kabupaten/Kota vs Provinsi agar Kabupaten/Kota selalu diprioritaskan
  const kabKotaList = daftar.filter((w) => w.tipe !== 'provinsi');
  const provList = daftar.filter((w) => w.tipe === 'provinsi');

  // 1. Cek exact match atau token match pada Kabupaten/Kota terlebih dahulu
  for (const item of kabKotaList) {
    const namaClean = item.nama.toLowerCase().replace(/\s*\([^)]*\)/g, '').trim();
    if (tanpaKurung === namaClean || tanpaKurung === item.nama.toLowerCase()) {
      return item;
    }
    if (item.aliases?.some((a) => a.toLowerCase() === tanpaKurung)) {
      return item;
    }
  }

  // 2. Cek apakah input mengandung nama Kabupaten/Kota sebagai kata utuh (misal "Kabupaten Bondowoso (Jawa Timur)" atau "Jawa Timur / Ngawi")
  for (const item of kabKotaList) {
    const namaClean = item.nama.toLowerCase().replace(/\s*\([^)]*\)/g, '').trim();
    const escaped = namaClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wordRe = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
    if (wordRe.test(tanpaKurung) || wordRe.test(fullLower)) {
      return item;
    }
    if (item.aliases) {
      for (const al of item.aliases) {
        if (al.length < 3) continue;
        const escAl = al.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const alRe = new RegExp(`(^|[^a-z0-9])${escAl}([^a-z0-9]|$)`, 'i');
        if (alRe.test(tanpaKurung) || alRe.test(fullLower)) {
          return item;
        }
      }
    }
  }

  // 3. Cek fuzzy match pada Kabupaten/Kota (toleransi typo seperti "bondowso", "banyuwgi", "krwng")
  let bestKabMatch: WilayahRef | null = null;
  let bestKabScore = 0;
  if (tanpaKurung.length >= 3) {
    for (const item of kabKotaList) {
      const cleanTarget = item.nama.toLowerCase().replace(/\s*\([^)]*\)/g, '').trim();
      const dist = levenshteinDistance(tanpaKurung, cleanTarget);
      const maxLen = Math.max(tanpaKurung.length, cleanTarget.length);
      const sim = 1 - dist / maxLen;
      const maxDist = cleanTarget.length <= 5 ? 1 : 2;
      if (dist <= maxDist && sim >= 0.72 && sim > bestKabScore) {
        bestKabScore = sim;
        bestKabMatch = item;
      }
    }
  }
  if (bestKabMatch) return bestKabMatch;

  // 4. Cek Provinsi (exact / substring / alias)
  for (const item of provList) {
    const namaClean = item.nama.toLowerCase().trim();
    if (tanpaKurung === namaClean || fullLower.includes(namaClean)) {
      return item;
    }
    if (item.aliases?.some((a) => a.toLowerCase() === tanpaKurung || fullLower.includes(a.toLowerCase()))) {
      return item;
    }
  }

  return null;
}

/**
 * Mencari nama daerah / kota / kabupaten / provinsi Indonesia yang paling mendekati kata kunci yang diketik user
 * @param input Query ketikan user (misal: "palembng", "sragan", "subng", "bondowso")
 * @returns Wilayah kandidat terbaik dengan format saran ramah, atau null jika tidak ada yang cocok
 */
export function cariWilayahMendekati(input: string): {
  rekomendasi: string;
  namaResmi: string;
  skor: number;
  pesanKonfirmasi: string;
  lat?: number;
  lng?: number;
} | null {
  const query = input.trim().toLowerCase().replace(/^(kota|kabupaten|kab\.|provinsi|prov\.)\s+/i, '');
  if (query.length < 2) return null;

  let bestMatch: WilayahRef | null = null;
  let bestScore = 0; // 0 to 1

  for (const item of DAFTAR_WILAYAH_INDONESIA) {
    const target = item.nama.toLowerCase();
    const cleanTarget = target.replace(/\s*\([^)]*\)/g, '').trim();

    // 1. Exact Match
    if (query === target || query === cleanTarget) {
      const formatted = item.provinsi ? `${item.nama} (${item.provinsi})` : item.nama;
      return {
        rekomendasi: formatted,
        namaResmi: item.nama,
        skor: 1.0,
        pesanKonfirmasi: `${formatted}, apakah sudah benar?`,
        lat: item.lat,
        lng: item.lng,
      };
    }

    // 2. Cek Aliases
    if (item.aliases) {
      for (const al of item.aliases) {
        if (query === al.toLowerCase()) {
          const formatted = item.provinsi ? `${item.nama} (${item.provinsi})` : item.nama;
          return {
            rekomendasi: formatted,
            namaResmi: item.nama,
            skor: 0.98,
            pesanKonfirmasi: `${formatted}, apakah sudah benar?`,
            lat: item.lat,
            lng: item.lng,
          };
        }
      }
    }

    // 3. Substring / Prefix match
    if (cleanTarget.startsWith(query) && query.length >= 3) {
      const score = 0.85 + (query.length / cleanTarget.length) * 0.1;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    } else if (cleanTarget.includes(query) && query.length >= 4) {
      const score = 0.75;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }

    // 4. Fuzzy Levenshtein Distance
    const dist = levenshteinDistance(query, cleanTarget);
    const maxLen = Math.max(query.length, cleanTarget.length);
    const simScore = 1 - dist / maxLen;

    const maxAllowedDist = cleanTarget.length <= 5 ? 1 : cleanTarget.length <= 8 ? 2 : 3;
    if (dist <= maxAllowedDist && simScore > 0.60) {
      if (simScore > bestScore) {
        bestScore = simScore;
        bestMatch = item;
      }
    }

    if (item.aliases) {
      for (const al of item.aliases) {
        const alDist = levenshteinDistance(query, al.toLowerCase());
        const alMax = Math.max(query.length, al.length);
        const alSim = 1 - alDist / alMax;
        if (alDist <= 1 && alSim > 0.70 && alSim > bestScore) {
          bestScore = alSim;
          bestMatch = item;
        }
      }
    }
  }

  if (bestMatch && bestScore >= 0.65) {
    const formatted = bestMatch.provinsi ? `${bestMatch.nama} (${bestMatch.provinsi})` : bestMatch.nama;
    return {
      rekomendasi: formatted,
      namaResmi: bestMatch.nama,
      skor: Number(bestScore.toFixed(2)),
      pesanKonfirmasi: `${formatted}, apakah sudah benar?`,
      lat: bestMatch.lat,
      lng: bestMatch.lng,
    };
  }

  return null;
}
