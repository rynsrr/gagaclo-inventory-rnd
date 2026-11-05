import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabase';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { Warehouse3DView } from './components/Warehouse3DView';
import { TotalItemsSummaryView } from './components/TotalItemsSummaryView';
import { BoxDetailModal } from './components/BoxDetailModal';
import { ItemModal } from './components/ItemModal';
import { BoxQrModal } from './components/BoxQrModal';
import { QuickScannerModal } from './components/QuickScannerModal';
import { InventoryTimer } from './components/InventoryTimer';
import { InventoryImport } from './components/InventoryImport';
import { SupabaseModal } from './components/SupabaseModal';
import { BoxManageModal } from './components/BoxManageModal';
import { BoxLabelPrintModal } from './components/BoxLabelPrintModal';
import { FeedbackIssuesView } from './components/FeedbackIssuesView';
import { BoxSearchPanel, computeSearchResults } from './components/BoxSearchPanel';
import {
  Box as BoxIcon,
  Boxes,
  Database,
  LayoutDashboard,
  PackagePlus,
  MessageSquarePlus,
  X,
  Sparkles,
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
  } = useInventory();

  const [warehouseControlsHost, setWarehouseControlsHost] = useState(null);
  const [databaseBytes, setDatabaseBytes] = useState(null);
  const [isBoxManageOpen, setIsBoxManageOpen] = useState(false);
  const [isBoxLabelPrintOpen, setIsBoxLabelPrintOpen] = useState(false);
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
    ? 'Pemakaian —'
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

      {/* Top Navigation Bar — actions only; main tabs live in the left sidebar */}
      <header className="inventory-header no-print sticky top-0 z-30">
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

            {appMode === '3d-warehouse' && (
              <div className="inventory-header-controls" ref={setWarehouseControlsHost} />
            )}

            {/* Actions */}
            <div className="inventory-header-actions flex shrink-0 items-center gap-2">

              {/* Supabase Corporate Gagaclo Status Button */}
              <button
                type="button"
                onClick={() => setIsSupabaseModalOpen(true)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs border ${
                  supabaseStatus.isConnected
                    ? 'bg-emerald-50/90 hover:bg-emerald-100/90 text-emerald-800 border-emerald-200/90 hover:shadow-xs hover:-translate-y-0.5'
                    : 'bg-white/90 hover:bg-slate-100/90 text-slate-700 border-slate-200 hover:shadow-xs hover:-translate-y-0.5'
                }`}
                aria-label={connected ? `Supabase Gagaclo, ${usageLabel}` : 'Hubungkan Supabase Gagaclo'}
                title={
                  supabaseStatus.isConnected
                    ? `Supabase Cloud Terhubung • Sinkronisasi Aktif (${supabaseStatus.lastSync || 'Baru saja'})`
                    : 'Hubungkan ke Cloud Database Supabase Corporate Gagaclo'
                }
              >
                <span className="relative flex h-2 w-2">
                  {connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                </span>
                <Database className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{connected ? usageLabel : 'Hubungkan Cloud'}</span>
              </button>

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

            </div>

          </div>
        </div>
      </header>

      {/* Hitung Mundur Pendataan */}
      <div className="no-print mx-auto w-full max-w-7xl shrink-0 px-4 pt-3 pb-1 sm:px-6 lg:px-8">
        <InventoryTimer />
      </div>

      {/* Left main navigation + page content */}
      <div className="inventory-body">
        <aside className="inventory-sidebar no-print" aria-label="Navigasi utama">
          <nav className="inventory-nav" aria-label="Tab utama">
            <p className="inventory-sidebar-label">MENU UTAMA</p>
            {mainTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = appMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAppMode(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`inventory-nav-item ${tab.primary ? 'inventory-nav-item-primary' : ''}`}
                  title={tab.primary ? 'Tab utama: visualisasi box & rak 3D' : tab.subtitle}
                >
                  <span className="inventory-nav-icon">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="inventory-nav-text">
                    <strong>{tab.label}</strong>
                    <small>{tab.subtitle}</small>
                  </span>
                  <span className="inventory-nav-count">{tab.count}</span>
                </button>
              );
            })}
          </nav>

          <div className="inventory-sidebar-divider" />

          <BoxSearchPanel
            query={searchQuery}
            onQueryChange={setSearchQuery}
            results={searchResults}
          />

          <p className="inventory-sidebar-foot">
            {boxes.length} box • {items.length} item tersimpan
          </p>
        </aside>

        <main className="inventory-main no-print flex-1 min-w-0 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {appMode === '3d-warehouse' && (
            <Warehouse3DView
              controlsHost={warehouseControlsHost}
              highlightBoxNumbers={highlightBoxNumbers}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              searchResults={searchResults}
              onClearSearch={() => setSearchQuery('')}
            />
          )}
          {appMode === 'summary' && <TotalItemsSummaryView />}
          {appMode === 'issues' && <FeedbackIssuesView />}
        </main>
      </div>

      {/* Floating Modals for interacting with 3D or 2D Boxes */}
      <BoxDetailModal />
      <ItemModal />
      <BoxQrModal />
      <QuickScannerModal />

      {/* Supabase Cloud Connection & Sync Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

      {/* Box / Rack / People Management Modal */}
      <BoxManageModal
        isOpen={isBoxManageOpen}
        onClose={() => setIsBoxManageOpen(false)}
      />

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
              className="p-1 hover:bg-white/20 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              aria-label="Tutup notifikasi"
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
