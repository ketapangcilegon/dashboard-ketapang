"use client";

import { Brain, TrendingUp, TrendingDown, AlertTriangle, Info, ArrowRight, Minus, Check } from 'lucide-react';

const getIcon = (id: string) => {
  if (id.includes('beras')) return '🌾';
  if (id.includes('bawang_merah')) return '🧅';
  if (id.includes('bawang_putih')) return '🧄';
  if (id.includes('cabai')) return '🌶️';
  if (id.includes('sapi')) return '🥩';
  if (id.includes('ayam') && !id.includes('telur')) return '🐔';
  if (id.includes('telur')) return '🥚';
  if (id.includes('gula')) return '🍚';
  if (id.includes('minyak')) return '🛢️';
  return '📦';
};

interface ForecastPanelProps {
  livePrices?: Record<string, number>;
}

interface ForecastItem {
  id: string;
  name: string;
  current: number;
  month1: number;
  month3: number;
  cv: number;
  isWarning: boolean;
  trend: 'up' | 'down' | 'stable';
}

export default function ForecastPanel({ livePrices = {} }: ForecastPanelProps) {
  // Mock ML logic
  // List of commodities to forecast
  const commodities = [
    { id: 'beras_premium', name: 'Beras Premium', base: 15000, volatility: 0.05, trendFactor: 1.02 },
    { id: 'beras_medium', name: 'Beras Medium', base: 13500, volatility: 0.04, trendFactor: 1.01 },
    { id: 'bawang_merah', name: 'Bawang Merah', base: 45000, volatility: 0.15, trendFactor: 1.12 },
    { id: 'bawang_putih', name: 'Bawang Putih', base: 42000, volatility: 0.08, trendFactor: 0.95 },
    { id: 'cabai_merah', name: 'Cabai Merah', base: 65000, volatility: 0.20, trendFactor: 1.18 },
    { id: 'cabai_rawit', name: 'Cabai Rawit', base: 70000, volatility: 0.25, trendFactor: 1.25 },
    { id: 'daging_sapi', name: 'Daging Sapi', base: 135000, volatility: 0.02, trendFactor: 1.01 },
    { id: 'daging_ayam', name: 'Daging Ayam', base: 38000, volatility: 0.06, trendFactor: 1.05 },
    { id: 'telur_ayam', name: 'Telur Ayam', base: 28000, volatility: 0.04, trendFactor: 1.03 },
    { id: 'gula_pasir', name: 'Gula Pasir', base: 17500, volatility: 0.03, trendFactor: 1.00 },
    { id: 'minyak_goreng', name: 'Minyak Goreng', base: 16000, volatility: 0.04, trendFactor: 1.02 },
  ];

  const forecasts: ForecastItem[] = commodities.map(item => {
    // If livePrices has the data, use it. (Handling different key names if needed)
    const liveKey = Object.keys(livePrices).find(k => k.toLowerCase().includes(item.name.toLowerCase()));
    const current = liveKey && livePrices[liveKey] > 0 ? livePrices[liveKey] : item.base;
    
    // Simulate ML Forecast
    // 1-month forecast (applying some trend factor)
    const month1 = Math.round((current * item.trendFactor) / 100) * 100;
    
    // 3-month forecast (compounding the trend and adding some volatility)
    const month3Raw = month1 * item.trendFactor * (1 + (item.volatility * (item.trendFactor > 1 ? 1 : -1)));
    const month3 = Math.round(month3Raw / 100) * 100;
    
    // Calculate simulated CV for this window (Standard Deviation / Mean)
    const values = [current, month1, month3];
    const mean = values.reduce((a,b)=>a+b,0) / 3;
    const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / 3);
    const cv = (stdDev / mean) * 100;
    
    // Threshold EWS (Early Warning System)
    let isWarning = false;
    if (item.id.includes('beras') && cv > 5) isWarning = true;
    else if (item.id.includes('cabai') && cv > 15) isWarning = true;
    else if (cv > 9) isWarning = true;

    // determine overall trend
    let trend: 'up'|'down'|'stable' = 'stable';
    if (month3 > current * 1.03) trend = 'up';
    else if (month3 < current * 0.97) trend = 'down';

    return {
      id: item.id,
      name: item.name,
      current,
      month1,
      month3,
      cv,
      isWarning,
      trend
    };
  });

  const warnings = forecasts.filter(f => f.isWarning);

  return (
    <div className="mt-8 space-y-5">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-center shadow-sm">
          <TrendingUp className="w-8 h-8 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-black text-[#0f172a] text-lg lg:text-xl uppercase tracking-wide flex items-center">
            AI FORECAST & EARLY WARNING SYSTEM (ML)
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full uppercase tracking-wider ml-3 border border-amber-200">DUMMY V1</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Proyeksi pergerakan harga pangan strategis 1 dan 3 bulan ke depan menggunakan model Machine Learning (V1).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Forecast Table */}
        <div className="lg:col-span-7 dashboard-card bg-white border border-emerald-100 rounded-3xl p-0 overflow-hidden flex flex-col h-[520px] shadow-sm">
          <div className="p-5 border-b border-emerald-50 bg-white flex items-center justify-between shrink-0">
            <h4 className="font-extrabold text-[13px] text-[#0B4D3C] uppercase tracking-wide flex items-center gap-2">
              <div className="p-1.5 bg-[#0B4D3C] rounded-full text-white">
                <TrendingUp className="w-4 h-4" />
              </div>
              Tabel Prediksi Harga
            </h4>
            <span className="text-[10px] bg-white border border-emerald-200 text-[#0B4D3C] px-4 py-1.5 rounded-full font-bold uppercase tracking-wider">1 & 3 BULAN</span>
          </div>
          <div className="overflow-y-auto custom-scrollbar flex-1 px-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="text-[#0B4D3C] font-extrabold border-b border-slate-100 text-[10px] uppercase tracking-wider">
                  <th className="p-4 bg-emerald-50/20">Komoditas</th>
                  <th className="p-4 bg-emerald-50/20 text-right">Harga Kini</th>
                  <th className="p-4 bg-emerald-50/20 text-right">+1 Bulan</th>
                  <th className="p-4 bg-emerald-50/20 text-right">+3 Bulan</th>
                  <th className="p-4 bg-emerald-50/20 text-center">Tren</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {forecasts.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-800 flex items-center gap-3 text-[13px]">
                      <span className="text-xl leading-none">{getIcon(item.id)}</span>
                      {item.name}
                    </td>
                    <td className="p-4 text-right text-slate-500 font-semibold">
                      Rp{item.current.toLocaleString('id-ID')}
                    </td>
                    <td className={`p-4 text-right font-bold ${item.month1 > item.current ? 'text-red-500' : 'text-emerald-500'}`}>
                      Rp{item.month1.toLocaleString('id-ID')}
                    </td>
                    <td className={`p-4 text-right font-black ${item.month3 > item.current ? 'text-red-500' : 'text-emerald-500'}`}>
                      Rp{item.month3.toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 text-center">
                      {item.trend === 'up' && <TrendingUp className="w-5 h-5 text-red-500 mx-auto" />}
                      {item.trend === 'down' && <TrendingDown className="w-5 h-5 text-emerald-500 mx-auto" />}
                      {item.trend === 'stable' && <Minus className="w-5 h-5 text-amber-500 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100 bg-white flex flex-wrap items-center gap-4 shrink-0 text-[10px] font-bold text-slate-500">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Turun</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> Stabil</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Naik</div>
            <div className="ml-auto text-slate-400 font-medium hidden sm:block">Harga dalam Rupiah (Rp) / kg</div>
          </div>
        </div>

        {/* Right Column: AI Interpretation */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="dashboard-card bg-[#0B4D3C] rounded-3xl p-6 lg:p-8 text-white border-none shadow-xl flex-1 flex flex-col h-[520px] overflow-hidden">
            <h4 className="font-extrabold text-[13px] uppercase tracking-wide flex items-center gap-3 mb-6 text-white">
              <div className="p-1.5 bg-white rounded-full text-[#0B4D3C] shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              Interpretasi Algoritma ML
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[9px] font-black rounded-full uppercase tracking-wider ml-auto border border-amber-500/30">DUMMY V1</span>
            </h4>
            
            <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
              <p className="text-xs text-white/90 leading-relaxed text-justify font-medium">
                Model peramalan (V1 Baseline) mendeteksi adanya potensi fluktuasi pada beberapa komoditas strategis berdasarkan momentum pergerakan harga 10 tahun terakhir. Batas toleransi indeks variabilitas (CV) yang aman diatur pada level <strong>&lt; 9%</strong>, sementara khusus untuk beras diatur lebih ketat pada level <strong>&lt; 5%</strong>.
              </p>

              {warnings.length > 0 ? (
                <div className="bg-[#1c3a31]/60 border border-red-500/40 p-5 rounded-2xl mt-4">
                  <div className="flex items-center gap-3 text-red-400 font-black text-xs uppercase tracking-wider mb-5">
                    <div className="p-2 bg-red-500/20 rounded-full text-red-500">
                      <AlertTriangle className="w-4 h-4 fill-red-500 text-[#1c3a31]" />
                    </div>
                    EARLY WARNING SYSTEM (EWS) AKTIF
                  </div>
                  <ul className="space-y-5">
                    {warnings.map(w => (
                      <li key={w.id} className="text-[11px] text-white flex items-start gap-4 leading-relaxed">
                        <span className="text-3xl leading-none mt-1 drop-shadow-md">{getIcon(w.id)}</span>
                        <div>
                          <strong className="text-white font-bold text-xs">{w.name}</strong> diproyeksikan melonjak hingga <strong className="text-amber-400 text-xs">Rp{w.month3.toLocaleString('id-ID')}</strong> dalam triwulan depan (CV: <strong className="text-amber-400">{w.cv.toFixed(1)}%</strong>). <br/>
                          <span className="text-[11px] text-white/70 mt-1 block italic">Tindakan: Disarankan menyiapkan mitigasi operasi pasar dalam 30 hari.</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="bg-[#1c3a31]/60 border border-emerald-500/40 p-5 rounded-2xl mt-4 flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-400 shrink-0">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-[13px] font-bold text-emerald-400 mb-1">Stabilitas Terjaga</h5>
                    <p className="text-xs text-emerald-100/80 leading-relaxed">Seluruh komoditas strategis diprediksi stabil (CV dalam batas aman) untuk rentang waktu 3 bulan ke depan.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 shrink-0">
              <div className="border border-white/20 rounded-xl p-4 flex items-start gap-3 bg-white/5">
                <div className="p-1 bg-white rounded-full text-[#0B4D3C] shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 font-bold" />
                </div>
                <div>
                  <h5 className="text-[11px] font-bold text-white mb-1">Sumber Model</h5>
                  <p className="text-[10px] text-white/70 font-medium leading-relaxed text-justify">
                    Model V1 (Prophet Baseline) memproses data historis bulanan secara deterministik. Pembaruan algoritma ML ke V2 (XGBoost/LSTM) yang mengikutsertakan variabel iklim makro dan volatilitas inflasi dapat dipasang di tahap mendatang.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
