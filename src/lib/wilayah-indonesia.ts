/**
 * Utilitas Pencocokan Wilayah Indonesia (Smart Geo Fuzzy Matcher)
 * Digunakan untuk menangkap dan mengoreksi typo asal pasokan beras manual secara instan.
 */

export interface WilayahRef {
  nama: string;
  tipe: 'kota' | 'kabupaten' | 'provinsi';
  provinsi?: string;
  aliases?: string[];
}

export const DAFTAR_WILAYAH_INDONESIA: WilayahRef[] = [
  // --- PROVINSI ---
  { nama: 'Sumatera Selatan', tipe: 'provinsi', aliases: ['sumsel'] },
  { nama: 'Sumatera Utara', tipe: 'provinsi', aliases: ['sumut'] },
  { nama: 'Sumatera Barat', tipe: 'provinsi', aliases: ['sumbar'] },
  { nama: 'Lampung', tipe: 'provinsi', aliases: ['lpg'] },
  { nama: 'Riau', tipe: 'provinsi' },
  { nama: 'Jambi', tipe: 'provinsi' },
  { nama: 'Bengkulu', tipe: 'provinsi' },
  { nama: 'Aceh', tipe: 'provinsi', aliases: ['nad', 'nanggroe aceh'] },
  { nama: 'Kepulauan Bangka Belitung', tipe: 'provinsi', aliases: ['babel'] },
  { nama: 'Kepulauan Riau', tipe: 'provinsi', aliases: ['kepri'] },
  { nama: 'DKI Jakarta', tipe: 'provinsi', aliases: ['jakarta'] },
  { nama: 'Jawa Barat', tipe: 'provinsi', aliases: ['jabar'] },
  { nama: 'Jawa Tengah', tipe: 'provinsi', aliases: ['jateng'] },
  { nama: 'DI Yogyakarta', tipe: 'provinsi', aliases: ['jogja', 'diy', 'yogya'] },
  { nama: 'Jawa Timur', tipe: 'provinsi', aliases: ['jatim'] },
  { nama: 'Banten', tipe: 'provinsi' },
  { nama: 'Bali', tipe: 'provinsi' },
  { nama: 'Nusa Tenggara Barat', tipe: 'provinsi', aliases: ['ntb', 'lombok'] },
  { nama: 'Nusa Tenggara Timur', tipe: 'provinsi', aliases: ['ntt', 'timor'] },
  { nama: 'Kalimantan Barat', tipe: 'provinsi', aliases: ['kalbar'] },
  { nama: 'Kalimantan Selatan', tipe: 'provinsi', aliases: ['kalsel'] },
  { nama: 'Kalimantan Tengah', tipe: 'provinsi', aliases: ['kalteng'] },
  { nama: 'Kalimantan Timur', tipe: 'provinsi', aliases: ['kaltim'] },
  { nama: 'Kalimantan Utara', tipe: 'provinsi', aliases: ['kaltara'] },
  { nama: 'Sulawesi Selatan', tipe: 'provinsi', aliases: ['sulsel'] },
  { nama: 'Sulawesi Tengah', tipe: 'provinsi', aliases: ['sulteng'] },
  { nama: 'Sulawesi Utara', tipe: 'provinsi', aliases: ['sulut'] },
  { nama: 'Sulawesi Tenggara', tipe: 'provinsi', aliases: ['sultra'] },
  { nama: 'Sulawesi Barat', tipe: 'provinsi', aliases: ['sulbar'] },
  { nama: 'Gorontalo', tipe: 'provinsi' },
  { nama: 'Maluku', tipe: 'provinsi' },
  { nama: 'Maluku Utara', tipe: 'provinsi' },
  { nama: 'Papua', tipe: 'provinsi' },
  { nama: 'Papua Barat', tipe: 'provinsi' },
  { nama: 'Papua Selatan', tipe: 'provinsi', aliases: ['merauke'] },

  // --- KOTA & KABUPATEN SENTRA PADI / PASOKAN PANGAN ---
  // Sumatera
  { nama: 'Palembang', tipe: 'kota', provinsi: 'Sumatera Selatan', aliases: ['palembng', 'plg', 'pelembang'] },
  { nama: 'Banyuasin', tipe: 'kabupaten', provinsi: 'Sumatera Selatan' },
  { nama: 'Ogan Komering Ilir', tipe: 'kabupaten', provinsi: 'Sumatera Selatan', aliases: ['oki', 'kayuagung'] },
  { nama: 'Ogan Komering Ulu', tipe: 'kabupaten', provinsi: 'Sumatera Selatan', aliases: ['oku', 'baturaja'] },
  { nama: 'Medan', tipe: 'kota', provinsi: 'Sumatera Utara', aliases: ['medn'] },
  { nama: 'Deli Serdang', tipe: 'kabupaten', provinsi: 'Sumatera Utara' },
  { nama: 'Asahan', tipe: 'kabupaten', provinsi: 'Sumatera Utara', aliases: ['kisaran'] },
  { nama: 'Padang', tipe: 'kota', provinsi: 'Sumatera Barat' },
  { nama: 'Solok', tipe: 'kabupaten', provinsi: 'Sumatera Barat', aliases: ['beras solok'] },
  { nama: 'Tanah Datar', tipe: 'kabupaten', provinsi: 'Sumatera Barat', aliases: ['batusangkar'] },
  { nama: 'Pekanbaru', tipe: 'kota', provinsi: 'Riau' },
  { nama: 'Bandar Lampung', tipe: 'kota', provinsi: 'Lampung', aliases: ['lampung kota'] },
  { nama: 'Lampung Tengah', tipe: 'kabupaten', provinsi: 'Lampung' },
  { nama: 'Lampung Selatan', tipe: 'kabupaten', provinsi: 'Lampung' },
  { nama: 'Lampung Timur', tipe: 'kabupaten', provinsi: 'Lampung' },
  { nama: 'Pringsewu', tipe: 'kabupaten', provinsi: 'Lampung' },

  // Jawa Barat & Banten
  { nama: 'Subang', tipe: 'kabupaten', provinsi: 'Jawa Barat', aliases: ['subng'] },
  { nama: 'Karawang', tipe: 'kabupaten', provinsi: 'Jawa Barat', aliases: ['krwng', 'karawng'] },
  { nama: 'Indramayu', tipe: 'kabupaten', provinsi: 'Jawa Barat', aliases: ['indramyu', 'dermayu'] },
  { nama: 'Cianjur', tipe: 'kabupaten', provinsi: 'Jawa Barat', aliases: ['cianjr', 'beras cianjur', 'pandanwangi'] },
  { nama: 'Majalengka', tipe: 'kabupaten', provinsi: 'Jawa Barat' },
  { nama: 'Cirebon', tipe: 'kota', provinsi: 'Jawa Barat' },
  { nama: 'Kuningan', tipe: 'kabupaten', provinsi: 'Jawa Barat' },
  { nama: 'Tasikmalaya', tipe: 'kabupaten', provinsi: 'Jawa Barat', aliases: ['tasik'] },
  { nama: 'Garut', tipe: 'kabupaten', provinsi: 'Jawa Barat' },
  { nama: 'Sukabumi', tipe: 'kabupaten', provinsi: 'Jawa Barat' },
  { nama: 'Bandung', tipe: 'kota', provinsi: 'Jawa Barat', aliases: ['bdg'] },
  { nama: 'Bekasi', tipe: 'kota', provinsi: 'Jawa Barat' },
  { nama: 'Bogor', tipe: 'kota', provinsi: 'Jawa Barat' },
  { nama: 'Purwakarta', tipe: 'kabupaten', provinsi: 'Jawa Barat' },
  { nama: 'Serang', tipe: 'kabupaten', provinsi: 'Banten' },
  { nama: 'Pandeglang', tipe: 'kabupaten', provinsi: 'Banten' },
  { nama: 'Lebak', tipe: 'kabupaten', provinsi: 'Banten', aliases: ['rantau', 'lebak banten', 'rangkasbitung'] },
  { nama: 'Tangerang', tipe: 'kabupaten', provinsi: 'Banten' },
  { nama: 'Cilegon', tipe: 'kota', provinsi: 'Banten' },

  // Jawa Tengah & DIY
  { nama: 'Demak', tipe: 'kabupaten', provinsi: 'Jawa Tengah', aliases: ['demk'] },
  { nama: 'Sragen', tipe: 'kabupaten', provinsi: 'Jawa Tengah', aliases: ['sragan', 'sragenn'] },
  { nama: 'Grobogan', tipe: 'kabupaten', provinsi: 'Jawa Tengah', aliases: ['purwodadi'] },
  { nama: 'Pati', tipe: 'kabupaten', provinsi: 'Jawa Tengah' },
  { nama: 'Kudus', tipe: 'kabupaten', provinsi: 'Jawa Tengah' },
  { nama: 'Cilacap', tipe: 'kabupaten', provinsi: 'Jawa Tengah' },
  { nama: 'Banyumas', tipe: 'kabupaten', provinsi: 'Jawa Tengah', aliases: ['purwokerto'] },
  { nama: 'Kebumen', tipe: 'kabupaten', provinsi: 'Jawa Tengah' },
  { nama: 'Purworejo', tipe: 'kabupaten', provinsi: 'Jawa Tengah' },
  { nama: 'Klaten', tipe: 'kabupaten', provinsi: 'Jawa Tengah', aliases: ['delanggu'] },
  { nama: 'Sukoharjo', tipe: 'kabupaten', provinsi: 'Jawa Tengah' },
  { nama: 'Wonogiri', tipe: 'kabupaten', provinsi: 'Jawa Tengah' },
  { nama: 'Boyolali', tipe: 'kabupaten', provinsi: 'Jawa Tengah' },
  { nama: 'Karanganyar', tipe: 'kabupaten', provinsi: 'Jawa Tengah' },
  { nama: 'Brebes', tipe: 'kabupaten', provinsi: 'Jawa Tengah' },
  { nama: 'Tegal', tipe: 'kota', provinsi: 'Jawa Tengah' },
  { nama: 'Pemalang', tipe: 'kabupaten', provinsi: 'Jawa Tengah' },
  { nama: 'Pekalongan', tipe: 'kota', provinsi: 'Jawa Tengah' },
  { nama: 'Batang', tipe: 'kabupaten', provinsi: 'Jawa Tengah' },
  { nama: 'Kendal', tipe: 'kabupaten', provinsi: 'Jawa Tengah' },
  { nama: 'Semarang', tipe: 'kota', provinsi: 'Jawa Tengah', aliases: ['smg'] },
  { nama: 'Surakarta (Solo)', tipe: 'kota', provinsi: 'Jawa Tengah', aliases: ['solo', 'surakarta'] },
  { nama: 'Yogyakarta', tipe: 'kota', provinsi: 'DI Yogyakarta', aliases: ['jogja', 'diy'] },
  { nama: 'Sleman', tipe: 'kabupaten', provinsi: 'DI Yogyakarta' },
  { nama: 'Bantul', tipe: 'kabupaten', provinsi: 'DI Yogyakarta' },

  // Jawa Timur
  { nama: 'Ngawi', tipe: 'kabupaten', provinsi: 'Jawa Timur', aliases: ['ngawii'] },
  { nama: 'Bojonegoro', tipe: 'kabupaten', provinsi: 'Jawa Timur' },
  { nama: 'Tuban', tipe: 'kabupaten', provinsi: 'Jawa Timur' },
  { nama: 'Lamongan', tipe: 'kabupaten', provinsi: 'Jawa Timur' },
  { nama: 'Madiun', tipe: 'kota', provinsi: 'Jawa Timur' },
  { nama: 'Magetan', tipe: 'kabupaten', provinsi: 'Jawa Timur' },
  { nama: 'Ponorogo', tipe: 'kabupaten', provinsi: 'Jawa Timur' },
  { nama: 'Nganjuk', tipe: 'kabupaten', provinsi: 'Jawa Timur' },
  { nama: 'Kediri', tipe: 'kota', provinsi: 'Jawa Timur' },
  { nama: 'Tulungagung', tipe: 'kabupaten', provinsi: 'Jawa Timur' },
  { nama: 'Blitar', tipe: 'kota', provinsi: 'Jawa Timur' },
  { nama: 'Jombang', tipe: 'kabupaten', provinsi: 'Jawa Timur' },
  { nama: 'Mojokerto', tipe: 'kota', provinsi: 'Jawa Timur' },
  { nama: 'Pasuruan', tipe: 'kota', provinsi: 'Jawa Timur' },
  { nama: 'Probolinggo', tipe: 'kota', provinsi: 'Jawa Timur' },
  { nama: 'Lumajang', tipe: 'kabupaten', provinsi: 'Jawa Timur' },
  { nama: 'Jember', tipe: 'kabupaten', provinsi: 'Jawa Timur' },
  { nama: 'Banyuwangi', tipe: 'kabupaten', provinsi: 'Jawa Timur', aliases: ['banyuwgi', 'bwi'] },
  { nama: 'Bondowoso', tipe: 'kabupaten', provinsi: 'Jawa Timur' },
  { nama: 'Situbondo', tipe: 'kabupaten', provinsi: 'Jawa Timur' },
  { nama: 'Malang', tipe: 'kota', provinsi: 'Jawa Timur' },
  { nama: 'Surabaya', tipe: 'kota', provinsi: 'Jawa Timur', aliases: ['sby'] },
  { nama: 'Sidoarjo', tipe: 'kabupaten', provinsi: 'Jawa Timur' },

  // Bali & Nusa Tenggara
  { nama: 'Denpasar', tipe: 'kota', provinsi: 'Bali' },
  { nama: 'Tabanan', tipe: 'kabupaten', provinsi: 'Bali', aliases: ['lumbung padi bali'] },
  { nama: 'Lombok Timur', tipe: 'kabupaten', provinsi: 'Nusa Tenggara Barat' },
  { nama: 'Lombok Tengah', tipe: 'kabupaten', provinsi: 'Nusa Tenggara Barat' },
  { nama: 'Sumbawa', tipe: 'kabupaten', provinsi: 'Nusa Tenggara Barat' },

  // Sulawesi
  { nama: 'Makassar', tipe: 'kota', provinsi: 'Sulawesi Selatan', aliases: ['makasar', 'ujung pandang'] },
  { nama: 'Sidrap (Sidenreng Rappang)', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', aliases: ['sidrap', 'sidenreng'] },
  { nama: 'Pinrang', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan' },
  { nama: 'Bone', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', aliases: ['watampone'] },
  { nama: 'Wajo', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', aliases: ['sengkang'] },
  { nama: 'Soppeng', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', aliases: ['watansoppeng'] },
  { nama: 'Luwu', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan', aliases: ['belopa', 'palopo'] },
  { nama: 'Gowa', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan' },
  { nama: 'Maros', tipe: 'kabupaten', provinsi: 'Sulawesi Selatan' },
  { nama: 'Parepare', tipe: 'kota', provinsi: 'Sulawesi Selatan' },
  { nama: 'Palu', tipe: 'kota', provinsi: 'Sulawesi Tengah' },
  { nama: 'Kendari', tipe: 'kota', provinsi: 'Sulawesi Tenggara' },
  { nama: 'Manado', tipe: 'kota', provinsi: 'Sulawesi Utara' },

  // Kalimantan & Papua
  { nama: 'Banjarmasin', tipe: 'kota', provinsi: 'Kalimantan Selatan' },
  { nama: 'Barito Kuala', tipe: 'kabupaten', provinsi: 'Kalimantan Selatan' },
  { nama: 'Pontianak', tipe: 'kota', provinsi: 'Kalimantan Barat' },
  { nama: 'Sambas', tipe: 'kabupaten', provinsi: 'Kalimantan Barat' },
  { nama: 'Samarinda', tipe: 'kota', provinsi: 'Kalimantan Timur' },
  { nama: 'Merauke', tipe: 'kabupaten', provinsi: 'Papua Selatan', aliases: ['lumbung pangan timur'] },
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
      // Damerau transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }

  return dp[m][n];
}

/**
 * Mencari nama daerah / kota / kabupaten / provinsi Indonesia yang paling mendekati kata kunci yang diketik user
 * @param input Query ketikan user (misal: "palembng", "sragan", "subng", "makasar")
 * @returns Wilayah kandidat terbaik dengan format saran ramah, atau null jika tidak ada yang cocok
 */
export function cariWilayahMendekati(input: string): {
  rekomendasi: string;
  namaResmi: string;
  skor: number;
  pesanKonfirmasi: string;
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
        pesanKonfirmasi: `${formatted}, apakah sudah benar?`
      };
    }

    // 2. Cek Aliases (misal: plg -> Palembang, sby -> Surabaya, jogja -> DI Yogyakarta)
    if (item.aliases) {
      for (const al of item.aliases) {
        if (query === al.toLowerCase()) {
          const formatted = item.provinsi ? `${item.nama} (${item.provinsi})` : item.nama;
          return {
            rekomendasi: formatted,
            namaResmi: item.nama,
            skor: 0.98,
            pesanKonfirmasi: `${formatted}, apakah sudah benar?`
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

    // 4. Fuzzy Levenshtein Distance (Deteksi Typo seperti "palembng", "krwng", "cianjr")
    const dist = levenshteinDistance(query, cleanTarget);
    const maxLen = Math.max(query.length, cleanTarget.length);
    const simScore = 1 - (dist / maxLen);

    // Toleransi typo: jarak <= 2 untuk kata pendek, jarak <= 3 untuk kata panjang
    const maxAllowedDist = cleanTarget.length <= 5 ? 1 : cleanTarget.length <= 8 ? 2 : 3;
    if (dist <= maxAllowedDist && simScore > 0.60) {
      if (simScore > bestScore) {
        bestScore = simScore;
        bestMatch = item;
      }
    }

    // Cek juga fuzzy terhadap aliases
    if (item.aliases) {
      for (const al of item.aliases) {
        const alDist = levenshteinDistance(query, al.toLowerCase());
        const alMax = Math.max(query.length, al.length);
        const alSim = 1 - (alDist / alMax);
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
      pesanKonfirmasi: `${formatted}, apakah sudah benar?`
    };
  }

  return null;
}
