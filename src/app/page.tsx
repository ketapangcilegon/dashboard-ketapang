import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import KPIGrid from '@/components/KPIGrid';
import HargaPanel from '@/components/HargaPanel';
import CVGauge from '@/components/CVGauge';
import dynamic from 'next/dynamic';

const ProduksiChart = dynamic(() => import('@/components/ProduksiChart'), { loading: () => <div className="animate-pulse bg-slate-100 w-full h-full rounded"></div> });
const MapSKPG = dynamic(() => import('@/components/MapSKPG'), { loading: () => <div className="animate-pulse bg-slate-100 w-full h-full rounded"></div> });
const MapFSVA = dynamic(() => import('@/components/MapFSVA'), { loading: () => <div className="animate-pulse bg-slate-100 w-full h-full rounded"></div> });
const TrendChart = dynamic(() => import('@/components/TrendChart'), { loading: () => <div className="animate-pulse bg-slate-100 w-full h-full rounded"></div> });

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-slate-800 font-sans">
      {/* Sidebar */}
      <div className="hidden lg:block w-64 shrink-0 bg-[var(--color-sidebar)] text-white shadow-xl z-20">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden relative">
        {/* Background Cityscape Illustration (Simulated with a gradient/pattern) */}
        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-blue-50 to-transparent z-0 opacity-70 pointer-events-none"></div>

        <Navbar />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar relative z-10">
          <div className="max-w-[1600px] mx-auto space-y-6">
            
            {/* TOP: 5 KPI Boxes */}
            <KPIGrid />

            {/* MIDDLE: 3 Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* COLUMN 1: Left (Span 4) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                {/* 1. Harga Pangan Strategis */}
                <div className="dashboard-card flex-1">
                  <HargaPanel />
                </div>
                
                {/* 9 & 10. PoU & GPM */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="dashboard-card">
                    <h3 className="font-bold text-sm text-slate-700 mb-2">9. PoU</h3>
                    <div className="h-24 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100 text-slate-400 text-xs">Donut Chart</div>
                  </div>
                  <div className="dashboard-card">
                    <h3 className="font-bold text-sm text-slate-700 mb-2">10. GPM</h3>
                    <div className="h-24 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100 text-slate-400 text-xs">Donut Chart</div>
                  </div>
                </div>

                {/* Trend Skor */}
                <div className="dashboard-card">
                  <TrendChart />
                </div>
              </div>

              {/* COLUMN 2: Middle (Span 4) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                {/* 2 & 3. CV & Produksi */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="dashboard-card">
                    <CVGauge />
                  </div>
                  <div className="dashboard-card">
                    <ProduksiChart />
                  </div>
                </div>

                {/* 11 & 12. Bantuan Pangan & Status Gizi */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="dashboard-card">
                    <h3 className="font-bold text-sm text-slate-700 mb-2">11. Bantuan Pangan</h3>
                    <div className="h-24 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100 text-slate-400 text-xs">Number/Icon</div>
                  </div>
                  <div className="dashboard-card">
                    <h3 className="font-bold text-sm text-slate-700 mb-2">12. Status Gizi Balita</h3>
                    <div className="h-24 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100 text-slate-400 text-xs">Donut Chart</div>
                  </div>
                </div>

                {/* Bottom Middle: Distribusi & Ringkasan */}
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="dashboard-card">
                    <h3 className="font-bold text-sm text-slate-700 mb-2">Distribusi Komoditas</h3>
                    <div className="h-32 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100 text-slate-400 text-xs">Pie Chart</div>
                  </div>
                  <div className="dashboard-card">
                    <h3 className="font-bold text-sm text-slate-700 mb-2">Ringkasan Ketahanan</h3>
                    <div className="h-32 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100 text-slate-400 text-xs">Gauge Chart</div>
                  </div>
                </div>
              </div>

              {/* COLUMN 3: Right Maps (Span 4) */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="dashboard-card flex-1 min-h-[300px] flex flex-col">
                  <h3 className="font-bold text-sm text-slate-700 mb-2">7. Peta SKPG</h3>
                  <div className="flex-1 relative rounded-lg overflow-hidden border border-slate-200">
                    <MapSKPG />
                  </div>
                </div>
                <div className="dashboard-card flex-1 min-h-[300px] flex flex-col">
                  <h3 className="font-bold text-sm text-slate-700 mb-2">8. Peta FSVA</h3>
                  <div className="flex-1 relative rounded-lg overflow-hidden border border-slate-200">
                    <MapFSVA />
                  </div>
                </div>
              </div>

            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
}
