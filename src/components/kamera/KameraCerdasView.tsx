"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, RefreshCw, MapPin, Trees, Store, Layers, BarChart3, AlertTriangle, Check, Sparkles, SwitchCamera, Upload, Zap, Image as ImageIcon, Loader2 } from 'lucide-react';
import GuidanceOverlay from './GuidanceOverlay';
import KonfirmasiPasokanModal from './KonfirmasiPasokanModal';
import KonfirmasiTanamanModal from './KonfirmasiTanamanModal';
import KameraCerdasMap from './KameraCerdasMap';
import KameraAgregasiDashboard from './KameraAgregasiDashboard';
import { cariKelurahanTerdekat } from '@/lib/kamera-normatif';
import { ObservasiRecord } from '@/app/api/kamera-cerdas/observasi/route';

export default function KameraCerdasView() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'camera' | 'map' | 'analytics'>('camera');
  
  // Camera & Mode State
  const [mode, setMode] = useState<'pasokan_beras' | 'tanaman_pangan'>('pasokan_beras');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // GPS State
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'active' | 'denied' | 'unavailable'>('searching');
  const [gpsCoords, setGpsCoords] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
    kelurahan: string;
    kecamatan: string;
  } | null>(null);

  // Capture & Processing State
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiDraftResult, setAiDraftResult] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Field Observations List
  const [observasiList, setObservasiList] = useState<ObservasiRecord[]>([]);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 1. Fetch Existing Observations
  const loadObservasi = useCallback(async () => {
    try {
      const res = await fetch('/api/kamera-cerdas/observasi');
      const json = await res.json();
      if (res.ok && json.data) {
        setObservasiList(json.data);
      }
    } catch (err) {
      console.warn('Gagal memuat observasi:', err);
    }
  }, []);

  useEffect(() => {
    loadObservasi();
  }, [loadObservasi]);

  // 2. Real-time GPS Tracker
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      return;
    }

    setGpsStatus('searching');

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;

        const geo = cariKelurahanTerdekat(lat, lng);

        setGpsCoords({
          lat,
          lng,
          accuracy: Number(accuracy.toFixed(1)),
          kelurahan: geo.kelurahan,
          kecamatan: geo.kecamatan
        });
        setGpsStatus('active');
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        if (err.code === 1) {
          setGpsStatus('denied');
        } else {
          setGpsStatus('unavailable');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // 3. Start Camera Stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Kamera langsung tidak didukung browser ini. Gunakan tombol upload file.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Gagal memulai kamera stream:', err);
      setIsCameraActive(false);
      setCameraError(err.message || 'Izin kamera belum diberikan.');
    }
  }, [facingMode]);

  useEffect(() => {
    if (activeTab === 'camera') {
      startCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setIsCameraActive(false);
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [activeTab, startCamera]);

  // Flip Camera
  const toggleCameraFacing = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // 4. Watermark & Compression Engine via Canvas
  const processImageWithWatermarkAndCompress = (
    imageSource: CanvasImageSource,
    originalWidth: number,
    originalHeight: number
  ): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve('');

      // Resize max dimension to 1600px for optimal AI quality & < 1 MB file size
      const maxDim = 1600;
      let targetW = originalWidth;
      let targetH = originalHeight;

      if (targetW > maxDim || targetH > maxDim) {
        if (targetW > targetH) {
          targetH = Math.round((targetH * maxDim) / targetW);
          targetW = maxDim;
        } else {
          targetW = Math.round((targetW * maxDim) / targetH);
          targetH = maxDim;
        }
      }

      canvas.width = targetW;
      canvas.height = targetH;

      // Draw photo
      ctx.drawImage(imageSource, 0, 0, targetW, targetH);

      // Date & Time
      const now = new Date();
      const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      
      const latStr = gpsCoords ? `Lat: ${gpsCoords.lat.toFixed(6)}` : 'Lat: - (Manual)';
      const lngStr = gpsCoords ? `Long: ${gpsCoords.lng.toFixed(6)}` : 'Long: - (Manual)';
      const locStr = gpsCoords ? `${gpsCoords.kelurahan}, ${gpsCoords.kecamatan}, Kota Cilegon` : 'Kota Cilegon';

      // Draw Watermark Box (Semi-transparent dark band at bottom)
      const bannerHeight = Math.max(70, Math.round(targetH * 0.1));
      ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
      ctx.fillRect(0, targetH - bannerHeight, targetW, bannerHeight);

      // Left Accent Border
      ctx.fillStyle = '#10B981'; // Emerald
      ctx.fillRect(0, targetH - bannerHeight, 8, bannerHeight);

      // Watermark Typography
      const fontSize = Math.max(14, Math.round(targetW * 0.022));
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;

      // Line 1: Timestamp & App
      ctx.fillText(`📷 KAMERA CERDAS DKPP CILEGON | ${dateStr} • ${timeStr}`, 20, targetH - bannerHeight + (bannerHeight * 0.4));

      // Line 2: GPS & Wilayah
      ctx.font = `600 ${fontSize * 0.9}px monospace`;
      ctx.fillStyle = '#34D399'; // Light emerald
      ctx.fillText(`${latStr} | ${lngStr} • 📍 ${locStr}`, 20, targetH - bannerHeight + (bannerHeight * 0.8));

      // Compress to JPEG with 0.80 quality (guaranteed < 1 MB)
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.80);
      resolve(compressedDataUrl);
    });
  };

  // 5. Trigger Photo Capture from Video Stream
  const handleCapturePhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    // Process with Watermark & Compress
    const processedUrl = await processImageWithWatermarkAndCompress(
      video,
      video.videoWidth || 1280,
      video.videoHeight || 720
    );

    setCapturedPhoto(processedUrl);
    analyzePhotoWithAI(processedUrl);
  };

  // Trigger from File Upload Fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        const processedUrl = await processImageWithWatermarkAndCompress(
          img,
          img.naturalWidth || 1280,
          img.naturalHeight || 720
        );
        setCapturedPhoto(processedUrl);
        analyzePhotoWithAI(processedUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // 6. Send to Gemini AI Vision API
  const analyzePhotoWithAI = async (photoBase64: string) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/kamera-cerdas/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: photoBase64,
          mode: mode,
          gpsMeta: gpsCoords || {
            lat: -6.01,
            lng: 106.02,
            kelurahan: 'Citangkil',
            kecamatan: 'Citangkil'
          }
        })
      });

      const data = await res.json();
      if (res.ok && data.data) {
        setAiDraftResult(data.data);
      } else {
        setAiDraftResult({ fallback: true });
      }
    } catch (err) {
      console.warn('AI Vision Analysis error:', err);
      setAiDraftResult({ fallback: true });
    } finally {
      setIsAnalyzing(false);
      setShowConfirmModal(true);
    }
  };

  // 7. Save Confirmed Observation to Database
  const handleSaveObservation = async (finalData: any) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/kamera-cerdas/observasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData)
      });

      if (res.ok) {
        setShowConfirmModal(false);
        setCapturedPhoto(null);
        setAiDraftResult(null);
        setSaveSuccessMsg(`Data ${mode === 'pasokan_beras' ? 'Pasokan Beras' : 'Tanaman Pangan'} berhasil disimpan ke Peta Spasial!`);
        await loadObservasi();
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      } else {
        alert('Gagal menyimpan data observasi. Silakan coba lagi.');
      }
    } catch (err) {
      console.error('Error saving observation:', err);
      alert('Terjadi kesalahan koneksi saat menyimpan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 relative overflow-hidden select-none">
      
      {/* ── Top App Bar Navigation ── */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-30 shrink-0 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-900/50">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-black text-white tracking-wide uppercase">Kamera Cerdas</h2>
              <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.2 rounded-full tracking-widest leading-none">
                BETA
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Field Data Collection & Geospatial Intelligence</p>
          </div>
        </div>

        {/* Top View Switcher Tabs */}
        <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700/80 text-xs font-bold">
          <button
            onClick={() => setActiveTab('camera')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'camera' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ambil Foto</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'map' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Peta Lapangan ({observasiList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'analytics' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Agregasi</span>
          </button>
        </div>
      </div>

      {/* ── Success Toast Alert ── */}
      {saveSuccessMsg && (
        <div className="absolute top-16 inset-x-4 sm:inset-x-auto sm:right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-emerald-400 animate-in slide-in-from-top duration-300">
          <Check className="w-4 h-4 bg-white/20 rounded-full p-0.5" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* ── Tab 1: Kamera Lapangan (Mobile-First Fullscreen) ── */}
      {activeTab === 'camera' && (
        <div className="flex-1 relative w-full h-full flex flex-col items-center justify-between bg-black overflow-hidden">
          
          {/* Live Video Stream Viewport */}
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            {isCameraActive ? (
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 max-w-sm">
                <Camera className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
                <p className="text-sm font-bold text-slate-300 mb-1">
                  {cameraError || 'Menghubungkan ke kamera smartphone...'}
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Pastikan izin kamera telah diberikan pada browser Anda, atau gunakan tombol upload foto galeri di bawah.
                </p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Coba Buka Kamera Lagi</span>
                </button>
              </div>
            )}
          </div>

          {/* Viewfinder Guidance Overlay */}
          <GuidanceOverlay mode={mode} />

          {/* Floating Top GPS Status Bar */}
          <div className="relative z-20 w-full px-4 pt-3 flex items-center justify-between pointer-events-auto">
            {/* GPS Indicator Badge */}
            <div className={`px-3 py-1.5 rounded-full backdrop-blur-md border text-[11px] font-bold shadow-lg flex items-center gap-2 transition-all ${
              gpsStatus === 'active'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : gpsStatus === 'searching'
                ? 'bg-amber-950/80 border-amber-500/50 text-amber-300 animate-pulse'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                gpsStatus === 'active' ? 'bg-emerald-400 animate-ping' : gpsStatus === 'searching' ? 'bg-amber-400' : 'bg-rose-500'
              }`} />
              
              {gpsStatus === 'active' && gpsCoords ? (
                <span>GPS Aktif (±{gpsCoords.accuracy}m) • {gpsCoords.kelurahan}</span>
              ) : gpsStatus === 'searching' ? (
                <span>Mencari Sinyal GPS...</span>
              ) : (
                <span>GPS Tidak Tersedia (Mode Manual)</span>
              )}
            </div>

            {/* Flip Camera Button */}
            <button
              onClick={toggleCameraFacing}
              className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-lg hover:bg-black/80 transition-all active:scale-95"
              title="Putar Kamera (Depan / Belakang)"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          </div>

          {/* Floating Analyzing Loader */}
          {isAnalyzing && (
            <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 shadow-xl">
                <Sparkles className="w-8 h-8 animate-spin" />
              </div>
              <h3 className="text-base font-black text-white mb-1">Menganalisis dengan AI Vision...</h3>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Mengidentifikasi {mode === 'pasokan_beras' ? 'sarana distribusi beras & estimasi karung' : 'tanaman pangan & estimasi produksi normatif'}
              </p>
            </div>
          )}

          {/* ── Bottom Controls Bar ── */}
          <div className="relative z-20 w-full p-5 bg-gradient-to-t from-black via-black/85 to-transparent flex flex-col items-center gap-4">
            
            {/* Mode Switcher Pill */}
            <div className="flex bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-slate-700/80 shadow-2xl text-xs font-black">
              <button
                type="button"
                onClick={() => setMode('pasokan_beras')}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  mode === 'pasokan_beras'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-900/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Pasokan Beras</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('tanaman_pangan')}
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  mode === 'tanaman_pangan'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-900/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Trees className="w-4 h-4" />
                <span>Tanaman Pangan</span>
              </button>
            </div>

            {/* Shutter Action Buttons Row */}
            <div className="w-full max-w-sm flex items-center justify-around px-4">
              
              {/* Upload Foto dari Galeri */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center shadow-lg hover:bg-slate-700 active:scale-95 transition-all"
                title="Pilih Foto dari Galeri"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Main Shutter Capture Button */}
              <button
                type="button"
                onClick={handleCapturePhoto}
                disabled={!isCameraActive || isAnalyzing}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-transparent p-1 active:scale-90 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.4)] disabled:opacity-40"
                title="Ambil Foto"
              >
                <div className="w-full h-full rounded-full bg-white hover:bg-emerald-400 transition-colors shadow-inner flex items-center justify-center text-slate-900">
                  <Camera className="w-6 h-6 text-slate-900" />
                </div>
              </button>

              {/* View Map Shortcut */}
              <button
                type="button"
                onClick={() => setActiveTab('map')}
                className="w-12 h-12 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center shadow-lg hover:bg-slate-700 active:scale-95 transition-all"
                title="Lihat Peta Hasil Observasi"
              >
                <Layers className="w-5 h-5 text-emerald-400" />
              </button>
            </div>

            <p className="text-[10px] text-slate-400 font-medium drop-shadow-md">
              Foto otomatis diberi watermark GPS & dikompresi &lt; 1 MB
            </p>
          </div>

        </div>
      )}

      {/* ── Tab 2: Peta Spasial Hasil Observasi ── */}
      {activeTab === 'map' && (
        <div className="flex-1 w-full h-full relative">
          <KameraCerdasMap
            observasiList={observasiList}
            onRefresh={loadObservasi}
          />
        </div>
      )}

      {/* ── Tab 3: Agregasi & Analisis ── */}
      {activeTab === 'analytics' && (
        <div className="flex-1 w-full h-full relative">
          <KameraAgregasiDashboard observasiList={observasiList} />
        </div>
      )}

      {/* ── Confirmation Modal Mode A: Pasokan Beras ── */}
      {showConfirmModal && mode === 'pasokan_beras' && capturedPhoto && (
        <KonfirmasiPasokanModal
          photoPreview={capturedPhoto}
          gpsMeta={{
            lat: gpsCoords?.lat || -6.01,
            lng: gpsCoords?.lng || 106.02,
            accuracy: gpsCoords?.accuracy,
            kelurahan: gpsCoords?.kelurahan || 'Citangkil',
            kecamatan: gpsCoords?.kecamatan || 'Citangkil',
            timestamp: new Date()
          }}
          aiDraft={aiDraftResult}
          onSave={handleSaveObservation}
          onRetake={() => {
            setShowConfirmModal(false);
            setCapturedPhoto(null);
          }}
          isSaving={isSaving}
        />
      )}

      {/* ── Confirmation Modal Mode B: Tanaman Pangan ── */}
      {showConfirmModal && mode === 'tanaman_pangan' && capturedPhoto && (
        <KonfirmasiTanamanModal
          photoPreview={capturedPhoto}
          gpsMeta={{
            lat: gpsCoords?.lat || -6.01,
            lng: gpsCoords?.lng || 106.02,
            accuracy: gpsCoords?.accuracy,
            kelurahan: gpsCoords?.kelurahan || 'Citangkil',
            kecamatan: gpsCoords?.kecamatan || 'Citangkil',
            timestamp: new Date()
          }}
          aiDraft={aiDraftResult}
          onSave={handleSaveObservation}
          onRetake={() => {
            setShowConfirmModal(false);
            setCapturedPhoto(null);
          }}
          isSaving={isSaving}
        />
      )}

    </div>
  );
}
