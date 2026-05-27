import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import UploadPanel from '@/components/UploadPanel';

export default function EntryPage() {
  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-slate-800 font-sans">
      <div className="hidden lg:block w-64 shrink-0 bg-[var(--color-sidebar)] text-white shadow-xl z-20">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-blue-50 to-transparent z-0 opacity-70 pointer-events-none"></div>
        <Navbar />
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 custom-scrollbar relative z-10">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="dashboard-card border-none shadow-sm bg-white/60 backdrop-blur-md mb-6">
              <h2 className="text-xl font-bold text-slate-800">Upload Data Ketahanan Pangan</h2>
              <p className="text-sm text-slate-500 mt-1">Unggah file template Excel Anda di sini. Data akan otomatis diproses dan memperbarui indikator di Dashboard utama.</p>
            </div>
            
            <UploadPanel />
          </div>
        </main>
      </div>
    </div>
  );
}
