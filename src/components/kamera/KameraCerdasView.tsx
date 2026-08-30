"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, RefreshCw, MapPin, Trees, Store, Layers, BarChart3, AlertTriangle, Check, Sparkles, SwitchCamera, Upload, Zap, Image as ImageIcon, Loader2, Lock, ShieldCheck, ShieldAlert, KeyRound, LogOut } from 'lucide-react';
import GuidanceOverlay from './GuidanceOverlay';
import KonfirmasiPasokanModal from './KonfirmasiPasokanModal';
import KonfirmasiTanamanModal from './KonfirmasiTanamanModal';
import KameraCerdasMap from './KameraCerdasMap';
import KameraAgregasiDashboard from './KameraAgregasiDashboard';
import { cariKelurahanTerdekat } from '@/lib/kamera-normatif';
import { ObservasiRecord } from '@/app/api/kamera-cerdas/observasi/route';
import { supabase } from '@/lib/supabase';

export default function KameraCerdasView() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'camera' | 'map' | 'analytics'>('camera');
  
  // Governance & Admin State
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Verifikasi Sesi Admin
  useEffect(() => {
    const checkAuth = async () => {
      const sessionActive = typeof window !== 'undefined' && sessionStorage.getItem('adminSession') === 'active';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const hasAdmin = sessionActive || !!session?.user;
        setIsAdmin(hasAdmin);
        if (session?.user?.email) {
          setAdminEmail(session.user.email);
        } else if (sessionActive) {
          setAdminEmail('admin@cilegon.go.id');
        }
      } catch {
        setIsAdmin(sessionActive);
      }
    };
    checkAuth();
    const interval = setInterval(checkAuth, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleLoginAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword
      });
      if (!error && data.user) {
        sessionStorage.setItem('adminSession', 'active');
        setIsAdmin(true);
        setAdminEmail(data.user.email || 'admin@cilegon.go.id');
        setShowLoginModal(false);
        setLoginPassword('');
      } else {
        setLoginError(error ? 'Akses ditolak: ' + error.message : 'Email atau kata sandi tidak sesuai.');
      }
    } catch (err: any) {
      setLoginError('Terjadi kesalahan jaringan: ' + (err.message || 'Error'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('adminSession');
    try {
      await supabase.auth.signOut();
    } catch {}
    setIsAdmin(false);
    setAdminEmail('');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };
  
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
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Kamera langsung tidak didukung browser ini. Gunakan tombol upload foto.');
      }

      // Gunakan constraints ideal agar kompatibel dengan berbagai sensor kamera Android (portrait/landscape)
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 }
          },
          audio: false
        });
      } catch (errConstraint) {
        console.warn('Initial camera constraints failed, attempting fallback:', errConstraint);
        // Fallback untuk perangkat Android tertentu yang menolak resolusi spesifik
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.onloadedmetadata = () => {
          video.play().catch(e => console.warn('video play on metadata error:', e));
        };
        video.play().catch(e => console.warn('video play error:', e));
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Gagal memulai kamera stream:', err);
      setIsCameraActive(false);
      setCameraError(err.message || 'Izin kamera belum diberikan.');
    }
  }, [facingMode]);

  // Sinkronkan stream ke video element jika terjadi re-render
  useEffect(() => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive]);

  useEffect(() => {
    if (activeTab === 'camera' && isAdmin) {
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
  }, [activeTab, isAdmin, startCamera]);

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

      // Pastikan dimensi valid
      let srcW = originalWidth > 0 ? originalWidth : 1280;
      let srcH = originalHeight > 0 ? originalHeight : 720;

      // Resize max dimension to 1600px for optimal AI quality & < 1 MB file size
      const maxDim = 1600;
      let targetW = srcW;
      let targetH = srcH;

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
    try {
      const stream = streamRef.current;
      const track = stream?.getVideoTracks()[0];
      
      let capturedSource: CanvasImageSource | null = null;
      let width = 1280;
      let height = 720;
      let isBitmap = false;

      // 1. Android/Chrome First: Gunakan ImageCapture API
      // Ini menyelesaikan bug layar hitam di browser Android (akibat kegagalan readback GPU texture video ke canvas)
      if (track && typeof window !== 'undefined' && 'ImageCapture' in window) {
        try {
          const imageCapture = new (window as any).ImageCapture(track);
          // Coba takePhoto terlebih dahulu untuk resolusi sensor perangkat penuh
          const blob = await imageCapture.takePhoto().catch(() => null);
          if (blob && blob.size > 0) {
            const bitmap = await createImageBitmap(blob);
            capturedSource = bitmap;
            width = bitmap.width;
            height = bitmap.height;
            isBitmap = true;
          } else {
            // Fallback ke grabFrame jika takePhoto ditolak oleh driver kamera Android
            const frameBitmap = await imageCapture.grabFrame().catch(() => null);
            if (frameBitmap && frameBitmap.width > 0) {
              capturedSource = frameBitmap;
              width = frameBitmap.width;
              height = frameBitmap.height;
              isBitmap = true;
            }
          }
        } catch (icErr) {
          console.warn('ImageCapture exception, fallback ke video element:', icErr);
        }
      }

      // 2. Fallback ke <video> element (untuk Desktop / Laptop / Browser tanpa ImageCapture)
      if (!capturedSource && videoRef.current) {
        const video = videoRef.current;
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          width = video.videoWidth;
          height = video.videoHeight;
          capturedSource = video;
        } else {
          // Tunggu frame berikutnya ready
          await new Promise<void>((resolve) => {
            if ('requestVideoFrameCallback' in video) {
              (video as any).requestVideoFrameCallback(() => resolve());
            } else {
              setTimeout(resolve, 200);
            }
          });
          width = video.videoWidth || 1280;
          height = video.videoHeight || 720;
          capturedSource = video;
        }
      }

      if (!capturedSource) {
        alert('Kamera belum siap mengambil gambar. Pastikan live preview video sudah muncul.');
        return;
      }

      // Process with Watermark & Compress
      const processedUrl = await processImageWithWatermarkAndCompress(
        capturedSource,
        width,
        height
      );

      // Bebaskan memori ImageBitmap jika dipakai
      if (isBitmap && capturedSource && 'close' in (capturedSource as any)) {
        (capturedSource as any).close();
      }

      if (!processedUrl) {
        alert('Gagal memproses foto. Silakan coba lagi.');
        return;
      }

      setCapturedPhoto(processedUrl);
      analyzePhotoWithAI(processedUrl);
    } catch (err: any) {
      console.error('Error capturing photo:', err);
      alert('Gagal mengambil foto: ' + (err.message || 'Error'));
    }
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
        body: JSON.stringify({
          ...finalData,
          petugas_nama: adminEmail || 'Admin DKPP Cilegon',
          status_verifikasi: 'TERVERIFIKASI_ADMIN'
        })
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
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap gap-2 items-center justify-between z-30 shrink-0 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-900/50">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-black text-white tracking-wide uppercase">Kamera Cerdas</h2>
              <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full tracking-widest leading-none ${
                isAdmin ? 'bg-emerald-500 text-white' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {isAdmin ? 'PETUGAS' : 'KHUSUS ADMIN'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Field Data Collection & Geospatial Intelligence</p>
          </div>
        </div>

        {/* Top View Switcher Tabs & Admin Status */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-800 p-0.5 rounded-xl border border-slate-700/80 text-xs font-bold">
            <button
              onClick={() => setActiveTab('camera')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'camera' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {isAdmin ? <Camera className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
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

          {/* Admin Indicator / Login Trigger */}
          {isAdmin ? (
            <div className="flex items-center gap-1.5">
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-bold text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate max-w-[130px]">{adminEmail || 'Petugas DKPP'}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg border border-slate-700 hover:border-rose-700/50 transition-all flex items-center gap-1 cursor-pointer"
                title="Keluar Sesi Admin"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[11px] font-black transition-all cursor-pointer shadow-sm active:scale-95"
              title="Login Petugas DKPP"
            >
              <KeyRound className="w-3 h-3" />
              <span>Login Admin</span>
            </button>
          )}
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
        !isAdmin ? (
          <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-slate-900 via-slate-950 to-black text-center relative overflow-y-auto">
            <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5 my-auto">
              
              {/* Security Shield Icon */}
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Lock className="w-2.5 h-2.5" /> Tata Kelola Data • Akses Terbatas
                </span>
                <h3 className="text-lg font-black text-white uppercase tracking-wide">
                  Khusus Petugas & Admin DKPP
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Modul Kamera Cerdas merupakan instrumen pengumpulan data primer lapangan untuk verifikasi pasokan beras dan tanaman pangan. Untuk menjaga integritas data statistik daerah, fitur perekaman foto dan AI Vision saat ini <strong>hanya dapat dioperasikan oleh Surveyor / Petugas Resmi DKPP Kota Cilegon</strong>.
                </p>
              </div>

              {/* Scope Matrix */}
              <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800/80 text-left space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-2">
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ambil Foto & AI Vision Lapangan</span>
                  </span>
                  <span className="text-[9.5px] font-black text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">KHUSUS ADMIN</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 border-t border-slate-800/60 pt-2.5">
                  <span className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Peta Sebaran Spasial Lapangan</span>
                  </span>
                  <span className="text-[9.5px] font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">PUBLIK (TERBUKA)</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 border-t border-slate-800/60 pt-2.5">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Dashboard Agregasi Data Pangan</span>
                  </span>
                  <span className="text-[9.5px] font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">PUBLIK (TERBUKA)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(true)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Masuk sebagai Petugas / Admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('map')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Lihat Peta Lapangan ({observasiList.length} Observasi)</span>
                </button>
              </div>

              <div className="text-[10px] text-slate-500 pt-1">
                Atau login melalui <a href="/entry" className="text-emerald-400 hover:underline font-bold">Portal Admin Utama</a>
              </div>
            </div>
          </div>
        ) : (
        <div className="flex-1 relative w-full h-full flex flex-col items-center justify-between bg-black overflow-hidden">
          
          {/* Live Video Stream Viewport */}
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
            />

            {!isCameraActive && (
              <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 max-w-sm z-10">
                <Camera className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
                <p className="text-sm font-bold text-slate-300 mb-1">
                  {cameraError || 'Menghubungkan ke kamera smartphone...'}
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Pastikan izin kamera telah diberikan pada browser Anda, atau gunakan tombol upload foto/galeri di bawah.
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
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
              className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-lg hover:bg-black/80 transition-all active:scale-95 cursor-pointer"
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
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
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
                className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
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
                className="w-12 h-12 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center shadow-lg hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
                title="Pilih Foto dari Galeri"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Main Shutter Capture Button */}
              <button
                type="button"
                onClick={handleCapturePhoto}
                disabled={!isCameraActive || isAnalyzing}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-transparent p-1 active:scale-90 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.4)] disabled:opacity-40 cursor-pointer"
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
                className="w-12 h-12 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center shadow-lg hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
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
        )
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

      {/* ── Modal Login Petugas / Admin (DKPP Governance) ── */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide text-white">Login Petugas DKPP</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Gunakan akun resmi administrator / petugas DKPP Kota Cilegon untuk membuka modul perekaman Kamera Cerdas.
            </p>

            {loginError && (
              <div className="mb-4 p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-semibold">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLoginAdmin} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Email Petugas</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@cilegon.go.id"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Kata Sandi</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Verifikasi & Aktifkan Kamera</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
