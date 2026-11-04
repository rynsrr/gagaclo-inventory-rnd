import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { Warehouse3DView } from './components/Warehouse3DView';
import { PrintableManifestView } from './components/PrintableManifestView';
import { BoxDetailModal } from './components/BoxDetailModal';
import { ItemModal } from './components/ItemModal';
import { BoxQrModal } from './components/BoxQrModal';
import { QuickScannerModal } from './components/QuickScannerModal';
import { BoxLabelPrintModal } from './components/BoxLabelPrintModal';
import { SupabaseModal } from './components/SupabaseModal';
import { 
  Box as BoxIcon, 
  Printer, 
  Boxes,
  Database
} from 'lucide-react';

const AppContent = () => {
  // Mode selection: default to '3d-warehouse'
  const [appMode, setAppMode] = useState('3d-warehouse'); // '3d-warehouse', 'manifests'
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

  const {
    supabaseStatus,
    isSupabaseModalOpen,
    setIsSupabaseModalOpen
  } = useInventory();

  const [databaseBytes, setDatabaseBytes] = useState(null);
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
    : `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(databaseBytes / 1_000_000)} MB terpakai`;

  return (
    <div className="inventory-shell min-h-screen flex flex-col font-sans">
      
      {/* Top Navigation Bar */}
      <header className="inventory-header no-print sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Logo & Title */}
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="bg-blue-50 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    R&D INVENTORY
                  </span>
                </div>

              </div>
            </div>

            {/* Actions & Switcher Tabs */}
            <div className="flex items-center flex-wrap gap-2">
              
              {/* Supabase Corporate Gagaclo Status Button */}
              <button
                type="button"
                onClick={() => setIsSupabaseModalOpen(true)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm border ${
                  supabaseStatus.isConnected
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title={
                  supabaseStatus.isConnected
                    ? `Supabase Cloud Terhubung • Sinkronisasi Aktif (${supabaseStatus.lastSync || 'Baru saja'})`
                    : 'Hubungkan ke Cloud Database Supabase Corporate Gagaclo'
                }
              >
                {supabaseStatus.isConnected ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                )}
                <Database className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Supabase Gagaclo</span>
                {supabaseStatus.isConnected ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-mono font-bold">
                    {usageLabel}
                  </span>
                ) : (
                  <span className="text-[10px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                    Hubungkan
                  </span>
                )}
              </button>

              {/* Mode Switcher Tabs */}
              <div className="inventory-segments flex items-center gap-1 p-1 rounded-xl text-xs overflow-x-auto scrollbar-none">
                
                {/* 3D Visualizer Mode */}
                <button
                  onClick={() => setAppMode('3d-warehouse')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    appMode === '3d-warehouse'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BoxIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ilustrasi 3D Rak & Box</span>
                </button>

                {/* Dokumen Manifes */}
                <button
                  onClick={() => setAppMode('manifests')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    appMode === 'manifests'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Dokumen Manifes</span>
                </button>

              </div>

            </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {appMode === '3d-warehouse' && (
          <Warehouse3DView onOpenLabelPrintModal={() => setIsLabelModalOpen(true)} />
        )}
        {appMode === 'manifests' && <PrintableManifestView />}
      </main>

      {/* Footer */}


      {/* Floating Modals for interacting with 3D or 2D Boxes */}
      <BoxDetailModal />
      <ItemModal />
      <BoxQrModal />
      <QuickScannerModal />
      <BoxLabelPrintModal 
        isOpen={isLabelModalOpen} 
        onClose={() => setIsLabelModalOpen(false)} 
      />
      
      {/* Supabase Cloud Connection & Sync Modal */}
      <SupabaseModal 
        isOpen={isSupabaseModalOpen} 
        onClose={() => setIsSupabaseModalOpen(false)} 
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
