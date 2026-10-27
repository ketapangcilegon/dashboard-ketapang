"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Camera, RefreshCw, MapPin, Trees, Store, Layers, BarChart3, AlertTriangle, Check, Sparkles, SwitchCamera, Upload, Zap, Loader2, Lock, ShieldCheck, ShieldAlert, KeyRound, LogOut, Globe2, Mail, Lightbulb, X } from 'lucide-react';
import GuidanceOverlay from './GuidanceOverlay';
import KonfirmasiPasokanModal from './KonfirmasiPasokanModal';
import KonfirmasiTanamanModal from './KonfirmasiTanamanModal';
import KameraCerdasMap from './KameraCerdasMap';
import KameraAgregasiDashboard from './KameraAgregasiDashboard';
import { cariKelurahanTerdekat, resolveDynamicGeocode, haversineDistanceMeters } from '@/lib/kamera-normatif';
import { ObservasiRecord } from '@/app/api/kamera-cerdas/observasi/route';
import { supabase } from '@/lib/supabase';
import { useFeatureAccess } from '@/lib/useFeatureAccess';
import {
  enumeratorSupabase,
  toEnumeratorProfile,
  signInWithGoogle,
  signOutEnumerator,
  type EnumeratorProfile
} from '@/lib/enumeratorAuth';
import { SEED_OBSERVASI_DATA } from '@/lib/kameraSeedData';

// Peta 3D (MapLibre + deck.gl) hanya dimuat di browser & hanya saat tab dibuka
const ArusPasokanMap = dynamic(() => import('./ArusPasokanMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#04101f] text-cyan-200 text-xs font-bold gap-2">
      <Loader2 className="w-4 h-4 animate-spin" /> Menyiapkan peta 3D arus pasokan...
    </div>
  )
});

type KameraTab = 'camera' | 'map' | 'analytics' | 'arus';

export interface KameraCerdasViewProps {
  initialTab?: KameraTab;
  focusSection?: 'rantai_pasok' | 'agregasi' | null;
  onBack?: () => void;
}

export default function KameraCerdasView({
  initialTab = 'camera',
  focusSection = null,
  onBack
}: KameraCerdasViewProps = {}) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<KameraTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  // Governance & Admin State
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const { isKameraLocked } = useFeatureAccess();
  // Enumerator = pengguna publik yang masuk memakai Google (Gmail)
  const [enumerator, setEnumerator] = useState<EnumeratorProfile | null>(null);
  const [isEnumeratorLoading, setIsEnumeratorLoading] = useState<boolean>(true);
  const [isGoogleRedirecting, setIsGoogleRedirecting] = useState<boolean>(false);
  const [googleError, setGoogleError] = useState<string>('');
  const [showCrowdsourcingInfo, setShowCrowdsourcingInfo] = useState<boolean>(false);
  // Kamera hanya dapat dipakai Admin/Petugas, atau Enumerator yang sudah login Google (bila fitur tidak dikunci admin)
  const canOperateCamera = isAdmin || (!isKameraLocked && !!enumerator);
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showEnumeratorModal, setShowEnumeratorModal] = useState<boolean>(false);
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
          setAdminEmail('Administrator');
        }
      } catch {
        setIsAdmin(sessionActive);
      }
    };
    checkAuth();
    // Ganti polling 1.5s dengan onAuthStateChange — event-driven, zero polling overhead
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionActive = typeof window !== 'undefined' && sessionStorage.getItem('adminSession') === 'active';
      const hasAdmin = sessionActive || !!session?.user;
      setIsAdmin(hasAdmin);
      if (session?.user?.email) setAdminEmail(session.user.email);
      else if (sessionActive) setAdminEmail('Administrator');
      else setAdminEmail('');
    });
    return () => subscription.unsubscribe();
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
        setAdminEmail(data.user.email || 'Administrator');
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

  // Sesi Enumerator (Google). Klien terpisah dari sesi Admin agar tidak pernah dianggap Admin.
  useEffect(() => {
    let aktif = true;
    enumeratorSupabase.auth.getSession()
      .then(({ data }) => {
        if (aktif) setEnumerator(toEnumeratorProfile(data.session?.user));
      })
      .catch(() => { /* abaikan: dianggap belum login */ })
      .finally(() => { if (aktif) setIsEnumeratorLoading(false); });
    const { data: { subscription } } = enumeratorSupabase.auth.onAuthStateChange((_event, session) => {
      setEnumerator(toEnumeratorProfile(session?.user));
      setIsEnumeratorLoading(false);
    });
    return () => {
      aktif = false;
      subscription.unsubscribe();
    };
  }, []);

  const [manualName, setManualName] = useState<string>('');
  const [manualEmail, setManualEmail] = useState<string>('');

  const handleGoogleLogin = async () => {
    setGoogleError('');
    setIsGoogleRedirecting(true);
    const { error } = await signInWithGoogle();
    if (error) {
      const errLower = error.toLowerCase();
      if (errLower.includes('provider is not enabled') || errLower.includes('validation_failed')) {
        setGoogleError('Login Google belum diaktifkan di Supabase Dashboard (Auth > Providers > Google). Silakan gunakan formulir manual di bawah ini untuk mengisi Nama & Gmail Anda.');
      } else {
        setGoogleError(error);
      }
      setIsGoogleRedirecting(false);
    }
  };

  const handleSaveManualEnumerator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmail.trim() || !manualName.trim()) return;
    const profile: EnumeratorProfile = {
      id: 'enum-' + Date.now(),
      email: manualEmail.trim().toLowerCase(),
      nama: manualName.trim(),
      avatarUrl: undefined
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('ketapang-enumerator-auth', JSON.stringify({ profile, user: null }));
    }
    setEnumerator(profile);
    setShowEnumeratorModal(false);
  };

  const handleEnumeratorLogout = async () => {
    await signOutEnumerator();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ketapang-enumerator-auth');
    }
    setEnumerator(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  /** Token autentikasi pengirim: sesi Admin (jika admin) atau sesi Google (enumerator). */
  const getAuthToken = async (): Promise<string | null> => {
    if (isAdmin) {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) return data.session.access_token;
    }
    const { data } = await enumeratorSupabase.auth.getSession();
    return data.session?.access_token || null;
  };
  
  // Camera & Mode State
  const [mode, setMode] = useState<'pasokan_beras' | 'tanaman_pangan'>('pasokan_beras');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showGuidanceBubble, setShowGuidanceBubble] = useState<boolean>(true);

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
  const [newlyCreatedPinId, setNewlyCreatedPinId] = useState<string | null>(null);
  const [newlyCreatedCoords, setNewlyCreatedCoords] = useState<[number, number] | null>(null);

  // Field Observations List - Diinisialisasi langsung dengan SEED_OBSERVASI_DATA agar 7 toko beras tidak pernah kosong
  const [observasiList, setObservasiList] = useState<ObservasiRecord[]>(SEED_OBSERVASI_DATA);
  const [observasiLoaded, setObservasiLoaded] = useState<boolean>(true);
  const [observasiError, setObservasiError] = useState<string | null>(null);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 1. Fetch Existing Observations
  const loadObservasi = useCallback(async () => {
    try {
      const res = await fetch('/api/kamera-cerdas/observasi');
      const json = await res.json();
      if (res.ok && Array.isArray(json.data) && json.data.length > 0) {
        setObservasiList(json.data);
        setObservasiError(null);
      } else if (!res.ok) {
        setObservasiError(json?.error || 'Data observasi tidak dapat dimuat.');
      }
    } catch (err) {
      console.warn('Gagal memuat observasi dari server, menggunakan data tersimpan:', err);
    } finally {
      setObservasiLoaded(true);
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

        // Inisialisasi awal instan dengan kalkulasi lokal
        const initialGeo = cariKelurahanTerdekat(lat, lng);

        setGpsCoords({
          lat,
          lng,
          accuracy: Number(accuracy.toFixed(1)),
          kelurahan: initialGeo.kelurahan,
          kecamatan: initialGeo.kecamatan
        });
        setGpsStatus('active');

        // Resolve wilayah riil dinamis via Reverse Geocoding (OSM Nominatim)
        resolveDynamicGeocode(lat, lng).then((dynGeo) => {
          if (dynGeo && dynGeo.kelurahan) {
            setGpsCoords(prev => prev ? {
              ...prev,
              kelurahan: dynGeo.kelurahan,
              kecamatan: dynGeo.kecamatan
            } : null);
          }
        }).catch(() => {});
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

  // 3. Start Camera Stream (Hardware-safe switching & device enumeration)
  const startCamera = useCallback(async () => {
    setCameraError(null);

    // Hentikan track stream aktif secara menyeluruh
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Jeda hardware 160ms agar driver sensor fisik kamera Android/iOS tuntas merilis kunci hardware
    await new Promise(r => setTimeout(r, 160));

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Kamera langsung tidak didukung browser ini.');
      }

      let stream: MediaStream | null = null;
      let targetDeviceId: string | undefined;

      // Cari deviceId spesifik bila tersedia untuk kehandalan membalik kamera
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        if (facingMode === 'environment') {
          const rear = videoDevices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') || 
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('belakang')
          );
          if (rear) targetDeviceId = rear.deviceId;
        } else {
          const front = videoDevices.find(d => 
            d.label.toLowerCase().includes('front') || 
            d.label.toLowerCase().includes('user') ||
            d.label.toLowerCase().includes('depan')
          );
          if (front) targetDeviceId = front.deviceId;
        }
      } catch {}

      // Tier 1: Menggunakan deviceId atau facingMode
      try {
        const constraints: MediaTrackConstraints = targetDeviceId
          ? { deviceId: { exact: targetDeviceId } }
          : { facingMode: { ideal: facingMode } };

        stream = await navigator.mediaDevices.getUserMedia({
          video: constraints,
          audio: false
        });
      } catch (errConstraint) {
        console.warn('Initial camera constraints failed, attempting fallback tier 2:', errConstraint);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode },
            audio: false
          });
        } catch (errTier2) {
          console.warn('Fallback tier 2 failed, attempting basic video:', errTier2);
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }
      }

      if (!stream) throw new Error('Tidak dapat memperoleh akses video kamera.');

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
      setCameraError(err.message || 'Izin kamera belum diberikan atau sensor kamera sedang sibuk.');
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
    if (activeTab === 'camera' && canOperateCamera) {
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
  }, [activeTab, canOperateCamera, startCamera]);

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
    if (!canOperateCamera) {
      if (isKameraLocked) {
        setShowLoginModal(true);
      } else {
        setShowEnumeratorModal(true);
      }
      return;
    }
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
    if (!canOperateCamera) {
      if (isKameraLocked) {
        setShowLoginModal(true);
      } else {
        setShowEnumeratorModal(true);
      }
      return;
    }
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
      const token = await getAuthToken();
      if (!token && !enumerator?.email && !isAdmin) {
        setShowEnumeratorModal(true);
        setIsSaving(false);
        return;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      if (enumerator?.email) {
        headers['x-enumerator-email'] = enumerator.email;
        headers['x-enumerator-name'] = enumerator.nama || '';
      }

      // Nama, Gmail, peran & status verifikasi ditetapkan server dari token / header enumerator
      const res = await fetch('/api/kamera-cerdas/observasi', {
        method: 'POST',
        headers,
        body: JSON.stringify(finalData)
      });

      if (res.ok) {
        const json = await res.json();
        const savedRecord: ObservasiRecord = json.data || finalData;
        const newLat = Number(savedRecord.latitude || finalData.latitude);
        const newLng = Number(savedRecord.longitude || finalData.longitude);
        const newId = savedRecord.id || finalData.id;

        setShowConfirmModal(false);
        setCapturedPhoto(null);
        setAiDraftResult(null);
        setSaveSuccessMsg(`Data ${mode === 'pasokan_beras' ? 'Pasokan Beras' : 'Tanaman Pangan'} berhasil disimpan ke Supabase & Pin GIS di-generate!`);
        await loadObservasi();

        // Otomatis beralih ke Tab Peta Lapangan & buat pin di lokasi GPS yang kamera submit
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('kamera_observasi_updated', { detail: savedRecord }));
        }

        if (newLat && newLng) {
          setNewlyCreatedCoords([newLat, newLng]);
          if (newId) setNewlyCreatedPinId(newId);
          setActiveTab('map');
        }

        setTimeout(() => setSaveSuccessMsg(null), 5000);
      } else if (res.status === 401) {
        alert('Autentikasi ditolak. Silakan masuk kembali dengan akun Google (Gmail) Anda.');
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
    <div className="w-full h-full flex flex-col bg-[#F5FAF2] text-slate-800 relative overflow-hidden select-none">
      
      {/* ── Top App Bar Navigation ── */}
      <div className="bg-gradient-to-r from-white via-[#F7FCEB] to-[#EAF8EE] border-b border-emerald-100 px-3 sm:px-4 py-2.5 flex flex-wrap gap-2 items-center justify-between z-30 shrink-0 shadow-[0_4px_18px_rgba(16,120,70,0.08)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-lime-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/30">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs sm:text-sm font-black text-slate-900 tracking-wide uppercase whitespace-nowrap">
                Peta Pasokan Pangan (AI Vision)
              </h2>
              {(isAdmin || enumerator) && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full tracking-wider leading-none bg-emerald-500 text-white">
                  {isAdmin ? 'PETUGAS' : 'ENUMERATOR'}
                </span>
              )}
              {/* Tombol Lampu Kuning (Konsep Crowdsourcing) */}
              <button
                type="button"
                onClick={() => setShowCrowdsourcingInfo((prev) => !prev)}
                className={`p-1 rounded-full transition-all border inline-flex items-center justify-center cursor-pointer ${
                  showCrowdsourcingInfo
                    ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-sm ring-2 ring-amber-300'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-600 border-amber-300 shadow-2xs'
                }`}
                title="Penjelasan Konsep Crowdsourcing Geospasial"
                aria-label="Konsep Crowdsourcing Pasokan"
              >
                <Lightbulb className="w-3.5 h-3.5 fill-amber-400 text-amber-600" />
              </button>
            </div>
            <p className="text-[10px] text-slate-500">Field Data Collection & Geospatial Intelligence</p>
          </div>
        </div>

        {/* Top View Switcher Tabs & Admin Status */}
        <div className="flex items-center gap-2">
          <div className="flex bg-emerald-50/90 p-0.5 rounded-lg border border-emerald-200 text-[10.5px] font-bold">
            <button
              onClick={() => setActiveTab('camera')}
              className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 leading-none ${
                activeTab === 'camera' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-emerald-800'
              }`}
            >
              {canOperateCamera ? <Camera className="w-3 h-3" /> : <Lock className="w-3 h-3 text-amber-700" />}
              <span className="hidden sm:inline">Ambil Foto</span>
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 leading-none ${
                activeTab === 'map' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-emerald-800'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Pin ({observasiList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 leading-none ${
                activeTab === 'analytics' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-emerald-800'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              <span className="hidden sm:inline">Agregasi</span>
            </button>

            <button
              onClick={() => setActiveTab('arus')}
              className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 leading-none ${
                activeTab === 'arus' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-emerald-800'
              }`}
              title="Peta 3D Arus Pasokan & Distribusi Beras"
            >
              <Globe2 className="w-3 h-3" />
              <span className="hidden sm:inline">Arus Pasokan</span>
            </button>
          </div>

          {/* Admin Indicator / Login Trigger */}
          {isAdmin ? (
            <div className="flex items-center gap-1.5">
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-[10px] font-bold text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span className="truncate max-w-[130px]">{adminEmail || 'Petugas DKPP'}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-emerald-200 hover:border-rose-700/50 transition-all flex items-center gap-1 cursor-pointer"
                title="Keluar Sesi Admin"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          ) : enumerator ? (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-white border border-emerald-200 shadow-sm min-w-0" title={`${enumerator.nama} • ${enumerator.email}`}>
                {enumerator.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={enumerator.avatarUrl} alt={enumerator.nama} referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover border border-emerald-200" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-black">
                    {enumerator.nama.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="hidden sm:flex flex-col leading-tight min-w-0">
                  <b className="text-[10px] text-slate-800 truncate max-w-[130px]">{enumerator.nama}</b>
                  <span className="text-[9px] text-slate-500 truncate max-w-[130px]">{enumerator.email}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={handleEnumeratorLogout}
                className="px-2 py-1.5 text-[10px] font-bold text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer"
                title="Keluar dari akun Google"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleRedirecting}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 border border-emerald-200 text-slate-700 text-[10.5px] font-black leading-none transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-60"
                title="Masuk dengan Google (Gmail)"
              >
                {isGoogleRedirecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3 text-emerald-700" />}
                <span>Login Gmail</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Expandable Crowdsourcing Concept Note ── */}
      {showCrowdsourcingInfo && (
        <div className="bg-gradient-to-br from-amber-50 via-yellow-50/70 to-emerald-50 border-b border-amber-200/90 px-3.5 py-3 text-slate-800 shadow-md z-30 shrink-0 transition-all duration-300 animate-in slide-in-from-top-2">
          <div className="max-w-4xl mx-auto flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <Lightbulb className="w-4 h-4 fill-amber-950" />
            </div>
            <div className="flex-1 space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                  Konsep Crowdsourcing Geospasial Pasokan Pangan Cilegon
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCrowdsourcingInfo(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-black/5 transition-colors cursor-pointer"
                  aria-label="Tutup Catatan"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-700">
                Sistem ini mengadopsi mekanisme <strong>partisipatif (crowdsourcing)</strong> berbasis autentikasi akun Google (Gmail). Petugas lapangan, enumerator, dan pemangku kepentingan pangan cukup mengambil foto sarana penjual (kios/grosir beras), produsen beras, maupun sentra tanaman pangan di Kota Cilegon.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[10px]">
                <div className="bg-white/85 p-2 rounded-lg border border-amber-200/80 shadow-2xs">
                  <span className="font-black text-amber-900 block mb-0.5">1. Foto & Deteksi AI</span>
                  Kamera cerdas menganalisis visual objek pangan, stok etalase/karung, atau fase tanaman secara otomatis.
                </div>
                <div className="bg-white/85 p-2 rounded-lg border border-amber-200/80 shadow-2xs">
                  <span className="font-black text-amber-900 block mb-0.5">2. Geotagging & Auto-Pin</span>
                  Sistem mengekstrak koordinat GPS riil di lapangan dan otomatis menerbitkan pin spasial terverifikasi di peta.
                </div>
                <div className="bg-white/85 p-2 rounded-lg border border-amber-200/80 shadow-2xs">
                  <span className="font-black text-amber-900 block mb-0.5">3. Agregasi Rantai Pasok</span>
                  Setiap pasokan yang masuk ke Cilegon terpetakan komprehensif, mencakup daerah asal, rute, dan estimasi tonasenya.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Toast Alert ── */}
      {saveSuccessMsg && (
        <div className="absolute top-16 inset-x-4 sm:inset-x-auto sm:right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-emerald-400 animate-in slide-in-from-top duration-300">
          <Check className="w-4 h-4 bg-white/20 rounded-full p-0.5" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* ── Tab 1: Kamera Lapangan (Mobile-First Fullscreen) ── */}
      {activeTab === 'camera' && (
        <div className="flex-1 relative w-full h-full flex flex-col items-center justify-between bg-[#EAF5E4] overflow-hidden">
          
          {/* Live Video Stream Viewport */}
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#EAF5E4]">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
            />

            {!isCameraActive && (
              <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500 max-w-sm z-10">
                <Camera className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
                <p className="text-sm font-bold text-slate-600 mb-1">
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
          <GuidanceOverlay mode={mode} hideTopHeader={true} />

          {/* Floating Top GPS Status Bar & Reverse Camera Button (Capture 3) */}
          <div className="relative z-20 w-full px-4 pt-3 flex flex-col gap-2 pointer-events-auto">
            <div className="flex items-start justify-between">
              {/* GPS Indicator (2 Baris: Status Akurasi + Titik Wilayah / Kelurahan) */}
              <div className="flex flex-col text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-left">
                <div className="flex items-center gap-1.5 text-xs font-black tracking-wide">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    gpsStatus === 'active' 
                      ? 'bg-[#00FF66] animate-pulse shadow-[0_0_8px_#00FF66]' 
                      : gpsStatus === 'searching' 
                      ? 'bg-amber-400 animate-pulse' 
                      : 'bg-rose-500'
                  }`} />
                  <span>
                    {gpsStatus === 'active' && gpsCoords 
                      ? `GPS Aktif (±${gpsCoords.accuracy || '3.3'}m)`
                      : gpsStatus === 'searching'
                      ? 'Mencari Sinyal GPS...'
                      : 'GPS Offline / Manual'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-white/95 pl-0.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-white/90 shrink-0" />
                  <span className="truncate max-w-[190px]">
                    {gpsCoords?.kelurahan || 'Mendeteksi wilayah...'}
                  </span>
                </div>
              </div>

              {/* Flip / Reverse Camera Button (Capture 3: Lingkaran Transparan Gelap) */}
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md border border-white/25 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer hover:bg-black/60 shrink-0"
                title="Putar Kamera (Depan / Belakang)"
                aria-label="Putar Kamera"
              >
                <SwitchCamera className="w-5 h-5 drop-shadow-xs" />
              </button>
            </div>

            {/* Floating Top Guidance Bubble (Capture 3) */}
            {showGuidanceBubble && (
              <div className="mt-1 bg-black/65 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20 text-white shadow-xl flex items-center justify-between gap-2.5 max-w-sm mx-auto animate-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-2 min-w-0 text-left">
                  <span className="text-base shrink-0">
                    {mode === 'pasokan_beras' ? '🏪' : '🌳'}
                  </span>
                  <p className="text-[11px] font-medium text-white/95 leading-tight">
                    {mode === 'pasokan_beras'
                      ? 'Arahkan kamera ke plang toko atau tumpukan karung beras'
                      : 'Posisikan pohon / rumpun tanaman di dalam bingkai'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuidanceBubble(false)}
                  className="text-white/60 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  aria-label="Tutup Panduan"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Floating Analyzing Loader */}
          {isAnalyzing && (
            <div className="absolute inset-0 z-40 bg-white/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 mb-4 shadow-xl">
                <Sparkles className="w-8 h-8 animate-spin" />
              </div>
              <h3 className="text-base font-black text-slate-900 mb-1">Menganalisis dengan AI Vision...</h3>
              <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                Mengidentifikasi {mode === 'pasokan_beras' ? 'sarana distribusi beras & estimasi karung' : 'tanaman pangan & estimasi produksi normatif'}
              </p>
            </div>
          )}

          {/* ── Bottom Controls Bar (Capture 3 Mockup) ── */}
          <div className="relative z-20 w-full p-4 sm:p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col items-center gap-3">
            
            {/* Mode Switcher HUD Brackets (Capture 3) */}
            <div className="w-full max-w-[320px] flex items-center justify-center gap-3">
              {/* Box 1: Pasokan Beras */}
              <button
                type="button"
                onClick={() => setMode('pasokan_beras')}
                className={`relative flex-1 py-2.5 px-3 rounded-xl backdrop-blur-md transition-all cursor-pointer flex flex-col items-center justify-center text-center group ${
                  mode === 'pasokan_beras'
                    ? 'bg-emerald-950/60 border border-emerald-400 text-white shadow-[0_0_15px_rgba(52,211,153,0.35)]'
                    : 'bg-black/40 border border-white/15 text-white/60 hover:text-white hover:border-white/30'
                }`}
              >
                {/* 4 Corner Brackets (HUD Reticles) */}
                <div className={`absolute -top-[1px] -left-[1px] w-2.5 h-2.5 border-t-2 border-l-2 transition-colors ${mode === 'pasokan_beras' ? 'border-emerald-400' : 'border-white/30'}`} />
                <div className={`absolute -top-[1px] -right-[1px] w-2.5 h-2.5 border-t-2 border-r-2 transition-colors ${mode === 'pasokan_beras' ? 'border-emerald-400' : 'border-white/30'}`} />
                <div className={`absolute -bottom-[1px] -left-[1px] w-2.5 h-2.5 border-b-2 border-l-2 transition-colors ${mode === 'pasokan_beras' ? 'border-emerald-400' : 'border-white/30'}`} />
                <div className={`absolute -bottom-[1px] -right-[1px] w-2.5 h-2.5 border-b-2 border-r-2 transition-colors ${mode === 'pasokan_beras' ? 'border-emerald-400' : 'border-white/30'}`} />

                <div className="mb-1">
                  <svg className="w-5 h-5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10 12h4" />
                    <path d="M12 10v4" />
                  </svg>
                </div>
                <span className="text-[11px] font-black tracking-tight leading-tight">
                  Pasokan Beras
                </span>
              </button>

              {/* Box 2: Tanaman Pangan */}
              <button
                type="button"
                onClick={() => setMode('tanaman_pangan')}
                className={`relative flex-1 py-2.5 px-3 rounded-xl backdrop-blur-md transition-all cursor-pointer flex flex-col items-center justify-center text-center group ${
                  mode === 'tanaman_pangan'
                    ? 'bg-emerald-950/60 border border-emerald-400 text-white shadow-[0_0_15px_rgba(52,211,153,0.35)]'
                    : 'bg-black/40 border border-white/15 text-white/60 hover:text-white hover:border-white/30'
                }`}
              >
                {/* 4 Corner Brackets (HUD Reticles) */}
                <div className={`absolute -top-[1px] -left-[1px] w-2.5 h-2.5 border-t-2 border-l-2 transition-colors ${mode === 'tanaman_pangan' ? 'border-emerald-400' : 'border-white/30'}`} />
                <div className={`absolute -top-[1px] -right-[1px] w-2.5 h-2.5 border-t-2 border-r-2 transition-colors ${mode === 'tanaman_pangan' ? 'border-emerald-400' : 'border-white/30'}`} />
                <div className={`absolute -bottom-[1px] -left-[1px] w-2.5 h-2.5 border-b-2 border-l-2 transition-colors ${mode === 'tanaman_pangan' ? 'border-emerald-400' : 'border-white/30'}`} />
                <div className={`absolute -bottom-[1px] -right-[1px] w-2.5 h-2.5 border-b-2 border-r-2 transition-colors ${mode === 'tanaman_pangan' ? 'border-emerald-400' : 'border-white/30'}`} />

                <div className="mb-1">
                  <svg className="w-5 h-5 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 20h10" />
                    <path d="M12 20v-8" />
                    <path d="M12 12a5 5 0 0 1 5-5c0 4-2 6-5 6Z" />
                    <path d="M12 12a5 5 0 0 0-5-5c0 4 2 6 5 6Z" />
                  </svg>
                </div>
                <span className="text-[11px] font-black tracking-tight leading-tight">
                  Tanaman Pangan
                </span>
              </button>
            </div>

            {/* Shutter Action Button (Centered) */}
            <div className="w-full max-w-xs flex items-center justify-center px-2 pt-1">
              {/* Main Shutter Capture Button (Glowing Green Circle) */}
              <button
                type="button"
                onClick={handleCapturePhoto}
                disabled={!isCameraActive || isAnalyzing}
                className="w-20 h-20 rounded-full border-2 border-emerald-400/80 p-1 flex items-center justify-center active:scale-90 transition-transform shadow-[0_0_25px_rgba(52,211,153,0.5)] disabled:opacity-40 cursor-pointer"
                title="Ambil Foto Langsung"
                aria-label="Ambil Foto"
              >
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#00FF87] via-[#059669] to-[#047857] flex items-center justify-center text-white shadow-inner">
                  <Camera className="w-7 h-7 text-white drop-shadow-sm" />
                </div>
              </button>
            </div>

            <p className="text-[10px] text-slate-500 font-medium drop-shadow-md">
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
            focusPinId={newlyCreatedPinId}
            focusCoords={newlyCreatedCoords}
          />
        </div>
      )}

      {/* ── Tab 3: Agregasi & Analisis ── */}
      {activeTab === 'analytics' && (
        <div className="flex-1 w-full h-full relative">
          <KameraAgregasiDashboard observasiList={observasiList} focusSection={focusSection} />
        </div>
      )}

      {/* ── Tab 4: Peta 3D Arus Pasokan & Distribusi Beras ── */}
      {activeTab === 'arus' && (
        <div className="flex-1 w-full h-full relative min-h-[420px]">
          <ArusPasokanMap
            observasiList={observasiList}
            loaded={observasiLoaded}
            error={observasiError}
            onRefresh={loadObservasi}
          />
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
          existingObservations={observasiList}
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
          existingObservations={observasiList}
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
        <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-emerald-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-slate-800 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <ShieldCheck className="w-5 h-5" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-900">Login Petugas DKPP</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="text-slate-500 hover:text-emerald-800 text-xs px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Gunakan akun resmi administrator / petugas DKPP Kota Cilegon untuk membuka modul perekaman Kamera Cerdas.
            </p>

            {loginError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-700 text-xs font-semibold">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLoginAdmin} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Email Petugas</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder=""
                  className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Kata Sandi</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
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

      {/* ── Modal Kotak Autentikasi Gmail (Enumerator Crowdsourcing) ── */}
      {showEnumeratorModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-emerald-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-slate-800 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-700">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide text-slate-900">Autentikasi Enumerator</h3>
                  <p className="text-[10px] text-slate-500">Pencatatan Pangan Crowdsourcing</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEnumeratorModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Untuk validitas data pangan Kota Cilegon, silakan hubungkan akun Google (Gmail) atau isi nama & email enumerator Anda secara langsung.
            </p>

            {googleError && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-800 text-[11px] leading-relaxed">
                <span className="font-bold block mb-1">Catatan Supabase Auth:</span>
                {googleError}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleRedirecting}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-emerald-50 border-2 border-emerald-200 hover:border-emerald-400 text-slate-800 font-black text-xs shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.98] disabled:opacity-60 mb-3"
            >
              {isGoogleRedirecting ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
              )}
              <span>{isGoogleRedirecting ? 'Menghubungkan...' : 'Masuk dengan Akun Google'}</span>
            </button>

            {/* Alternatif: Masukkan Nama & Gmail Langsung */}
            <div className="pt-3 border-t border-emerald-100">
              <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center justify-between">
                <span>Atau Masukkan Identitas Langsung:</span>
                <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-black">CROWDSOURCING</span>
              </div>
              <form onSubmit={handleSaveManualEnumerator} className="space-y-2">
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap Enumerator"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full bg-emerald-50/70 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
                />
                <input
                  type="email"
                  required
                  placeholder="alamat.gmail@gmail.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="w-full bg-emerald-50/70 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Gunakan Identitas & Lanjutkan</span>
                </button>
              </form>
            </div>

            <div className="flex items-center justify-between pt-3 mt-3 border-t border-emerald-100 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setShowEnumeratorModal(false);
                  setActiveTab('map');
                }}
                className="text-emerald-700 hover:underline font-bold cursor-pointer"
              >
                Lihat Peta Lapangan ({observasiList.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEnumeratorModal(false);
                  setShowLoginModal(true);
                }}
                className="text-slate-500 hover:text-emerald-700 font-bold cursor-pointer"
              >
                Login Petugas DKPP
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
