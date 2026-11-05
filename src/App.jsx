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

            <div className="inventory-header-brand flex shrink-0 items-center gap-2">
              <div className="rounded-lg bg-blue-600 p-1.5 text-white">
                <Boxes className="h-4 w-4" />
              </div>
              <span className="inventory-brand text-xs font-semibold text-slate-800">R&amp;D Inventory</span>
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
                className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition border ${
                  supabaseStatus.isConnected
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                aria-label={connected ? `Supabase Gagaclo, ${usageLabel}` : 'Hubungkan Supabase Gagaclo'}
                title={
                  supabaseStatus.isConnected
                    ? `Supabase Cloud Terhubung • Sinkronisasi Aktif (${supabaseStatus.lastSync || 'Baru saja'})`
                    : 'Hubungkan ke Cloud Database Supabase Corporate Gagaclo'
                }
              >
                <Database className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{connected ? usageLabel : 'Hubungkan'}</span>
              </button>

              <InventoryImport />

              {/* Kelola Box / Rak / Orang */}
              <button
                type="button"
                onClick={() => setIsBoxManageOpen(true)}
                className="flex items-center space-x-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition border bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                aria-label="Kelola Box, Rak & Orang"
                title="Tambah Box, atur Rak/Lantai, kelola data Orang (PIC)"
              >
                <PackagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Kelola</span>
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
