/**
 * ML Explainability Module (SHAP-like attribution and Indonesian narrative generation)
 */

export interface ExplanationResult {
  factors: string[];
  narasi: string;
  rekomendasi: string[];
}

/**
 * Computes feature contribution category impacts, generates an Indonesian narrative,
 * and builds dynamic EWS action recommendations.
 * 
 * @param currentPrice The actual price in the latest month
 * @param predictedPrice The forecasted price (1 month ahead)
 * @param features The feature row values for the target month
 * @param komoditas Name of the commodity
 * @param cv Volatility CV (12-month)
 * @param growth_yoy YoY Growth Rate
 * @param status_cv EWS Volatility status
 * @param status_skpg EWS SKPG status
 */
export function explainPrediction(
  currentPrice: number,
  predictedPrice: number,
  features: Record<string, number>,
  komoditas: string,
  cv: number,
  growth_yoy: number,
  status_cv: string,
  status_skpg: string
): ExplanationResult {
  const diffPercent = ((predictedPrice - currentPrice) / currentPrice) * 100;
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
  const isCrop = ['harga_cabai_merah', 'harga_cabai_rawit', 'harga_bawang_merah', 'harga_bawang_putih'].includes(komoditas);
  
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
  const recommendations: string[] = [];
  const isRentan = status_cv === 'RENTAN' || status_skpg === 'RENTAN';
  const isWaspada = status_cv === 'WASPADA' || status_skpg === 'WASPADA' || (isRising && diffPercent > 3);

  if (isRentan) {
    recommendations.push("siapkan GPM");
    recommendations.push("intensifkan monitoring");
    recommendations.push("koordinasi distribusi");
  } else if (isWaspada) {
    recommendations.push("lakukan operasi pasar mandiri");
    recommendations.push("pantau pasokan distributor");
    recommendations.push("himbau belanja bijak");
  } else {
    recommendations.push("monitoring rutin mingguan");
    recommendations.push("jaga kestabilan pasokan");
    recommendations.push("pastikan jalur distribusi lancar");
  }

  // 3. Generate structured narrative text
  const komoditasCleanName = komoditas.replace('harga_', '').replace(/_/g, ' ');
  const capitalizedName = komoditasCleanName.charAt(0).toUpperCase() + komoditasCleanName.slice(1);
  const actionWord = isRising ? 'naik' : 'turun';
  
  const narasi = `${capitalizedName} diproyeksikan ${actionWord} ${absDiff.toFixed(0)}%.
Pendorong utama:
${topDrivers.join('\n')}

Interpretasi risiko:
CV: ${cv.toFixed(1)}% -> ${status_cv}
SKPG: ${growth_yoy.toFixed(1)}% -> ${status_skpg}

Rekomendasi:
${recommendations.map(r => `* ${r}`).join('\n')}`;

  return {
    factors: topDrivers,
    narasi,
    rekomendasi: recommendations
  };
}
