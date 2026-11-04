import React, { useState } from 'react';
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

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans">
      
      {/* Top Navigation Bar */}
      <header className="no-print bg-slate-900 text-white shadow-md sticky top-0 z-30 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Logo & Title */}
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-black tracking-tight text-white uppercase">
                    GAGACLO
                  </span>
                  <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    R&D INVENTORY
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Visualisasi 3D Gudang, Manajemen Box & Dokumen Manifes
                </p>
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
                    ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-700/60'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
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
                  <span className="text-[10px] bg-emerald-800/80 text-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold">
                    CLOUD SYNC
                  </span>
                ) : (
                  <span className="text-[10px] bg-blue-900/60 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded font-bold">
                    Hubungkan
                  </span>
                )}
              </button>

              {/* Mode Switcher Tabs */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto scrollbar-none">
                
                {/* 3D Visualizer Mode */}
                <button
                  onClick={() => setAppMode('3d-warehouse')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    appMode === '3d-warehouse'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
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
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
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
      <footer className="no-print bg-slate-900 text-slate-400 py-5 border-t border-slate-800 text-xs text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-bold text-slate-300">
            GAGACLO • INVENTORY MANAGEMENT RND
          </p>
          <p className="text-[11px] text-slate-500">
            Pencatatan Sampel, Material & Label Box • Dokumen Ref: 20261102
          </p>
        </div>
      </footer>

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
