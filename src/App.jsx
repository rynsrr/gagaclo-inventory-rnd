import React, { useEffect, useState } from 'react';
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
import { 
  Box as BoxIcon, 
  Boxes,
  Database,
  LayoutDashboard,
  PackagePlus
} from 'lucide-react';

const AppContent = () => {
  // Mode selection: default to '3d-warehouse'
  const [appMode, setAppMode] = useState('3d-warehouse'); // '3d-warehouse', 'summary'

  const {
    supabaseStatus,
    isSupabaseModalOpen,
    setIsSupabaseModalOpen
  } = useInventory();

  const [warehouseControlsHost, setWarehouseControlsHost] = useState(null);
  const [databaseBytes, setDatabaseBytes] = useState(null);
  const [isBoxManageOpen, setIsBoxManageOpen] = useState(false);
  const connected = supabaseStatus.isConnected;
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

  return (
    <div className={`inventory-shell min-h-screen flex flex-col font-sans ${appMode === '3d-warehouse' ? 'warehouse-screen' : ''}`}>
      
      {/* Top Navigation Bar */}
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

            {/* Actions & Switcher Tabs */}
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

              {/* Mode Switcher Tabs */}
              <div className="inventory-segments flex items-center gap-0.5 p-0.5 rounded-lg text-xs">
                
                {/* 3D Visualizer Mode */}
                <button
                  onClick={() => setAppMode('3d-warehouse')}
                  className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-md font-semibold transition whitespace-nowrap ${
                    appMode === '3d-warehouse'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BoxIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>BOX</span>
                </button>

                {/* Ringkasan Total Item */}
                <button
                  onClick={() => setAppMode('summary')}
                  className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-md font-semibold transition whitespace-nowrap ${
                    appMode === 'summary'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-blue-500" />
                  <span>Ringkasan</span>
                </button>

              </div>

            </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="inventory-main no-print flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {appMode === '3d-warehouse' && (
          <Warehouse3DView controlsHost={warehouseControlsHost} />
        )}
        {appMode === 'summary' && <TotalItemsSummaryView />}
      </main>
      <footer className="no-print mx-auto w-full max-w-7xl shrink-0 px-4 pb-3 sm:px-6 lg:px-8">
        <InventoryTimer />
      </footer>

      {/* Footer */}


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
