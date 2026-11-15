import React, { Suspense, lazy, useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from './lib/supabase';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { BoxDetailModal } from './components/BoxDetailModal';
import { ItemModal } from './components/ItemModal';
import { TargetTeamBanner } from './components/TargetTeamBanner';
import { CelebrationFlareOverlay } from './components/CelebrationFlareOverlay';
import { InventoryImport } from './components/InventoryImport';
import { BoxSearchPanel, computeSearchResults } from './components/BoxSearchPanel';

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
import {
  Boxes,
  Box as BoxIcon,
  LayoutDashboard,
  Calendar,
  MessageSquarePlus,
  Database,
  PackagePlus,
  X,
  Send,
  ShoppingBasket,
  CheckCircle2,
  AlertTriangle,
  Info,
  User,
  ShieldCheck,
  Settings,
  FileSpreadsheet,
  Upload,
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
  } = useInventory();

  const [databaseBytes, setDatabaseBytes] = useState(null);
  const [isBoxManageOpen, setIsBoxManageOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [userProfileTarget, setUserProfileTarget] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const settingsRef = useRef(null);
  const [cartCheckoutItems, setCartCheckoutItems] = useState(null);
  const [celebrationAchiever, setCelebrationAchiever] = useState(null);
  const connected = supabaseStatus.isConnected;

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
      id: 'ppic-performance',
      label: 'REKAP HARIAN',
      subtitle: 'Penyimpanan per hari',
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

              <div className="inventory-header-brand flex shrink-0 items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#0071e3] text-white shadow-xs ring-1 ring-black/[0.06]">
                  <Boxes className="h-4.5 w-4.5 stroke-[2.2]" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold tracking-tight text-[#1d1d1f]">
                    GAGACLO <span className="text-[#0071e3] font-black">R&amp;D</span>
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-black/[0.04] border border-black/[0.06] px-1.5 py-0.5 rounded-full">v2.0</span>
                </div>
              </div>

            {/* Top Navigation Tabs (Apple Segmented Control Style) */}
            <nav className="flex flex-1 items-center justify-center mx-2 sm:mx-4 font-apple" aria-label="Menu navigasi utama">
              <div className="inline-flex items-center p-1 bg-black/[0.04] rounded-full border border-black/[0.05] gap-0.5 max-w-full overflow-x-auto scrollbar-none">
                {mainTabs.map((tab) => {
                  const isActive = appMode === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAppMode(tab.id)}
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
                  className={`flex items-center justify-center h-8.5 w-8.5 rounded-full text-xs font-medium transition-all duration-150 border cursor-pointer ${
                    isSettingsOpen
                      ? 'bg-[#1d1d1f] text-white border-[#1d1d1f] shadow-xs'
                      : 'bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border-black/[0.08] shadow-2xs'
                  }`}
                  aria-label="Menu Setting & Pengaturan"
                  title="Menu Setting: Kelola Box & Rak, Backup & Pulihkan, Impor & Ekspor Excel"
                >
                  <Settings className={`h-4 w-4 transition-transform duration-200 ${isSettingsOpen ? 'rotate-90 text-white' : 'text-[#1d1d1f]'}`} aria-hidden="true" />
                </button>

                {isSettingsOpen && (
                  <div
                    className="absolute right-0 mt-3 w-[320px] sm:w-[490px] bg-white/95 backdrop-blur-2xl text-[#1d1d1f] border border-black/[0.08] rounded-[22px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)] p-4 sm:p-5 z-50 animate-in fade-in zoom-in-95 duration-150 whitespace-normal font-apple"
                    style={{ whiteSpace: 'normal' }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Kolom 1: KELOLA GUDANG */}
                      <div className="flex flex-col gap-2 min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] px-2 flex items-center justify-between">
                          <span>Kelola Gudang</span>
                          <span className="text-[10px] text-[#86868b] bg-black/[0.04] px-1.5 py-0.5 rounded-full font-medium">Fisik</span>
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
                              setIsBackupModalOpen(true);
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

              {/* Akun & Profil User PPIC */}
              <button
                type="button"
                onClick={() => {
                  setUserProfileTarget(null);
                  setIsUserProfileOpen(true);
                }}
                className="flex items-center justify-center h-8.5 w-8.5 rounded-full text-xs font-medium transition-all duration-150 border bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border-black/[0.08] cursor-pointer shadow-2xs"
                aria-label={`Akun: ${currentUser?.name || 'PPIC'}`}
                title={`Login sebagai: ${currentUser?.name || 'PPIC'} (${currentUser?.role || 'Staff'}) • Klik untuk beralih akun`}
              >
                <User className="h-4 w-4 text-[#1d1d1f]" aria-hidden="true" />
              </button>

            </div>

          </div>
        </div>
      </header>
      </div>

      {/* Left main navigation + page content */}
      <div className="inventory-body">
        <main className="inventory-main no-print flex-1 min-w-0 w-full max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
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
