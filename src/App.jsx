import React, { Suspense, lazy, useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from './lib/supabase';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { BoxDetailModal } from './components/BoxDetailModal';
import { ItemModal } from './components/ItemModal';
import { TargetTeamBanner } from './components/TargetTeamBanner';
import { CelebrationFlareOverlay } from './components/CelebrationFlareOverlay';
import { InventoryImport } from './components/InventoryImport';
import { computeSearchResults } from './components/BoxSearchPanel';

// Code-split heavy 3D scene & secondary views for ultra lightweight initial load
const Warehouse3DView = lazy(() =>
  import('./components/Warehouse3DView').then((m) => ({ default: m.Warehouse3DView }))
);
const TotalItemsSummaryView = lazy(() =>
  import('./components/TotalItemsSummaryView').then((m) => ({ default: m.TotalItemsSummaryView }))
);
const PpicPerformanceView = lazy(() =>
  import('./components/PpicPerformanceView').then((m) => ({ default: m.PpicPerformanceView }))
);
const FeedbackIssuesView = lazy(() =>
  import('./components/FeedbackIssuesView').then((m) => ({ default: m.FeedbackIssuesView }))
);
const DispatchOutgoingView = lazy(() =>
  import('./components/DispatchOutgoingView').then((m) => ({ default: m.DispatchOutgoingView }))
);
const TeamStructureView = lazy(() =>
  import('./components/TeamStructureView').then((m) => ({ default: m.TeamStructureView }))
);
const SupabaseModal = lazy(() =>
  import('./components/SupabaseModal').then((m) => ({ default: m.SupabaseModal }))
);
const BoxManageModal = lazy(() =>
  import('./components/BoxManageModal').then((m) => ({ default: m.BoxManageModal }))
);
const BoxQrModal = lazy(() =>
  import('./components/BoxQrModal').then((m) => ({ default: m.BoxQrModal }))
);
const QuickScannerModal = lazy(() =>
  import('./components/QuickScannerModal').then((m) => ({ default: m.QuickScannerModal }))
);
const UserProfileModal = lazy(() =>
  import('./components/UserProfileModal').then((m) => ({ default: m.UserProfileModal }))
);
const BackupModal = lazy(() =>
  import('./components/BackupModal').then((m) => ({ default: m.BackupModal }))
);
const AnnouncementModal = lazy(() =>
  import('./components/AnnouncementModal').then((m) => ({ default: m.AnnouncementModal }))
);
import { AiTagScannerModal } from './components/AiTagScannerModal';
import { allocateNextSequentialCode } from './utils/sequenceResolver';
import {
  Boxes,
  Database,
  PackagePlus,
  X,
  ShoppingBasket,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Settings,
  FileSpreadsheet,
  Upload,
  Lock,
  Search,
  Sparkles,
  Box as BoxIcon,
  Pencil,
  Megaphone,
  Calendar,
} from 'lucide-react';
import { DispatchCartModal } from './components/DispatchCartModal';
import { DispatchCartFloatingBar } from './components/DispatchCartFloatingBar';
import { DispatchModal } from './components/DispatchModal';

const AppContent = () => {
  // Mode selection: default to '3d-warehouse' (BOX is the main tab)
  const [appMode, setAppMode] = useState('3d-warehouse'); // '3d-warehouse', 'summary'
  const [searchQuery, setSearchQuery] = useState('');

  const {
    supabaseStatus,
    isSupabaseModalOpen,
    setIsSupabaseModalOpen,
    isBackupModalOpen,
    setIsBackupModalOpen,
    boxes,
    items,
    issues = [],
    systemNotification,
    setSystemNotification,
    currentUser,
    dispatchCart,
    exportToExcel,
    setSelectedBoxNumber,
    setItemModalConfig,
    addItem,
    announcement,
    updateAnnouncement,
  } = useInventory();

  const [databaseBytes, setDatabaseBytes] = useState(null);
  const [isBoxManageOpen, setIsBoxManageOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [userProfileTarget, setUserProfileTarget] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAnnouncementOpen, setIsAnnouncementOpen] = useState(false);
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);
  const [highlightPpic, setHighlightPpic] = useState('ALL');
  const [hoveredSearchBoxNumber, setHoveredSearchBoxNumber] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBackupPasswordOpen, setIsBackupPasswordOpen] = useState(false);
  const [backupPasswordInput, setBackupPasswordInput] = useState('');
  const [backupPasswordError, setBackupPasswordError] = useState(false);
  const settingsRef = useRef(null);
  const [cartCheckoutItems, setCartCheckoutItems] = useState(null);
  const [celebrationAchiever, setCelebrationAchiever] = useState(null);
  const connected = supabaseStatus.isConnected;

  const handleAppDirectSaveAiData = async (extracted) => {
    const boxNum = 1;
    const boxObj = boxes.find(b => Number(b.boxNumber) === Number(boxNum));
    const isMat = boxObj?.category === 'MATERIAL';
    const finalKode = await allocateNextSequentialCode(
      supabase,
      isMat ? 'MATERIAL' : 'SAMPLE',
      items
    );
    const styleTrim = String(extracted.style || 'SAMPLE').trim().toUpperCase();
    const sampleNoTrim = String(extracted.sampleNo || '').trim().toUpperCase();
    const sizeTrim = String(extracted.size || 'ONESIZE').trim().toUpperCase();
    const colorTrim = String(extracted.color || 'NA').trim().toUpperCase();
    const buyerNoTrim = String(extracted.buyerNo || 'NA').trim().toUpperCase();
    const trackClean = (extracted.track && String(extracted.track).trim()) ? String(extracted.track).trim().toUpperCase() : 'NA';
    const tanggalClean = extracted.tanggal || 'NA';
    const placeClean = boxObj ? `BOX ${boxNum} (${boxObj.rackName} - ${boxObj.picName})` : `BOX ${boxNum}`;
    const fullDeskripsi = sampleNoTrim
      ? `${styleTrim} - Sample: ${sampleNoTrim} - Size: ${sizeTrim}`
      : `${styleTrim} - Size: ${sizeTrim}`;

    const payload = {
      track: trackClean,
      tanggal: tanggalClean,
      kode: finalKode,
      buyerNo: buyerNoTrim,
      jenisSample: extracted.jenisSample || 'PPS',
      style: styleTrim,
      sampleNo: sampleNoTrim,
      size: sizeTrim,
      deskripsi: fullDeskripsi,
      color: colorTrim,
      jumlah: Number(extracted.jumlah) || 1,
      satuan: 'PCE',
      place: placeClean,
      name: sampleNoTrim
        ? `${styleTrim} (Sample: ${sampleNoTrim}, Size: ${sizeTrim})`
        : `${styleTrim} (Size: ${sizeTrim})`,
      sku: finalKode,
      buyerNumber: buyerNoTrim,
      description: fullDeskripsi,
      qty: Number(extracted.jumlah) || 1,
      unit: 'PCE',
      boxNumber: boxNum,
      rackId: boxObj ? Number(boxObj.rackId) : 1,
      rackName: boxObj ? boxObj.rackName : 'RACK 1',
      picName: boxObj ? boxObj.picName : 'Royan',
      category: boxObj ? boxObj.category : 'SAMPLE',
      status: 'In Storage',
      dateIn: tanggalClean,
    };

    await addItem(payload);
    setSystemNotification({
      type: 'target',
      message: `⚡ [${finalKode}] Berhasil dicatat langsung ke BOX #${boxNum}!`,
    });
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && (key === 'f' || key === 'k')) {
        event.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }, 50);
      }
      if (event.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchOpen]);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setIsSettingsOpen(false);
      }
    };
    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  useEffect(() => {
    const handleTriggerFlare = (e) => {
      if (e?.detail) setCelebrationAchiever(e.detail);
    };
    window.addEventListener('gagaclo_trigger_celebration_flare', handleTriggerFlare);
    return () => {
      window.removeEventListener('gagaclo_trigger_celebration_flare', handleTriggerFlare);
    };
  }, []);

  const activeIssuesCount = issues.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length;

  // Shared search state: the sidebar panel shows results, the 3D scene highlights
  // the boxes that contain a match.
  const searchResults = useMemo(
    () => computeSearchResults(boxes, items, searchQuery),
    [boxes, items, searchQuery],
  );
  const highlightBoxNumbers = searchResults.active ? searchResults.matchedBoxNumbers : null;

  useEffect(() => {
    const client = supabase;
    setDatabaseBytes(null);
    if (!connected || !client) return;
    let active = true;
    const refresh = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const { data, error } = await client.rpc('inventory_database_bytes');
        if (active) setDatabaseBytes(!error && typeof data === 'number' && data >= 0 ? data : null);
      } catch {
        if (active) setDatabaseBytes(null);
      }
    };
    void refresh();
    const timer = setInterval(refresh, 60_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [connected]);

  // Auto-open dynamic announcement popup on app load if active and not marked as seen
  useEffect(() => {
    if (!announcement?.isActive) return;
    try {
      const lastSeen = localStorage.getItem('gagaclo_last_seen_announcement_v2');
      if (lastSeen !== announcement.updatedAt) {
        const timer = setTimeout(() => {
          setIsAnnouncementOpen(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [announcement?.updatedAt, announcement?.isActive]);

  const handleDismissAnnouncement = () => {
    try {
      if (announcement?.updatedAt) {
        localStorage.setItem('gagaclo_last_seen_announcement_v2', announcement.updatedAt);
      }
    } catch {}
    setIsAnnouncementOpen(false);
  };

  const usageLabel = databaseBytes === null
    ? 'Pemakaian: -'
    : `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(databaseBytes / 1_000_000)} MB`;

  const mainTabs = [
    {
      id: '3d-warehouse',
      label: 'BOX',
      subtitle: 'Rak & box 3D',
      count: boxes.length,
      primary: true,
    },
    {
      id: 'ppic-performance',
      label: 'REKAP HARIAN',
      subtitle: 'Penyimpanan per hari',
      count: null,
      primary: false,
    },
    {
      id: 'summary',
      label: 'RINGKASAN',
      subtitle: 'Semua barang',
      count: items.length,
      primary: false,
    },
    {
      id: 'dispatch',
      label: 'KIRIM KELUAR',
      subtitle: 'Buyer, ANZO QC/TW/CHINA, RDTW, RDC',
      count: null,
      primary: false,
    },
    {
      id: 'issues',
      label: 'ISU & USULAN',
      subtitle: 'Laporan & ide tim',
      count: activeIssuesCount > 0 ? activeIssuesCount : null,
      primary: false,
    },
    {
      id: 'team-structure',
      label: 'STRUKTUR TIM',
      subtitle: 'Organisasi & RACI',
      count: 9,
      primary: false,
    },
  ];

  return (
    <div className={`inventory-shell min-h-screen flex flex-col font-sans ${appMode === '3d-warehouse' ? 'warehouse-screen' : ''}`}>

      {/* Sticky Top Header Section: Full-Width Target Team Banner + Navigation Header */}
      <div className="no-print sticky top-0 z-40 w-full shrink-0">
        {/* Full-Width Target Team Banner (Fokus & Dinamis) */}
        <TargetTeamBanner
          onOpenUserProfile={(userName) => {
            setUserProfileTarget(userName);
            setIsUserProfileOpen(true);
          }}
        />

        {/* Top Navigation Bar */}
        <header className="inventory-header">
          <div className="inventory-header-scroll">
            <div className="inventory-header-row font-apple">

              <button
                type="button"
                onClick={() => {
                  setAppMode('3d-warehouse');
                  setIsSearchOpen(false);
                  window.dispatchEvent(new CustomEvent('gagaclo_reset_3d_home_view'));
                }}
                className="inventory-header-brand flex shrink-0 items-center gap-2.5 text-left cursor-pointer hover:opacity-85 active:scale-98 transition select-none group focus:outline-hidden"
                title="Kembali ke Tampilan Utama 3D (Home)"
                aria-label="Kembali ke Tampilan Utama 3D (Home)"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#0071e3] text-white shadow-xs ring-1 ring-black/[0.06] group-hover:shadow-md transition">
                  <Boxes className="h-4.5 w-4.5 stroke-[2.2]" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold tracking-tight text-[#1d1d1f]">
                    Inventory <span className="text-[#0071e3] font-black">RnD</span>
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-black/[0.04] border border-black/[0.06] px-1.5 py-0.5 rounded-full">v2.0</span>
                </div>
              </button>

            {/* Top Navigation Tabs (Apple Segmented Control Style) - Disembunyikan di Mobile, Digantikan Bottom Bar */}
            <nav className="hidden md:flex flex-1 items-center justify-center mx-2 sm:mx-4 font-apple" aria-label="Menu navigasi utama">
              <div className="inline-flex items-center p-1 bg-black/[0.04] rounded-full border border-black/[0.05] gap-0.5 max-w-full">
                {mainTabs.map((tab) => {
                  const isActive = appMode === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setAppMode(tab.id);
                        if (tab.id === '3d-warehouse') {
                          window.dispatchEvent(new CustomEvent('gagaclo_reset_3d_home_view'));
                        }
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-[-0.01em] transition-all duration-200 cursor-pointer select-none whitespace-nowrap ${
                        isActive
                          ? 'bg-white text-[#1d1d1f] shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]'
                          : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.02]'
                      }`}
                      title={tab.subtitle}
                    >
                      <span>{tab.label}</span>
                      {tab.count !== null && tab.count !== undefined && (
                        <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-medium tabular-nums transition-colors ${
                          isActive ? 'bg-[#0071e3]/10 text-[#0071e3]' : 'bg-black/[0.05] text-[#86868b]'
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Actions Toolbar Kanan (Apple macOS Style) */}
            <div className="inventory-header-actions ml-auto flex shrink-0 items-center justify-end gap-2 font-apple">

              {/* Supabase Status Pill (Apple Indicator Pill) */}
              <div
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-black/[0.06] bg-black/[0.03] text-[#1d1d1f] cursor-default select-none tabular-nums"
                aria-label={connected ? `Supabase Gagaclo, ${usageLabel}` : 'Status Cloud Supabase'}
                title={
                  supabaseStatus.isConnected
                    ? `Supabase Cloud Terhubung • Sinkronisasi Otomatis Aktif (${supabaseStatus.lastSync || 'Baru saja'}) • Pengaturan Terkunci`
                    : 'Cloud Database Gagaclo'
                }
              >
                <span className="relative flex h-2 w-2">
                  {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34c759] opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-[#34c759]' : 'bg-[#86868b]'}`}></span>
                </span>
                <Database className="h-3.5 w-3.5 text-[#86868b]" aria-hidden="true" />
                <span className="text-[11px] font-semibold text-[#1d1d1f]">{connected ? usageLabel : 'Cloud'}</span>
              </div>

              {/* Pencarian Cepat (Hanya Icon Kaca Pembesar) */}
              <div className={`relative ${isSearchOpen ? 'z-50' : ''}`} ref={searchContainerRef}>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen((prev) => !prev)}
                  className={`flex items-center justify-center h-8.5 w-8.5 rounded-full text-xs font-medium transition-all duration-150 border cursor-pointer ${
                    isSearchOpen || searchQuery
                      ? 'bg-[#0071e3] text-white border-[#0071e3] shadow-xs'
                      : 'bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border-black/[0.08] shadow-2xs'
                  }`}
                  aria-label="Pencarian Cepat"
                  title="Cari nomor box, kode sampel, buyer, style, warna, PIC, atau rak (Ctrl+F)"
                >
                  <Search className={`h-4 w-4 ${isSearchOpen || searchQuery ? 'text-white' : 'text-[#1d1d1f]'}`} aria-hidden="true" />
                </button>

                {/* Spotlight Popover Dropdown */}
                {isSearchOpen && (
                  <div
                    className="absolute -right-2 sm:right-0 mt-3 w-[calc(100vw-24px)] sm:w-[480px] max-w-[480px] bg-white/95 backdrop-blur-2xl text-[#1d1d1f] border border-black/[0.08] rounded-[22px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)] p-3.5 sm:p-4 z-50 animate-in fade-in zoom-in-95 duration-150 font-apple whitespace-normal"
                    style={{ whiteSpace: 'normal' }}
                  >
                    {/* Input Field */}
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#86868b]" aria-hidden="true" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        inputMode="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari nomor box, sampel, buyer, style, PIC..."
                        autoComplete="off"
                        className="w-full rounded-full border border-black/[0.08] bg-black/[0.03] py-2 pl-9 pr-8 text-xs sm:text-sm text-[#1d1d1f] placeholder:text-[#86868b] focus:border-[#0071e3] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0071e3]/20 transition shadow-xs"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            searchInputRef.current?.focus();
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#86868b] hover:bg-black/[0.06] hover:text-[#1d1d1f] transition cursor-pointer"
                          title="Hapus kata kunci"
                          aria-label="Hapus kata kunci"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>

                    {/* Results Container */}
                    {searchResults?.active ? (
                      <div className="mt-3 pt-3 border-t border-black/[0.06] space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0071e3] bg-[#0071e3]/10 px-2.5 py-0.5 rounded-full border border-[#0071e3]/20 shadow-2xs">
                            <Sparkles className="h-3 w-3 text-[#0071e3]" aria-hidden="true" />
                            <span>
                              {searchResults.matchedBoxNumbers.size} box cocok &amp; disorot di 3D
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="text-xs text-[#86868b] hover:text-[#ff3b30] underline font-medium transition cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>

                        {/* Matched Boxes Chips */}
                        {searchResults.boxMatches.length > 0 && (
                          <div>
                            <p className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider mb-1.5">
                              Box Ditemukan ({searchResults.boxMatches.length}). Klik untuk buka:
                            </p>
                            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                              {searchResults.boxMatches.map((box) => (
                                <button
                                  key={`head-box-${box.boxNumber}`}
                                  type="button"
                                  onMouseEnter={() => setHoveredSearchBoxNumber(Number(box.boxNumber))}
                                  onMouseLeave={() => setHoveredSearchBoxNumber(null)}
                                  onClick={() => {
                                    setSelectedBoxNumber(box.boxNumber);
                                    setIsSearchOpen(false);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#ff9500]/10 hover:bg-[#ff9500]/20 text-[#c96700] border border-[#ff9500]/25 transition shadow-2xs cursor-pointer active:scale-95"
                                  title={`Klik untuk buka BOX #${box.boxNumber} (${box.rackName})`}
                                >
                                  <BoxIcon className="h-3 w-3 text-[#ff9500]" aria-hidden="true" />
                                  <span>BOX #{box.boxNumber}</span>
                                  <span className="text-[11px] font-normal opacity-80">({box.rackName || 'LANTAI'})</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Matched Items List */}
                        {searchResults.itemMatches.length > 0 && (
                          <div>
                            <p className="text-[11px] font-bold text-[#86868b] uppercase tracking-wider mb-1.5">
                              Sampel / Material Cocok ({searchResults.itemMatches.length}):
                            </p>
                            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                              {searchResults.itemMatches.slice(0, 8).map((item, idx) => (
                                <div
                                  key={item.id || `head-item-${idx}`}
                                  onMouseEnter={() => setHoveredSearchBoxNumber(Number(item.boxNumber))}
                                  onMouseLeave={() => setHoveredSearchBoxNumber(null)}
                                  className="flex items-center justify-between gap-2 p-2 rounded-[12px] bg-black/[0.02] hover:bg-[#0071e3]/5 border border-black/[0.06] hover:border-[#0071e3]/30 transition-all text-xs group"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedBoxNumber(Number(item.boxNumber));
                                      setIsSearchOpen(false);
                                    }}
                                    className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                                    title={`Buka BOX #${item.boxNumber} tempat sampel ini disimpan`}
                                  >
                                    <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-[6px] bg-[#0071e3]/10 text-[#0071e3] font-bold text-[11px] tabular-nums">
                                      #{item.boxNumber}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="font-semibold text-[#1d1d1f] truncate text-xs group-hover:text-[#0071e3]">
                                        {item.kode || item.sku || item.style || item.name || 'Sample'}
                                      </div>
                                      <div className="text-[11px] text-[#86868b] truncate">
                                        {item.style && item.style !== (item.kode || item.sku) ? `${item.style} • ` : ''}
                                        Buyer: {item.buyerNo || '-'} • PIC: {item.picName || '-'}
                                      </div>
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setItemModalConfig({
                                        isOpen: true,
                                        item,
                                        targetBoxNumber: Number(item.boxNumber)
                                      });
                                      setIsSearchOpen(false);
                                    }}
                                    className="shrink-0 p-1.5 rounded-full text-[#86868b] hover:text-[#0071e3] hover:bg-white border border-transparent hover:border-black/[0.06] transition cursor-pointer"
                                    title="Edit rincian sampel ini"
                                    aria-label={`Edit ${item.kode || item.sku || item.name || 'barang'}`}
                                  >
                                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            {searchResults.itemMatches.length > 8 && (
                              <p className="text-[11px] text-[#86868b] mt-1 italic">
                                +{searchResults.itemMatches.length - 8} sampel lainnya cocok.
                              </p>
                            )}
                          </div>
                        )}

                        {searchResults.matchedBoxNumbers.size === 0 && (
                          <p className="text-center py-3 text-xs text-[#86868b] border border-dashed border-black/[0.1] rounded-[14px] bg-black/[0.02]">
                            Tidak ada box atau sampel yang cocok dengan kata kunci <strong>"{searchQuery}"</strong>.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2.5 pt-2 border-t border-black/[0.04] text-[11px] text-[#86868b] flex items-center justify-between">
                        <span>Ketik kata kunci untuk mencari box, style, atau buyer.</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-black/[0.05] text-[10px] font-mono text-[#86868b]">ESC</kbd>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Keranjang Pengiriman */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className={`relative flex items-center justify-center h-8.5 w-8.5 rounded-full text-xs font-medium transition-all duration-150 border cursor-pointer ${
                  dispatchCart?.length > 0
                    ? 'bg-[#ff3b30]/10 text-[#ff3b30] border-[#ff3b30]/25 hover:bg-[#ff3b30]/15'
                    : 'bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border-black/[0.08] shadow-2xs'
                }`}
                aria-label="Keranjang Pengiriman Sampel"
                title={`Keranjang Pengiriman Sampel (${dispatchCart?.length || 0} item)`}
              >
                <ShoppingBasket className={`h-4 w-4 ${dispatchCart?.length > 0 ? 'text-[#ff3b30]' : 'text-[#1d1d1f]'}`} aria-hidden="true" />
                {dispatchCart?.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#ff3b30] text-[10px] font-bold text-white shadow-xs">
                    {dispatchCart.length}
                  </span>
                )}
              </button>

              {/* Menu Tab Setting Dropdown (Apple System Menu Style) */}
              <div className={`relative ${isSettingsOpen ? 'z-50' : ''}`} ref={settingsRef}>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen((prev) => !prev)}
                  className={`relative flex items-center justify-center h-8.5 w-8.5 rounded-full text-xs font-medium transition-all duration-150 border cursor-pointer ${
                    isSettingsOpen
                      ? 'bg-[#1d1d1f] text-white border-[#1d1d1f] shadow-xs'
                      : 'bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border-black/[0.08] shadow-2xs'
                  }`}
                  aria-label="Menu Setting & Pengaturan"
                  title="Menu Setting: Pengumuman Tim, Kelola Box & Rak, Backup & Pulihkan, Impor & Ekspor Excel"
                >
                  <Settings className={`h-4 w-4 transition-transform duration-200 ${isSettingsOpen ? 'rotate-90 text-white' : 'text-[#1d1d1f]'}`} aria-hidden="true" />
                  {/* Indikator titik jika ada pengumuman aktif yang belum dibuka */}
                  {(() => {
                    try {
                      const lastSeen = localStorage.getItem('gagaclo_last_seen_announcement_v2');
                      if (announcement?.isActive && lastSeen !== announcement?.updatedAt) {
                        return (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f59e0b] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f59e0b]"></span>
                          </span>
                        );
                      }
                    } catch {}
                    return null;
                  })()}
                </button>

                {isSettingsOpen && (
                  <div
                    className="absolute -right-2 sm:right-0 mt-3 w-[calc(100vw-24px)] sm:w-[490px] max-w-[490px] bg-white/95 backdrop-blur-2xl text-[#1d1d1f] border border-black/[0.08] rounded-[22px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)] p-4 sm:p-5 z-50 animate-in fade-in zoom-in-95 duration-150 whitespace-normal font-apple"
                    style={{ whiteSpace: 'normal' }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Kolom 1: KELOLA GUDANG & PENGUMUMAN */}
                      <div className="flex flex-col gap-2 min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] px-2 flex items-center justify-between">
                          <span>Operasional &amp; Gudang</span>
                          <span className="text-[10px] text-[#86868b] bg-black/[0.04] px-1.5 py-0.5 rounded-full font-medium">Sistem</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsBoxManageOpen(true);
                              setIsSettingsOpen(false);
                            }}
                            className="w-full text-left p-2.5 rounded-[14px] hover:bg-black/[0.04] active:bg-black/[0.06] transition-all group cursor-pointer block"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#0071e3]/10 text-[#0071e3] group-hover:bg-[#0071e3] group-hover:text-white transition-colors shrink-0">
                                <PackagePlus className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-[#1d1d1f] flex items-center justify-between">
                                  <span>Kelola Box &amp; Rak</span>
                                  <span className="text-[11px] text-[#86868b] group-hover:text-[#0071e3] group-hover:translate-x-0.5 transition-all">›</span>
                                </div>
                                <div className="text-[11px] text-[#86868b] mt-0.5 leading-snug">Atur nomor box, rak 1–5 &amp; PIC</div>
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsAnnouncementOpen(true);
                              setIsSettingsOpen(false);
                            }}
                            className="w-full text-left p-2.5 rounded-[14px] hover:bg-black/[0.04] active:bg-black/[0.06] transition-all group cursor-pointer block"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#f59e0b]/10 text-[#f59e0b] group-hover:bg-[#f59e0b] group-hover:text-white transition-colors shrink-0">
                                <Megaphone className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-[#1d1d1f] flex items-center justify-between">
                                  <span>Pengumuman Tim</span>
                                  <span className="text-[11px] text-[#86868b] group-hover:text-[#f59e0b] group-hover:translate-x-0.5 transition-all">›</span>
                                </div>
                                <div className="text-[11px] text-[#86868b] mt-0.5 leading-snug">Atur &amp; siarkan pengumuman popup</div>
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsAiScannerOpen(true);
                              setIsSettingsOpen(false);
                            }}
                            className="w-full text-left p-2.5 rounded-[14px] hover:bg-black/[0.04] active:bg-black/[0.06] transition-all group cursor-pointer block"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#0071e3]/10 text-[#0071e3] group-hover:bg-[#0071e3] group-hover:text-white transition-colors shrink-0">
                                <Sparkles className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-[#1d1d1f] flex items-center justify-between">
                                  <span>Snap &amp; Fill AI Tag</span>
                                  <span className="text-[10px] text-emerald-600 bg-emerald-50 font-bold px-1.5 py-0.5 rounded-full border border-emerald-200">Baru</span>
                                </div>
                                <div className="text-[11px] text-[#86868b] mt-0.5 leading-snug">Scan label kartu &amp; auto-input data</div>
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Kolom 2: DATA & CADANGAN */}
                      <div className="flex flex-col gap-2 min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] px-2 flex items-center justify-between">
                          <span>Data &amp; Cadangan</span>
                          <span className="text-[10px] text-[#86868b] bg-black/[0.04] px-1.5 py-0.5 rounded-full font-medium">Cloud &amp; File</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setBackupPasswordInput('');
                              setBackupPasswordError(false);
                              setIsBackupPasswordOpen(true);
                              setIsSettingsOpen(false);
                            }}
                            className="w-full text-left p-2.5 rounded-[14px] hover:bg-black/[0.04] active:bg-black/[0.06] transition-all group cursor-pointer block"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#34c759]/10 text-[#34c759] group-hover:bg-[#34c759] group-hover:text-white transition-colors shrink-0">
                                <ShieldCheck className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-[#1d1d1f] flex items-center justify-between">
                                  <span>Backup &amp; Pulihkan</span>
                                  <span className="text-[11px] text-[#86868b] group-hover:text-[#34c759] group-hover:translate-x-0.5 transition-all">›</span>
                                </div>
                                <div className="text-[11px] text-[#86868b] mt-0.5 leading-snug">Auto-backup, snapshot &amp; restore</div>
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsImportModalOpen(true);
                              setIsSettingsOpen(false);
                            }}
                            className="w-full text-left p-2.5 rounded-[14px] hover:bg-black/[0.04] active:bg-black/[0.06] transition-all group cursor-pointer block"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#5856d6]/10 text-[#5856d6] group-hover:bg-[#5856d6] group-hover:text-white transition-colors shrink-0">
                                <Upload className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-[#1d1d1f] flex items-center justify-between">
                                  <span>Impor Excel (.xlsx)</span>
                                  <span className="text-[11px] text-[#86868b] group-hover:text-[#5856d6] group-hover:translate-x-0.5 transition-all">›</span>
                                </div>
                                <div className="text-[11px] text-[#86868b] mt-0.5 leading-snug">Unggah file data excel baru</div>
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (exportToExcel) exportToExcel();
                              setIsSettingsOpen(false);
                            }}
                            className="w-full text-left p-2.5 rounded-[14px] hover:bg-black/[0.04] active:bg-black/[0.06] transition-all group cursor-pointer block"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#ff9500]/10 text-[#ff9500] group-hover:bg-[#ff9500] group-hover:text-white transition-colors shrink-0">
                                <FileSpreadsheet className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-[#1d1d1f] flex items-center justify-between">
                                  <span>Unduh Excel (.xlsx)</span>
                                  <span className="text-[11px] text-[#86868b] group-hover:text-[#ff9500] group-hover:translate-x-0.5 transition-all">›</span>
                                </div>
                                <div className="text-[11px] text-[#86868b] mt-0.5 leading-snug">Ekspor data rekap seluruh item</div>
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      </header>
      </div>

      {/* Left main navigation + page content */}
      <div className="inventory-body">
        <main className="inventory-main no-print flex-1 min-w-0 w-full max-w-[1560px] mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 pb-24 md:pb-5">
          {appMode === '3d-warehouse' && (
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center min-h-[460px] rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400 gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  <span className="text-xs font-semibold text-slate-300">Memuat Visualisasi 3D Rak...</span>
                </div>
              }
            >
              <Warehouse3DView
                highlightBoxNumbers={highlightBoxNumbers}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                searchResults={searchResults}
                onClearSearch={() => setSearchQuery('')}
                highlightPpic={highlightPpic}
                onSelectPic={setHighlightPpic}
                previewFocusBoxNumber={hoveredSearchBoxNumber}
              />
            </Suspense>
          )}
          {appMode === 'summary' && (
            <Suspense fallback={<div className="py-12 text-center text-sm font-semibold text-slate-400">Memuat Ringkasan Data...</div>}>
              <TotalItemsSummaryView />
            </Suspense>
          )}
          {appMode === 'dispatch' && (
            <Suspense fallback={<div className="py-12 text-center text-sm font-semibold text-slate-400">Memuat Pengiriman Sampel Keluar...</div>}>
              <DispatchOutgoingView />
            </Suspense>
          )}
          {appMode === 'ppic-performance' && (
            <Suspense fallback={<div className="py-12 text-center text-sm font-semibold text-slate-400">Memuat Rekap Harian...</div>}>
              <PpicPerformanceView />
            </Suspense>
          )}
          {appMode === 'issues' && (
            <Suspense fallback={<div className="py-12 text-center text-sm font-semibold text-slate-400">Memuat Saran &amp; Kendala...</div>}>
              <FeedbackIssuesView />
            </Suspense>
          )}
          {appMode === 'team-structure' && (
            <Suspense fallback={<div className="py-12 text-center text-sm font-semibold text-slate-400">Memuat Struktur Organisasi...</div>}>
              <TeamStructureView />
            </Suspense>
          )}
        </main>
      </div>

      {/* Floating Modals for interacting with 3D or 2D Boxes */}
      <BoxDetailModal />
      <ItemModal />

      <Suspense fallback={null}>
        <BoxQrModal />
        <QuickScannerModal />
      </Suspense>

      {/* Supabase Cloud Connection & Sync Modal */}
      {isSupabaseModalOpen && (
        <Suspense fallback={null}>
          <SupabaseModal
            isOpen={isSupabaseModalOpen}
            onClose={() => setIsSupabaseModalOpen(false)}
          />
        </Suspense>
      )}

      {/* Box / Rack / People Management Modal */}
      {isBoxManageOpen && (
        <Suspense fallback={null}>
          <BoxManageModal
            isOpen={isBoxManageOpen}
            onClose={() => setIsBoxManageOpen(false)}
          />
        </Suspense>
      )}

      {/* User Profile & 5 PIC Authentication Modal */}
      {isUserProfileOpen && (
        <Suspense fallback={null}>
          <UserProfileModal
            isOpen={isUserProfileOpen}
            onClose={() => {
              setIsUserProfileOpen(false);
              setUserProfileTarget(null);
            }}
            initialSelectedUserName={userProfileTarget}
          />
        </Suspense>
      )}

      {/* Password Gate Modal untuk Akses Backup (Password: 4695, tanpa hint) */}
      {isBackupPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="backup-pw-title"
            className="w-full max-w-sm rounded-[22px] bg-white border border-black/[0.08] shadow-2xl p-6 relative font-apple"
          >
            <button
              type="button"
              onClick={() => {
                setIsBackupPasswordOpen(false);
                setBackupPasswordInput('');
                setBackupPasswordError(false);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/[0.04] transition-all cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 id="backup-pw-title" className="text-sm font-bold text-[#1d1d1f]">
                  Akses Backup &amp; Pulihkan
                </h3>
                <p className="text-[11px] text-[#86868b]">
                  Masukkan kata sandi pengelola untuk membuka menu ini.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (backupPasswordInput === '4695') {
                  setIsBackupPasswordOpen(false);
                  setBackupPasswordInput('');
                  setBackupPasswordError(false);
                  setIsBackupModalOpen(true);
                } else {
                  setBackupPasswordError(true);
                }
              }}
              className="space-y-4"
            >
              <div>
                <input
                  type="password"
                  autoFocus
                  value={backupPasswordInput}
                  onChange={(e) => {
                    setBackupPasswordInput(e.target.value);
                    if (backupPasswordError) setBackupPasswordError(false);
                  }}
                  placeholder="Masukkan kata sandi..."
                  className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#f5f5f7] border border-black/[0.08] text-sm text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40 focus:bg-white transition-all"
                />
                {backupPasswordError && (
                  <p className="text-[11px] text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                    Kata sandi salah. Akses ditolak.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsBackupPasswordOpen(false);
                    setBackupPasswordInput('');
                    setBackupPasswordError(false);
                  }}
                  className="px-4 py-2 rounded-full text-xs font-medium text-[#1d1d1f] hover:bg-black/[0.05] transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full text-xs font-semibold bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  Masuk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Backup & Auto-Snapshot Modal */}
      {isBackupModalOpen && (
        <Suspense fallback={null}>
          <BackupModal
            isOpen={isBackupModalOpen}
            onClose={() => setIsBackupModalOpen(false)}
          />
        </Suspense>
      )}

      {/* Impor Excel Spreadsheet Modal */}
      {isImportModalOpen && (
        <InventoryImport
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
        />
      )}

      {/* Keranjang Pengiriman (Marketplace Model) */}
      <DispatchCartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToDispatch={(cartItems) => {
          setIsCartOpen(false);
          setCartCheckoutItems(cartItems);
        }}
      />

      {/* Floating Bottom-Right Sticky Cart Button */}
      <DispatchCartFloatingBar onOpenCart={() => setIsCartOpen(true)} />

      {/* Checkout Dispatch Modal (Triggered from Cart) */}
      {cartCheckoutItems && (
        <DispatchModal
          isOpen={true}
          onClose={() => setCartCheckoutItems(null)}
          preselectedItems={cartCheckoutItems}
        />
      )}

      {/* Global Floating Toast Notification (Multi-user concurrency & auto-sequence alerts) */}
      {systemNotification && (
        <aside aria-label="Notifikasi sistem" className="fixed bottom-5 right-5 z-50 animate-fade-in max-w-sm w-[calc(100%-2.5rem)] sm:w-auto pointer-events-auto shadow-lg">
          <div className={`flex items-start gap-3 px-4 py-3 rounded-lg text-white border text-xs sm:text-sm font-medium ${
            systemNotification.type === 'target'
              ? 'bg-slate-900 border-emerald-500/80 shadow-emerald-950/40'
              : systemNotification.type === 'error'
                ? 'bg-slate-900 border-rose-500/80 shadow-rose-950/40'
                : 'bg-slate-900 border-slate-700 shadow-slate-950/40'
          }`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded shrink-0 font-bold text-xs mt-0.5 ${
              systemNotification.type === 'target'
                ? 'text-emerald-400'
                : systemNotification.type === 'error'
                  ? 'text-rose-400'
                  : 'text-amber-400'
            }`}>
              {systemNotification.type === 'target' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" aria-hidden="true" />
              ) : systemNotification.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-rose-400" aria-hidden="true" />
              ) : (
                <Info className="w-5 h-5 text-amber-400" aria-hidden="true" />
              )}
            </span>
            <span className="flex-1 text-slate-100 leading-snug">{systemNotification.message}</span>
            <button
              type="button"
              onClick={() => setSystemNotification(null)}
              className="min-h-[32px] min-w-[32px] flex items-center justify-center p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              aria-label="Tutup notifikasi"
              title="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* Full-Page Celebratory Flare Overlay */}
      {celebrationAchiever && (
        <CelebrationFlareOverlay
          achiever={celebrationAchiever}
          onClose={() => setCelebrationAchiever(null)}
        />
      )}

      {/* Modal Pengumuman Resmi (Center Monitor) */}
      <Suspense fallback={null}>
        <AnnouncementModal
          isOpen={isAnnouncementOpen}
          onClose={handleDismissAnnouncement}
          announcement={announcement}
          onSaveAnnouncement={updateAnnouncement}
          currentUser={currentUser}
        />
      </Suspense>

      {/* Snap & Fill AI Tag Scanner Modal */}
      <AiTagScannerModal
        isOpen={isAiScannerOpen}
        onClose={() => setIsAiScannerOpen(false)}
        targetBoxNumber={1}
        onApplyToForm={(extracted) => {
          setItemModalConfig({
            isOpen: true,
            item: null,
            targetBoxNumber: 1,
            prefill: extracted,
          });
          setIsAiScannerOpen(false);
        }}
        onDirectSave={handleAppDirectSaveAiData}
      />

      {/* Ergonomic Mobile Bottom Navigation Bar (Android Thumb Accessible) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-black/[0.08] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom,0px)] font-apple"
        aria-label="Navigasi Bawah Mobile"
      >
        <div className="flex items-center justify-around h-14 px-1">
          <button
            type="button"
            onClick={() => {
              setAppMode('3d-warehouse');
              window.dispatchEvent(new CustomEvent('gagaclo_reset_3d_home_view'));
            }}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
              appMode === '3d-warehouse'
                ? 'text-[#0071e3] font-bold'
                : 'text-[#86868b] hover:text-[#1d1d1f] font-medium'
            }`}
          >
            <div className={`flex items-center justify-center h-6 w-6 rounded-full transition-transform ${appMode === '3d-warehouse' ? 'scale-110 bg-[#0071e3]/10' : ''}`}>
              <Boxes className="h-4 w-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">Box 3D</span>
          </button>

          <button
            type="button"
            onClick={() => setAppMode('ppic-performance')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
              appMode === 'ppic-performance'
                ? 'text-[#0071e3] font-bold'
                : 'text-[#86868b] hover:text-[#1d1d1f] font-medium'
            }`}
          >
            <div className={`flex items-center justify-center h-6 w-6 rounded-full transition-transform ${appMode === 'ppic-performance' ? 'scale-110 bg-[#0071e3]/10' : ''}`}>
              <Calendar className="h-4 w-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">Rekap</span>
          </button>

          <button
            type="button"
            onClick={() => setAppMode('summary')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
              appMode === 'summary'
                ? 'text-[#0071e3] font-bold'
                : 'text-[#86868b] hover:text-[#1d1d1f] font-medium'
            }`}
          >
            <div className={`relative flex items-center justify-center h-6 w-6 rounded-full transition-transform ${appMode === 'summary' ? 'scale-110 bg-[#0071e3]/10' : ''}`}>
              <FileSpreadsheet className="h-4 w-4 stroke-[2.2]" />
              {items.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center px-1 rounded-full bg-[#0071e3] text-[8px] font-bold text-white">
                  {items.length > 999 ? '999+' : items.length}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">Ringkasan</span>
          </button>

          <button
            type="button"
            onClick={() => setAppMode('dispatch')}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
              appMode === 'dispatch'
                ? 'text-[#0071e3] font-bold'
                : 'text-[#86868b] hover:text-[#1d1d1f] font-medium'
            }`}
          >
            <div className={`relative flex items-center justify-center h-6 w-6 rounded-full transition-transform ${appMode === 'dispatch' ? 'scale-110 bg-[#0071e3]/10' : ''}`}>
              <ShoppingBasket className="h-4 w-4 stroke-[2.2]" />
              {dispatchCart?.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center px-1 rounded-full bg-[#ff3b30] text-[8px] font-bold text-white animate-pulse">
                  {dispatchCart.length}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">Kirim</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all cursor-pointer ${
              isSettingsOpen
                ? 'text-[#0071e3] font-bold'
                : 'text-[#86868b] hover:text-[#1d1d1f] font-medium'
            }`}
          >
            <div className={`flex items-center justify-center h-6 w-6 rounded-full transition-transform ${isSettingsOpen ? 'scale-110 bg-[#0071e3]/10' : ''}`}>
              <Settings className="h-4 w-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default function App() {
  return (
    <InventoryProvider>
      <AppContent />
    </InventoryProvider>
  );
}
