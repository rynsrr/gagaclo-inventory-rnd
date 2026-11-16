import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  X, 
  Check, 
  RotateCw, 
  Lock, 
  Unlock, 
  FileText, 
  AlertCircle, 
  Key, 
  Save, 
  ArrowRight, 
  RefreshCw,
  Sliders,
  ChevronDown,
  Info
} from 'lucide-react';
import { 
  scanGarmentTag, 
  compressImage, 
  getStoredGeminiKey, 
  saveStoredGeminiKey 
} from '../utils/aiLabelScanner';
import { useInventory } from '../context/InventoryContext';

const BUYER_OPTIONS = [
  { code: 'AN05', label: 'AN05 - ERGODYNE' },
  { code: 'AN01', label: 'AN01' },
  { code: 'AN02', label: 'AN02' },
  { code: 'AN03', label: 'AN03' },
  { code: 'AN04', label: 'AN04' },
  { code: 'NA', label: 'NA (Tanpa Buyer)' },
];

const JENIS_SAMPLE_OPTIONS = [
  'PPS',
  'DEV',
  'ARCHIVE',
  'PROTO',
  'SMS',
  'FIT',
  'SEW',
  'NA',
];

export const AiTagScannerModal = ({
  isOpen,
  onClose,
  targetBoxNumber = 1,
  defaultBuyer = '',
  defaultJenisSample = '',
  onApplyToForm,
  onDirectSave,
}) => {
  if (!isOpen) return null;

  return (
    <AiTagScannerContent
      onClose={onClose}
      targetBoxNumber={targetBoxNumber}
      defaultBuyer={defaultBuyer}
      defaultJenisSample={defaultJenisSample}
      onApplyToForm={onApplyToForm}
      onDirectSave={onDirectSave}
    />
  );
};

const AiTagScannerContent = ({
  onClose,
  targetBoxNumber = 1,
  defaultBuyer = '',
  defaultJenisSample = '',
  onApplyToForm,
  onDirectSave,
}) => {
  const inventoryContext = useInventory();
  const cloudGeminiKey = inventoryContext?.cloudGeminiKey;
  const updateCloudGeminiKey = inventoryContext?.updateCloudGeminiKey;

  const [inputMode, setInputMode] = useState('camera'); // 'camera' | 'upload'
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (belakang) | 'user' (depan)
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [scanDuration, setScanDuration] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);

  // Sticky Context (Session-Lock)
  const [stickyBuyer, setStickyBuyer] = useState(() => {
    return localStorage.getItem('gagaclo_sticky_buyer') || defaultBuyer || 'AN05';
  });
  const [isBuyerLocked, setIsBuyerLocked] = useState(true);

  const [stickyJenis, setStickyJenis] = useState(() => {
    return localStorage.getItem('gagaclo_sticky_jenis') || defaultJenisSample || 'PPS';
  });
  const [isJenisLocked, setIsJenisLocked] = useState(true);

  // Selalu buka di Form Lengkap (default true sesuai permintaan pengguna)
  const [alwaysOpenFullForm, setAlwaysOpenFullForm] = useState(() => {
    const saved = localStorage.getItem('gagaclo_always_open_full_form');
    return saved !== null ? saved === 'true' : true;
  });

  // Hasil Ekstraksi
  const [extractedData, setExtractedData] = useState(null);
  const [sessionSuccessCount, setSessionSuccessCount] = useState(0);

  // Pengaturan API Key Gemini (Tersinkron Cloud)
  const [showApiKeySetting, setShowApiKeySetting] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => cloudGeminiKey || getStoredGeminiKey());
  const [apiKeySavedSuccess, setApiKeySavedSuccess] = useState(false);

  useEffect(() => {
    if (cloudGeminiKey) {
      setApiKeyInput(cloudGeminiKey);
    }
  }, [cloudGeminiKey]);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  // Simpan sticky context ke localStorage saat berubah
  useEffect(() => {
    if (isBuyerLocked && stickyBuyer) {
      localStorage.setItem('gagaclo_sticky_buyer', stickyBuyer);
    }
  }, [stickyBuyer, isBuyerLocked]);

  useEffect(() => {
    if (isJenisLocked && stickyJenis) {
      localStorage.setItem('gagaclo_sticky_jenis', stickyJenis);
    }
  }, [stickyJenis, isJenisLocked]);

  // Stop camera stream helper
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Proses gambar via Gemini Flash API
  const processImageFile = async (fileOrBlob) => {
    setIsScanning(true);
    setScanError(null);
    setExtractedData(null);

    const startTime = performance.now();

    try {
      // 1. Kompres gambar di client-side (max 900px, quality 0.75 untuk transfer sub-80ms)
      const compressedBase64 = await compressImage(fileOrBlob, 900, 0.75);
      setCapturedImage(compressedBase64);

      // 2. Siapkan context
      const contextSettings = {
        lockedBuyer: isBuyerLocked ? stickyBuyer : '',
        lockedJenisSample: isJenisLocked ? stickyJenis : '',
        _boxNumber: String(targetBoxNumber),
      };

      // 3. Panggil scan API
      const result = await scanGarmentTag(compressedBase64, contextSettings);
      const data = result?.data ? result.data : result;

      if (!data || typeof data !== 'object') {
        throw new Error('Hasil pemindaian AI tidak valid atau kosong.');
      }

      // Validasi minimal ada data yang terbaca
      const hasAnyField = Boolean(
        (data.style && data.style !== 'NA') ||
        (data.sampleNo && data.sampleNo !== 'NA') ||
        (data.size && data.size !== 'NA') ||
        (data.color && data.color !== 'NA') ||
        (data.track && data.track !== 'NA' && data.track !== 'SAMPEL FISIK')
      );

      // Jika sticky buyer/jenis aktif dan AI mengembalikan kosong atau beda, prioritaskan sticky
      if (isBuyerLocked && stickyBuyer) {
        data.buyerNo = stickyBuyer;
      }
      if (isJenisLocked && stickyJenis) {
        data.jenisSample = stickyJenis;
      }

      const endTime = performance.now();
      setScanDuration(Math.round(endTime - startTime));

      if (!hasAnyField) {
        setScanError('Tag sampel tidak terbaca dengan jelas oleh AI. Pastikan tulisan tag cukup terang, tegak lurus, dan fokus.');
        setExtractedData(null);
      } else {
        setExtractedData(data);
        stopCamera();
        if (alwaysOpenFullForm) {
          onApplyToForm?.(data);
          onClose();
        }
      }
    } catch (err) {
      console.error('AI Scan Error:', err);
      const msg = err?.message || 'Gagal mengenali tag sampel. Pastikan pencahayaan cukup dan foto tegak lurus.';
      setScanError(msg);
      setExtractedData(null);
      if (msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('api_key')) {
        setShowApiKeySetting(true);
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Mulai / Hentikan stream kamera
  useEffect(() => {
    let active = true;

    async function startCamera() {
      if (inputMode !== 'camera' || extractedData) {
        stopCamera();
        return;
      }

      setCameraError(null);
      stopCamera();

      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error('Kamera tidak didukung pada browser ini.');
        }

        const constraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setIsCameraActive(true);
      } catch (err) {
        console.warn('Gagal mengakses kamera:', err);
        setCameraError('Kamera tidak dapat diakses atau izin ditolak. Silakan gunakan tab Upload Gambar atau izinkan akses kamera.');
        setIsCameraActive(false);
      }
    }

    startCamera();

    return () => {
      active = false;
      stopCamera();
    };
  }, [inputMode, facingMode, extractedData]);

  // Listener Clipboard Paste (Ctrl+V)
  useEffect(() => {
    const handlePaste = async (e) => {
      if (isScanning) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            await processImageFile(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isScanning, isBuyerLocked, stickyBuyer, isJenisLocked, stickyJenis, targetBoxNumber]);

  // Ambil snapshot dari kamera
  const handleCaptureSnapshot = async () => {
    if (!videoRef.current || isScanning) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (blob) {
          await processImageFile(blob);
        }
      }, 'image/jpeg', 0.9);
    } catch (err) {
      console.error('Gagal mengambil frame video:', err);
      setScanError('Gagal mengambil gambar dari kamera.');
    }
  };

  // Pilih file dari galeri / disk
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await processImageFile(file);
    }
  };

  // Reset scan untuk foto berikutnya
  const handleResetScan = () => {
    setCapturedImage(null);
    setExtractedData(null);
    setScanError(null);
    setScanDuration(null);
  };

  // Handler: Terapkan ke Form (buka ItemModal)
  const handleApplyToForm = () => {
    if (!extractedData) return;
    onApplyToForm?.(extractedData);
    onClose();
  };

  // Handler: Simpan Langsung (Instant Fast-Entry)
  const handleDirectSave = async () => {
    if (!extractedData || !onDirectSave) return;
    try {
      await onDirectSave(extractedData);
      setSessionSuccessCount((prev) => prev + 1);
      // Reset untuk kartu berikutnya tanpa menutup modal
      handleResetScan();
    } catch (err) {
      setScanError(err?.message || 'Gagal menyimpan item ke database.');
    }
  };

  // Simpan API Key kustom & sinkronkan otomatis ke Supabase Cloud
  const handleSaveApiKey = async () => {
    if (updateCloudGeminiKey) {
      await updateCloudGeminiKey(apiKeyInput);
    } else {
      saveStoredGeminiKey(apiKeyInput);
    }
    setApiKeySavedSuccess(true);
    setTimeout(() => {
      setApiKeySavedSuccess(false);
      setShowApiKeySetting(false);
    }, 1500);
  };

  return (
    <div 
      ref={containerRef}
      className="font-apple fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fade-in"
    >
      <div className="bg-[#12141a] text-white rounded-[26px] shadow-[0_30px_90px_rgba(0,0,0,0.5)] border border-white/10 w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        {/* Apple Dark Header */}
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-white/[0.08] bg-[#181a22] shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0071e3] to-[#5ac8fa] text-white shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-white">
                  Snap &amp; Fill AI Tag Scanner
                </h2>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Gemini Flash Vision
                </span>
              </div>
              <p className="text-[11px] text-white/50 leading-tight">
                Scan label / tag tulisan tangan &bull; Target: <strong>BOX #{targetBoxNumber}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowApiKeySetting((p) => !p)}
              className={`flex h-7 px-2.5 items-center space-x-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                showApiKeySetting
                  ? 'bg-white/20 text-white'
                  : apiKeyInput || cloudGeminiKey
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
              title={
                apiKeyInput || cloudGeminiKey
                  ? 'API Key Aktif & Tersinkron Cloud (Klik untuk melihat/ubah)'
                  : 'Pasang API Key'
              }
            >
              <Key className="w-3.5 h-3.5" />
              <span>{apiKeyInput || cloudGeminiKey ? 'Cloud Synced' : 'Pasang API Key'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Panel Pengaturan API Key (Jika Dibuka) */}
        {showApiKeySetting && (
          <div className="bg-[#1c1f2a] border-b border-white/10 p-4 animate-in slide-in-from-top duration-150 shrink-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#5ac8fa]" />
                <span className="text-xs font-semibold text-white">Kunci API Google Gemini (Tersinkron di Cloud)</span>
              </div>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#5ac8fa] hover:underline flex items-center gap-1"
              >
                <span>Dapatkan API Key Gratis</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-white/60 mb-2.5 leading-relaxed">
              Kunci ini <strong>tersinkron otomatis ke Supabase Cloud</strong>. Saat disimpan, seluruh perangkat rekan tim (HP Android, laptop, tablet) langsung bisa memindai label tanpa perlu memasukkan API key lagi.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/30 font-mono focus:outline-hidden focus:ring-2 focus:ring-[#0071e3]"
              />
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-3.5 py-1.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                {apiKeySavedSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>{apiKeySavedSuccess ? 'Tersinkron!' : 'Simpan ke Cloud'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Sticky Context Bar (Pengunci Buyer & Jenis Sample untuk Input Massal) */}
        <div className="bg-[#181a24] border-b border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-white/50 text-[11px] font-medium flex items-center gap-1">
              <Lock className="w-3 h-3 text-[#5ac8fa]" />
              <span>Sesi Kunci:</span>
            </span>

            {/* Sticky Buyer Picker */}
            <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-xs">
              <button
                type="button"
                onClick={() => setIsBuyerLocked((p) => !p)}
                className="mr-1.5 text-white/70 hover:text-white transition"
                title={isBuyerLocked ? 'Buyer Terkunci (klik untuk buka)' : 'Buyer Tidak Terkunci (klik untuk kunci)'}
              >
                {isBuyerLocked ? <Lock className="w-3 h-3 text-emerald-400" /> : <Unlock className="w-3 h-3 text-white/40" />}
              </button>
              <span className="text-white/40 text-[10px] mr-1">Buyer:</span>
              <select
                value={stickyBuyer}
                onChange={(e) => setStickyBuyer(e.target.value)}
                className="bg-transparent text-white text-xs font-semibold border-none focus:outline-hidden cursor-pointer"
              >
                {BUYER_OPTIONS.map((b) => (
                  <option key={b.code} value={b.code} className="bg-[#181a24] text-white">
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sticky Jenis Sample Picker */}
            <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-xs">
              <button
                type="button"
                onClick={() => setIsJenisLocked((p) => !p)}
                className="mr-1.5 text-white/70 hover:text-white transition"
                title={isJenisLocked ? 'Jenis Terkunci (klik untuk buka)' : 'Jenis Tidak Terkunci (klik untuk kunci)'}
              >
                {isJenisLocked ? <Lock className="w-3 h-3 text-emerald-400" /> : <Unlock className="w-3 h-3 text-white/40" />}
              </button>
              <span className="text-white/40 text-[10px] mr-1">Jenis:</span>
              <select
                value={stickyJenis}
                onChange={(e) => setStickyJenis(e.target.value)}
                className="bg-transparent text-white text-xs font-semibold border-none focus:outline-hidden cursor-pointer"
              >
                {JENIS_SAMPLE_OPTIONS.map((j) => (
                  <option key={j} value={j} className="bg-[#181a24] text-white">
                    {j}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Selalu Buka di Form Lengkap */}
            <label className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-2.5 py-1 text-xs cursor-pointer select-none transition">
              <input
                type="checkbox"
                checked={alwaysOpenFullForm}
                onChange={(e) => {
                  const val = e.target.checked;
                  setAlwaysOpenFullForm(val);
                  localStorage.setItem('gagaclo_always_open_full_form', val ? 'true' : 'false');
                }}
                className="w-3.5 h-3.5 rounded text-[#0071e3] focus:ring-0 focus:ring-offset-0 bg-black/40 border-white/20 cursor-pointer"
              />
              <FileText className="w-3 h-3 text-[#5ac8fa]" />
              <span className="text-[11px] font-medium text-white/90">Selalu Buka Form Lengkap</span>
            </label>
          </div>

          {sessionSuccessCount > 0 && (
            <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-medium">
              ⚡ {sessionSuccessCount} item tersimpan sesi ini
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* Hasil Pemindaian (Jika AI sudah selesai mengekstrak) */}
          {extractedData ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Header Status Sukses */}
              <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-emerald-300">
                      Label Berhasil Diekstrak ({scanDuration ? `${scanDuration}ms` : 'Cepat'})
                    </h3>
                    <p className="text-[11px] text-emerald-200/70">
                      Periksa nilai hasil pembacaan tulisan tangan di bawah sebelum menyimpan.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetScan}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Ulang</span>
                </button>
              </div>

              {/* Grid Preview Nilai Ekstraksi yang Dapat Diedit Cepat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                
                {/* Style / Model */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-white/50 tracking-wider">
                    Nama / No. Style
                  </span>
                  <input
                    type="text"
                    value={extractedData.style || ''}
                    onChange={(e) => setExtractedData((p) => ({ ...p, style: e.target.value.toUpperCase() }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-semibold focus:outline-hidden focus:border-[#0071e3]"
                    placeholder="Contoh: RDI#6823 BLACK 1.2"
                  />
                </div>

                {/* Sample No / Art */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-white/50 tracking-wider">
                    Sample No (Artikel)
                  </span>
                  <input
                    type="text"
                    value={extractedData.sampleNo || ''}
                    onChange={(e) => setExtractedData((p) => ({ ...p, sampleNo: e.target.value.toUpperCase() }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-semibold focus:outline-hidden focus:border-[#0071e3]"
                    placeholder="Contoh: RD1069"
                  />
                </div>

                {/* Size */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-white/50 tracking-wider">
                    Size
                  </span>
                  <input
                    type="text"
                    value={extractedData.size || ''}
                    onChange={(e) => setExtractedData((p) => ({ ...p, size: e.target.value.toUpperCase() }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-semibold focus:outline-hidden focus:border-[#0071e3]"
                    placeholder="Contoh: ONESIZE, L, M"
                  />
                </div>

                {/* Color */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-white/50 tracking-wider">
                    Warna / Color
                  </span>
                  <input
                    type="text"
                    value={extractedData.color || ''}
                    onChange={(e) => setExtractedData((p) => ({ ...p, color: e.target.value.toUpperCase() }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-semibold focus:outline-hidden focus:border-[#0071e3]"
                    placeholder="Contoh: BLACK"
                  />
                </div>

                {/* Buyer & Jenis */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-white/50 tracking-wider">
                    Buyer No &amp; Jenis Sample
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={extractedData.buyerNo || ''}
                      onChange={(e) => setExtractedData((p) => ({ ...p, buyerNo: e.target.value.toUpperCase() }))}
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-semibold focus:outline-hidden focus:border-[#0071e3]"
                      placeholder="Buyer (AN05)"
                    />
                    <input
                      type="text"
                      value={extractedData.jenisSample || ''}
                      onChange={(e) => setExtractedData((p) => ({ ...p, jenisSample: e.target.value.toUpperCase() }))}
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-semibold focus:outline-hidden focus:border-[#0071e3]"
                      placeholder="Jenis (PPS)"
                    />
                  </div>
                </div>

                {/* Tanggal & Qty */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-white/50 tracking-wider">
                    Tanggal &amp; Jumlah (PCE)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={extractedData.tanggal || ''}
                      onChange={(e) => setExtractedData((p) => ({ ...p, tanggal: e.target.value }))}
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-semibold focus:outline-hidden focus:border-[#0071e3]"
                      placeholder="DD-MM-YYYY"
                    />
                    <div className="flex items-center bg-black/30 border border-white/10 rounded-lg px-2">
                      <input
                        type="number"
                        min="1"
                        value={extractedData.jumlah || 1}
                        onChange={(e) => setExtractedData((p) => ({ ...p, jumlah: Math.max(1, Number(e.target.value) || 1) }))}
                        className="w-12 bg-transparent py-1 text-xs text-white font-semibold focus:outline-hidden"
                      />
                      <span className="text-[10px] font-mono font-bold text-white/50">PCE</span>
                    </div>
                  </div>
                </div>

                {/* Track / Note (Info Bahan) */}
                <div className="sm:col-span-2 bg-white/5 border border-white/10 rounded-xl p-2.5 space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-white/50 tracking-wider">
                    Track / Note (Info Bahan &amp; Catatan Khusus)
                  </span>
                  <textarea
                    rows="2"
                    value={extractedData.track || ''}
                    onChange={(e) => setExtractedData((p) => ({ ...p, track: e.target.value.toUpperCase() }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-hidden focus:border-[#0071e3]"
                    placeholder="Contoh: 240GSM 4-WAY STRETCH BLACK FLEECE / DHL : 5475890895 / PP SAMPLE"
                  />
                </div>
              </div>

              {/* Action Buttons: Review di Form vs Simpan Langsung */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={alwaysOpenFullForm}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setAlwaysOpenFullForm(val);
                      localStorage.setItem('gagaclo_always_open_full_form', val ? 'true' : 'false');
                    }}
                    className="w-3.5 h-3.5 rounded text-[#0071e3] bg-black/40 border-white/20 cursor-pointer"
                  />
                  <span>Selalu buka di Form Lengkap setelah scan</span>
                </label>

                <div className="flex items-center gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={handleApplyToForm}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0071e3] to-[#5ac8fa] hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-blue-950/30 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Buka di Form Lengkap</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDirectSave}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4 text-emerald-400" />
                    <span>⚡ Simpan Langsung ke Box #{targetBoxNumber}</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* Area Tangkap / Input Gambar */
            <div className="space-y-3">
              
              {/* Tab Selector Mode (Kamera vs Upload) */}
              <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setInputMode('camera')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    inputMode === 'camera'
                      ? 'bg-[#0071e3] text-white shadow-xs'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Kamera Langsung</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('upload')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    inputMode === 'upload'
                      ? 'bg-[#0071e3] text-white shadow-xs'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Foto / File</span>
                </button>
              </div>

              {/* Viewfinder Kamera */}
              {inputMode === 'camera' && (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 sm:aspect-16/10 border border-white/10 flex items-center justify-center">
                  
                  {isCameraActive ? (
                    <>
                      <video
                        ref={videoRef}
                        playsInline
                        autoPlay
                        muted
                        className="w-full h-full object-cover"
                      />

                      {/* Laser / Grid Overlay Arah Scan */}
                      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                        <div className="flex justify-between">
                          <span className="w-6 h-6 border-t-2 border-l-2 border-[#5ac8fa] rounded-tl-lg"></span>
                          <span className="w-6 h-6 border-t-2 border-r-2 border-[#5ac8fa] rounded-tr-lg"></span>
                        </div>
                        <div className="flex justify-between">
                          <span className="w-6 h-6 border-b-2 border-l-2 border-[#5ac8fa] rounded-bl-lg"></span>
                          <span className="w-6 h-6 border-b-2 border-r-2 border-[#5ac8fa] rounded-br-lg"></span>
                        </div>
                      </div>

                      {/* Tombol Balik Kamera (Depan / Belakang) */}
                      <button
                        type="button"
                        onClick={() => setFacingMode((p) => (p === 'environment' ? 'user' : 'environment'))}
                        className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/60 backdrop-blur-md text-white/90 hover:text-white flex items-center justify-center border border-white/20 transition cursor-pointer"
                        title="Balik Kamera (Depan / Belakang)"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>

                      {/* Shutter Button */}
                      <div className="absolute bottom-4 inset-x-0 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={handleCaptureSnapshot}
                          disabled={isScanning}
                          className="h-14 w-14 rounded-full border-4 border-white bg-red-600 hover:bg-red-500 active:scale-95 shadow-xl transition-all cursor-pointer flex items-center justify-center"
                          title="Ambil Foto Label"
                        >
                          <Camera className="w-6 h-6 text-white" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="p-6 text-center space-y-3">
                      <Camera className="w-10 h-10 text-white/30 mx-auto" />
                      <p className="text-xs text-white/60 max-w-xs mx-auto leading-relaxed">
                        {cameraError || 'Menghubungkan ke kamera... Harap izinkan akses kamera pada browser.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setInputMode('upload')}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                      >
                        Gunakan Upload Foto
                      </button>
                    </div>
                  )}

                  {/* Scanning Animation Overlay saat Sedang Memproses */}
                  {isScanning && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center space-y-3 z-10 animate-fade-in">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full border-4 border-[#0071e3]/30 border-t-[#0071e3] animate-spin"></div>
                        <Sparkles className="w-5 h-5 text-[#5ac8fa] absolute inset-0 m-auto animate-pulse" />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-white">Gemini Flash AI sedang membaca label...</p>
                        <p className="text-[11px] text-white/50 mt-0.5">Mengekstrak style, sample no, ukuran, dan tanggal</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* View Upload / Dropzone */}
              {inputMode === 'upload' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-white/20 hover:border-[#0071e3] bg-white/[0.03] hover:bg-white/[0.06] p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#5ac8fa]">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">
                      Klik untuk upload foto kartu sampel
                    </p>
                    <p className="text-[11px] text-white/50 mt-1">
                      Mendukung JPEG, PNG, WEBP atau <strong>Ctrl + V</strong> untuk paste dari clipboard
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message jika scan gagal */}
              {scanError && (
                <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-red-200">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1 leading-snug">
                      <strong>Gagal membaca label:</strong> {scanError}
                    </div>
                  </div>
                  {!apiKeyInput && (
                    <button
                      type="button"
                      onClick={() => setShowApiKeySetting(true)}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer shrink-0"
                    >
                      🔑 Pasang API Key
                    </button>
                  )}
                </div>
              )}

              {/* Petunjuk Efisiensi Input */}
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center gap-2.5 text-[11px] text-white/50">
                <Info className="w-4 h-4 text-[#5ac8fa] shrink-0" />
                <span>
                  <strong>Tips 400 PCE/hari:</strong> Kunci Buyer (misal: <em>AN05</em>) dan Jenis (misal: <em>PPS</em>). Tekan shutter kamera atau paste gambar &rarr; klik <strong>Simpan Langsung</strong> untuk alokasi otomatis sub-2 detik!
                </span>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
