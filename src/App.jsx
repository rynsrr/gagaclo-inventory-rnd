import React, { useState } from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { SimpleInventoryView } from './components/SimpleInventoryView';
import { Warehouse3DView } from './components/Warehouse3DView';
import { PrintableManifestView } from './components/PrintableManifestView';
import { BoxDetailModal } from './components/BoxDetailModal';
import { ItemModal } from './components/ItemModal';
import { BoxQrModal } from './components/BoxQrModal';
import { QuickScannerModal } from './components/QuickScannerModal';
import { BoxLabelPrintModal } from './components/BoxLabelPrintModal';
import { 
  FileText, 
  Box as BoxIcon, 
  Printer, 
  Boxes 
} from 'lucide-react';

const AppContent = () => {
  // Mode selection: default to 'simple-cards' for ultra simple & practical flow!
  const [appMode, setAppMode] = useState('simple-cards'); // 'simple-cards', '3d-warehouse', 'rack-map', 'manifests'
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

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
                  Pencatatan Sample, Cetak Kartu & Visualisasi 3D
                </p>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto scrollbar-none">
              
              {/* Super Simple Mode */}
              <button
                onClick={() => setAppMode('simple-cards')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                  appMode === 'simple-cards'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Kartu & Input (Super Simple)</span>
              </button>

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
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {appMode === 'simple-cards' && <SimpleInventoryView />}
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
            Pencatatan Sampel, Material & Kartu Fisik • Dokumen Ref: 20261102
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
