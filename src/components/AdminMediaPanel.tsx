/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from 'react';
import { PlusCircle, Edit3, Trash2, CheckCircle2, AlertCircle, Loader2, UploadCloud, Eye, ArrowUp, ArrowDown, Video, Image as ImageIcon, Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DashboardMedia } from './MediaCarousel';

export default function AdminMediaPanel() {
  const [items, setItems] = useState<DashboardMedia[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'warning' | ''; msg: string }>({ type: '', msg: '' });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<DashboardMedia | null>(null);

  // Form State
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState<boolean>(true);
  
  // File Upload State
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [existingMediaUrl, setExistingMediaUrl] = useState('');
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Load items from Supabase
  const fetchMediaItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dashboard_media')
        .select('*')
        .order('sort_order', { ascending: true });

      if (!error && data) {
        setItems(data);
      }
    } catch (err) {
      console.error('Error loading admin media items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMediaItems();
  }, []);

  const resetForm = () => {
    setEditingItem(null);
    setMediaType('image');
    setTitle('');
    setDescription('');
    setLocation('');
    setEventDate(new Date().toISOString().split('T')[0]);
    setDuration('');
    setSortOrder(items.length + 1);
    setIsActive(true);
    setMediaFile(null);
    setThumbnailFile(null);
    setExistingMediaUrl('');
    setExistingThumbnailUrl('');
    setUploadProgress(0);
    setStatusMessage({ type: '', msg: '' });
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: DashboardMedia) => {
    resetForm();
    setEditingItem(item);
    setMediaType(item.media_type);
    setTitle(item.title);
    setDescription(item.description || '');
    setLocation(item.location || '');
    setEventDate(item.event_date || new Date().toISOString().split('T')[0]);
    setDuration(item.duration || '');
    setSortOrder(item.sort_order || 1);
    setIsActive(item.is_active);
    setExistingMediaUrl(item.media_url);
    setExistingThumbnailUrl(item.thumbnail_url || '');
    setIsModalOpen(true);
  };

  // Helper to count currently active items
  const activeCount = items.filter(x => x.is_active && x.id !== editingItem?.id).length;

  const handleUploadFile = async (file: File, folder: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error } = await supabase.storage
      .from('dashboard-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      throw new Error(`Upload gagal (${folder}): ${error.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from('dashboard-media')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage({ type: '', msg: '' });

    // 1. Validation: Max 10 active items
    if (isActive && activeCount >= 10) {
      setStatusMessage({
        type: 'warning',
        msg: 'Maksimal 10 konten aktif. Nonaktifkan konten lain terlebih dahulu.'
      });
      return;
    }

    // 2. Validation: Required fields
    if (!title.trim()) {
      setStatusMessage({ type: 'error', msg: 'Judul konten wajib diisi.' });
      return;
    }

    if (!editingItem && !mediaFile && !existingMediaUrl) {
      setStatusMessage({ type: 'error', msg: 'File media (foto/video) wajib diunggah.' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    try {
      let finalMediaUrl = existingMediaUrl;
      let finalThumbnailUrl = existingThumbnailUrl;

      // Upload media file if selected
      if (mediaFile) {
        setUploadProgress(35);
        const folder = mediaType === 'video' ? 'videos' : 'images';
        finalMediaUrl = await handleUploadFile(mediaFile, folder);
      }

      setUploadProgress(70);

      // Upload thumbnail file if selected
      if (thumbnailFile) {
        finalThumbnailUrl = await handleUploadFile(thumbnailFile, 'thumbnails');
      }

      setUploadProgress(85);

      const payload = {
        media_type: mediaType,
        media_url: finalMediaUrl,
        thumbnail_url: finalThumbnailUrl || null,
        title: title.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        event_date: eventDate,
        duration: mediaType === 'video' ? (duration.trim() || null) : null,
        is_active: isActive,
        sort_order: Number(sortOrder) || 1,
        updated_at: new Date().toISOString()
      };

      if (editingItem) {
        // Update
        const { error } = await supabase
          .from('dashboard_media')
          .update(payload)
          .eq('id', editingItem.id);

        if (error) throw error;
        setStatusMessage({ type: 'success', msg: 'Konten media berhasil diperbarui!' });
      } else {
        // Insert
        const { error } = await supabase
          .from('dashboard_media')
          .insert([payload]);

        if (error) throw error;
        setStatusMessage({ type: 'success', msg: 'Konten media baru berhasil ditambahkan!' });
      }

      setUploadProgress(100);
      setTimeout(() => {
        setIsModalOpen(false);
        fetchMediaItems();
      }, 800);

    } catch (err: any) {
      console.error('[AdminMediaPanel Submit Error]', err);
      setStatusMessage({
        type: 'error',
        msg: `Gagal menyimpan konten: ${err.message || 'Terjadi kesalahan server'}`
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleActive = async (item: DashboardMedia) => {
    const newStatus = !item.is_active;

    if (newStatus && activeCount >= 10) {
      alert('Maksimal 10 konten aktif. Nonaktifkan konten lain terlebih dahulu.');
      return;
    }

    try {
      const { error } = await supabase
        .from('dashboard_media')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', item.id);

      if (!error) {
        fetchMediaItems();
      } else {
        alert(`Gagal mengubah status: ${error.message}`);
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleDelete = async (item: DashboardMedia) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus konten "${item.title}"?`)) return;

    try {
      const { error } = await supabase
        .from('dashboard_media')
        .delete()
        .eq('id', item.id);

      if (!error) {
        fetchMediaItems();
      } else {
        alert(`Gagal menghapus konten: ${error.message}`);
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Banner */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-black text-[#0B1E41] tracking-tight">
              Manajemen Informasi & Dokumentasi
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Kelola foto, video kegiatan, lokasi, tanggal, dan urutan tampilan hero carousel pada dashboard utama.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMediaItems}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4" /> Tambah Konten
          </button>
        </div>
      </div>

      {/* Main List Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600">
            Total Konten: <strong className="text-slate-800">{items.length}</strong> | Active Carousel: <strong className="text-emerald-600">{items.filter(x => x.is_active).length} / 10</strong>
          </span>
          {items.filter(x => x.is_active).length >= 10 && (
            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
              Batas Maksimal 10 Aktif Tercapai
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 font-medium text-xs flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <span>Memuat data media...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-medium text-xs flex flex-col items-center gap-3">
            <ImageIcon className="w-12 h-12 text-slate-300" />
            <p>Belum ada data media informasi & dokumentasi.</p>
            <button
              onClick={handleOpenAddModal}
              className="text-emerald-600 font-bold hover:underline"
            >
              + Tambah Konten Pertama
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/70 text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4">Media</th>
                  <th className="py-3.5 px-4">Judul & Lokasi</th>
                  <th className="py-3.5 px-4">Tanggal Kegiatan</th>
                  <th className="py-3.5 px-4 text-center">Urutan</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-center text-slate-400">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4">
                      <div className="relative w-16 h-10 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 shrink-0">
                        <img 
                          src={item.media_type === 'video' ? (item.thumbnail_url || item.media_url) : item.media_url} 
                          alt={item.title}
                          className="w-full h-full object-cover" 
                        />
                        <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[8px] font-bold px-1 rounded uppercase">
                          {item.media_type}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-extrabold text-slate-800 text-xs line-clamp-1">{item.title}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{item.location || 'Kota Cilegon'}</p>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-600">
                      {item.event_date || '-'}
                    </td>

                    <td className="py-3 px-4 text-center font-bold">
                      <span className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 inline-flex items-center justify-center text-slate-700">
                        {item.sort_order}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all ${
                          item.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {item.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#03593b] to-[#047857] text-white flex items-center justify-between">
              <h3 className="font-extrabold text-sm tracking-wide uppercase">
                {editingItem ? 'Edit Konten Informasi & Dokumentasi' : 'Tambah Konten Informasi & Dokumentasi'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {statusMessage.msg && (
                <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                  statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  statusMessage.type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                  'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{statusMessage.msg}</span>
                </div>
              )}

              {/* Media Type Selector */}
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Jenis Media
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMediaType('image')}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      mediaType === 'image'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-400 ring-2 ring-emerald-400/20'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" /> FOTO / GAMBAR
                  </button>

                  <button
                    type="button"
                    onClick={() => setMediaType('video')}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      mediaType === 'video'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-400 ring-2 ring-emerald-400/20'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Video className="w-4 h-4" /> VIDEO
                  </button>
                </div>
              </div>

              {/* Media File Upload */}
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Upload File Media ({mediaType === 'video' ? 'MP4 / WebM' : 'JPG / PNG / WEBP'})
                </label>
                <input
                  type="file"
                  accept={mediaType === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/webp'}
                  onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2 cursor-pointer focus:outline-none"
                />
                {existingMediaUrl && !mediaFile && (
                  <p className="text-[10px] text-slate-400 mt-1 truncate">
                    File saat ini: <a href={existingMediaUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline font-bold">Lihat URL Media</a>
                  </p>
                )}
              </div>

              {/* Video Thumbnail Upload (Optional for Video) */}
              {mediaType === 'video' && (
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Upload Poster / Thumbnail Video (Opsional)
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2 cursor-pointer focus:outline-none"
                  />
                  {existingThumbnailUrl && !thumbnailFile && (
                    <p className="text-[10px] text-slate-400 mt-1 truncate">
                      Thumbnail saat ini: <a href={existingThumbnailUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline font-bold">Lihat Thumbnail</a>
                    </p>
                  )}
                </div>
              )}

              {/* Title & Duration Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Judul Konten <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Monitoring Lahan Pertanian"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {mediaType === 'video' && (
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Durasi Video
                    </label>
                    <input
                      type="text"
                      placeholder="00:45"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Location & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Lokasi Kegiatan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Kel. Gerem"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Tanggal Kegiatan
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={2}
                  placeholder="Kondisi lahan pertanian padi di wilayah Kota Cilegon menunjukkan pertumbuhan optimal menjelang panen."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Sort Order & Active Status */}
              <div className="grid grid-cols-2 gap-3 items-center pt-2">
                <div>
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                    Urutan Carousel (Sort Order)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span className="text-xs font-extrabold text-slate-700">Aktifkan Konten</span>
                  </label>
                </div>
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="w-full space-y-1.5 pt-2">
                  <div className="flex justify-between text-[10px] font-bold text-emerald-700">
                    <span>Mengunggah file ke Supabase Storage...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Konten</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
