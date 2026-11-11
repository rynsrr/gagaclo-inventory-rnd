import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabase';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { BoxDetailModal } from './components/BoxDetailModal';
import { ItemModal } from './components/ItemModal';
import { InventoryTimer } from './components/InventoryTimer';
import { InventoryImport } from './components/InventoryImport';
import { BoxSearchPanel, computeSearchResults } from './components/BoxSearchPanel';

// Code-split heavy 3D scene & secondary views for ultra lightweight initial load
const Warehouse3DView = lazy(() =>
  import('./components/Warehouse3DView').then((m) => ({ default: m.Warehouse3DView }))
);
const TotalItemsSummaryView = lazy(() =>
  import('./components/TotalItemsSummaryView').then((m) => ({ default: m.TotalItemsSummaryView }))
);
const FeedbackIssuesView = lazy(() =>
  import('./components/FeedbackIssuesView').then((m) => ({ default: m.FeedbackIssuesView }))
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
import {
  Boxes,
  Box as BoxIcon,
  LayoutDashboard,
  MessageSquarePlus,
  Database,
  PackagePlus,
  X,
} from 'lucide-react';

const AppContent = () => {
  // Mode selection: default to '3d-warehouse' (BOX is the main tab)
  const [appMode, setAppMode] = useState('3d-warehouse'); // '3d-warehouse', 'summary'
  const [searchQuery, setSearchQuery] = useState('');

  const {
    supabaseStatus,
    isSupabaseModalOpen,
    setIsSupabaseModalOpen,
    boxes,
    items,
    issues = [],
    systemNotification,
    setSystemNotification,
    currentUser,
  } = useInventory();

  const [databaseBytes, setDatabaseBytes] = useState(null);
  const [isBoxManageOpen, setIsBoxManageOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const connected = supabaseStatus.isConnected;

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
      id: 'issues',
      label: 'Issue & Usulan',
      subtitle: 'Laporan & ide fitur',
      icon: MessageSquarePlus,
      count: activeIssuesCount,
      primary: false,
    },
  ];

  return (
    <div className={`inventory-shell min-h-screen flex flex-col font-sans ${appMode === '3d-warehouse' ? 'warehouse-screen' : ''}`}>

      {/* Sticky Top Header Section: Full-Width Focused Countdown Banner + Navigation Header */}
      <div className="no-print sticky top-0 z-30 w-full shrink-0">
        {/* Full-Width Countdown Timer Banner (Fokus & Bold) */}
        <InventoryTimer fullWidth />

        {/* Top Navigation Bar */}
        <header className="inventory-header">
          <div className="inventory-header-scroll">
            <div className="inventory-header-row">

              <div className="inventory-header-brand flex shrink-0 items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 text-white shadow-md shadow-blue-500/25 ring-1 ring-white/30">
                <Boxes className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="inventory-brand text-xs font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                  GAGACLO <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">R&amp;D</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200/80 px-1.5 py-0.2 rounded-full">v2.0</span>
                </span>
                <span className="inventory-brand text-[10px] font-medium text-slate-500 -mt-0.5">Inventory &amp; Sample Studio</span>
              </div>
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
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs border cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 scale-[1.02]'
                        : 'bg-white/90 hover:bg-slate-100 text-slate-700 border-slate-200/90 hover:-translate-y-0.5'
                    }`}
                    title={tab.subtitle}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} aria-hidden="true" />
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200/80'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Actions */}
            <div className="inventory-header-actions flex shrink-0 items-center gap-2">

              {/* Supabase Corporate Gagaclo Status Badge (Display Only - Tidak Dapat Diklik untuk Keamanan Data) */}
              <div
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs border cursor-default select-none ${
                  supabaseStatus.isConnected
                    ? 'bg-emerald-50/90 text-emerald-800 border-emerald-200/90'
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

              {/* Kelola Box / Rak / Orang */}
              <button
                type="button"
                onClick={() => setIsBoxManageOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs border bg-white/90 hover:bg-slate-100/90 text-slate-700 border-slate-200 hover:shadow-xs hover:-translate-y-0.5"
                aria-label="Kelola Box, Rak & Orang"
                title="Tambah Box, atur Rak/Lantai, kelola data Orang (PIC)"
              >
                <PackagePlus className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                <span>Kelola Box &amp; Rak</span>
              </button>

              {/* Akun & Profil User PIC */}
              <button
                type="button"
                onClick={() => setIsUserProfileOpen(true)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs border bg-gradient-to-r from-blue-50/90 to-indigo-50/90 hover:from-blue-100 hover:to-indigo-100 text-blue-900 border-blue-200/90 hover:shadow-xs hover:-translate-y-0.5 cursor-pointer"
                aria-label="Akun & Profil PIC"
                title={`Login sebagai: ${currentUser?.name || 'PIC'} • Klik untuk beralih akun PIC`}
              >
                <span className={`flex h-4 w-4 items-center justify-center rounded-md text-[10px] font-black text-white ${currentUser?.avatarBg || 'bg-blue-600'}`}>
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'P'}
                </span>
                <span className="font-black text-slate-900">{currentUser?.name || 'PIC'}</span>
                <span className="text-[9px] font-black uppercase text-blue-700 bg-white/80 border border-blue-200/70 px-1 rounded">
                  #{currentUser?.ppicNumber || 1}
                </span>
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
                <div className="flex flex-col items-center justify-center min-h-[460px] rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 gap-3">
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

      {/* Global Floating Toast Notification (Multi-user concurrency & auto-sequence alerts) */}
      {systemNotification && (
        <aside aria-label="Notifikasi sistem" className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-fade-in max-w-lg w-[92%] sm:w-auto pointer-events-auto shadow-2xl">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 text-white shadow-2xl border border-white/20 backdrop-blur-md text-xs sm:text-sm font-semibold">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400 text-slate-950 shrink-0 font-bold text-xs">
              ⚡
            </span>
            <span className="flex-1 text-slate-100 leading-snug">{systemNotification.message}</span>
            <button
              type="button"
              onClick={() => setSystemNotification(null)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 hover:bg-white/20 active:bg-white/30 rounded-lg text-slate-300 hover:text-white transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-label="Tutup notifikasi"
              title="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
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
