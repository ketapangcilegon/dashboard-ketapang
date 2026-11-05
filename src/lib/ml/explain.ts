/**
 * ML Explainability Module (SHAP-like attribution and Indonesian narrative generation)
 */

export interface ExplanationResult {
  factors: string[];
  narasi: string;
  rekomendasi: string[];
}

export interface ExplainPredictionOptions {
  currentPrice: number;
  predictedPrice: number;
  forecast3m?: number;
  features: Record<string, number>;
  komoditas: string;
  cv: number;
  growth_yoy: number;
  status_cv?: string;
  status_skpg?: string;
  compositeStatus?: 'AMAN' | 'WASPADA' | 'AWAS' | 'KRITIS' | string;
  compositeScore?: number;
  matrixStatus?: 'AMAN' | 'WASPADA' | 'AWAS' | 'KRITIS' | string;
  diagnostics?: string[];
  rekomendasi?: string[];
}

/**
 * Computes feature contribution category impacts, generates an Indonesian narrative,
 * and builds dynamic EWS action recommendations based on the 4-dimension integrated EWS model.
 */
export function explainPrediction(
  currentPriceOrOpts: number | ExplainPredictionOptions,
  predictedPriceArg?: number,
  featuresArg?: Record<string, number>,
  komoditasArg?: string,
  cvArg?: number,
  growth_yoyArg?: number,
  status_cvArg?: string,
  status_skpgArg?: string
): ExplanationResult {
  let opts: ExplainPredictionOptions;

  if (typeof currentPriceOrOpts === 'object') {
    opts = currentPriceOrOpts;
  } else {
    opts = {
      currentPrice: currentPriceOrOpts,
      predictedPrice: predictedPriceArg || 0,
      features: featuresArg || {},
      komoditas: komoditasArg || '',
      cv: cvArg || 0,
      growth_yoy: growth_yoyArg || 0,
      status_cv: status_cvArg,
      status_skpg: status_skpgArg,
    };
  }

  const {
    currentPrice,
    predictedPrice,
    forecast3m = predictedPrice,
    features,
    komoditas,
    cv,
    growth_yoy,
    status_cv = 'AMAN',
    status_skpg = 'AMAN',
    compositeStatus,
    compositeScore,
    matrixStatus,
    diagnostics = [],
    rekomendasi: customRekomendasi
  } = opts;

  const diffPercent = currentPrice > 0 ? ((predictedPrice - currentPrice) / currentPrice) * 100 : 0;
  const isRising = diffPercent > 0;
  const absDiff = Math.abs(diffPercent);

  // 1. Calculate category impacts (SHAP-like)
  const contributions: { factor: string; value: number; direction: 'naik' | 'turun' }[] = [];

  // A. Keagamaan & HBKN (Ramadhan, Idul Fitri, Idul Adha, Nataru)
  let hbknImpact = 0;
  const hbknReasons: string[] = [];

  if (features.idul_fitri === 1 || (features.hari_menuju_idul_fitri !== undefined && features.hari_menuju_idul_fitri <= 30)) {
    hbknImpact += 15.5;
    hbknReasons.push("Menjelang Idul Fitri");
  }
  if (features.idul_adha === 1 || (features.hari_menuju_idul_adha !== undefined && features.hari_menuju_idul_adha <= 30)) {
    hbknImpact += 12.0;
    hbknReasons.push("Menjelang Idul Adha");
  }
  if (features.ramadhan === 1) {
    hbknImpact += 8.5;
    hbknReasons.push("Momentum Ramadhan");
  }
  if (features.nataru === 1) {
    hbknImpact += 5.0;
    hbknReasons.push("Periode Nataru");
  }

  if (hbknImpact > 0) {
    contributions.push({
      factor: hbknReasons[0] || "Hari Besar Keagamaan Nasional (HBKN)",
      value: hbknImpact,
      direction: 'naik'
    });
  }

  // B. Cuaca (Curah hujan, hari hujan)
  let weatherImpact = 0;
  const weatherReasons: string[] = [];
  const curahHujan = features.curah_hujan_mm || 0;
  const hariHujan = features.hari_hujan || 0;
  const isCrop = ['harga_cabai_merah', 'harga_cabai_rawit', 'harga_cabai_rawit_merah', 'harga_cabai_rawit_hijau', 'harga_bawang_merah', 'harga_bawang_putih'].some(k => komoditas.includes(k));

  if (curahHujan > 250 || hariHujan > 15) {
    weatherImpact = isCrop ? 14.5 : 4.5;
    weatherReasons.push("Curah hujan tinggi");
  } else if (curahHujan < 50 && curahHujan > 0) {
    weatherImpact = isCrop ? 8.0 : 2.0;
    weatherReasons.push("Kekeringan / curah hujan rendah");
  } else {
    weatherImpact = -3.5;
    weatherReasons.push("Cuaca kondusif");
  }

  contributions.push({
    factor: weatherReasons[0],
    value: Math.abs(weatherImpact),
    direction: weatherImpact > 0 ? 'naik' : 'turun'
  });

  // C. Inflasi Makro
  let inflationImpact = 0;
  const mtm = features.inflasi_mtm || 0;
  const yoy = features.inflasi_yoy || 0;
  let inflName = "Stabilitas inflasi makro";

  if (mtm > 0.4 || yoy > 3.0) {
    inflationImpact = 9.5;
    inflName = "Peningkatan inflasi IHK";
  } else if (mtm < 0) {
    inflationImpact = -4.0;
    inflName = "Tekanan deflasi bulanan";
  } else {
    inflationImpact = 2.5;
  }

  contributions.push({
    factor: inflName,
    value: Math.abs(inflationImpact),
    direction: inflationImpact > 0 ? 'naik' : 'turun'
  });

  // D. Tren Harga Jangka Panjang & Jangka Pendek (Lags, moving_avg, trend_3)
  const trend3 = features.trend_3 || 0;
  if (trend3 > 0) {
    contributions.push({
      factor: "Tren harga 3 bulan terakhir",
      value: 11.0,
      direction: 'naik'
    });
  } else if (trend3 < 0) {
    contributions.push({
      factor: "Tren harga 3 bulan terakhir",
      value: 9.0,
      direction: 'turun'
    });
  } else {
    contributions.push({
      factor: "Stabilitas harga historis",
      value: 1.5,
      direction: 'naik'
    });
  }

  // Sort factors based on whether they align with the price prediction direction, then by absolute impact value
  const sorted = contributions.sort((a, b) => {
    const aMatches = a.direction === (isRising ? 'naik' : 'turun');
    const bMatches = b.direction === (isRising ? 'naik' : 'turun');
    if (aMatches && !bMatches) return -1;
    if (!aMatches && bMatches) return 1;
    return b.value - a.value;
  });

  // Take top 3 factors
  const topDrivers = sorted.slice(0, 3).map((c, idx) => {
    return `${idx + 1} ${c.factor}`;
  });

  // 2. Generate EWS recommendations (rekomendasi)
  // Standardized 3 classifications: AMAN, WASPADA, AWAS
  let rawStatus = (compositeStatus || (
    status_cv === 'AWAS' || status_cv === 'KRITIS' || status_cv === 'RENTAN' || status_skpg === 'AWAS' || status_skpg === 'KRITIS' || status_skpg === 'RENTAN'
      ? 'AWAS'
      : status_cv === 'WASPADA' || status_skpg === 'WASPADA' || (isRising && diffPercent > 3)
        ? 'WASPADA'
        : 'AMAN'
  )).toUpperCase();

  const effectiveStatus = rawStatus === 'KRITIS' ? 'AWAS' : rawStatus;

  let recommendations: string[] = [];
  if (customRekomendasi && customRekomendasi.length > 0) {
    recommendations = [...customRekomendasi];
  } else if (effectiveStatus === 'AWAS') {
    recommendations = [
      "siapkan GPM & perluas kios pangan SPHP Bulog di kelurahan prioritas",
      "intensifkan monitoring harian harga dan pasokan distributor",
      "fasilitasi distribusi pangan / bantuan ongkos angkut dari sentra produsen",
      "optimalisasi Cadangan Pangan Pemerintah Daerah (CPPD) untuk stabilisasi"
    ];
  } else if (effectiveStatus === 'WASPADA') {
    recommendations = [
      "pantau pasokan distributor dan pergerakan stok pedagang",
      "koordinasi pasokan dengan daerah produsen mitra",
      "siapkan opsi operasi pasar mandiri jika tren berlanjut"
    ];
  } else {
    recommendations = [
      "monitoring rutin mingguan stabilitas pasokan dan harga",
      "jaga kestabilan pasokan dan kelancaran distribusi normal"
    ];
  }

  // 3. Generate structured narrative text conforming to Master Prompt Chapter 7
  const komoditasCleanName = komoditas.replace('harga_', '').replace(/_/g, ' ');
  const capitalizedName = komoditasCleanName.charAt(0).toUpperCase() + komoditasCleanName.slice(1);
  const actionWord = isRising ? 'naik' : 'turun';
  const scoreText = compositeScore !== undefined ? ` (Skor Komposit: ${compositeScore.toFixed(2)}/2.00)` : '';
  const matrixText = matrixStatus ? ` | Status Matriks Irisan: ${matrixStatus}` : '';

  const diagText = diagnostics.length > 0 ? `\nCatatan Diagnostik:\n${diagnostics.map(d => `- ${d}`).join('\n')}\n` : '';

  const narasi = `[STATUS EWS: ${effectiveStatus}${scoreText}${matrixText}]
${capitalizedName} diproyeksikan ${actionWord} ${absDiff.toFixed(1)}% pada horizon +1 bulan (Rp ${Math.round(predictedPrice).toLocaleString('id-ID')}) dan +3 bulan (Rp ${Math.round(forecast3m).toLocaleString('id-ID')}).

Pendorong utama pergerakan harga:
${topDrivers.join('\n')}

Evaluasi Dimensi Terpadu:
- Forecast +1 Bulan: ${diffPercent >= 0 ? '+' : ''}${diffPercent.toFixed(1)}%
- Volatilitas Historis (CV): ${cv.toFixed(1)}% -> ${status_cv}
- Tekanan Harga Tahunan (YoY): ${growth_yoy >= 0 ? '+' : ''}${growth_yoy.toFixed(1)}% -> ${status_skpg}
${diagText}
Rekomendasi Kebijakan:
${recommendations.map(r => `* ${r}`).join('\n')}`;

  return {
    factors: topDrivers,
    narasi,
    rekomendasi: recommendations
  };
}
