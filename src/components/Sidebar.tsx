import { Home, DollarSign, Package, Utensils, MapPin, Gift, FileText, Settings, Download } from 'lucide-react';

export default function Sidebar() {
  const menuItems = [
    { icon: Home, label: 'Beranda', active: true },
    { icon: DollarSign, label: 'Harga Pangan' },
    { icon: Package, label: 'Ketersediaan' },
    { icon: Utensils, label: 'Konsumsi & Gizi' },
    { icon: MapPin, label: 'Peta Kerawanan' },
    { icon: Gift, label: 'Program & Bantuan' },
    { icon: FileText, label: 'Laporan' },
    { icon: Settings, label: 'Pengaturan' },
  ];

  return (
    <div className="h-full flex flex-col justify-between py-6">
      <div>
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shrink-0">
             <span className="text-white text-xs font-black">🌱</span>
          </div>
          <div>
            <h1 className="text-white font-black leading-tight">KETAHANAN<br/>PANGAN</h1>
            <p className="text-blue-300 text-[10px] uppercase tracking-widest">KOTA MAJU</p>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <a 
                key={i} 
                href="#" 
                className={`sidebar-link ${item.active ? 'active' : ''}`}
              >
                <Icon className={`w-5 h-5 ${item.active ? 'text-white' : 'text-slate-400'}`} />
                <span className="text-sm font-medium">{item.label}</span>
                {!item.active && i > 0 && i < 7 && <span className="ml-auto opacity-0 group-hover:opacity-100 text-slate-500">›</span>}
              </a>
            );
          })}
        </nav>
      </div>

      <div className="px-6 mt-8 space-y-4">
        <div className="text-xs text-slate-400">
          <p>Data per tanggal</p>
          <p className="text-slate-300 font-bold">20 Mei 2025 09:00</p>
        </div>
        <button className="w-full py-2.5 px-4 rounded-lg border border-slate-600 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
          <Download className="w-4 h-4" /> Unduh Laporan
        </button>
      </div>
    </div>
  );
}
