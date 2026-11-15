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
  ChevronDown,
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
  } = useInventory();

  const [databaseBytes, setDatabaseBytes] = useState(null);
  const [isBoxManageOpen, setIsBoxManageOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
      icon: BoxIcon,
      count: boxes.length,
      primary: true,
    },
    {
      id: 'summary',
      label: 'Ringkasan',
      subtitle: 'Semua barang',
      icon: LayoutDashboard,
      count: items.length,
      primary: false,
    },
    {
      id: 'dispatch',
      label: 'Kirim Keluar',
      subtitle: 'Buyer, ANZO QC/TW/CHINA, RDTW, RDC',
      icon: Send,
      count: null,
      primary: false,
    },
    {
      id: 'ppic-performance',
      label: 'Rekap Harian',
      subtitle: 'Penyimpanan per hari',
      icon: Calendar,
      count: null,
      primary: false,
    },
    {
      id: 'issues',
      label: 'Isu & Usulan',
      subtitle: 'Laporan & ide tim',
      icon: MessageSquarePlus,
      count: activeIssuesCount > 0 ? activeIssuesCount : null,
      primary: false,
    },
  ];

  return (
    <div className={`inventory-shell min-h-screen flex flex-col font-sans ${appMode === '3d-warehouse' ? 'warehouse-screen' : ''}`}>

      {/* Sticky Top Header Section: Full-Width Target Team Banner + Navigation Header */}
      <div className="no-print sticky top-0 z-30 w-full shrink-0">
        {/* Full-Width Target Team Banner (Fokus & Dinamis) */}
        <TargetTeamBanner onOpenRekap={() => setAppMode('ppic-performance')} />

        {/* Top Navigation Bar */}
        <header className="inventory-header">
          <div className="inventory-header-scroll">
            <div className="inventory-header-row">

              <div className="inventory-header-brand flex shrink-0 items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm ring-1 ring-white/20">
                  <Boxes className="h-4 w-4" />
                </div>
                <span className="inventory-brand text-xs font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                  GAGACLO <span className="text-blue-600 font-black">R&amp;D</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md">v2.0</span>
                </span>
              </div>

            {/* Top Navigation Tabs */}
            <nav className="flex items-center gap-1.5 mx-1 sm:mx-3" aria-label="Menu navigasi utama">
              {mainTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = appMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAppMode(tab.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                    title={tab.subtitle}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} aria-hidden="true" />
                    <span>{tab.label}</span>
                    {tab.count !== null && tab.count !== undefined && (
                      <span className={`text-xs px-2 py-0.5 rounded-md font-bold tabular-nums ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Actions */}
            <div className="inventory-header-actions flex shrink-0 items-center gap-2">

              {/* Supabase Corporate Gagaclo Status Badge (Display Only - Tidak Dapat Diklik untuk Keamanan Data) */}
              <div
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border cursor-default select-none ${
                  supabaseStatus.isConnected
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
                aria-label={connected ? `Supabase Gagaclo, ${usageLabel}` : 'Status Cloud Supabase'}
                title={
                  supabaseStatus.isConnected
                    ? `Supabase Cloud Terhubung • Sinkronisasi Otomatis Aktif (${supabaseStatus.lastSync || 'Baru saja'}) • Pengaturan Terkunci`
                    : 'Cloud Database Gagaclo'
                }
              >
                <span className="relative flex h-2 w-2">
                  {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                </span>
                <Database className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{connected ? usageLabel : 'Cloud Terhubung'}</span>
              </div>

              <InventoryImport />

              {/* Keranjang Pengiriman (Marketplace Model) */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className={`relative flex items-center justify-center p-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  dispatchCart?.length > 0
                    ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                aria-label="Keranjang Pengiriman Sampel"
                title={`Keranjang Pengiriman Sampel (${dispatchCart?.length || 0} item)`}
              >
                <ShoppingBasket className="h-4 w-4 text-rose-600" aria-hidden="true" />
                {dispatchCart?.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white shadow-xs">
                    {dispatchCart.length}
                  </span>
                )}
              </button>

              {/* Menu Tab Setting Dropdown (Kelola Box & Rak + Backup & Pulihkan) */}
              <div className="relative" ref={settingsRef}>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen((prev) => !prev)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    isSettingsOpen
                      ? 'bg-slate-100 text-slate-900 border-slate-300 shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  aria-label="Menu Setting & Pengaturan"
                  title="Menu Setting: Kelola Box & Rak, Backup & Pulihkan"
                >
                  <Settings className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
                  <span>Setting</span>
                  <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${isSettingsOpen ? 'rotate-180 text-slate-600' : ''}`} />
                </button>

                {isSettingsOpen && (
                  <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white border border-slate-200 shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBoxManageOpen(true);
                        setIsSettingsOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <PackagePlus className="h-4 w-4 text-blue-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900">Kelola Box &amp; Rak</div>
                        <div className="text-[10px] text-slate-500 font-normal">Atur box, rak &amp; denah gudang</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsBackupModalOpen(true);
                        setIsSettingsOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 flex items-center gap-2.5 transition cursor-pointer border-t border-slate-100"
                    >
                      <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-bold text-slate-900">Backup &amp; Pulihkan</div>
                        <div className="text-[10px] text-slate-500 font-normal">Cadangan &amp; snapshot data</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Akun & Profil User PPIC */}
              <button
                type="button"
                onClick={() => setIsUserProfileOpen(true)}
                className="flex items-center justify-center p-2 rounded-lg text-xs font-bold transition-all border bg-white hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer shadow-2xs"
                aria-label={`Akun: ${currentUser?.name || 'PPIC'}`}
                title={`Login sebagai: ${currentUser?.name || 'PPIC'} (${currentUser?.role || 'Staff'}) • Klik untuk beralih akun`}
              >
                <User className="h-4 w-4 text-slate-700" aria-hidden="true" />
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
            onClose={() => setIsUserProfileOpen(false)}
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
