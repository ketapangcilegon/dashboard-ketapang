import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

export default function HargaPanel() {
  const commodities = [
    { name: 'Beras Medium', price: '14.500', change: '-1,4%', isUp: false, status: 'Stabil', emoji: '🍚' },
    { name: 'Telur Ayam Ras', price: '27.000', change: '+2,1%', isUp: true, status: 'Naik', emoji: '🥚' },
    { name: 'Daging Ayam Ras', price: '37.500', change: '-0,8%', isUp: false, status: 'Stabil', emoji: '🍗' },
    { name: 'Minyak Goreng', price: '20.000', change: '+1,6%', isUp: true, status: 'Naik', emoji: '🧴' },
    { name: 'Gula Pasir', price: '17.000', change: '-0,6%', isUp: false, status: 'Stabil', emoji: '🧂' },
    { name: 'Cabe Merah Keriting', price: '48.000', change: '+6,3%', isUp: true, status: 'Naik', emoji: '🌶️' },
  ];

  return (
    <div className="flex flex-col h-full">
      <h3 className="font-bold text-slate-800 text-sm mb-4">1. Harga Pangan Strategis <span className="font-normal text-slate-500">(Rp/kg)</span></h3>
      
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-slate-400 border-b border-slate-100 text-[11px] uppercase tracking-wider">
              <th className="pb-3 font-semibold font-medium">Komoditas</th>
              <th className="pb-3 font-semibold font-medium text-right">Harga Rata-rata</th>
              <th className="pb-3 font-semibold font-medium text-right">Perubahan (mtm)</th>
              <th className="pb-3 font-semibold font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {commodities.map((c, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="py-2.5 flex items-center gap-2 text-slate-700 font-medium">
                  <span className="text-base">{c.emoji}</span> {c.name}
                </td>
                <td className="py-2.5 text-right font-bold text-slate-700">{c.price}</td>
                <td className="py-2.5 text-right">
                  <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${c.isUp ? 'text-red-500' : 'text-emerald-500'}`}>
                    {c.isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {c.change.replace('+', '').replace('-', '')}
                  </span>
                </td>
                <td className="py-2.5 text-right">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${c.isUp ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-3 text-right">
        <a href="#" className="text-blue-600 text-xs font-semibold hover:underline">Lihat selengkapnya →</a>
      </div>
    </div>
  );
}
