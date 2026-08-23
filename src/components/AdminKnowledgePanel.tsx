"use client";

import { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  UploadCloud, 
  FileText, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  RefreshCw, 
  FileSpreadsheet, 
  FileCode,
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface KnowledgeDoc {
  id: string;
  judul: string;
  deskripsi: string;
  jenis: string;
  file_name: string | null;
  total_chunks: number;
  created_at: string;
}

interface TestSearchResult {
  id: string;
  doc_title: string;
  chunk_index: number;
  content: string;
  rank?: number;
}

export default function AdminKnowledgePanel() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | ''; msg: string }>({ type: '', msg: '' });

  // Form input state
  const [inputType, setInputType] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Test Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<TestSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/knowledge');
      const data = await res.json();
      if (res.ok) {
        setDocs(data.docs || []);
      }
    } catch (err) {
      console.error('Error fetching knowledge docs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!judul) {
        // Auto fill judul dari nama file tanpa ekstensi
        setJudul(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputType === 'file' && !selectedFile) {
      setStatusMessage({ type: 'error', msg: 'Pilih file dokumen terlebih dahulu.' });
      return;
    }
    if (inputType === 'text' && !rawText.trim()) {
      setStatusMessage({ type: 'error', msg: 'Teks dokumen tidak boleh kosong.' });
      return;
    }
    if (!judul.trim()) {
      setStatusMessage({ type: 'error', msg: 'Judul dokumen wajib diisi.' });
      return;
    }

    setIsUploading(true);
    setStatusMessage({ type: '', msg: '' });

    try {
      const formData = new FormData();
      formData.append('judul', judul.trim());
      formData.append('deskripsi', deskripsi.trim());

      if (inputType === 'file' && selectedFile) {
        formData.append('file', selectedFile);
      } else {
        formData.append('rawText', rawText.trim());
      }

      const res = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          msg: data.message || `Berhasil mengindeks dokumen menjadi ${data.totalChunks} potongan pengetahuan AI!`
        });
        // Reset form
        setSelectedFile(null);
        setRawText('');
        setJudul('');
        setDeskripsi('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchDocs();
      } else {
        setStatusMessage({
          type: 'error',
          msg: data.error || 'Gagal memproses dan mengunggah dokumen.'
        });
      }
    } catch (err) {
      console.error('Upload error:', err);
      setStatusMessage({ type: 'error', msg: 'Terjadi kesalahan jaringan saat mengunggah.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, docTitle: string) => {
    if (!confirm(`Hapus dokumen "${docTitle}" beserta seluruh indeks pengetahuannya?`)) return;

    try {
      const res = await fetch(`/api/knowledge?id=${docId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: 'success', msg: `Dokumen "${docTitle}" berhasil dihapus.` });
        fetchDocs();
      } else {
        setStatusMessage({ type: 'error', msg: data.error || 'Gagal menghapus dokumen.' });
      }
    } catch {
      setStatusMessage({ type: 'error', msg: 'Terjadi kesalahan saat menghapus.' });
    }
  };

  const handleTestSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim(), limit: 4 })
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 p-6 rounded-2xl text-white shadow-md relative overflow-hidden border border-emerald-800/40">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black tracking-wider uppercase mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            RAG AI Knowledge Base
          </div>
          <h2 className="text-xl font-black tracking-wide">Pusat Pengetahuan & Dokumen AI</h2>
          <p className="text-xs text-emerald-100/80 mt-1 leading-relaxed">
            Upload dokumen resmi (PDF peraturan/UU, laporan ketahanan pangan tahunan 50–100 halaman, tabel Excel/CSV) atau catatan teknis. Dokumen akan dipotong (*chunking*) dan diindeks secara otomatis ke Supabase agar AI Intelligence dapat mengutip isinya secara presisi saat menjawab pertanyaan.
          </p>
        </div>
      </div>

      {/* Alert Status */}
      {statusMessage.msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in duration-200 border ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-xs font-bold leading-relaxed">{statusMessage.msg}</span>
        </div>
      )}

      {/* Grid: Upload Form (Left) & Test Search / Quick Tips (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* FORM UPLOAD */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-slate-800 text-sm tracking-wide">Tambah Dokumen Baru</h3>
            </div>
            
            {/* Mode switch: File vs Text */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setInputType('file')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  inputType === 'file' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setInputType('text')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  inputType === 'text' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Input Teks
              </button>
            </div>
          </div>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            
            {/* File Dropzone or Textarea */}
            {inputType === 'file' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  File Dokumen (PDF, Excel .xlsx/.xls, CSV, TXT)
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all text-center group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv,.txt,.md"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="flex items-center gap-3">
                      {selectedFile.name.endsWith('.pdf') ? (
                        <FileText className="w-8 h-8 text-rose-500" />
                      ) : selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.csv') ? (
                        <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
                      ) : (
                        <FileCode className="w-8 h-8 text-blue-500" />
                      )}
                      <div className="text-left">
                        <p className="text-xs font-extrabold text-slate-800 max-w-[280px] truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Klik untuk ganti
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-emerald-600 transition-colors mb-2" />
                      <p className="text-xs font-bold text-slate-700">
                        Klik untuk memilih file dokumen
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        PDF Peraturan (50-100 halaman), Laporan Tahunan, Excel Data Produksi
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Isi Teks / Peraturan / Catatan Kebijakan
                </label>
                <textarea
                  rows={5}
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder="Paste isi peraturan, keputusan walikota, atau catatan teknis ketahanan pangan di sini..."
                  className="w-full text-xs font-medium p-3 border border-slate-300 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                />
              </div>
            )}

            {/* Judul Dokumen */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Judul Dokumen / Peraturan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={judul}
                onChange={e => setJudul(e.target.value)}
                placeholder="Contoh: Perda No. 3 Tahun 2020 tentang Penyelenggaraan Ketahanan Pangan"
                className="w-full text-xs font-semibold p-2.5 border border-slate-300 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                required
              />
            </div>

            {/* Deskripsi / Keterangan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Deskripsi Singkat / Kategori (Opsional)
              </label>
              <input
                type="text"
                value={deskripsi}
                onChange={e => setDeskripsi(e.target.value)}
                placeholder="Contoh: Regulasi cadangan beras pemerintah daerah & distribusi pangan"
                className="w-full text-xs font-medium p-2.5 border border-slate-300 rounded-xl outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isUploading}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sedang mengekstrak & memproses chunking (~5-15 detik)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Indeks Dokumen ke AI Knowledge Base</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* TEST SEARCH / SIMULATION (Right) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-emerald-600" />
              <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">
                Uji Coba Pencarian Knowledge Base
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
              Cek apakah potongan teks dokumen Anda dapat ditemukan oleh sistem pencarian AI sebelum ditanyakan di menu chat.
            </p>

            <form onSubmit={handleTestSearch} className="flex gap-2 mb-3">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari kata kunci (misal: cadangan beras, pasal 5)..."
                className="flex-1 text-xs p-2 border border-slate-300 rounded-xl outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl disabled:opacity-50 cursor-pointer"
              >
                {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cari'}
              </button>
            </form>

            {/* Results */}
            {hasSearched && (
              <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                {searchResults.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic text-center py-2">
                    Tidak ada potongan teks yang cocok dengan kata kunci tersebut.
                  </p>
                ) : (
                  searchResults.map((res, i) => (
                    <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-left">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-emerald-700 truncate max-w-[180px]">
                          📚 {res.doc_title}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-400">
                          Chunk #{res.chunk_index}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-3 leading-snug font-medium">
                        {res.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Quick Info Box */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-2xl">
            <div className="flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-900 leading-relaxed space-y-1">
                <p className="font-bold">Bagaimana AI menggunakan dokumen ini?</p>
                <p className="text-slate-600">
                  Saat user bertanya di <strong>AI Intelligence</strong>, sistem secara otomatis mencari 4 potongan teks paling relevan dari database dan menyisipkannya ke konteks prompt Gemini, sehingga AI dapat menjawab dengan mengutip pasal, angka, atau isi dokumen resmi secara akurat.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* LIST DOKUMEN YANG SUDAH DI-INDEX */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-black text-slate-800 text-sm tracking-wide">Daftar Dokumen Knowledge Base</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Total {docs.length} Dokumen Terindeks
              </p>
            </div>
          </div>

          <button
            onClick={fetchDocs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <span className="text-xs font-bold">Memuat daftar dokumen...</span>
          </div>
        ) : docs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-xs font-bold text-slate-600">Belum ada dokumen yang diupload.</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Silakan upload file PDF peraturan, laporan tahunan ketahanan pangan, atau tabel Excel melalui formulir di atas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                  <th className="py-3 px-3">Jenis</th>
                  <th className="py-3 px-3">Judul Dokumen</th>
                  <th className="py-3 px-3">Deskripsi</th>
                  <th className="py-3 px-3 text-center">Jumlah Chunk</th>
                  <th className="py-3 px-3">Tanggal Upload</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                        doc.jenis === 'pdf' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                        doc.jenis === 'excel' || doc.jenis === 'csv' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}>
                        {doc.jenis}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-extrabold text-slate-800 leading-snug">{doc.judul}</p>
                      {doc.file_name && (
                        <p className="text-[10px] text-slate-400 font-semibold">{doc.file_name}</p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-medium max-w-xs truncate">
                      {doc.deskripsi || '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-black text-emerald-700">
                      {doc.total_chunks} <span className="text-[10px] font-semibold text-slate-400">potongan</span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-semibold text-[11px]">
                      {new Date(doc.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDelete(doc.id, doc.judul)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus dokumen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
